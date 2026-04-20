import { createTool } from "@mastra/core/tools";
import {
	agent as agentTable,
	agentVersion,
	db,
	eq,
	orchestratorAuditLog,
} from "@repo/database";
import type { AgentSnapshot } from "@repo/database";
import { z } from "zod";
import { ArchitectToolError, toFailure } from "./errors";
import {
	type ArchitectRuntimeContext,
	computeDiff,
	requireArchitectContext,
} from "./helpers";

const inputSchema = z.object({
	agentId: z.string().min(1),
	changes: z.object({
		name: z.string().min(1).optional(),
		role: z.string().optional(),
		description: z.string().optional(),
		businessContext: z.record(z.string(), z.any()).optional(),
		personality: z.record(z.string(), z.any()).optional(),
		conversationStyle: z.record(z.string(), z.any()).optional(),
		emojiConfig: z.record(z.string(), z.any()).optional(),
		voice: z.record(z.string(), z.any()).optional(),
		salesTechniques: z.array(z.record(z.string(), z.any())).optional(),
		antiPatterns: z.array(z.string()).optional(),
		conversationExamples: z.array(z.record(z.string(), z.any())).optional(),
		addKnowledgeDocIds: z.array(z.string()).optional(),
		removeKnowledgeDocIds: z.array(z.string()).optional(),
	}),
	reason: z
		.string()
		.min(3)
		.describe("Descrição humana da mudança pra audit log"),
});

const outputSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		newVersion: z.number().int(),
		diff: z.array(
			z.object({
				field: z.string(),
				before: z.any(),
				after: z.any(),
			}),
		),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
		message: z.string(),
		details: z.unknown().optional(),
	}),
]);

/**
 * Tool 8 — updateAgentStructurally (story 08A.3).
 *
 * Chat de Evolução pós-criação (consumido pelo Painel de Refino 07B-v2,
 * mas implementado aqui conforme ADR-001). Aplica changes parciais no
 * agent existente dentro de transação atômica, cria snapshot agent_version
 * +1, e registra em audit log com `actorType: 'architect'`.
 *
 * Validação de tenant: agent.organizationId precisa bater com o do
 * runtimeContext. Cross-org bloqueado via erro FORBIDDEN (AC21).
 */
export const updateAgentStructurally = createTool({
	id: "update-agent-structurally",
	description: `Aplica mudanças estruturais em agente já publicado.
Use no Chat de Evolução quando usuário pede alteração (ex: "adicionei 2 produtos novos").
SEMPRE confirme com usuário antes de aplicar (mostrando diff).`,
	inputSchema,
	outputSchema,
	execute: async ({ context, requestContext }) => {
		try {
			const { userId, organizationId } = requireArchitectContext(
				requestContext as ArchitectRuntimeContext | undefined,
			);

			const result = await db.transaction(async (tx) => {
				const existing = await tx.query.agent.findFirst({
					where: eq(agentTable.id, context.agentId),
				});
				if (!existing) {
					throw new ArchitectToolError(
						"AGENT_NOT_FOUND",
						`Agente ${context.agentId} não existe.`,
					);
				}
				if (existing.organizationId !== organizationId) {
					throw new ArchitectToolError(
						"FORBIDDEN",
						"Agente pertence a outra organização.",
					);
				}

				const { changes } = context;
				const newKnowledgeDocIds = applyKnowledgeDocChanges(
					existing.knowledgeDocIds,
					changes.addKnowledgeDocIds,
					changes.removeKnowledgeDocIds,
				);

				const nextVersion = existing.version + 1;
				const nextUpdates = stripUndefined({
					name: changes.name,
					role: changes.role,
					description: changes.description,
					businessContext: changes.businessContext as
						| typeof agentTable.$inferSelect.businessContext
						| undefined,
					personality: changes.personality as
						| typeof agentTable.$inferSelect.personality
						| undefined,
					conversationStyle: changes.conversationStyle as
						| typeof agentTable.$inferSelect.conversationStyle
						| undefined,
					emojiConfig: changes.emojiConfig as
						| typeof agentTable.$inferSelect.emojiConfig
						| undefined,
					voice: changes.voice as
						| typeof agentTable.$inferSelect.voice
						| undefined,
					salesTechniques: changes.salesTechniques as
						| typeof agentTable.$inferSelect.salesTechniques
						| undefined,
					antiPatterns: changes.antiPatterns,
					conversationExamples: changes.conversationExamples as
						| typeof agentTable.$inferSelect.conversationExamples
						| undefined,
					knowledgeDocIds: newKnowledgeDocIds,
					version: nextVersion,
					updatedAt: new Date(),
				});

				const updated = await tx
					.update(agentTable)
					.set(nextUpdates)
					.where(eq(agentTable.id, context.agentId))
					.returning();

				const next = updated[0];
				if (!next) {
					throw new ArchitectToolError(
						"PUBLISH_FAILED",
						"UPDATE agent não retornou row.",
					);
				}

				const snapshot = buildAgentSnapshot(next);
				await tx.insert(agentVersion).values({
					agentId: next.id,
					version: nextVersion,
					snapshot,
					createdByUserId: userId,
				});

				await tx.insert(orchestratorAuditLog).values({
					organizationId,
					userId,
					actorType: "architect",
					actorId: userId,
					resource: "agent",
					resourceId: next.id,
					action: "agent_updated_structurally",
					before: snapshotToAuditObject(existing),
					after: {
						...snapshotToAuditObject(next),
						reason: context.reason,
					},
				});

				return {
					agent: next,
					previous: existing,
					newVersion: nextVersion,
				};
			});

			return {
				success: true as const,
				newVersion: result.newVersion,
				diff: computeDiff(
					snapshotToAuditObject(result.previous),
					snapshotToAuditObject(result.agent),
				),
			};
		} catch (err) {
			return toFailure(err);
		}
	},
});

// =============================================================================
// Helpers locais
// =============================================================================

function applyKnowledgeDocChanges(
	current: string[],
	add?: string[],
	remove?: string[],
): string[] | undefined {
	if (!add?.length && !remove?.length) return undefined;
	const toRemove: Record<string, true> = {};
	for (const id of remove ?? []) toRemove[id] = true;
	const seen: Record<string, true> = {};
	const out: string[] = [];
	const push = (id: string) => {
		if (toRemove[id] || seen[id]) return;
		seen[id] = true;
		out.push(id);
	};
	for (const id of current) push(id);
	for (const id of add ?? []) push(id);
	return out;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
	const out: Partial<T> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (v !== undefined) {
			(out as Record<string, unknown>)[k] = v;
		}
	}
	return out;
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

function snapshotToAuditObject(
	row: typeof agentTable.$inferSelect,
): Record<string, unknown> {
	return {
		name: row.name,
		role: row.role,
		description: row.description,
		model: row.model,
		temperature: row.temperature,
		maxSteps: row.maxSteps,
		personality: row.personality,
		businessContext: row.businessContext,
		conversationStyle: row.conversationStyle,
		emojiConfig: row.emojiConfig,
		voice: row.voice,
		salesTechniques: row.salesTechniques,
		antiPatterns: row.antiPatterns,
		conversationExamples: row.conversationExamples,
		knowledgeDocIds: row.knowledgeDocIds,
		version: row.version,
	};
}
