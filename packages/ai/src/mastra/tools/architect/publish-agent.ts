import { createTool } from "@mastra/core/tools";
import {
	agentCreationSession,
	agent as agentTable,
	agentVersion,
	and,
	db,
	eq,
	knowledgeDocument,
	orchestratorAuditLog,
	sql,
} from "@repo/database";
import type { AgentSnapshot } from "@repo/database";
import { z } from "zod";
import { ArchitectToolError, toFailure } from "./errors";
import {
	type ArchitectRuntimeContext,
	type ArchitectWorkingMemory,
	deriveToolsFromCapabilities,
	requireArchitectContext,
	validateFullChecklist,
} from "./helpers";

const inputSchema = z.object({});

const outputSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		agent: z.object({
			id: z.string(),
			name: z.string(),
			status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]),
			version: z.number().int(),
		}),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
		message: z.string(),
		details: z.unknown().optional(),
	}),
]);

/**
 * Função core da transação atômica (story 08A.3, reaproveitada em 09.9).
 *
 * Extraída pra permitir reuso direto via route handler (sem precisar de
 * Mastra runtime context). A tool publishAgentFromSession e o endpoint
 * HTTP usam ambos esta função.
 */
export type PublishAgentCoreInput = {
	sessionId: string;
	userId: string;
	organizationId: string;
	workingMemory: ArchitectWorkingMemory;
};

export type PublishAgentCoreResult = {
	id: string;
	name: string;
	status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
	version: number;
};

export async function publishAgentFromSessionCore(
	input: PublishAgentCoreInput,
): Promise<PublishAgentCoreResult> {
	const { sessionId, userId, organizationId, workingMemory } = input;

	const checklistErrors = validateFullChecklist(workingMemory);
	if (checklistErrors.length > 0) {
		throw new ArchitectToolError(
			"CHECKLIST_INCOMPLETE",
			`Checklist incompleto (${checklistErrors.length} campo${checklistErrors.length === 1 ? "" : "s"} faltando). Finalize antes de publicar.`,
			checklistErrors,
		);
	}

	const result = await db.transaction(async (tx) => {
		const sessionRow = await tx.query.agentCreationSession.findFirst({
			where: and(
				eq(agentCreationSession.id, sessionId),
				eq(agentCreationSession.userId, userId),
				eq(agentCreationSession.status, "DRAFT"),
			),
		});
		if (!sessionRow) {
			throw new ArchitectToolError(
				"SESSION_NOT_FOUND",
				`Sessão ${sessionId} não encontrada ou já publicada.`,
			);
		}

		const insertValues = buildAgentInsertValues(
			workingMemory,
			organizationId,
		);
		const inserted = await tx
			.insert(agentTable)
			.values(insertValues)
			.returning();
		const createdAgent = inserted[0];
		if (!createdAgent) {
			throw new ArchitectToolError(
				"PUBLISH_FAILED",
				"INSERT agent não retornou row.",
			);
		}

		await tx
			.update(knowledgeDocument)
			.set({ agentId: createdAgent.id, sessionId: null })
			.where(eq(knowledgeDocument.sessionId, sessionId));

		await tx.execute(sql`
			UPDATE knowledge_chunk
			SET metadata = jsonb_set(
				jsonb_set(metadata, '{agentId}', to_jsonb(${createdAgent.id}::text)),
				'{sessionId}', 'null'::jsonb
			)
			WHERE (metadata->>'sessionId') = ${sessionId}
		`);

		const snapshot = buildAgentSnapshot(createdAgent);
		await tx.insert(agentVersion).values({
			agentId: createdAgent.id,
			version: 1,
			snapshot,
			createdByUserId: userId,
		});

		await tx
			.update(agentCreationSession)
			.set({
				status: "PUBLISHED",
				publishedAgentId: createdAgent.id,
				updatedAt: new Date(),
			})
			.where(eq(agentCreationSession.id, sessionId));

		await tx.insert(orchestratorAuditLog).values({
			organizationId,
			userId,
			actorType: "architect",
			actorId: userId,
			resource: "agent",
			resourceId: createdAgent.id,
			action: "agent_published",
			before: null,
			after: {
				sessionId,
				agentName: createdAgent.name,
				knowledgeDocCount:
					workingMemory.checklist.knowledge.documentIds.length,
			},
		});

		return createdAgent;
	});

	return {
		id: result.id,
		name: result.name,
		status: result.status,
		version: result.version,
	};
}

/**
 * Tool 7 — publishAgentFromSession (story 08A.3).
 *
 * Agora wrapper fino em cima de `publishAgentFromSessionCore`. A lógica
 * de transação vive no core pra ser reusada pelo route handler 09.9
 * (UI "Criar agente" CTA).
 */
export const publishAgentFromSession = createTool({
	id: "publish-agent-from-session",
	description: `Publica agente construído na sessão atual. Consolida working memory em um novo agent + migra documentos do rascunho + cria snapshot v1 + audit log.
Use APENAS quando artefato final_summary foi aprovado pelo usuário.
Transação atômica: ou publica tudo ou nada (rollback em falha).`,
	inputSchema,
	outputSchema,
	execute: async ({ requestContext }) => {
		try {
			const { sessionId, userId, organizationId, workingMemory } =
				requireArchitectContext(
					requestContext as ArchitectRuntimeContext | undefined,
				);

			const agent = await publishAgentFromSessionCore({
				sessionId,
				userId,
				organizationId,
				workingMemory,
			});

			return {
				success: true as const,
				agent,
			};
		} catch (err) {
			return toFailure(err);
		}
	},
});

// =============================================================================
// Builders — isolados para facilitar manutenção e testes
// =============================================================================

function buildAgentInsertValues(
	wm: ArchitectWorkingMemory,
	organizationId: string,
) {
	const persona = wm.checklist.planning.persona;
	const ideation = wm.checklist.ideation;
	const planning = wm.checklist.planning;
	const knowledge = wm.checklist.knowledge;

	return {
		organizationId,
		name: persona.name ?? "Agente",
		role: ideation.goalForAgent ?? null,
		avatarUrl: null,
		gender: persona.gender ? persona.gender.toUpperCase() : null,
		description: ideation.offering ?? null,
		model: "openai/gpt-4.1-mini",
		temperature: 0.7,
		maxSteps: 10,
		personality: {
			tone: mapToneNumToKey(persona.tone),
			formality: mapFormalityNumToKey(persona.formality),
			humor: mapHumorNumToKey(persona.humor),
			empathyLevel: mapEmpathyNumToKey(persona.empathy),
		},
		businessContext: {
			industry: ideation.industry ?? undefined,
			products: ideation.offering ?? undefined,
			pricing: ideation.ticketMean ?? undefined,
			inviolableRules: persona.antiPatterns,
		},
		conversationStyle: {},
		instructions: null,
		enabledTools: deriveToolsFromCapabilities(planning.capabilities),
		knowledgeDocIds: knowledge.documentIds,
		status: "DRAFT" as const,
		version: 1,
		whatsappInstanceId: null,
		emojiConfig: {
			mode: planning.emojiConfig.mode,
			curatedList: planning.emojiConfig.curatedList,
			allowed: planning.emojiConfig.allowed as never,
			forbidden: planning.emojiConfig.forbidden as never,
		},
		voice: {
			enabled: planning.voiceConfig.enabled,
			provider: planning.voiceConfig.provider ?? undefined,
			voiceId: planning.voiceConfig.voiceId ?? undefined,
			mode: planning.voiceConfig.mode,
			triggers: planning.voiceConfig.triggers as never,
		},
		salesTechniques: planning.salesTechniques.map((t) => ({
			presetId: t.presetId,
			intensity: t.intensity,
		})),
		antiPatterns: persona.antiPatterns,
		conversationExamples: [],
		publishedAt: new Date(),
	};
}

function buildAgentSnapshot(
	row: typeof agentTable.$inferSelect,
): AgentSnapshot {
	return {
		name: row.name,
		role: row.role,
		avatarUrl: row.avatarUrl,
		gender: row.gender,
		description: row.description,
		model: row.model,
		temperature: row.temperature,
		maxSteps: row.maxSteps,
		personality: row.personality,
		businessContext: row.businessContext,
		conversationStyle: row.conversationStyle,
		instructions: row.instructions,
		enabledTools: row.enabledTools,
		knowledgeDocIds: row.knowledgeDocIds,
		whatsappInstanceId: row.whatsappInstanceId,
		version: row.version,
		publishedAt: (row.publishedAt ?? new Date()).toISOString(),
	};
}

// =============================================================================
// Mappers dos sliders (0-100) para enum de persona (legacy Phase 03+)
// Os valores novos (sliders 0-100) ficam em emojiConfig/voice/salesTechniques;
// a persona enum mantém compatibilidade com buildInstructions() existente.
// =============================================================================

function mapToneNumToKey(
	n: number | null,
): "formal" | "semiformal" | "informal" | "descontraido" {
	if (n === null) return "semiformal";
	if (n < 25) return "formal";
	if (n < 50) return "semiformal";
	if (n < 75) return "informal";
	return "descontraido";
}

function mapFormalityNumToKey(
	n: number | null,
): "voce_sem_girias" | "tu" | "vc_girias" | "formal" {
	if (n === null) return "voce_sem_girias";
	if (n < 25) return "formal";
	if (n < 50) return "voce_sem_girias";
	if (n < 75) return "vc_girias";
	return "tu";
}

function mapHumorNumToKey(
	n: number | null,
): "seco" | "leve" | "descontraido" | "sem_humor" {
	if (n === null) return "leve";
	if (n < 25) return "sem_humor";
	if (n < 50) return "seco";
	if (n < 75) return "leve";
	return "descontraido";
}

function mapEmpathyNumToKey(n: number | null): "alta" | "media" | "baixa" {
	if (n === null) return "media";
	if (n < 33) return "baixa";
	if (n < 66) return "media";
	return "alta";
}
