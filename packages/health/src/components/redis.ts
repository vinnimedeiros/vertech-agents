import { getRedisConnection } from "@repo/queue";
import type { HealthCheckResult } from "../contract";
import { defineHealthCheck } from "../helpers";

/**
 * Health check do Redis reusando a conexao singleton de @repo/queue.
 *
 * Coleta: PING latency, memory usage, connected clients, commands/sec, dbsize.
 * Status: healthy se tudo OK; unhealthy se PING falha ou memory > 90%.
 */
export const checkRedis = defineHealthCheck(
	"redis",
	async (): Promise<Omit<HealthCheckResult, "timestamp" | "component">> => {
		const conn = getRedisConnection();

		const startMs = Date.now();
		const pong = await conn.ping();
		const pingLatencyMs = Date.now() - startMs;

		if (pong !== "PONG") {
			return {
				status: "unhealthy",
				metrics: { pingLatencyMs },
				alerts: [
					{
						severity: "critical",
						message: `Redis PING retornou "${pong}" em vez de PONG`,
					},
				],
			};
		}

		const [memoryInfo, clientsInfo, statsInfo, dbSize] = await Promise.all([
			conn.info("memory"),
			conn.info("clients"),
			conn.info("stats"),
			conn.dbsize(),
		]);

		const usedMemoryBytes = parseInfoValue(memoryInfo, "used_memory");
		const maxMemoryBytes = parseInfoValue(memoryInfo, "maxmemory");
		const connectedClients = parseInfoValue(clientsInfo, "connected_clients");
		const opsPerSecond = parseInfoValue(
			statsInfo,
			"instantaneous_ops_per_sec",
		);

		const memoryUsedMb = Math.round((usedMemoryBytes / (1024 * 1024)) * 100) / 100;
		const maxMemoryMb =
			maxMemoryBytes > 0
				? Math.round((maxMemoryBytes / (1024 * 1024)) * 100) / 100
				: 0;

		const memoryPct =
			maxMemoryBytes > 0 ? (usedMemoryBytes / maxMemoryBytes) * 100 : 0;

		const alerts: HealthCheckResult["alerts"] = [];
		let status: HealthCheckResult["status"] = "healthy";

		if (memoryPct > 90) {
			status = "unhealthy";
			alerts.push({
				severity: "critical",
				message: `Redis memoria em ${memoryPct.toFixed(1)}% (${memoryUsedMb}MB/${maxMemoryMb}MB)`,
			});
		} else if (memoryPct > 75) {
			status = "degraded";
			alerts.push({
				severity: "warning",
				message: `Redis memoria em ${memoryPct.toFixed(1)}% (${memoryUsedMb}MB/${maxMemoryMb}MB)`,
			});
		}

		if (pingLatencyMs > 100) {
			status = status === "unhealthy" ? status : "degraded";
			alerts.push({
				severity: "warning",
				message: `Redis PING latency alta: ${pingLatencyMs}ms`,
			});
		}

		return {
			status,
			metrics: {
				pingLatencyMs,
				memoryUsedMb,
				maxMemoryMb,
				memoryUsedPct: Math.round(memoryPct * 100) / 100,
				connectedClients,
				commandsPerSecond: opsPerSecond,
				dbSize,
			},
			alerts,
		};
	},
);

function parseInfoValue(info: string, key: string): number {
	const match = info.match(new RegExp(`^${key}:(.*)$`, "m"));
	if (!match) return 0;
	const value = Number(match[1]);
	return Number.isFinite(value) ? value : 0;
}
