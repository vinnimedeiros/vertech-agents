import { describe, expect, it } from "vitest";
import {
	aggregateStatus,
	defineHealthCheck,
	formatMetrics,
	type HealthStatus,
} from "../index";

describe("@repo/health", () => {
	describe("defineHealthCheck", () => {
		it("preenche component e timestamp automaticamente", async () => {
			const check = defineHealthCheck("test", async () => ({
				status: "healthy",
				metrics: { foo: 1 },
				alerts: [],
			}));
			const result = await check();
			expect(result.component).toBe("test");
			expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(result.status).toBe("healthy");
		});

		it("captura exceptions e retorna unhealthy com alert critical", async () => {
			const check = defineHealthCheck("broken", async () => {
				throw new Error("boom");
			});
			const result = await check();
			expect(result.status).toBe("unhealthy");
			expect(result.alerts[0]?.severity).toBe("critical");
			expect(result.alerts[0]?.message).toContain("boom");
		});
	});

	describe("aggregateStatus", () => {
		it("retorna healthy quando todos sao healthy", () => {
			const result = aggregateStatus(["healthy", "healthy"] as HealthStatus[]);
			expect(result).toBe("healthy");
		});

		it("retorna degraded quando algum esta degraded e nenhum unhealthy", () => {
			const result = aggregateStatus([
				"healthy",
				"degraded",
				"healthy",
			] as HealthStatus[]);
			expect(result).toBe("degraded");
		});

		it("retorna unhealthy quando qualquer um esta unhealthy", () => {
			const result = aggregateStatus([
				"healthy",
				"degraded",
				"unhealthy",
			] as HealthStatus[]);
			expect(result).toBe("unhealthy");
		});
	});

	describe("formatMetrics", () => {
		it("arredonda numeros pra 2 casas decimais", () => {
			const result = formatMetrics({ latency: 12.34567 });
			expect(result.latency).toBe(12.35);
		});

		it("preserva inteiros", () => {
			const result = formatMetrics({ count: 42 });
			expect(result.count).toBe(42);
		});

		it("converte booleans em strings 'true'/'false'", () => {
			const result = formatMetrics({ connected: true });
			expect(result.connected).toBe("true");
		});

		it("trunca strings longas em 200 chars", () => {
			const long = "x".repeat(500);
			const result = formatMetrics({ msg: long });
			expect((result.msg as string).length).toBe(200);
		});
	});
});
