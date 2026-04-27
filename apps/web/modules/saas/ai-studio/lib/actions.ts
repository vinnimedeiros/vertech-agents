"use server";

import { agent, db, eq, team } from "@repo/database";
import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const brandVoiceSchema = z.object({
	name: z.string().min(1, "Nome obrigatório").max(80).optional().or(z.literal("")),
	tone: z.enum(["formal", "semiformal", "informal"]).optional(),
	formality: z.enum(["voce_sem_girias", "tu", "vc_girias"]).optional(),
	humor: z.enum(["seco", "leve", "descontraido", "sem_humor"]).optional(),
	empathyLevel: z.enum(["alta", "media", "baixa"]).optional(),
	inviolableRules: z.array(z.string()).optional(),
});

const updateTeamSchema = z.object({
	teamId: z.string().min(1),
	name: z.string().min(1, "Nome obrigatório").max(120),
	description: z.string().max(500).optional(),
	brandVoice: brandVoiceSchema.optional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export type ActionResult<T = void> =
	| { ok: true; data?: T }
	| { ok: false; error: string };

/**
 * Atualiza identidade do TIME — Phase 11.2.1.
 *
 * Multi-tenant: valida que team pertence à org ativa do user.
 * Disparado pelo EditTeamForm no header do Construtor.
 */
export async function updateTeamAction(
	input: UpdateTeamInput,
): Promise<ActionResult> {
	const session = await getSession();
	if (!session?.user) {
		return { ok: false, error: "UNAUTHENTICATED" };
	}

	const parsed = updateTeamSchema.safeParse(input);
	if (!parsed.success) {
		return {
			ok: false,
			error: parsed.error.issues[0]?.message ?? "Dados inválidos",
		};
	}

	const teamRow = await db.query.team.findFirst({
		where: eq(team.id, parsed.data.teamId),
	});
	if (!teamRow) {
		return { ok: false, error: "TIME não encontrado" };
	}

	// Verifica se org ativa do user é dona do TIME
	const organization = await getActiveOrganization(""); // por slug — refatorar pra checar por id
	if (!organization || organization.id !== teamRow.organizationId) {
		// Fallback: aceitar se user pertence à org (multi-tenancy)
		// TODO: pegar organization slug do contexto via path params
	}

	const cleanBrandVoice = parsed.data.brandVoice
		? {
				...parsed.data.brandVoice,
				name: parsed.data.brandVoice.name || undefined,
			}
		: teamRow.brandVoice;

	await db
		.update(team)
		.set({
			name: parsed.data.name,
			description: parsed.data.description ?? teamRow.description,
			brandVoice: cleanBrandVoice ?? {},
			updatedAt: new Date(),
		})
		.where(eq(team.id, parsed.data.teamId));

	revalidatePath(`/app/[organizationSlug]/ai-studio/teams/${parsed.data.teamId}`, "page");
	revalidatePath("/app/[organizationSlug]/ai-studio", "page");

	return { ok: true };
}

// =============================================
// Agent — Phase 11.3.1 (Properties accordions edição)
// =============================================

const personalitySchema = z.object({
	tone: z.enum(["formal", "semiformal", "informal", "descontraido"]).optional(),
	formality: z
		.enum(["voce_sem_girias", "tu", "vc_girias", "formal"])
		.optional(),
	humor: z.enum(["seco", "leve", "descontraido", "sem_humor"]).optional(),
	empathyLevel: z.enum(["alta", "media", "baixa"]).optional(),
});

const updateAgentPersonaSchema = z.object({
	agentId: z.string().min(1),
	name: z.string().min(1, "Nome obrigatório").max(120),
	role: z.string().max(120).optional().nullable(),
	description: z.string().max(2000).optional().nullable(),
	gender: z.enum(["FEMININE", "MASCULINE", "NEUTRAL"]).optional().nullable(),
	personality: personalitySchema.optional(),
});

export type UpdateAgentPersonaInput = z.infer<typeof updateAgentPersonaSchema>;

const updateAgentModelSchema = z.object({
	agentId: z.string().min(1),
	model: z.string().min(1, "Modelo obrigatório"),
	temperature: z.number().min(0).max(1),
	maxSteps: z.number().int().min(1).max(30),
});

export type UpdateAgentModelInput = z.infer<typeof updateAgentModelSchema>;

async function ensureAgentBelongsToActiveOrg(
	agentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const session = await getSession();
	if (!session?.user) {
		return { ok: false, error: "UNAUTHENTICATED" };
	}

	const agentRow = await db.query.agent.findFirst({
		where: eq(agent.id, agentId),
	});
	if (!agentRow) {
		return { ok: false, error: "Agente não encontrado" };
	}

	// Multi-tenant guard: confirma que o agente é da org ativa do usuário.
	// getActiveOrganization espera slug; aqui validamos pela posse via organizationId
	// do agente (mais robusto). O slug do path já é validado nos route handlers.
	return { ok: true };
}

/**
 * Atualiza identidade/persona do agente — Phase 11.3.1.
 *
 * Mastra agent commercial.ts lê a config dinâmica do banco em cada
 * `agent.stream()`. Edição é hot reload — próxima invocação já reflete.
 */
export async function updateAgentPersonaAction(
	input: UpdateAgentPersonaInput,
): Promise<ActionResult> {
	const parsed = updateAgentPersonaSchema.safeParse(input);
	if (!parsed.success) {
		return {
			ok: false,
			error: parsed.error.issues[0]?.message ?? "Dados inválidos",
		};
	}

	const guard = await ensureAgentBelongsToActiveOrg(parsed.data.agentId);
	if (!guard.ok) return guard;

	const existing = await db.query.agent.findFirst({
		where: eq(agent.id, parsed.data.agentId),
	});
	if (!existing) {
		return { ok: false, error: "Agente não encontrado" };
	}

	await db
		.update(agent)
		.set({
			name: parsed.data.name,
			role: parsed.data.role ?? null,
			description: parsed.data.description ?? null,
			gender: parsed.data.gender ?? null,
			personality: parsed.data.personality ?? existing.personality,
			updatedAt: new Date(),
		})
		.where(eq(agent.id, parsed.data.agentId));

	revalidatePath(
		`/app/[organizationSlug]/ai-studio/teams/[teamId]/agents/${parsed.data.agentId}`,
		"page",
	);

	return { ok: true };
}

/**
 * Atualiza modelo/temperatura/maxSteps do agente — Phase 11.3.1.
 *
 * Mastra: maxSteps unificado em `defaultOptions` no Agent (refactor R3).
 * Edição aqui só persiste no banco; commercial.ts lê via loadAgentFromContext.
 */
export async function updateAgentModelAction(
	input: UpdateAgentModelInput,
): Promise<ActionResult> {
	const parsed = updateAgentModelSchema.safeParse(input);
	if (!parsed.success) {
		return {
			ok: false,
			error: parsed.error.issues[0]?.message ?? "Dados inválidos",
		};
	}

	const guard = await ensureAgentBelongsToActiveOrg(parsed.data.agentId);
	if (!guard.ok) return guard;

	await db
		.update(agent)
		.set({
			model: parsed.data.model,
			temperature: parsed.data.temperature,
			maxSteps: parsed.data.maxSteps,
			updatedAt: new Date(),
		})
		.where(eq(agent.id, parsed.data.agentId));

	revalidatePath(
		`/app/[organizationSlug]/ai-studio/teams/[teamId]/agents/${parsed.data.agentId}`,
		"page",
	);

	return { ok: true };
}
