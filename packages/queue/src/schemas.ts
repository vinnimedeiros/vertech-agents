import { z } from "zod";

/**
 * Payload do job de invocacao do agente Mastra.
 *
 * O worker usa `messageId` pra buscar a mensagem inbound no banco e decidir
 * o que fazer (guards: ja SENT aborta silenciosamente, agent nao ACTIVE aborta).
 * `conversationId` e usado pra serializar jobs da mesma conversa via
 * `deduplication.id = conv:${conversationId}`.
 */
export const agentInvocationJobSchema = z.object({
	messageId: z.string().min(1),
	conversationId: z.string().min(1),
	organizationId: z.string().min(1),
	/**
	 * Opcional: pra follow-ups agendados (Phase 08). Se omitido, executa ASAP.
	 */
	scheduledFor: z.coerce.date().optional(),
});

export type AgentInvocationJob = z.infer<typeof agentInvocationJobSchema>;

/**
 * Payload do job de ingest de documento (Phase 08-alpha, story 08A.2).
 *
 * Minimalista: o worker usa `documentId` pra carregar a row completa de
 * `knowledge_documents` e delegar pra pipeline `ingestDocument()` de @repo/ai.
 * Tudo que o pipeline precisa (orgId, fileUrl, fileType, sessionId/agentId)
 * ja esta persistido na row — o job so carrega a referencia.
 *
 * Idempotencia: dispatcher usa `jobId = 'ingest-' + documentId`, BullMQ dedupe
 * re-enfileiramentos. A propria pipeline tambem e idempotente (status READY
 * retorna cedo).
 */
export const ingestDocumentJobSchema = z.object({
	documentId: z.string().min(1),
});

export type IngestDocumentJob = z.infer<typeof ingestDocumentJobSchema>;
