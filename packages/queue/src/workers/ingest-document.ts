import { ingestDocument } from "@repo/ai";
import { Worker } from "bullmq";
import { getRedisConnection } from "../config";
import { INGEST_DOCUMENT_QUEUE_NAME } from "../queues/ingest-document";
import { ingestDocumentJobSchema } from "../schemas";

/**
 * Worker que consome a fila `ingest-document` (story 08A.2).
 *
 * Fluxo:
 * 1. Valida payload com Zod (aborta cedo em data ruim)
 * 2. Chama `ingestDocument(documentId)` — pipeline de 11 etapas de @repo/ai/rag
 * 3. Se retorna null: pipeline ja persistiu ERROR na row. Joga erro pra
 *    BullMQ retentar conforme `defaultJobOptions.attempts` (3 tentativas,
 *    backoff exponencial 2s/8s/32s).
 * 4. Apos 3 attempts exauridas, job vai pro DLQ (filter em telemetry) e a
 *    row permanece ERROR. Frontend ve via Supabase Realtime no UPDATE.
 *
 * Idempotencia dupla:
 * - Dispatcher usa `jobId = 'ingest-' + documentId` (AC9) — BullMQ dedupe.
 * - Pipeline retorna cedo se status ja for READY (AC10).
 *
 * Concorrencia default 5 (AC4), ajustavel via INGEST_DOCUMENT_CONCURRENCY.
 */
let workerInstance: Worker | null = null;

export function startIngestDocumentWorker(): Worker {
	if (workerInstance) {
		return workerInstance;
	}

	const concurrency = Number(process.env.INGEST_DOCUMENT_CONCURRENCY ?? "5");

	workerInstance = new Worker(
		INGEST_DOCUMENT_QUEUE_NAME,
		(job) => processIngestDocumentJob(job.data),
		{
			connection: getRedisConnection(),
			concurrency,
			autorun: true,
		},
	);

	workerInstance.on("completed", (job, returnValue) => {
		const chunkCount =
			returnValue &&
			typeof returnValue === "object" &&
			"chunkCount" in returnValue
				? (returnValue as { chunkCount: number }).chunkCount
				: "?";
		console.log(
			`[ingest-document-worker] job ${job.id} completed (${job.attemptsMade} attempt${job.attemptsMade === 1 ? "" : "s"}, ${chunkCount} chunks)`,
		);
	});

	workerInstance.on("failed", (job, err) => {
		console.error(
			`[ingest-document-worker] job ${job?.id} FAILED apos ${job?.attemptsMade} tentativas: ${err.message}`,
		);
	});

	workerInstance.on("error", (err) => {
		console.error(`[ingest-document-worker] worker error: ${err.message}`);
	});

	return workerInstance;
}

/**
 * Graceful shutdown — usado em SIGTERM handler ou testes.
 */
export async function stopIngestDocumentWorker(): Promise<void> {
	if (workerInstance) {
		await workerInstance.close();
		workerInstance = null;
	}
}

/**
 * Lógica pura do processor (sem BullMQ) — exposta pra unit tests.
 *
 * - Valida payload com Zod
 * - Chama ingestDocument da pipeline RAG
 * - Throw se retornar null (AC7: BullMQ retenta via defaultJobOptions)
 * - Return shape conforme AC6
 */
export async function processIngestDocumentJob(data: unknown): Promise<{
	success: true;
	documentId: string;
	chunkCount: number;
}> {
	const payload = ingestDocumentJobSchema.parse(data);
	const result = await ingestDocument(payload.documentId);

	if (!result) {
		throw new Error(
			`ingestDocument retornou null pra ${payload.documentId} — pipeline marcou row como ERROR`,
		);
	}

	return {
		success: true,
		documentId: result.documentId,
		chunkCount: result.chunkCount,
	};
}
