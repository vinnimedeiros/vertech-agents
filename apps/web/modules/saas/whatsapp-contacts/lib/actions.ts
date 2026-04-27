"use server";

import { requireOrgAccess } from "@repo/auth";
import {
	and,
	asc,
	contact,
	conversation,
	db,
	eq,
	inArray,
	lead,
	pipeline,
	pipelineStage,
	whatsappInstance,
} from "@repo/database";
import { bus } from "@repo/events";
import { getSession } from "@saas/auth/lib/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAuthed() {
	const session = await getSession();
	if (!session?.user) throw new Error("UNAUTHENTICATED");
	return session.user;
}

async function getContactOrgId(contactId: string) {
	const [row] = await db
		.select({ organizationId: contact.organizationId })
		.from(contact)
		.where(eq(contact.id, contactId))
		.limit(1);
	return row?.organizationId ?? null;
}

/**
 * Força sincronização da agenda do WhatsApp da org. Lê os contatos do store
 * do Baileys (que o próprio celular já entregou ao conectar) e roda o
 * upsert. Usado pelo botão "Sincronizar" na página Contatos WhatsApp.
 */
export async function syncWhatsAppContactsNowAction(
	organizationId: string,
	organizationSlug: string,
): Promise<{ inserted: number; updated: number }> {
	const user = await requireAuthed();
	await requireOrgAccess(user.id, organizationId);

	const instanceId = await getActiveWhatsAppInstance(organizationId);
	if (!instanceId) {
		throw new Error("Nenhum WhatsApp conectado nesta organização.");
	}

	const { baileysManager } = await import("@repo/whatsapp");
	const { syncContactsFromWhatsApp } = await import(
		"@repo/whatsapp/src/contacts-sync"
	);
	const inst = await baileysManager.ensureReady(instanceId, 10000);
	const sock = inst.getSock() as any;

	// Baileys mantém store em memória populado pelo evento contacts.upsert;
	// se não houver store, tentamos puxar via `fetchStatus` (no-op seguro).
	const storeContacts: Record<
		string,
		{ id: string; name?: string; notify?: string; verifiedName?: string }
	> =
		sock?.store?.contacts ??
		sock?.authState?.contacts ??
		{};
	const list = Object.values(storeContacts);

	const result = await syncContactsFromWhatsApp(organizationId, list);
	revalidatePath(`/app/${organizationSlug}/crm/contatos`, "page");
	return result;
}

async function getActiveWhatsAppInstance(organizationId: string) {
	const [row] = await db
		.select({ id: whatsappInstance.id })
		.from(whatsappInstance)
		.where(
			and(
				eq(whatsappInstance.organizationId, organizationId),
				inArray(whatsappInstance.status, [
					"CONNECTED",
					"CONNECTING",
					"DISCONNECTED",
				]),
			),
		)
		.limit(1);
	return row?.id ?? null;
}

async function getDefaultPipelineAndFirstStage(organizationId: string) {
	const [p] = await db
		.select({ id: pipeline.id })
		.from(pipeline)
		.where(eq(pipeline.organizationId, organizationId))
		.orderBy(pipeline.isDefault, asc(pipeline.createdAt))
		.limit(1);
	if (!p) return null;
	const [s] = await db
		.select({ id: pipelineStage.id })
		.from(pipelineStage)
		.where(eq(pipelineStage.pipelineId, p.id))
		.orderBy(asc(pipelineStage.position))
		.limit(1);
	if (!s) return null;
	return { pipelineId: p.id, stageId: s.id };
}

// ============================================================
// Criar conversa (ou retornar existente) pra iniciar chat com contato
// ============================================================

/**
 * Cria conversa COM primeira mensagem em transação. Usado no fluxo "Nova
 * conversa" estilo WhatsApp Web — só persiste quando user envia primeira
 * mensagem. Reusa conversa existente se já houver.
 */
export async function startConversationWithMessageAction(
	contactId: string,
	text: string,
	organizationSlug: string,
): Promise<{ conversationId: string }> {
	const user = await requireAuthed();
	const organizationId = await getContactOrgId(contactId);
	if (!organizationId) throw new Error("CONTACT_NOT_FOUND");
	await requireOrgAccess(user.id, organizationId);

	const trimmed = text.trim();
	if (!trimmed) throw new Error("EMPTY_MESSAGE");

	const { openConversationWithContactAction } = await import("./actions");
	const { conversationId } = await openConversationWithContactAction(
		contactId,
		organizationSlug,
	);

	const { sendTextMessageAction } = await import("@saas/chat/lib/actions");
	await sendTextMessageAction({
		conversationId,
		text: trimmed,
		direction: "OUTBOUND",
		senderType: "USER",
	});

	revalidatePath(`/app/${organizationSlug}/crm/chat`, "page");
	return { conversationId };
}

/**
 * Verifica se já existe conversa com este contato no canal WHATSAPP.
 * NÃO cria nova — só retorna ID se existir, senão null.
 * Usado no fluxo de "Nova conversa" estilo WhatsApp Web: se já existe,
 * navega pra ela; se não, abre rota draft `/crm/chat/new/{contactId}`
 * e a conversa só é criada quando user envia primeira mensagem.
 */
export async function findExistingConversationWithContactAction(
	contactId: string,
): Promise<{ conversationId: string | null }> {
	const user = await requireAuthed();
	const organizationId = await getContactOrgId(contactId);
	if (!organizationId) throw new Error("CONTACT_NOT_FOUND");
	await requireOrgAccess(user.id, organizationId);

	const [existing] = await db
		.select({ id: conversation.id })
		.from(conversation)
		.where(
			and(
				eq(conversation.contactId, contactId),
				eq(conversation.channel, "WHATSAPP"),
			),
		)
		.limit(1);

	return { conversationId: existing?.id ?? null };
}

export async function openConversationWithContactAction(
	contactId: string,
	organizationSlug: string,
): Promise<{ conversationId: string }> {
	const user = await requireAuthed();
	const organizationId = await getContactOrgId(contactId);
	if (!organizationId) throw new Error("CONTACT_NOT_FOUND");
	await requireOrgAccess(user.id, organizationId);

	const instanceId = await getActiveWhatsAppInstance(organizationId);

	// Reusa conversa existente, independente da instance atual
	const [existing] = await db
		.select({ id: conversation.id })
		.from(conversation)
		.where(
			and(
				eq(conversation.contactId, contactId),
				eq(conversation.channel, "WHATSAPP"),
			),
		)
		.limit(1);

	if (existing) {
		return { conversationId: existing.id };
	}

	const now = new Date();
	const [created] = await db
		.insert(conversation)
		.values({
			organizationId,
			contactId,
			channel: "WHATSAPP",
			channelInstanceId: instanceId,
			status: "NEW",
			unreadCount: 0,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: conversation.id });

	bus.emitEvent({
		type: "conversation.created",
		payload: {
			conversationId: created.id,
			contactId,
			channel: "WHATSAPP",
		},
		meta: {
			orgId: organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidatePath(`/app/${organizationSlug}/crm/chat`, "page");
	return { conversationId: created.id };
}

// ============================================================
// Promover contato(s) a lead no pipeline default
// ============================================================

const promoteSchema = z.object({
	contactIds: z.array(z.string().min(1)).min(1),
	pipelineId: z.string().min(1).optional(),
	stageId: z.string().min(1).optional(),
});

export async function promoteContactsToLeadsAction(
	input: z.input<typeof promoteSchema>,
	organizationSlug: string,
): Promise<{ createdLeads: number; skipped: number }> {
	const user = await requireAuthed();
	const data = promoteSchema.parse(input);

	// Todos os contatos precisam ser da mesma org
	const rows = await db
		.select({
			id: contact.id,
			organizationId: contact.organizationId,
		})
		.from(contact)
		.where(inArray(contact.id, data.contactIds));
	if (rows.length === 0) throw new Error("NO_CONTACTS");

	const organizationId = rows[0].organizationId;
	if (rows.some((r) => r.organizationId !== organizationId)) {
		throw new Error("CONTACTS_WRONG_ORG");
	}
	await requireOrgAccess(user.id, organizationId);

	// Resolve pipeline/stage default se não informados
	let targetPipelineId = data.pipelineId;
	let targetStageId = data.stageId;
	if (!targetPipelineId || !targetStageId) {
		const def = await getDefaultPipelineAndFirstStage(organizationId);
		if (!def) throw new Error("NO_PIPELINE_CONFIGURED");
		targetPipelineId = def.pipelineId;
		targetStageId = def.stageId;
	}

	// Filtra contatos que já têm lead ativo (pra não duplicar)
	const existingLeads = await db
		.select({ contactId: lead.contactId })
		.from(lead)
		.where(
			and(
				inArray(lead.contactId, rows.map((r) => r.id)),
				eq(lead.organizationId, organizationId),
			),
		);
	const alreadyHasLead = new Set(existingLeads.map((l) => l.contactId));

	const now = new Date();
	let createdLeads = 0;
	let skipped = 0;

	for (const row of rows) {
		if (alreadyHasLead.has(row.id)) {
			skipped++;
			continue;
		}
		// Pega nome do contato pro título
		const [c] = await db
			.select({ name: contact.name })
			.from(contact)
			.where(eq(contact.id, row.id))
			.limit(1);
		await db.insert(lead).values({
			organizationId,
			contactId: row.id,
			pipelineId: targetPipelineId,
			stageId: targetStageId,
			title: c?.name ?? null,
			temperature: "COLD",
			priority: "NORMAL",
			currency: "BRL",
			createdAt: now,
			updatedAt: now,
		});
		await db
			.update(contact)
			.set({ promotedToLeadAt: now, updatedAt: now })
			.where(eq(contact.id, row.id));
		createdLeads++;
	}

	revalidatePath(`/app/${organizationSlug}/crm/contatos`, "page");
	revalidatePath(`/app/${organizationSlug}/crm/pipeline`, "page");
	return { createdLeads, skipped };
}
