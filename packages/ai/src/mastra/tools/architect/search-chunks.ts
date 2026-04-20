import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { queryKnowledge } from "../../../rag/query";
import { toFailure } from "./errors";
import {
	type ArchitectRuntimeContext,
	requireArchitectContext,
} from "./helpers";

const inputSchema = z.object({
	query: z.string().min(3),
	topK: z.number().int().min(1).max(10).default(5),
});

const outputSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		chunks: z.array(
			z.object({
				content: z.string(),
				similarity: z.number(),
				documentId: z.string(),
				documentTitle: z.string(),
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
 * Tool 5 — searchChunks (story 08A.3).
 *
 * Wrapper fino sobre `queryKnowledge` de 08A.1. Escopo sessão (RAG de
 * rascunho) — só retorna chunks do user atual via metadata.sessionId match.
 *
 * Sem hits não é erro (AC14): retorna `chunks: []` naturalmente.
 */
export const searchChunks = createTool({
	id: "search-chunks",
	description: `Busca no vector store os chunks de conhecimento mais relevantes à query.
Use quando precisar de info específica do material uploadado (ex: "qual o preço do procedimento X?").`,
	inputSchema,
	outputSchema,
	execute: async ({ context, requestContext }) => {
		try {
			const { sessionId } = requireArchitectContext(
				requestContext as ArchitectRuntimeContext | undefined,
			);

			const results = await queryKnowledge(context.query, {
				sessionId,
				topK: context.topK,
			});

			return {
				success: true as const,
				chunks: results.map((r) => ({
					content: r.content,
					similarity: r.similarity,
					documentId: r.documentId,
					documentTitle: r.documentTitle,
				})),
			};
		} catch (err) {
			return toFailure(err);
		}
	},
});
