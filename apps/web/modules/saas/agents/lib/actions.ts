"use server";

import { requireOrgAccess } from "@repo/auth";
import { agent, db, eq } from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { revalidatePath } from "next/cache";
import {
	agentIdInputSchema,
	createAgentInputSchema,
	linkWhatsAppInputSchema,
	renameAgentInputSchema,
	toggleStatusInputSchema,
	updateBusinessInputSchema,
	updateConversationInputSchema,
	updateIdentityInputSchema,
	updateModelInputSchema,
	updatePersonaInputSchema,
} from "./schemas";

// =============================================
// Helpers internos
// =============================================

async function requireAuthed() {
	const session = await getSession();
	if (!session?.user) throw new Error("UNAUTHENTICATED");
	return session.user;
}

async function loadAgentWithAccessGuard(userId: string, agentId: string) {
	const row = await db.query.agent.findFirst({
		where: eq(agent.id, agentId),
	});
	if (!row) throw new Error("AGENT_NOT_FOUND");
	await requireOrgAccess(userId, row.organizationId);
	return row;
}

function revalidateAgentsList(slug: string) {
	revalidatePath(`/app/${slug}/agents`, "page");
}

function revalidateAgentDetail(slug: string, agentId: string) {
	revalidatePath(`/app/${slug}/agents/${agentId}`, "layout");
	revalidateAgentsList(slug);
}

// =============================================
// CREATE
// =============================================

/**
 * Cria um agente em status DRAFT com defaults pra persona/business/style.
 * Retorna o ID pro client redirecionar pro detalhe.
 */
export async function createAgentAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = createAgentInputSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	const now = new Date();
	const [created] = await db
		.insert(agent)
		.values({
			organizationId: data.organizationId,
			name: data.name,
			role: data.role,
			model: data.model,
			status: "DRAFT",
			version: 1,
			// defaults explicitos — schema ja tem .default() mas manter aqui
			// garante consistencia se alguem trocar o default do schema no futuro
			personality: {},
			businessContext: {},
			conversationStyle: {},
			enabledTools: [],
			knowledgeDocIds: [],
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: agent.id });

	revalidateAgentsList(organizationSlug);
	return { agentId: created.id };
}

// =============================================
// DUPLICATE
// =============================================

export async function duplicateAgentAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = agentIdInputSchema.parse(input);
	const source = await loadAgentWithAccessGuard(user.id, data.agentId);

	const now = new Date();
	const [created] = await db
		.insert(agent)
		.values({
			organizationId: source.organizationId,
			name: `${source.name} (cópia)`,
			role: source.role,
			avatarUrl: source.avatarUrl,
			gender: source.gender,
			description: source.description,
			model: source.model,
			temperature: source.temperature,
			maxSteps: source.maxSteps,
			personality: source.personality,
			businessContext: source.businessContext,
			conversationStyle: source.conversationStyle,
			instructions: source.instructions,
			enabledTools: source.enabledTools,
			knowledgeDocIds: source.knowledgeDocIds,
			status: "DRAFT",
			version: 1,
			// NAO duplica vinculo nem publishedAt — copia comeca limpa
			whatsappInstanceId: null,
			publishedAt: null,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: agent.id });

	revalidateAgentsList(organizationSlug);
	return { agentId: created.id };
}

// =============================================
// ARCHIVE / UNARCHIVE
// =============================================

export async function archiveAgentAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = agentIdInputSchema.parse(input);
	await loadAgentWithAccessGuard(user.id, data.agentId);

	// Arquivar libera o vinculo WhatsApp pra outro agente usar a instancia
	await db
		.update(agent)
		.set({
			status: "ARCHIVED",
			whatsappInstanceId: null,
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
}

export async function unarchiveAgentAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = agentIdInputSchema.parse(input);
	await loadAgentWithAccessGuard(user.id, data.agentId);

	// Desarquivar volta pra DRAFT — user precisa re-ativar e re-vincular manualmente
	await db
		.update(agent)
		.set({
			status: "DRAFT",
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
}

// =============================================
// TOGGLE STATUS (Activate / Pause)
// =============================================

/**
 * Alterna entre ACTIVE e PAUSED com pre-validacao.
 * Bloqueia ativacao se campos obrigatorios nao estao preenchidos.
 * Retorna lista de campos faltando pro client mostrar no toast.
 */
export async function toggleAgentStatusAction(
	input: unknown,
	organizationSlug: string,
): Promise<
	{ ok: true } | { ok: false; code: "MISSING_FIELDS"; missing: string[] }
> {
	const user = await requireAuthed();
	const data = toggleStatusInputSchema.parse(input);
	const row = await loadAgentWithAccessGuard(user.id, data.agentId);

	if (row.status === "ARCHIVED") {
		throw new Error("AGENT_ARCHIVED");
	}

	if (data.to === "ACTIVE") {
		const missing: string[] = [];
		if (!row.name?.trim()) missing.push("name");
		if (!row.role?.trim()) missing.push("role");
		if (!row.model?.trim()) missing.push("model");
		if (!row.whatsappInstanceId) missing.push("whatsappInstance");
		if (missing.length > 0) {
			return { ok: false, code: "MISSING_FIELDS", missing };
		}
	}

	await db
		.update(agent)
		.set({
			status: data.to,
			publishedAt:
				data.to === "ACTIVE" && !row.publishedAt
					? new Date()
					: row.publishedAt,
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
	return { ok: true };
}

// =============================================
// RENAME (inline edit do header — Story 07B.2)
// =============================================

/**
 * Renomeia o agente. Usado pelo inline edit do nome no header do detalhe.
 * Paridade 1:1 com o campo `name` da aba Identidade (que chama
 * updateAgentIdentityAction com o form completo).
 */
export async function renameAgentAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = renameAgentInputSchema.parse(input);
	const row = await loadAgentWithAccessGuard(user.id, data.agentId);

	if (row.status === "ARCHIVED") {
		throw new Error("AGENT_ARCHIVED");
	}

	await db
		.update(agent)
		.set({ name: data.name, updatedAt: new Date() })
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
}

// =============================================
// UPDATE IDENTITY (aba Identidade completa — Story 07B.3)
// Definida aqui porque a estrutura de actions vive em um unico arquivo.
// =============================================

export async function updateAgentIdentityAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = updateIdentityInputSchema.parse(input);
	const row = await loadAgentWithAccessGuard(user.id, data.agentId);

	if (row.status === "ARCHIVED") {
		throw new Error("AGENT_ARCHIVED");
	}

	await db
		.update(agent)
		.set({
			name: data.name,
			role: data.role,
			avatarUrl: data.avatarUrl,
			gender: data.gender,
			description: data.description,
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
}

// =============================================
// UPDATE PERSONA (aba Persona — Story 07B.4)
// =============================================

export async function updateAgentPersonaAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = updatePersonaInputSchema.parse(input);
	const row = await loadAgentWithAccessGuard(user.id, data.agentId);

	if (row.status === "ARCHIVED") {
		throw new Error("AGENT_ARCHIVED");
	}

	await db
		.update(agent)
		.set({
			personality: {
				tone: data.tone,
				formality: data.formality,
				humor: data.humor,
				empathyLevel: data.empathyLevel,
			},
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
}

// =============================================
// UPDATE BUSINESS (aba Negocio - Story 07B.5)
// =============================================

export async function updateAgentBusinessContextAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = updateBusinessInputSchema.parse(input);
	const row = await loadAgentWithAccessGuard(user.id, data.agentId);

	if (row.status === "ARCHIVED") {
		throw new Error("AGENT_ARCHIVED");
	}

	await db
		.update(agent)
		.set({
			businessContext: {
				industry: data.industry ?? undefined,
				products: data.products ?? undefined,
				pricing: data.pricing ?? undefined,
				policies: data.policies ?? undefined,
				inviolableRules: data.inviolableRules,
			},
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
}

// =============================================
// UPDATE CONVERSATION (aba Conversas - Story 07B.6)
// =============================================

export async function updateAgentConversationStyleAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = updateConversationInputSchema.parse(input);
	const row = await loadAgentWithAccessGuard(user.id, data.agentId);

	if (row.status === "ARCHIVED") {
		throw new Error("AGENT_ARCHIVED");
	}

	await db
		.update(agent)
		.set({
			conversationStyle: {
				greeting: data.greeting ?? undefined,
				qualificationQuestions: data.qualificationQuestions,
				objectionHandling: data.objectionHandling ?? undefined,
				handoffTriggers: data.handoffTriggers,
			},
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
}

// =============================================
// UPDATE MODEL (aba Modelo - Story 07B.7)
// =============================================

export async function updateAgentModelAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = updateModelInputSchema.parse(input);
	const row = await loadAgentWithAccessGuard(user.id, data.agentId);

	if (row.status === "ARCHIVED") {
		throw new Error("AGENT_ARCHIVED");
	}

	await db
		.update(agent)
		.set({
			model: data.model,
			temperature: data.temperature,
			maxSteps: data.maxSteps,
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
}

// =============================================
// LINK / UNLINK WHATSAPP (aba WhatsApp - Story 07B.8)
// =============================================

export async function linkAgentToWhatsAppAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = linkWhatsAppInputSchema.parse(input);
	const row = await loadAgentWithAccessGuard(user.id, data.agentId);

	if (row.status === "ARCHIVED") {
		throw new Error("AGENT_ARCHIVED");
	}

	await db
		.update(agent)
		.set({
			whatsappInstanceId: data.whatsappInstanceId,
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
}

export async function unlinkAgentFromWhatsAppAction(
	input: unknown,
	organizationSlug: string,
) {
	const user = await requireAuthed();
	const data = agentIdInputSchema.parse(input);
	const row = await loadAgentWithAccessGuard(user.id, data.agentId);

	// Se o agente estava ACTIVE, pausa (sem WhatsApp nao faz sentido estar ativo)
	const shouldPause = row.status === "ACTIVE";

	await db
		.update(agent)
		.set({
			whatsappInstanceId: null,
			status: shouldPause ? "PAUSED" : row.status,
			updatedAt: new Date(),
		})
		.where(eq(agent.id, data.agentId));

	revalidateAgentDetail(organizationSlug, data.agentId);
	return { pausedByUnlink: shouldPause };
}
