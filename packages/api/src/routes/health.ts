import { db, sql } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";

export const healthRouter = new Hono().get(
	"/health",
	describeRoute({
		tags: ["Health"],
		summary: "Health check",
		description:
			"Returns 200 if the app + database are healthy. Used by Coolify liveness probe.",
		responses: {
			200: { description: "OK" },
			503: { description: "Database unreachable" },
		},
	}),
	async (c) => {
		const startedAt = Date.now();
		let dbStatus: "ok" | "error" = "ok";
		let dbLatencyMs = 0;

		try {
			const t0 = Date.now();
			await db.execute(sql`SELECT 1`);
			dbLatencyMs = Date.now() - t0;
		} catch {
			dbStatus = "error";
		}

		const payload = {
			status: dbStatus === "ok" ? "healthy" : "unhealthy",
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			responseTimeMs: Date.now() - startedAt,
			checks: {
				database: {
					status: dbStatus,
					latencyMs: dbLatencyMs,
				},
			},
			version: process.env.npm_package_version ?? "0.0.0",
			environment: process.env.NODE_ENV ?? "development",
		};

		return c.json(payload, dbStatus === "ok" ? 200 : 503);
	},
);
