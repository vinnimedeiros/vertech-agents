import { z } from "zod";

/**
 * Schemas Zod dos formulários de refinamento inline (story 09.7).
 *
 * Payload direto pro server action que atualiza `agent_artifact.content`
 * sem passar pelo LLM — refinamento inline é edição estrutural direta,
 * não instrução natural (essa continua via chat + tool refineArtifact).
 */

export const businessProfileRefineSchema = z.object({
	businessName: z.string().min(1, "Obrigatório").max(80),
	summary: z.string().min(1, "Obrigatório").max(400),
	offering: z.array(z.string().min(1).max(120)).max(20),
	targetAudience: z.string().min(1, "Obrigatório").max(200),
	goalForAgent: z.string().min(1, "Obrigatório").max(300),
	differentiator: z.string().max(300).optional(),
});

export const knowledgeBaseRefineSchema = z.object({
	additionalNotes: z.string().max(1000).optional(),
	removedDocumentIds: z.array(z.string()).default([]),
});

export type BusinessProfileRefineInput = z.infer<
	typeof businessProfileRefineSchema
>;
export type KnowledgeBaseRefineInput = z.infer<
	typeof knowledgeBaseRefineSchema
>;
