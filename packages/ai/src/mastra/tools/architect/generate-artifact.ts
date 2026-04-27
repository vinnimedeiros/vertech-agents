import { createTool } from "@mastra/core/tools";
import { agentArtifact, db } from "@repo/database";
import { z } from "zod";
import { ArchitectToolError, toFailure } from "./errors";
import {
	type ArchitectRuntimeContext,
	type ArtifactTypeInput,
	artifactTypeToDb,
	buildArtifactContent,
	getStageForArtifactType,
	requireArchitectContext,
	validateChecklistForStage,
} from "./helpers";

const inputSchema = z.object({
	artifactType: z.enum([
		"business_profile",
		"agent_blueprint",
		"knowledge_base",
		"final_summary",
	]),
});

const outputSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		artifact: z.object({
			id: z.string(),
			type: z.string(),
			content: z.record(z.string(), z.any()),
			status: z.literal("GENERATED"),
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
 * Tool 2 — generateArtifact (story 08A.3).
 *
 * Consolida o working memory da etapa atual num artifact content estruturado
 * e persiste em `agent_artifact` com status GENERATED. Valida o checklist da
 * etapa correspondente antes — se faltar campo obrigatório, retorna erro
 * `CHECKLIST_INCOMPLETE` com lista precisa.
 *
 * Nota: working memory write-back (`artifactIds[camelCase(type)] = id`) é
 * feito via retorno da tool — o Agent Arquiteto (09.5) configurará Mastra
 * memory schema pra mergear automaticamente. Nesta phase, retornamos o id
 * no `artifact` e o caller aplica patch próprio.
 */
export const generateArtifact = createTool({
	id: "generate-artifact",
	description: `Gera um artefato estruturado consolidando o que foi coletado até aqui.
Use APENAS quando todos os campos obrigatórios da etapa atual estão preenchidos.
Sempre confirme com o usuário antes de chamar: "posso estruturar o que coletamos?"`,
	inputSchema,
	outputSchema,
	execute: async ({ context, requestContext }) => {
		try {
			const { sessionId, workingMemory } = requireArchitectContext(
				requestContext as ArchitectRuntimeContext | undefined,
			);

			const artifactType = context.artifactType as ArtifactTypeInput;
			const stage = getStageForArtifactType(artifactType);

			const validationErrors = validateChecklistForStage(
				workingMemory,
				stage,
			);
			if (validationErrors.length > 0) {
				throw new ArchitectToolError(
					"CHECKLIST_INCOMPLETE",
					`Etapa ${stage} incompleta (${validationErrors.length} campo${validationErrors.length === 1 ? "" : "s"} faltando).`,
					validationErrors,
				);
			}

			const content = buildArtifactContent(artifactType, workingMemory);

			const [inserted] = await db
				.insert(agentArtifact)
				.values({
					sessionId,
					type: artifactTypeToDb(artifactType),
					content,
					status: "GENERATED",
				})
				.returning();

			if (!inserted) {
				throw new ArchitectToolError(
					"PUBLISH_FAILED",
					"INSERT de agent_artifact não retornou row.",
				);
			}

			return {
				success: true as const,
				artifact: {
					id: inserted.id,
					type: inserted.type,
					content: inserted.content as Record<string, unknown>,
					status: "GENERATED" as const,
				},
			};
		} catch (err) {
			return toFailure(err);
		}
	},
});
