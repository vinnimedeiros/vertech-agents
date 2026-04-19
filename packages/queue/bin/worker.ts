/**
 * Entrypoint do worker standalone. Usar em prod (Coolify) com:
 *
 *   pnpm worker:start
 *
 * Em dev, o worker e iniciado inline via apps/web/instrumentation.ts
 * (nao precisa rodar este script separado em dev).
 */
import {
	startAgentInvocationWorker,
	stopAgentInvocationWorker,
} from "../src/workers/agent-invocation";
import { closeRedisConnection } from "../src/config";

async function main() {
	console.log("[worker] starting agent-invocation worker...");
	startAgentInvocationWorker();
	console.log("[worker] ready — aguardando jobs");

	// Graceful shutdown
	const shutdown = async (signal: string) => {
		console.log(`[worker] ${signal} recebido, encerrando...`);
		await stopAgentInvocationWorker();
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
