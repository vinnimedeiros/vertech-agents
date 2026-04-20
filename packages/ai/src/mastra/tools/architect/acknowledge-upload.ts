import { createTool } from "@mastra/core/tools";
import { and, db, eq, knowledgeDocument } from "@repo/database";
import { z } from "zod";
import { ArchitectToolError, toFailure } from "./errors";
import {
	type ArchitectRuntimeContext,
	requireArchitectContext,
} from "./helpers";

const inputSchema = z.object({
	documentId: z.string().min(1),
	brief_acknowledgment: z
		.string()
		.max(120)
		.describe(
			'Mensagem curta natural pro usuário, ex: "Recebi o catálogo, vou processar aqui"',
		),
});

const outputSchema = z.discriminatedUnion("success", [
	z.object({
		success: z.literal(true),
		document: z.object({
			id: z.string(),
			fileName: z.string(),
			status: z.enum(["PENDING", "PROCESSING", "READY", "ERROR"]),
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
 * Tool 1 — acknowledgeUpload (story 08A.3).
 *
 * Valida que o documentId pertence à sessão ativa do runtimeContext e retorna
 * o shape esperado pelo Arquiteto exibir inline no chat ("Recebi o catálogo,
 * vou processar aqui"). Não dispara ingest — esse já foi disparado pelo
 * upload endpoint (08A.4) que enqueua job na queue ingest-document (08A.2).
 */
export const acknowledgeUpload = createTool({
	id: "acknowledge-upload",
	description: `Reconhece que um documento foi uploadado pelo usuário e está sendo processado.
Use quando um novo documento aparecer em workingMemory.uploadedDocuments.
NÃO use se o documento já foi reconhecido antes.`,
	inputSchema,
	outputSchema,
	execute: async ({ context, requestContext }) => {
		try {
			const { sessionId } = requireArchitectContext(
				requestContext as ArchitectRuntimeContext | undefined,
			);

			const doc = await db.query.knowledgeDocument.findFirst({
				where: and(
					eq(knowledgeDocument.id, context.documentId),
					eq(knowledgeDocument.sessionId, sessionId),
				),
			});

			if (!doc) {
				throw new ArchitectToolError(
					"DOCUMENT_NOT_FOUND",
					`Documento ${context.documentId} não pertence à sessão ${sessionId}.`,
				);
			}

			return {
				success: true as const,
				document: {
					id: doc.id,
					fileName: doc.title,
					status: doc.status,
				},
			};
		} catch (err) {
			return toFailure(err);
		}
	},
});
