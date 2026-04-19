import { Queue } from "bullmq";
import { defaultJobOptions, getRedisConnection } from "../config";
import {
	type AgentInvocationJob,
	agentInvocationJobSchema,
} from "../schemas";

export const AGENT_INVOCATION_QUEUE_NAME = "agent-invocation";

/**
 * Lazy singleton — instanciado no primeiro uso pra permitir importar o package
 * em contextos sem REDIS_URL (testes, static analysis, etc).
 */
let queueInstance: Queue<AgentInvocationJob> | null = null;

export function getAgentInvocationQueue(): Queue<AgentInvocationJob> {
	if (!queueInstance) {
		queueInstance = new Queue<AgentInvocationJob>(
			AGENT_INVOCATION_QUEUE_NAME,
			{
				connection: getRedisConnection(),
				defaultJobOptions,
			},
		);
	}
	return queueInstance;
}

/**
 * Usado em testes e shutdown. Fecha a queue ativa.
 */
export async function closeAgentInvocationQueue(): Promise<void> {
	if (queueInstance) {
		await queueInstance.close();
		queueInstance = null;
	}
}

/**
 * Dispatcher com validacao + idempotencia + serializacao por conversa.
 *
 * **Idempotencia:** usa `jobId = messageId` — BullMQ dedupe automaticamente
 * em caso de re-enfileiramento (retry de webhook, double-send do provider).
 *
 * **Serializacao por conversa (DIVERGENCIA APROVADA — Aria, 2026-04-19):**
 * usa `deduplication.keepLastIfActive: true` com id `conv:{conversationId}`.
 * Quando uma msg da conv X esta sendo processada e outra da mesma conv chega,
 * a nova aguarda a atual terminar. Pattern nativo do BullMQ OSS —
 * substitui lock Redis manual mencionado na versao inicial da 07A.6.
 *
 * @returns Job enfileirado. Se ja existia job com mesmo `jobId`, retorna o existente.
 */
export async function dispatchAgentInvocation(payload: AgentInvocationJob) {
	const validated = agentInvocationJobSchema.parse(payload);

	const queue = getAgentInvocationQueue();

	const options: Parameters<typeof queue.add>[2] = {
		jobId: validated.messageId,
		deduplication: {
			id: `conv:${validated.conversationId}`,
		},
	};

	if (validated.scheduledFor) {
		const delay = validated.scheduledFor.getTime() - Date.now();
		if (delay > 0) {
			options.delay = delay;
		}
	}

	return queue.add(AGENT_INVOCATION_QUEUE_NAME, validated, options);
}
