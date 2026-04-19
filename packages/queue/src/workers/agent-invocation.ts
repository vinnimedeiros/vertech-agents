import { Worker } from "bullmq";
import { invokeAgentForMessage, type InvokeAgentResult } from "@repo/ai";
import {
	db,
	eq,
	message as messageTable,
} from "@repo/database";
import { getRedisConnection } from "../config";
import { getOutboundSender } from "../outbound-sender";
import { AGENT_INVOCATION_QUEUE_NAME } from "../queues/agent-invocation";
import { agentInvocationJobSchema } from "../schemas";

/**
 * Worker que consome a fila `agent-invocation`.
 *
 * Fluxo:
 * 1. Invoca invoker do @repo/ai (gera resposta + persiste outbound PENDING)
 * 2. Se retornou info de envio: usa o `OutboundSender` registrado via
 *    registerOutboundSender() pra enviar externo (WhatsApp, etc)
 * 3. Se envio falhar: marca outbound FAILED + registra erro em metadata
 *
 * `OutboundSender` e dependency-injected pra evitar ciclo de dep com
 * @repo/whatsapp. Registrado em apps/web/instrumentation.ts no boot.
 *
 * - Concurrency default 5 (ajustavel via AGENT_INVOCATION_CONCURRENCY)
 * - Retry policy vem do job (defaultJobOptions)
 * - Serializacao por conversa via deduplication.id (aplicada no enqueue)
 */
let workerInstance: Worker | null = null;

export function startAgentInvocationWorker(): Worker {
	if (workerInstance) {
		return workerInstance;
	}

	const concurrency = Number(
		process.env.AGENT_INVOCATION_CONCURRENCY ?? "5",
	);

	workerInstance = new Worker(
		AGENT_INVOCATION_QUEUE_NAME,
		async (job) => {
			const payload = agentInvocationJobSchema.parse(job.data);
			const result = await invokeAgentForMessage({
				messageId: payload.messageId,
			});
			await handleSendIfApplicable(result);
		},
		{
			connection: getRedisConnection(),
			concurrency,
			autorun: true,
		},
	);

	workerInstance.on("completed", (job) => {
		console.log(
			`[agent-invocation-worker] job ${job.id} completed (${job.attemptsMade} attempt${job.attemptsMade === 1 ? "" : "s"})`,
		);
	});

	workerInstance.on("failed", (job, err) => {
		console.error(
			`[agent-invocation-worker] job ${job?.id} FAILED apos ${job?.attemptsMade} tentativas: ${err.message}`,
		);
	});

	workerInstance.on("error", (err) => {
		console.error(`[agent-invocation-worker] worker error: ${err.message}`);
	});

	return workerInstance;
}

/**
 * Graceful shutdown — usado em SIGTERM handler ou testes.
 */
export async function stopAgentInvocationWorker(): Promise<void> {
	if (workerInstance) {
		await workerInstance.close();
		workerInstance = null;
	}
}

/**
 * Usa o OutboundSender registrado pra enviar externo se aplicavel.
 * Se nenhum sender registrado, marca como SENT mesmo assim (modo interno —
 * util em testes e canais que nao precisam de envio externo).
 */
async function handleSendIfApplicable(
	result: InvokeAgentResult,
): Promise<void> {
	if (!result) return;

	const sender = getOutboundSender();

	if (!sender) {
		// Sem sender registrado — provavelmente contexto de teste ou boot
		// incompleto. Marca SENT pra nao deixar mensagem em PENDING.
		console.warn(
			"[agent-invocation-worker] Nenhum OutboundSender registrado — marcando outbound SENT sem envio externo",
		);
		await db
			.update(messageTable)
			.set({ status: "SENT" })
			.where(eq(messageTable.id, result.outboundMessageId));
		return;
	}

	try {
		await sender({
			channel: result.channel,
			channelInstanceId: result.channelInstanceId,
			phone: result.phone,
			text: result.text,
		});
		await db
			.update(messageTable)
			.set({ status: "SENT" })
			.where(eq(messageTable.id, result.outboundMessageId));
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : String(err);
		await db
			.update(messageTable)
			.set({
				status: "FAILED",
				metadata: { error: errorMsg },
			})
			.where(eq(messageTable.id, result.outboundMessageId));
	}
}
