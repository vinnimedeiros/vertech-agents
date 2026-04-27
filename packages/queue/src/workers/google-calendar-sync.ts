import { Worker } from "bullmq";
import { db, eq, oauthToken } from "@repo/database";
import { getRedisConnection } from "../config";
import { getGoogleSyncRunner } from "../google-sync-runner";
import { GOOGLE_CALENDAR_SYNC_QUEUE_NAME } from "../queues/google-calendar-sync";
import { googleCalendarSyncJobSchema } from "../schemas";

/**
 * Worker que consome a fila `google-calendar-sync`.
 *
 * Modos:
 * - **Sweep** (sem orgId/userId): query `oauth_token` provider="google",
 *   itera SEQUENCIAL chamando runner injectado pra cada. Concurrency 1
 *   pra evitar burst contra rate limit Google Calendar API (~600 req/100s
 *   por usuário, mas sweep é rápido — overshoot fácil em paralelo).
 * - **Specific** (com orgId+userId): sync único, pula iteração.
 *
 * Runner é dependency-injected via `registerGoogleSyncRunner` em
 * apps/web/instrumentation.ts (chama `runFullSync` da web). Sem ciclo
 * de dep entre packages.
 */
let workerInstance: Worker | null = null;

export function startGoogleCalendarSyncWorker(): Worker {
	if (workerInstance) {
		return workerInstance;
	}

	workerInstance = new Worker(
		GOOGLE_CALENDAR_SYNC_QUEUE_NAME,
		async (job) => {
			const payload = googleCalendarSyncJobSchema.parse(job.data);
			const runner = getGoogleSyncRunner();
			if (!runner) {
				console.warn(
					"[google-sync-worker] runner não registrado — skip job",
				);
				return { skipped: true, reason: "no_runner" };
			}

			// Modo specific: sync uma conexão e retorna
			if (payload.organizationId && payload.userId) {
				const result = await runner({
					organizationId: payload.organizationId,
					userId: payload.userId,
					force: payload.force,
				});
				return result;
			}

			// Modo sweep: itera todos tokens Google
			const tokens = await db.query.oauthToken.findMany({
				where: eq(oauthToken.provider, "google"),
				columns: { organizationId: true, userId: true },
			});

			let success = 0;
			let failed = 0;
			let totalPulled = 0;
			let totalPushed = 0;
			let totalDeleted = 0;

			for (const t of tokens) {
				try {
					const res = await runner({
						organizationId: t.organizationId,
						userId: t.userId,
					});
					if (res.ok) {
						success += 1;
						totalPulled += res.pulled;
						totalPushed += res.pushed;
						totalDeleted += res.deleted;
					} else {
						failed += 1;
						console.warn(
							`[google-sync-worker] sync ${t.organizationId}/${t.userId} ok=false: ${res.error}`,
						);
					}
				} catch (err) {
					failed += 1;
					console.error(
						`[google-sync-worker] sync ${t.organizationId}/${t.userId} threw:`,
						err instanceof Error ? err.message : err,
					);
				}
			}

			const summary = {
				totalConnections: tokens.length,
				success,
				failed,
				totalPulled,
				totalPushed,
				totalDeleted,
			};
			console.log(
				`[google-sync-worker] sweep complete: ${JSON.stringify(summary)}`,
			);
			return summary;
		},
		{
			connection: getRedisConnection(),
			// Sequencial: respeita rate limit Google Calendar API + simplifica
			// debug. Sweep de 100 tokens = ~30s sequential, OK pra polling 30min.
			concurrency: 1,
			autorun: true,
		},
	);

	workerInstance.on("completed", (job) => {
		console.log(
			`[google-sync-worker] job ${job.id} completed (${job.attemptsMade} attempt${job.attemptsMade === 1 ? "" : "s"})`,
		);
	});

	workerInstance.on("failed", (job, err) => {
		console.error(
			`[google-sync-worker] job ${job?.id} FAILED após ${job?.attemptsMade} tentativas: ${err.message}`,
		);
	});

	workerInstance.on("error", (err) => {
		const code = (err as { code?: string })?.code;
		const msg = err.message || "(sem mensagem)";
		const hint =
			code === "ECONNREFUSED"
				? " — Redis não está rodando. Abra Docker Desktop."
				: "";
		console.error(
			`[google-sync-worker] worker error: ${msg}${code ? ` [${code}]` : ""}${hint}`,
		);
	});

	return workerInstance;
}

export async function stopGoogleCalendarSyncWorker(): Promise<void> {
	if (workerInstance) {
		await workerInstance.close();
		workerInstance = null;
	}
}
