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
