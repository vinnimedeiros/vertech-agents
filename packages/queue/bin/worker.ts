/**
 * Entrypoint do worker standalone. Usar em prod (Coolify) com:
 *
 *   pnpm worker:start
 *
 * Em dev, os workers sao iniciados inline via apps/web/instrumentation.ts
 * (nao precisa rodar este script separado em dev).
 */
import { closeRedisConnection } from "../src/config";
import {
	startAgentInvocationWorker,
	stopAgentInvocationWorker,
} from "../src/workers/agent-invocation";
import {
	startIngestDocumentWorker,
	stopIngestDocumentWorker,
} from "../src/workers/ingest-document";

async function main() {
	console.log("[worker] starting agent-invocation worker...");
	startAgentInvocationWorker();
	console.log("[worker] starting ingest-document worker...");
	startIngestDocumentWorker();
	console.log("[worker] ready — aguardando jobs");

	// Graceful shutdown: finaliza jobs ativos de ambos os workers antes de
	// desconectar Redis (story 08A.2 AC16).
	const shutdown = async (signal: string) => {
		console.log(`[worker] ${signal} recebido, encerrando...`);
		await Promise.all([
			stopAgentInvocationWorker(),
			stopIngestDocumentWorker(),
		]);
		await closeRedisConnection();
		console.log("[worker] encerrado");
		process.exit(0);
	};

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
	console.error("[worker] fatal error:", err);
	process.exit(1);
});
