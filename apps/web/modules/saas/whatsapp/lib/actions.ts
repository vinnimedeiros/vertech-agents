"use server";

import { requireOrgAccess } from "@repo/auth";
import {
	and,
	contact,
	conversation,
	db,
	eq,
	inArray,
	isNull,
	like,
	notInArray,
	sql,
	whatsappInstance,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import {
	getWhatsAppSyncStatus,
	type WhatsAppSyncStatus,
} from "@saas/whatsapp/lib/server";
import { baileysManager } from "@repo/whatsapp";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createInstanceSchema = z.object({
	organizationId: z.string().min(1),
	name: z.string().trim().min(1, "Nome é obrigatório").max(80),
});

const idInput = z.object({
	instanceId: z.string().min(1),
});

async function requireAuthed() {
	const session = await getSession();
	if (!session?.user) throw new Error("UNAUTHENTICATED");
	return session.user;
}

async function assertInstanceAccess(userId: string, instanceId: string) {
	const [row] = await db
		.select({
			id: whatsappInstance.id,
			organizationId: whatsappInstance.organizationId,
		})
		.from(whatsappInstance)
		.where(eq(whatsappInstance.id, instanceId))
		.limit(1);
	if (!row) throw new Error("INSTANCE_NOT_FOUND");
	await requireOrgAccess(userId, row.organizationId);
	return row;
}

function revalidateIntegrations(slug: string) {
	revalidatePath(`/app/${slug}/crm/integracoes`, "page");
}

// ============================================================
// Criar instância + iniciar conexão (gera QR)
// ============================================================

export async function createInstanceAction(
	input: z.input<typeof createInstanceSchema>,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = createInstanceSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	const now = new Date();
	const [created] = await db
		.insert(whatsappInstance)
		.values({
			organizationId: data.organizationId,
			name: data.name,
			status: "PENDING",
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: whatsappInstance.id });

	// Inicia imediatamente pra gerar QR
	baileysManager.startInstance(created.id).catch((err) => {
		console.error(
			"[createInstanceAction] startInstance failed",
			created.id,
			err,
		);
	});

	revalidateIntegrations(organizationSlug);
	return { instanceId: created.id };
}

// ============================================================
// Reiniciar conexão (usa auth salvo; se expirou, gera QR novo)
// ============================================================

export async function restartInstanceAction(
	input: z.input<typeof idInput>,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = idInput.parse(input);
	await assertInstanceAccess(user.id, data.instanceId);

	await baileysManager.destroyInstance(data.instanceId);

	// Reseta status pra PENDING enquanto o Baileys gera QR novo — caso
	// contrário o polling do popup mostraria o status anterior (LOGGED_OUT
	// ou DISCONNECTED) durante os segundos iniciais.
	await db
		.update(whatsappInstance)
		.set({
			status: "PENDING",
			lastQRCode: null,
			lastError: null,
			updatedAt: new Date(),
		})
		.where(eq(whatsappInstance.id, data.instanceId));

	baileysManager.startInstance(data.instanceId).catch((err) => {
		console.error(
			"[restartInstanceAction] startInstance failed",
			data.instanceId,
			err,
		);
	});

	revalidateIntegrations(organizationSlug);
}

// ============================================================
// Desconectar (logout) — requer QR novo pra reconectar
// ============================================================

export async function disconnectInstanceAction(
	input: z.input<typeof idInput>,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = idInput.parse(input);
	await assertInstanceAccess(user.id, data.instanceId);

	await baileysManager.stopInstance(data.instanceId);

	await db
		.update(whatsappInstance)
		.set({
			status: "LOGGED_OUT",
			phoneNumber: null,
			lastQRCode: null,
			authState: null,
			updatedAt: new Date(),
		})
		.where(eq(whatsappInstance.id, data.instanceId));

	revalidateIntegrations(organizationSlug);
}

// ============================================================
// Deletar instância (logout + remove do DB)
// ============================================================

export async function deleteInstanceAction(
	input: z.input<typeof idInput>,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = idInput.parse(input);
	const inst = await assertInstanceAccess(user.id, data.instanceId);

	await baileysManager.stopInstance(data.instanceId).catch(() => {});

	// Limpa o que pertence só a esta instance: conversations apontando pra ela
	// (cascade messages) e contatos criados via WhatsApp sem promoção a lead.
	await purgeInstanceArtifacts(data.instanceId, inst.organizationId);

	await db
		.delete(whatsappInstance)
		.where(eq(whatsappInstance.id, data.instanceId));

	revalidateIntegrations(organizationSlug);
}

// ============================================================
// Status do sync de history (UI poll)
// ============================================================

/**
 * Retorna status do sync pra UI mostrar banner "Sincronizando contatos".
 * Client poll a cada 5s enquanto `active=true`.
 */
export async function getWhatsAppSyncStatusAction(
	organizationId: string,
): Promise<WhatsAppSyncStatus> {
	const user = await requireAuthed();
	await requireOrgAccess(user.id, organizationId);
	return getWhatsAppSyncStatus(organizationId);
}

// ============================================================
// Trocar instância: cria nova, pergunta se herda contatos/conversas
// ============================================================

const switchInstanceSchema = z.object({
	oldInstanceId: z.string().min(1),
	newName: z.string().trim().min(1, "Nome é obrigatório").max(80),
	inheritContacts: z.boolean(),
	inheritConversations: z.boolean(),
});

export async function switchInstanceAction(
	input: z.input<typeof switchInstanceSchema>,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = switchInstanceSchema.parse(input);
	const old = await assertInstanceAccess(user.id, data.oldInstanceId);

	// "Herdar conversas sem herdar contatos" é impossível: conversation tem
	// FK cascade em contact. Apagar contato derruba conversation. UI já trava
	// essa combinação, mas valida aqui também (defesa em profundidade).
	if (!data.inheritContacts && data.inheritConversations) {
		throw new Error(
			"Não é possível herdar conversas sem herdar contatos.",
		);
	}

	// Encerra conexão WhatsApp ativa (se tiver) antes de mexer no DB
	await baileysManager.stopInstance(data.oldInstanceId).catch(() => {});

	const now = new Date();

	// Operação atômica: tudo dentro da transação, rollback completo se falhar
	// em qualquer passo. Evita estado inconsistente (ex: nova instance criada
	// + falha ao apagar velha = 2 instances ativas).
	const created = await db.transaction(async (tx) => {
		// Cria nova instance ANTES de reaponta conversations (precisa do id)
		const [inst] = await tx
			.insert(whatsappInstance)
			.values({
				organizationId: old.organizationId,
				name: data.newName,
				status: "PENDING",
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: whatsappInstance.id });

		if (data.inheritConversations) {
			// Reaponta conversations da instance velha pra nova; histórico preservado
			await tx
				.update(conversation)
				.set({ channelInstanceId: inst.id, updatedAt: now })
				.where(eq(conversation.channelInstanceId, data.oldInstanceId));
		} else {
			// Apaga conversations da velha (cascade messages)
			await tx
				.delete(conversation)
				.where(eq(conversation.channelInstanceId, data.oldInstanceId));
		}

		if (!data.inheritContacts) {
			// Apaga contatos criados via WhatsApp (sem lead promovido E sem conv ativa)
			await purgeInstanceArtifactsTx(
				tx,
				data.oldInstanceId,
				old.organizationId,
				{ conversationsAlreadyPurged: !data.inheritConversations },
			);
		}

		// Remove instance velha
		await tx
			.delete(whatsappInstance)
			.where(eq(whatsappInstance.id, data.oldInstanceId));

		return inst;
	});

	// Inicia nova pra gerar QR
	baileysManager.startInstance(created.id).catch((err) => {
		console.error(
			"[switchInstanceAction] startInstance failed",
			created.id,
			err,
		);
	});

	revalidateIntegrations(organizationSlug);
	return { instanceId: created.id };
}

/**
 * Apaga artefatos pertencentes a uma instance: conversations vivas + contatos
 * criados via WhatsApp sem promoção a lead. Idempotente — pode ser chamado
 * várias vezes ou após delete prévio de conversations.
 *
 * Wrapper que abre sua própria transação (uso fora de fluxo já transacional).
 */
async function purgeInstanceArtifacts(
	instanceId: string,
	organizationId: string,
	opts?: { conversationsAlreadyPurged?: boolean },
) {
	await db.transaction(async (tx) => {
		await purgeInstanceArtifactsTx(tx, instanceId, organizationId, opts);
	});
}

/**
 * Versão transacional reusável — recebe tx existente. Usar de dentro de outra
 * transação maior (ex: switchInstanceAction).
 */
async function purgeInstanceArtifactsTx(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	instanceId: string,
	organizationId: string,
	opts?: { conversationsAlreadyPurged?: boolean },
) {
	if (!opts?.conversationsAlreadyPurged) {
		await tx
			.delete(conversation)
			.where(eq(conversation.channelInstanceId, instanceId));
	}

	// Contatos a apagar: criados via WhatsApp, sem lead promovido, sem conv viva,
	// sem lead row (FK restrict no lead.contactId não permite apagar).
	const contactsWithLeads = tx
		.select({ id: sql<string>`DISTINCT "contactId"` })
		.from(sql`lead`);
	const contactsWithConvs = tx
		.select({ id: sql<string>`DISTINCT "contactId"` })
		.from(conversation);

	await tx
		.delete(contact)
		.where(
			and(
				eq(contact.organizationId, organizationId),
				like(contact.source, "whatsapp%"),
				isNull(contact.promotedToLeadAt),
				notInArray(contact.id, contactsWithLeads),
				notInArray(contact.id, contactsWithConvs),
			),
		);
}
