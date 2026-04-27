import {
	agentArtifact,
	agentCreationSession,
	and,
	count,
	db,
	eq,
	gte,
} from "@repo/database";
import type { HealthAlert } from "@repo/health";
import { defineHealthCheck, formatMetrics } from "@repo/health";
import { NextResponse } from "next/server";
import { requireSuperadmin } from "@saas/auth/lib/superadmin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check do Arquiteto (Phase 09).
 *
 * Fix PRD-10 do Smith verify (2026-04-21) — atende regra MUST
 * `feedback_health_tech_dashboard.md`: cada phase instrumenta seu
 * componente pra o Superadmin Health Tech Dashboard.
 *
 * Métricas:
 * - Sessions DRAFT em aberto (snapshot atual)
 * - Sessions ABANDONED últimas 24h
 * - Sessions PUBLISHED últimas 24h
 * - Artefatos gerados últimas 24h por tipo/status
 * - Taxa aprovação (PUBLISHED / PUBLISHED+ABANDONED touched nas últimas 24h)
 *
 * Alerts:
 * - critical se taxa de publicação < 10% (muitos rascunhos abandonados)
 * - warning se sessions DRAFT > 500 (backlog de órfãos)
 */
const check = defineHealthCheck("architect", async () => {
	const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const [draftRows, abandonedRows, publishedRows, artifactRows] =
		await Promise.all([
			db
				.select({ total: count() })
				.from(agentCreationSession)
				.where(eq(agentCreationSession.status, "DRAFT")),
			db
				.select({ total: count() })
				.from(agentCreationSession)
				.where(
					and(
						eq(agentCreationSession.status, "ABANDONED"),
						gte(agentCreationSession.updatedAt, last24h),
					),
				),
			db
				.select({ total: count() })
				.from(agentCreationSession)
				.where(
					and(
						eq(agentCreationSession.status, "PUBLISHED"),
						gte(agentCreationSession.updatedAt, last24h),
					),
				),
			db
				.select({
					type: agentArtifact.type,
					status: agentArtifact.status,
					total: count(),
				})
				.from(agentArtifact)
				.where(gte(agentArtifact.createdAt, last24h))
				.groupBy(agentArtifact.type, agentArtifact.status),
		]);

	const draftCount = Number(draftRows[0]?.total ?? 0);
	const abandonedCount = Number(abandonedRows[0]?.total ?? 0);
	const publishedCount = Number(publishedRows[0]?.total ?? 0);

	const totalSessionsTouched24h = abandonedCount + publishedCount;
	const publishRate =
		totalSessionsTouched24h > 0
			? publishedCount / totalSessionsTouched24h
			: null;

	const alerts: HealthAlert[] = [];
	let status: "healthy" | "degraded" | "unhealthy" = "healthy";

	if (publishRate !== null && publishRate < 0.1) {
		status = "degraded";
		alerts.push({
			severity: "critical",
			message: `Taxa de publicação baixa: ${(publishRate * 100).toFixed(1)}% (${publishedCount}/${totalSessionsTouched24h} nas últimas 24h).`,
		});
	}
	if (draftCount > 500) {
		if (status === "healthy") status = "degraded";
		alerts.push({
			severity: "warning",
			message: `Backlog de DRAFT alto: ${draftCount} sessions em aberto.`,
		});
	}

	const artifactMetrics: Record<string, number> = {};
	for (const row of artifactRows) {
		artifactMetrics[`artifact_${row.type}_${row.status}_24h`] = Number(
			row.total,
		);
	}

	return {
		status,
		metrics: formatMetrics({
			sessions_draft_open: draftCount,
			sessions_abandoned_24h: abandonedCount,
			sessions_published_24h: publishedCount,
			publish_rate_24h:
				publishRate !== null ? Number(publishRate.toFixed(3)) : 0,
			...artifactMetrics,
		}),
		alerts,
	};
});

export async function GET() {
	const denied = await requireSuperadmin();
	if (denied) return denied;
	const result = await check();
	return NextResponse.json(result);
}
