import { Pool, type PoolClient } from "pg";
import type { HealthCheckResult } from "../contract";
import { defineHealthCheck } from "../helpers";

/**
 * Pool compartilhado apenas pra health checks (conexao leve, timeout curto).
 * Nao reusar o pool do Drizzle pra nao poluir o pool de producao.
 */
let cachedPool: Pool | null = null;

function getHealthPool(): Pool {
	if (!cachedPool) {
		const url = process.env.DATABASE_URL;
		if (!url) {
			throw new Error("DATABASE_URL nao configurada");
		}
		cachedPool = new Pool({
			connectionString: url,
			max: 2,
			idleTimeoutMillis: 10_000,
			connectionTimeoutMillis: 5_000,
		});
	}
	return cachedPool;
}

/**
 * Usado em testes e shutdown. Fecha pool ativo.
 */
export async function closeHealthPool(): Promise<void> {
	if (cachedPool) {
		await cachedPool.end();
		cachedPool = null;
	}
}

/**
 * Health check do Postgres: SELECT 1 + contagem de conexoes ativas.
 * Status: healthy se latency < 100ms; degraded 100-500ms; unhealthy se erro/timeout.
 */
export const checkDatabase = defineHealthCheck(
	"database",
	async (): Promise<Omit<HealthCheckResult, "timestamp" | "component">> => {
		const pool = getHealthPool();
		let client: PoolClient | null = null;
		try {
			client = await pool.connect();

			const startMs = Date.now();
			await client.query("SELECT 1");
			const latencyMs = Date.now() - startMs;

			const activeConnectionsResult = await client.query<{ count: string }>(
				"SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active' AND datname = current_database()",
			);
			const activeConnections = Number(
				activeConnectionsResult.rows[0]?.count ?? 0,
			);

			const alerts: HealthCheckResult["alerts"] = [];
			let status: HealthCheckResult["status"] = "healthy";

			if (latencyMs > 500) {
				status = "unhealthy";
				alerts.push({
					severity: "critical",
					message: `Database latency muito alta: ${latencyMs}ms (SELECT 1)`,
				});
			} else if (latencyMs > 100) {
				status = "degraded";
				alerts.push({
					severity: "warning",
					message: `Database latency elevada: ${latencyMs}ms (SELECT 1)`,
				});
			}

			return {
				status,
				metrics: {
					selectOneLatencyMs: latencyMs,
					activeConnections,
					poolSize: pool.totalCount,
					poolIdle: pool.idleCount,
					poolWaiting: pool.waitingCount,
				},
				alerts,
			};
		} finally {
			client?.release();
		}
	},
);
