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
 * Tool 7 — publishAgentFromSession (story 08A.3).
 *
 * Tool mais crítica da phase. Transação Postgres atômica de 10 steps (tech
 * spec § 6.1) que consolida o working memory da sessão num agente publicado.
 * Qualquer falha dispara rollback automático do Postgres — sessão permanece
 * DRAFT, nenhuma row é criada, usuário pode retentar (UI faz backoff 1/3/9s).
 *
 * Input vazio: tudo vem do runtimeContext (sessionId, userId, organizationId,
 * workingMemory populado pelo Agent Arquiteto em 09.5).
 *
 * Events (step 10 tech spec) são emitidos implicitamente via Realtime da
 * tabela agent e knowledge_document (clientes subscrevem UPDATE/INSERT).
 * Emit explícito fica pra 09.5 se necessário.
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

			// Step 3 adiantado: validação pré-tx pra falhar cedo sem abrir conexão.
			const checklistErrors = validateFullChecklist(workingMemory);
			if (checklistErrors.length > 0) {
				throw new ArchitectToolError(
					"CHECKLIST_INCOMPLETE",
					`Checklist incompleto (${checklistErrors.length} campo${checklistErrors.length === 1 ? "" : "s"} faltando). Finalize antes de publicar.`,
					checklistErrors,
				);
			}

			const result = await db.transaction(async (tx) => {
				// Step 1: Carrega sessão com lock lógico (status DRAFT + userId match)
				const session = await tx.query.agentCreationSession.findFirst({
					where: and(
						eq(agentCreationSession.id, sessionId),
						eq(agentCreationSession.userId, userId),
						eq(agentCreationSession.status, "DRAFT"),
					),
				});
				if (!session) {
					throw new ArchitectToolError(
						"SESSION_NOT_FOUND",
						`Sessão ${sessionId} não encontrada ou já publicada.`,
					);
				}

				// Step 4: Cria agent consolidando working memory
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

				// Step 5: Migra knowledge_documents (sessionId -> null, agentId -> novo)
				await tx
					.update(knowledgeDocument)
					.set({ agentId: createdAgent.id, sessionId: null })
					.where(eq(knowledgeDocument.sessionId, sessionId));

				// Step 6: Atualiza metadata dos chunks (jsonb_set chained)
				// Escopo via metadata.sessionId pra não misturar com outras sessões.
				await tx.execute(sql`
					UPDATE knowledge_chunk
					SET metadata = jsonb_set(
						jsonb_set(metadata, '{agentId}', to_jsonb(${createdAgent.id}::text)),
						'{sessionId}', 'null'::jsonb
					)
					WHERE (metadata->>'sessionId') = ${sessionId}
				`);

				// Step 7: Cria snapshot v1 em agent_version
				const snapshot = buildAgentSnapshot(createdAgent);
				await tx.insert(agentVersion).values({
					agentId: createdAgent.id,
					version: 1,
					snapshot,
					createdByUserId: userId,
				});

				// Step 8: Marca sessão PUBLISHED + publishedAgentId
				await tx
					.update(agentCreationSession)
					.set({
						status: "PUBLISHED",
						publishedAgentId: createdAgent.id,
						updatedAt: new Date(),
					})
					.where(eq(agentCreationSession.id, sessionId));

				// Step 9: Audit log (actorType: architect)
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
							workingMemory.checklist.knowledge.documentIds
								.length,
					},
				});

				return createdAgent;
			});

			// Step 10: eventos via Realtime Supabase (automático no UPDATE/INSERT das
			// tabelas agent, knowledge_document, agent_creation_session). Sem emit
			// explícito necessário nesta phase.

			return {
				success: true as const,
				agent: {
					id: result.id,
					name: result.name,
					status: result.status,
					version: result.version,
				},
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
