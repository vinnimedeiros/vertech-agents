/**
 * Contrato uniforme consumido por endpoints `/api/admin/health/{componente}`
 * e pelo Health Tech Dashboard (Phase 10c).
 *
 * Cada componente (queue, mastra, redis, database, llm-providers, etc)
 * retorna um `HealthCheckResult`. O Dashboard e um dumb consumer.
 */

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type HealthAlert = {
	severity: "warning" | "critical";
	message: string;
	/** ISO timestamp de quando o alerta comecou (opcional). */
	since?: string;
};

export type HealthCheckResult = {
	component: string;
	status: HealthStatus;
	/**
	 * Metricas arbitrarias do componente. Chaves em camelCase.
	 * Valores numericos ou strings curtas (nao expor credenciais aqui).
	 */
	metrics: Record<string, number | string>;
	alerts: HealthAlert[];
	/** ISO timestamp de quando o check foi executado. */
	timestamp: string;
	/**
	 * Opcional: componentes filhos agregados sob este check composto.
	 * Usado por endpoints que cobrem N entidades do mesmo tipo (ex: N queues,
	 * N LLM providers). O `status` do pai e a agregacao dos filhos.
	 */
	subchecks?: HealthCheckResult[];
};
