import { Queue } from "bullmq";
import { defaultJobOptions, getRedisConnection } from "../config";
import {
	type GoogleCalendarSyncJob,
	googleCalendarSyncJobSchema,
} from "../schemas";

export const GOOGLE_CALENDAR_SYNC_QUEUE_NAME = "google-calendar-sync";

const REPEATABLE_JOB_ID = "google-sweep";

/**
 * Intervalo do sweep automático. Default 30min — balanço entre frescor de
 * dados e respeito a quotas Google Calendar API. Override via env.
 */
const SWEEP_INTERVAL_MS = Number(
	process.env.GOOGLE_SYNC_INTERVAL_MS ?? 30 * 60 * 1000,
);

let queueInstance: Queue<GoogleCalendarSyncJob> | null = null;

export function getGoogleCalendarSyncQueue(): Queue<GoogleCalendarSyncJob> {
	if (!queueInstance) {
		queueInstance = new Queue<GoogleCalendarSyncJob>(
			GOOGLE_CALENDAR_SYNC_QUEUE_NAME,
			{
				connection: getRedisConnection(),
				defaultJobOptions,
			},
		);
	}
	return queueInstance;
}

/**
 * Dispatch one-shot — sync de uma conexão específica via worker.
 * Idempotente: jobId = `sync:{orgId}:{userId}` evita duplicatas.
 *
 * Sem args = job de sweep manual (worker itera todos os tokens).
 */
export async function dispatchGoogleCalendarSync(
	payload: GoogleCalendarSyncJob = {},
) {
	const validated = googleCalendarSyncJobSchema.parse(payload);
	const queue = getGoogleCalendarSyncQueue();
	const options: Parameters<typeof queue.add>[2] = {};
	if (validated.organizationId && validated.userId) {
		options.jobId = `sync:${validated.organizationId}:${validated.userId}`;
	}
	return queue.add(GOOGLE_CALENDAR_SYNC_QUEUE_NAME, validated, options);
}

/**
 * Registra o repeatable sweep — chamado UMA vez no boot da app.
 * BullMQ dedupe via `jobId` fixo, ré-execuções deste fn são no-op.
 */
export async function scheduleGoogleCalendarSyncRepeatable(): Promise<void> {
	const queue = getGoogleCalendarSyncQueue();
	await queue.add(
		GOOGLE_CALENDAR_SYNC_QUEUE_NAME,
		{},
		{
			repeat: { every: SWEEP_INTERVAL_MS },
			jobId: REPEATABLE_JOB_ID,
		},
	);
}

export async function closeGoogleCalendarSyncQueue(): Promise<void> {
	if (queueInstance) {
		await queueInstance.close();
		queueInstance = null;
	}
}
