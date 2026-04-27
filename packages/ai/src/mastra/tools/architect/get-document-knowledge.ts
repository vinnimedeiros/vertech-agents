import { createTool } from "@mastra/core/tools";
import { db, eq, knowledgeDocument } from "@repo/database";
import { z } from "zod";
import { toFailure } from "./errors";
import {
	type ArchitectRuntimeContext,
	requireArchitectContext,
} from "./helpers";

const inputSchema = z.object({});

const outputSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		documents: z.array(
			z.object({
				id: z.string(),
				title: z.string(),
				status: z.enum(["PENDING", "PROCESSING", "READY", "ERROR"]),
				summary: z.string().nullable(),
				chunkCount: z.number().int(),
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
 * Tool 6 — getDocumentKnowledge (story 08A.3).
 *
 * Retorna todos os docs da sessão ativa com status + resumo + chunkCount.
 * Usado pelo Arquiteto na etapa Conhecimento pra fazer recap pro usuário
 * ("Já processei X documentos, o Y trouxe tal conteúdo, o Z está em erro").
 *
 * Input vazio: tudo vem do runtimeContext.
 */
export const getDocumentKnowledge = createTool({
	id: "get-document-knowledge",
	description:
		"Retorna resumo do que foi extraído de todos os documentos da sessão. Use na etapa Conhecimento pra fazer recap pro usuário.",
	inputSchema,
	outputSchema,
	execute: async ({ requestContext }) => {
		try {
			const { sessionId } = requireArchitectContext(
				requestContext as ArchitectRuntimeContext | undefined,
			);

			const docs = await db.query.knowledgeDocument.findMany({
				where: eq(knowledgeDocument.sessionId, sessionId),
			});

			return {
				success: true as const,
				documents: docs.map((d) => ({
					id: d.id,
					title: d.title,
					status: d.status,
					summary: d.extractedSummary ?? null,
					chunkCount: d.chunkCount,
				})),
			};
		} catch (err) {
			return toFailure(err);
		}
	},
});
