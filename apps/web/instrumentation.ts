/**
 * Next.js instrumentation hook — roda uma vez no startup do server.
 *
 * Responsabilidades:
 * 1. Registrar o OutboundSender do @repo/whatsapp no @repo/queue (dep injection
 *    pra evitar ciclo de dep entre packages). SEMPRE executa em node runtime.
 * 2. Em dev, iniciar o worker BullMQ inline no mesmo processo (simplifica
 *    `pnpm dev`). Em prod, worker roda separado via `pnpm worker:start`.
 *
 * Ver: https://nextjs.org/docs/app/guides/instrumentation
 */
export async function register() {
	// Nextjs invoca register no edge runtime tambem — nosso hook so faz
	// sentido em node (onde BullMQ e Mastra rodam).
	if (process.env.NEXT_RUNTIME !== "nodejs") return;

	// 1. Registrar OutboundSender (obrigatorio em qualquer ambiente node)
	try {
		const { registerOutboundSender } = await import("@repo/queue");
		const whatsapp = await import("@repo/whatsapp");

		registerOutboundSender(async (info) => {
			if (info.channel !== "WHATSAPP") {
				console.warn(
					`[instrumentation] canal ${info.channel} sem sender — ignorando`,
				);
				return;
			}
			if (!info.channelInstanceId || !info.phone) {
				throw new Error(
					"WhatsApp channel requer channelInstanceId e phone",
				);
			}
			await whatsapp.sendText(
				info.channelInstanceId,
				info.phone,
				info.text,
			);
		});

		console.log("[instrumentation] OutboundSender (WhatsApp) registrado");
	} catch (err) {
		console.error(
			"[instrumentation] falha ao registrar OutboundSender:",
			err instanceof Error ? err.message : err,
		);
	}

	// 1.5. Registrar GoogleSyncRunner (D.3 Wave B)
	// Injeta `runFullSync` da web no @repo/queue pra worker poder chamar
	// sem ciclo de dep (apps/web → packages/queue → apps/web).
	try {
		const { registerGoogleSyncRunner } = await import("@repo/queue");
		const { runFullSync } = await import(
			"@saas/integrations/google/lib/calendar-sync"
		);
		registerGoogleSyncRunner(async ({ organizationId, userId, force }) => {
			const result = await runFullSync(organizationId, userId, { force });
			return {
				ok: result.ok,
				pulled: result.pulled,
				pushed: result.pushed,
				deleted: result.deleted,
				error: result.error,
			};
		});
		console.log("[instrumentation] GoogleSyncRunner registrado");
	} catch (err) {
		console.error(
			"[instrumentation] falha ao registrar GoogleSyncRunner:",
			err instanceof Error ? err.message : err,
		);
	}

	// 2. Iniciar worker inline somente em dev
	const shouldStartInline =
		process.env.NODE_ENV === "development" ||
		process.env.WORKER_MODE === "inline";

	if (!shouldStartInline) {
		return;
	}

	try {
		const {
			startAgentInvocationWorker,
			startIngestDocumentWorker,
			startGoogleCalendarSyncWorker,
			scheduleGoogleCalendarSyncRepeatable,
		} = await import("@repo/queue");
		startAgentInvocationWorker();
		startIngestDocumentWorker();
		startGoogleCalendarSyncWorker();
		// Agenda o sweep repeatable. Idempotente — BullMQ dedupe via jobId.
		await scheduleGoogleCalendarSyncRepeatable().catch((err) => {
			console.error(
				"[instrumentation] falha ao agendar google sync repeatable:",
				err instanceof Error ? err.message : err,
			);
		});
		console.log(
			"[instrumentation] agent-invocation + ingest-document + google-calendar-sync workers iniciados inline (dev mode)",
		);
	} catch (err) {
		console.error(
			"[instrumentation] falha ao iniciar workers inline:",
			err instanceof Error ? err.message : err,
		);
	}
}
