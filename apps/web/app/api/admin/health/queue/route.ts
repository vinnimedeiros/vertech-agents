import type { HealthAlert, HealthCheckResult } from "@repo/health";
import {
	aggregateStatus,
	defineHealthCheck,
	formatMetrics,
} from "@repo/health";
import {
	type Queue,
	getAgentInvocationQueue,
	getIngestDocumentQueue,
	getQueueMetrics,
} from "@repo/queue";
import { requireSuperadmin } from "@saas/auth/lib/superadmin-guard";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Thresholds compartilhados entre todas as queues monitoradas.
 * Queues diferentes podem ter volumes bem distintos (agent-invocation roda
 * pra cada mensagem, ingest-document so pra upload), mas os sinais de saude
 * sao os mesmos: fila crescendo, jobs velhos, DLQ estourando.
 */
const WAITING_WARN_THRESHOLD = 100;
const OLDEST_WAITING_WARN_SECONDS = 300;
const DLQ_CRITICAL_THRESHOLD = 50;

async function buildQueueCheck(
	name: string,
	queue: Queue,
): Promise<HealthCheckResult> {
	const check = defineHealthCheck(name, async () => {
		const m = await getQueueMetrics(queue);

		const alerts: HealthAlert[] = [];
		let status: "healthy" | "degraded" | "unhealthy" = "healthy";

		if (m.waiting > WAITING_WARN_THRESHOLD) {
			status = "degraded";
			alerts.push({
				severity: "warning",
				message: `Fila "${name}" com ${m.waiting} jobs aguardando (threshold: ${WAITING_WARN_THRESHOLD})`,
			});
		}
		if (m.oldestWaitingAgeSeconds > OLDEST_WAITING_WARN_SECONDS) {
			status = "degraded";
			alerts.push({
				severity: "warning",
				message: `Fila "${name}": job mais antigo aguarda ha ${m.oldestWaitingAgeSeconds}s (threshold: ${OLDEST_WAITING_WARN_SECONDS}s)`,
			});
		}
		if (m.dlqCount > DLQ_CRITICAL_THRESHOLD) {
			status = "unhealthy";
			alerts.push({
				severity: "critical",
				message: `Fila "${name}": DLQ com ${m.dlqCount} jobs — investigar causas`,
			});
		}

		return {
			status,
			metrics: formatMetrics({ ...m }),
			alerts,
		};
	});

	return check();
}

const aggregatedCheck = defineHealthCheck("queue", async () => {
	const [agentInvocation, ingestDocument] = await Promise.all([
		buildQueueCheck("agent-invocation", getAgentInvocationQueue()),
		buildQueueCheck("ingest-document", getIngestDocumentQueue()),
	]);

	const subchecks = [agentInvocation, ingestDocument];
	const status = aggregateStatus(subchecks.map((s) => s.status));

	return {
		status,
		metrics: {},
		alerts: [],
		subchecks,
	};
});

export async function GET() {
	const denied = await requireSuperadmin();
	if (denied) return denied;
	const result = await aggregatedCheck();
	return NextResponse.json(result);
}
