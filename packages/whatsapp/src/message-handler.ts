import {
	and,
	contact,
	conversation,
	db,
	eq,
	message,
	sql,
	whatsappInstance,
} from "@repo/database";
import { bus } from "@repo/events";
import type { WAMessage, WASocket } from "@whiskeysockets/baileys";
import { enrichContactFromWhatsApp } from "./contact-enricher";
import { parseMessageContent } from "./message-parser";
import type { ParsedMessage } from "./types";

function previewFromParsed(parsed: ParsedMessage): string {
	if (parsed.type === "TEXT") return truncate(parsed.text, 80);
	if (parsed.type === "LOCATION") return `📍 ${truncate(parsed.text, 60)}`;
	if (parsed.type === "IMAGE")
		return parsed.caption ? `📷 ${truncate(parsed.caption, 60)}` : "📷 Imagem";
	if (parsed.type === "AUDIO") return "🎵 Áudio";
	if (parsed.type === "VIDEO")
		return parsed.caption ? `🎥 ${truncate(parsed.caption, 60)}` : "🎥 Vídeo";
	if (parsed.type === "DOCUMENT")
		return `📄 ${truncate(parsed.mediaFileName, 60)}`;
	if (parsed.type === "STICKER") return "Figurinha";
	return truncate(parsed.text, 80);
}

function truncate(s: string, max: number): string {
	const clean = s.replace(/\s+/g, " ").trim();
	return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/**
 * Recebe uma WAMessage inbound do Baileys e:
 * 1. upsert do contato (por telefone na org)
 * 2. upsert da conversation (por contact + channel + instance)
 * 3. parse do conteúdo (com download de mídia)
 * 4. insert da message + atualização da conversation (lastMessage, unreadCount)
 * 5. emissão de evento `message.inbound` pro bus (Mastra consumirá na Fase 07)
 *
 * Usa `externalId` (do msg.key.id do WhatsApp) pra dedupe — mensagens
 * duplicadas em reconexão são rejeitadas silenciosamente pelo unique index.
 */
export async function handleIncomingMessage(
	instanceId: string,
	msg: WAMessage,
	sock?: WASocket,
): Promise<void> {
	if (!msg.message || msg.key.fromMe) return;
	const remoteJid = msg.key.remoteJid;
	if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") {
		// Grupos e status broadcast: fora do escopo MVP
		return;
	}

	const [inst] = await db
		.select({ organizationId: whatsappInstance.organizationId })
		.from(whatsappInstance)
		.where(eq(whatsappInstance.id, instanceId))
		.limit(1);
	if (!inst) return;

	const phone = remoteJid.split("@")[0];
	if (!phone) return;
	const senderName = msg.pushName ?? "Desconhecido";

	const now = new Date();

	// Upsert contact
	const [existingContact] = await db
		.select({
			id: contact.id,
			name: contact.name,
			photoUrl: contact.photoUrl,
		})
		.from(contact)
		.where(
			and(
				eq(contact.organizationId, inst.organizationId),
				eq(contact.phone, phone),
			),
		)
		.limit(1);

	let contactId: string;
	let needsEnrichment = false;
	if (existingContact) {
		contactId = existingContact.id;
		// Só atualiza name se o atual estiver vazio/placeholder
		if (
			!existingContact.name ||
			existingContact.name === "Desconhecido" ||
			existingContact.name === phone
		) {
			await db
				.update(contact)
				.set({ name: senderName, updatedAt: now })
				.where(eq(contact.id, contactId));
		}
		// Re-enriquecer se ainda não tem foto (primeira vez ou foto foi
		// habilitada depois)
		if (!existingContact.photoUrl) needsEnrichment = true;
	} else {
		const [created] = await db
			.insert(contact)
			.values({
				organizationId: inst.organizationId,
				name: senderName,
				phone,
				source: "whatsapp",
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: contact.id });
		contactId = created.id;
		needsEnrichment = true;
	}

	// Dispara enrichment em background — não bloqueia o fluxo da mensagem
	if (needsEnrichment && sock) {
		enrichContactFromWhatsApp(sock, contactId, remoteJid).catch((err) => {
			console.warn(
				"[handleIncomingMessage] enrichContact falhou",
				err instanceof Error ? err.message : err,
			);
		});
	}

	// Reusa conversa existente do par (contato, WhatsApp) mesmo que a
	// instance original tenha sido trocada. Isso preserva o histórico quando
	// o cliente desconecta e reconecta com instance nova.
	const [existingConv] = await db
		.select({
			id: conversation.id,
			status: conversation.status,
			channelInstanceId: conversation.channelInstanceId,
		})
		.from(conversation)
		.where(
			and(
				eq(conversation.contactId, contactId),
				eq(conversation.channel, "WHATSAPP"),
			),
		)
		.limit(1);

	let conversationId: string;
	let previousStatus: string | null = null;
	if (existingConv) {
		conversationId = existingConv.id;
		previousStatus = existingConv.status;
		// Se a instância mudou, atualiza a referência (ex: após reconexão
		// com instância nova).
		if (existingConv.channelInstanceId !== instanceId) {
			await db
				.update(conversation)
				.set({ channelInstanceId: instanceId, updatedAt: now })
				.where(eq(conversation.id, conversationId));
		}
	} else {
		const [created] = await db
			.insert(conversation)
			.values({
				organizationId: inst.organizationId,
				contactId,
				channel: "WHATSAPP",
				channelInstanceId: instanceId,
				status: "NEW",
				unreadCount: 0,
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: conversation.id });
		conversationId = created.id;

		bus.emitEvent({
			type: "conversation.created",
			payload: {
				conversationId,
				contactId,
				channel: "WHATSAPP",
			},
			meta: {
				orgId: inst.organizationId,
				actorType: "system",
				actorId: instanceId,
				timestamp: now,
			},
		});
	}

	// Parse + download (se mídia)
	const parsed = await parseMessageContent(msg, inst.organizationId);
	const preview = previewFromParsed(parsed);
	const createdAt = msg.messageTimestamp
		? new Date(Number(msg.messageTimestamp) * 1000)
		: now;

	const values = {
		conversationId,
		externalId: msg.key.id ?? null,
		externalTimestamp: createdAt,
		senderType: "CONTACT" as const,
		senderId: contactId,
		senderName,
		direction: "INBOUND" as const,
		type: mapType(parsed.type),
		status: "DELIVERED" as const,
		text: "text" in parsed ? parsed.text : null,
		mediaUrl: "mediaUrl" in parsed ? parsed.mediaUrl : null,
		mediaMimeType: "mediaMimeType" in parsed ? parsed.mediaMimeType : null,
		mediaFileName: "mediaFileName" in parsed ? parsed.mediaFileName : null,
		mediaSize: "mediaSize" in parsed ? parsed.mediaSize : null,
		durationSeconds:
			"durationSeconds" in parsed ? parsed.durationSeconds : null,
		caption: "caption" in parsed ? parsed.caption : null,
		metadata: "metadata" in parsed ? parsed.metadata : null,
		createdAt,
	};

	// Insert com ON CONFLICT DO NOTHING (externalId único previne duplicata)
	const inserted = await db
		.insert(message)
		.values(values)
		.onConflictDoNothing({ target: message.externalId })
		.returning({ id: message.id });

	// Se conflitou (mensagem duplicada), ignora silenciosamente
	if (inserted.length === 0) return;
	const [{ id: messageId }] = inserted;

	// Atualiza conversation
	await db
		.update(conversation)
		.set({
			lastMessageAt: createdAt,
			lastMessagePreview: preview,
			unreadCount: sql`${conversation.unreadCount} + 1`,
			status: previousStatus === "RESOLVED" ? "ACTIVE" : conversation.status,
			updatedAt: now,
		})
		.where(eq(conversation.id, conversationId));

	bus.emitEvent({
		type: "message.created",
		payload: {
			messageId,
			conversationId,
			direction: "INBOUND",
			senderType: "CONTACT",
			type: values.type,
		},
		meta: {
			orgId: inst.organizationId,
			actorType: "system",
			actorId: instanceId,
			timestamp: now,
		},
	});
}

function mapType(
	t: ParsedMessage["type"],
):
	| "TEXT"
	| "IMAGE"
	| "AUDIO"
	| "VIDEO"
	| "DOCUMENT"
	| "STICKER"
	| "LOCATION"
	| "SYSTEM" {
	if (t === "UNSUPPORTED") return "SYSTEM";
	return t;
}
