import { createTool } from "@mastra/core/tools";
import { agentArtifact, db, eq } from "@repo/database";
import { z } from "zod";
import { ArchitectToolError, toFailure } from "./errors";
import {
	type ArchitectRuntimeContext,
	type ArtifactTypeInput,
	getNextStage,
	getStageForArtifactType,
	requireArchitectContext,
} from "./helpers";

const inputSchema = z.object({
	artifactId: z.string().min(1),
});

const outputSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		artifact: z.object({
			id: z.string(),
			status: z.literal("APPROVED"),
		}),
		nextStage: z.enum(["planning", "knowledge", "creation"]).nullable(),
	}),
	z.object({
		success: z.literal(false),
		error: z.string(),
		message: z.string(),
		details: z.unknown().optional(),
	}),
]);

const DB_TO_INPUT_TYPE: Record<string, ArtifactTypeInput> = {
	BUSINESS_PROFILE: "business_profile",
	AGENT_BLUEPRINT: "agent_blueprint",
	KNOWLEDGE_BASE: "knowledge_base",
	FINAL_SUMMARY: "final_summary",
};

/**
 * Tool 4 — approveArtifact (story 08A.3).
 *
 * Marca artefato como APPROVED (imutável) e retorna a próxima etapa pro
 * Arquiteto saber pra onde avançar no working memory. Na etapa Criação
 * (final_summary aprovado), `nextStage` é null — sinal pra chamar
 * publishAgentFromSession.
 *
 * Advance do working memory (currentStage + checklist[stage].status = 'done')
 * é responsabilidade do Agent Arquiteto (09.5) que configura Mastra memory
 * schema pra aplicar merge a partir do return value.
 */
export const approveArtifact = createTool({
	id: "approve-artifact",
	description:
		"Marca artefato como aprovado. Trava edições. Retorna próxima etapa (null se for Criação — hora de publicar).",
	inputSchema,
	outputSchema,
	execute: async ({ context, requestContext }) => {
		try {
			requireArchitectContext(
				requestContext as ArchitectRuntimeContext | undefined,
			);

			const updated = await db
				.update(agentArtifact)
				.set({ status: "APPROVED", approvedAt: new Date() })
				.where(eq(agentArtifact.id, context.artifactId))
				.returning();

			if (updated.length === 0) {
				throw new ArchitectToolError(
					"ARTIFACT_NOT_FOUND",
					`Artefato ${context.artifactId} não existe.`,
				);
			}

			const artifact = updated[0];
			if (!artifact) {
				throw new ArchitectToolError(
					"ARTIFACT_NOT_FOUND",
					"returning() vazio após UPDATE.",
				);
			}

			const inputType = DB_TO_INPUT_TYPE[artifact.type];
			if (!inputType) {
				throw new ArchitectToolError(
					"INVALID_ARTIFACT_TYPE",
					`Tipo desconhecido no banco: ${artifact.type}`,
				);
			}

			const currentStage = getStageForArtifactType(inputType);
			const nextRaw = getNextStage(currentStage);
			const nextStage: "planning" | "knowledge" | "creation" | null =
				nextRaw === "ideation" ? null : nextRaw;

			return {
				success: true as const,
				artifact: {
					id: artifact.id,
					status: "APPROVED" as const,
				},
				nextStage,
			};
		} catch (err) {
			return toFailure(err);
		}
	},
});
