import type { HealthCheckResult, HealthStatus } from "./contract";

/**
 * Wrapper padrao pra definir um health check.
 *
 * Preenche `component` e `timestamp` automaticamente.
 * Exceptions do checker viram `unhealthy` com alert critical — nunca propagam.
 *
 * @param component - nome do componente (queue, redis, database, ...)
 * @param checker - funcao que retorna shape sem timestamp/component
 */
export function defineHealthCheck(
	component: string,
	checker: () => Promise<Omit<HealthCheckResult, "timestamp" | "component">>,
): () => Promise<HealthCheckResult> {
	return async () => {
		const timestamp = new Date().toISOString();
		try {
			const partial = await checker();
			return { component, timestamp, ...partial };
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				component,
				status: "unhealthy",
				metrics: {},
				alerts: [
					{
						severity: "critical",
						message: `Health check falhou: ${message}`,
					},
				],
				timestamp,
			};
		}
	};
}

/**
 * Agrega varios status em um "pior". Se qualquer componente estiver unhealthy,
 * o resultado e unhealthy. Se algum degraded, degraded. Senao healthy.
 */
export function aggregateStatus(statuses: HealthStatus[]): HealthStatus {
	if (statuses.some((s) => s === "unhealthy")) return "unhealthy";
	if (statuses.some((s) => s === "degraded")) return "degraded";
	return "healthy";
}

/**
 * Formata numero/string para exibicao em metricas.
 * Arredonda numeros pra 2 casas decimais, sanitiza strings.
 */
export function formatMetrics(
	raw: Record<string, unknown>,
): Record<string, number | string> {
	const out: Record<string, number | string> = {};
	for (const [key, value] of Object.entries(raw)) {
		if (typeof value === "number") {
			out[key] = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
		} else if (typeof value === "boolean") {
			out[key] = value ? "true" : "false";
		} else if (value === null || value === undefined) {
			out[key] = "null";
		} else {
			out[key] = String(value).slice(0, 200);
		}
	}
	return out;
}
