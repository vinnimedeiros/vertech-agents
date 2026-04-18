"use server";

import { requireOrgAccess } from "@repo/auth";
import {
	and,
	contact,
	conversation,
	db,
	eq,
	message,
	sql,
} from "@repo/database";
import { bus } from "@repo/events";
import { getSession } from "@saas/auth/lib/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================
// Schemas
// ============================================================

const channelZ = z.enum(["WHATSAPP", "EMAIL", "SMS", "WEBCHAT", "INTERNAL"]);
const senderTypeZ = z.enum(["CONTACT", "USER", "AGENT", "SYSTEM"]);
const directionZ = z.enum(["INBOUND", "OUTBOUND"]);
const messageTypeZ = z.enum([
	"TEXT",
	"IMAGE",
	"AUDIO",
	"VIDEO",
	"DOCUMENT",
	"STICKER",
	"LOCATION",
	"CONTACT",
	"TEMPLATE",
	"SYSTEM",
]);
const statusZ = z.enum(["NEW", "ACTIVE", "WAITING", "RESOLVED", "ARCHIVED"]);

const createOrGetConversationSchema = z.object({
	organizationId: z.string().min(1),
	contactId: z.string().min(1),
	channel: channelZ.default("INTERNAL"),
	channelInstanceId: z.string().optional().nullable(),
});

const sendTextSchema = z.object({
	conversationId: z.string().min(1),
	text: z.string().trim().min(1).max(4000),
	senderType: senderTypeZ.default("USER"),
	direction: directionZ.default("OUTBOUND"),
});

const sendMediaSchema = z.object({
	conversationId: z.string().min(1),
	type: z.enum(["IMAGE", "AUDIO", "VIDEO", "DOCUMENT"]),
	mediaUrl: z.string().url(),
	mediaMimeType: z.string().optional().nullable(),
	mediaFileName: z.string().optional().nullable(),
	mediaSize: z.number().int().nonnegative().optional().nullable(),
	durationSeconds: z.number().int().nonnegative().optional().nullable(),
	caption: z.string().trim().max(1000).optional().nullable(),
	senderType: senderTypeZ.default("USER"),
	direction: directionZ.default("OUTBOUND"),
});

const updateStatusSchema = z.object({
	conversationId: z.string().min(1),
	status: statusZ,
});

const assignUserSchema = z.object({
	conversationId: z.string().min(1),
	userId: z.string().nullable(),
});

// ============================================================
// Helpers
// ============================================================

async function requireAuthed() {
	const session = await getSession();
	if (!session?.user) throw new Error("UNAUTHENTICATED");
	return session.user;
}

async function assertConversationAccess(userId: string, conversationId: string) {
	const [row] = await db
		.select({
			id: conversation.id,
			organizationId: conversation.organizationId,
			contactId: conversation.contactId,
			status: conversation.status,
		})
		.from(conversation)
		.where(eq(conversation.id, conversationId))
		.limit(1);

	if (!row) throw new Error("CONVERSATION_NOT_FOUND");
	await requireOrgAccess(userId, row.organizationId);
	return row;
}

function revalidateChat(slug?: string | null) {
	if (!slug) return;
	revalidatePath(`/app/${slug}/crm/chat`, "page");
}

function previewFromText(text: string, max = 80): string {
	const clean = text.replace(/\s+/g, " ").trim();
	return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function previewFromType(type: string): string {
	switch (type) {
		case "IMAGE":
			return "📷 Imagem";
		case "AUDIO":
			return "🎵 Áudio";
		case "VIDEO":
			return "🎥 Vídeo";
		case "DOCUMENT":
			return "📄 Documento";
		case "STICKER":
			return "Figurinha";
		case "LOCATION":
			return "📍 Localização";
		default:
			return "Mensagem";
	}
}

// ============================================================
// Actions
// ============================================================

export async function createOrGetConversationAction(
	input: z.input<typeof createOrGetConversationSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = createOrGetConversationSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	// Validar que o contato pertence à org
	const [contactRow] = await db
		.select({ id: contact.id, organizationId: contact.organizationId })
		.from(contact)
		.where(eq(contact.id, data.contactId))
		.limit(1);

	if (!contactRow) throw new Error("CONTACT_NOT_FOUND");
	if (contactRow.organizationId !== data.organizationId)
		throw new Error("CONTACT_WRONG_ORG");

	// Procura conversa existente com mesmo contato + canal
	const [existing] = await db
		.select()
		.from(conversation)
		.where(
			and(
				eq(conversation.organizationId, data.organizationId),
				eq(conversation.contactId, data.contactId),
				eq(conversation.channel, data.channel),
			),
		)
		.limit(1);

	if (existing) {
		return existing;
	}

	const now = new Date();
	const [created] = await db
		.insert(conversation)
		.values({
			organizationId: data.organizationId,
			contactId: data.contactId,
			channel: data.channel,
			channelInstanceId: data.channelInstanceId ?? null,
			status: "NEW",
			unreadCount: 0,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	bus.emitEvent({
		type: "conversation.created",
		payload: {
			conversationId: created.id,
			contactId: created.contactId,
			channel: created.channel,
		},
		meta: {
			orgId: data.organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateChat(organizationSlug);
	return created;
}

export async function sendTextMessageAction(
	input: z.input<typeof sendTextSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = sendTextSchema.parse(input);
	const conv = await assertConversationAccess(user.id, data.conversationId);

	const now = new Date();
	const preview = previewFromText(data.text);

	const created = await db.transaction(async (tx) => {
		const [msg] = await tx
			.insert(message)
			.values({
				conversationId: data.conversationId,
				senderType: data.senderType,
				senderId: user.id,
				senderName: user.name ?? user.email ?? null,
				direction: data.direction,
				type: "TEXT",
				status: data.direction === "OUTBOUND" ? "SENT" : "DELIVERED",
				text: data.text,
				createdAt: now,
			})
			.returning();

		// Atualiza conversation
		await tx
			.update(conversation)
			.set({
				lastMessageAt: now,
				lastMessagePreview: preview,
				// Incrementa unreadCount apenas em mensagens INBOUND
				unreadCount:
					data.direction === "INBOUND"
						? sql`${conversation.unreadCount} + 1`
						: conversation.unreadCount,
				// Se era NEW e é primeira resposta outbound, vira ACTIVE
				status:
					conv.status === "NEW" && data.direction === "OUTBOUND"
						? "ACTIVE"
						: conv.status,
				updatedAt: now,
			})
			.where(eq(conversation.id, data.conversationId));

		return msg;
	});

	bus.emitEvent({
		type: "message.created",
		payload: {
			messageId: created.id,
			conversationId: created.conversationId,
			direction: created.direction,
			senderType: created.senderType,
			type: created.type,
		},
		meta: {
			orgId: conv.organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateChat(organizationSlug);
	return created;
}

export async function sendMediaMessageAction(
	input: z.input<typeof sendMediaSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = sendMediaSchema.parse(input);
	const conv = await assertConversationAccess(user.id, data.conversationId);

	const now = new Date();
	const preview = data.caption
		? previewFromText(data.caption)
		: previewFromType(data.type);

	const created = await db.transaction(async (tx) => {
		const [msg] = await tx
			.insert(message)
			.values({
				conversationId: data.conversationId,
				senderType: data.senderType,
				senderId: user.id,
				senderName: user.name ?? user.email ?? null,
				direction: data.direction,
				type: data.type,
				status: data.direction === "OUTBOUND" ? "SENT" : "DELIVERED",
				mediaUrl: data.mediaUrl,
				mediaMimeType: data.mediaMimeType ?? null,
				mediaFileName: data.mediaFileName ?? null,
				mediaSize: data.mediaSize ?? null,
				durationSeconds: data.durationSeconds ?? null,
				caption: data.caption ?? null,
				createdAt: now,
			})
			.returning();

		await tx
			.update(conversation)
			.set({
				lastMessageAt: now,
				lastMessagePreview: preview,
				unreadCount:
					data.direction === "INBOUND"
						? sql`${conversation.unreadCount} + 1`
						: conversation.unreadCount,
				status:
					conv.status === "NEW" && data.direction === "OUTBOUND"
						? "ACTIVE"
						: conv.status,
				updatedAt: now,
			})
			.where(eq(conversation.id, data.conversationId));

		return msg;
	});

	bus.emitEvent({
		type: "message.created",
		payload: {
			messageId: created.id,
			conversationId: created.conversationId,
			direction: created.direction,
			senderType: created.senderType,
			type: created.type,
		},
		meta: {
			orgId: conv.organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateChat(organizationSlug);
	return created;
}

export async function markConversationAsReadAction(
	conversationId: string,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	await assertConversationAccess(user.id, conversationId);

	await db
		.update(conversation)
		.set({ unreadCount: 0, updatedAt: new Date() })
		.where(eq(conversation.id, conversationId));

	revalidateChat(organizationSlug);
}

export async function updateConversationStatusAction(
	input: z.input<typeof updateStatusSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = updateStatusSchema.parse(input);
	const conv = await assertConversationAccess(user.id, data.conversationId);

	const now = new Date();
	await db
		.update(conversation)
		.set({ status: data.status, updatedAt: now })
		.where(eq(conversation.id, data.conversationId));

	bus.emitEvent({
		type: "conversation.status.changed",
		payload: {
			conversationId: data.conversationId,
			from: conv.status,
			to: data.status,
		},
		meta: {
			orgId: conv.organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateChat(organizationSlug);
}

export async function assignUserToConversationAction(
	input: z.input<typeof assignUserSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = assignUserSchema.parse(input);
	await assertConversationAccess(user.id, data.conversationId);

	await db
		.update(conversation)
		.set({ assignedUserId: data.userId, updatedAt: new Date() })
		.where(eq(conversation.id, data.conversationId));

	revalidateChat(organizationSlug);
}
