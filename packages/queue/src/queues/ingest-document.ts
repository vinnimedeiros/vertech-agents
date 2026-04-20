import { Queue } from "bullmq";
import { defaultJobOptions, getRedisConnection } from "../config";
import { type IngestDocumentJob, ingestDocumentJobSchema } from "../schemas";

export const INGEST_DOCUMENT_QUEUE_NAME = "ingest-document";

/**
 * Lazy singleton — instanciado no primeiro uso pra permitir importar o package
 * em contextos sem REDIS_URL (testes, static analysis, etc).
 */
let queueInstance: Queue<IngestDocumentJob> | null = null;

export function getIngestDocumentQueue(): Queue<IngestDocumentJob> {
	if (!queueInstance) {
		queueInstance = new Queue<IngestDocumentJob>(
			INGEST_DOCUMENT_QUEUE_NAME,
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
export async function closeIngestDocumentQueue(): Promise<void> {
	if (queueInstance) {
		await queueInstance.close();
		queueInstance = null;
	}
}

/**
 * Dispatcher com validacao + idempotencia determinstica.
 *
 * **Idempotencia (story 08A.2 AC9):** usa `jobId = 'ingest-' + documentId` —
 * BullMQ dedupe automaticamente reenfileiramentos do mesmo documentId (util
 * em caso de retry do upload endpoint, double-click do usuario, etc).
 * Se ja existir job com esse id, BullMQ retorna o existente sem criar novo.
 *
 * Nao serializa por nada: documentos diferentes podem processar em paralelo
 * (concorrencia 5 no worker). Idempotencia da pipeline (status READY -> early
 * return) protege contra duplicata logica.
 *
 * @returns Job enfileirado ou pre-existente.
 */
export async function dispatchIngestDocument(payload: IngestDocumentJob) {
	const validated = ingestDocumentJobSchema.parse(payload);

	const queue = getIngestDocumentQueue();

	return queue.add(INGEST_DOCUMENT_QUEUE_NAME, validated, {
		jobId: `ingest-${validated.documentId}`,
	});
}
