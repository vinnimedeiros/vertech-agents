import type { Queue } from "bullmq";

/**
 * Metricas exportadas pra packages/health/src/components/queue.ts
 * (criado na story 07A.7).
 *
 * - `waiting` — jobs aguardando processamento
 * - `active` — jobs sendo processados agora
 * - `completedLastHour` — jobs com `finishedOn` na ultima hora
 * - `failedLastHour` — jobs com `failedReason` na ultima hora
 * - `dlqCount` — jobs que exauriram retry (attempts esgotadas)
 * - `oldestWaitingAgeSeconds` — idade do job mais antigo na fila (sinal de travamento)
 */
export type QueueMetrics = {
	waiting: number;
	active: number;
	completedLastHour: number;
	failedLastHour: number;
	dlqCount: number;
	oldestWaitingAgeSeconds: number;
};

export async function getQueueMetrics(queue: Queue): Promise<QueueMetrics> {
	const oneHourAgoMs = Date.now() - 60 * 60 * 1000;

	const [waiting, active, completedJobs, failedJobs] = await Promise.all([
		queue.getWaitingCount(),
		queue.getActiveCount(),
		queue.getJobs(["completed"], 0, 999),
		queue.getJobs(["failed"], 0, 999),
	]);

	const completedLastHour = completedJobs.filter(
		(job) => (job.finishedOn ?? 0) >= oneHourAgoMs,
	).length;

	const failedLastHour = failedJobs.filter(
		(job) => (job.finishedOn ?? 0) >= oneHourAgoMs,
	).length;

	// DLQ no BullMQ OSS = jobs que falharam e ja esgotaram attempts
	// (attemptsMade >= opts.attempts).
	const dlqCount = failedJobs.filter(
		(job) => job.attemptsMade >= (job.opts.attempts ?? 1),
	).length;

	const oldestWaitingJob = await queue
		.getJobs(["waiting"], 0, 0)
		.then((list) => list[0]);

	const oldestWaitingAgeSeconds = oldestWaitingJob
		? Math.floor((Date.now() - oldestWaitingJob.timestamp) / 1000)
		: 0;

	return {
		waiting,
		active,
		completedLastHour,
		failedLastHour,
		dlqCount,
		oldestWaitingAgeSeconds,
	};
}
