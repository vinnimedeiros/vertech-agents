import { defineHealthCheck, formatMetrics } from "@repo/health";
import { getAgentInvocationQueue, getQueueMetrics } from "@repo/queue";
import { NextResponse } from "next/server";
import { requireSuperadmin } from "@saas/auth/lib/superadmin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const check = defineHealthCheck("queue", async () => {
	const queue = getAgentInvocationQueue();
	const m = await getQueueMetrics(queue);

	const alerts: Array<{ severity: "warning" | "critical"; message: string }> =
		[];
	let status: "healthy" | "degraded" | "unhealthy" = "healthy";

	if (m.waiting > 100) {
		status = "degraded";
		alerts.push({
			severity: "warning",
			message: `Fila com ${m.waiting} jobs aguardando (threshold: 100)`,
		});
	}
	if (m.oldestWaitingAgeSeconds > 300) {
		status = "degraded";
		alerts.push({
			severity: "warning",
			message: `Job mais antigo aguarda ha ${m.oldestWaitingAgeSeconds}s (threshold: 300s)`,
		});
	}
	if (m.dlqCount > 50) {
		status = "unhealthy";
		alerts.push({
			severity: "critical",
			message: `DLQ com ${m.dlqCount} jobs — investigar causas`,
		});
	}

	return {
		status,
		metrics: formatMetrics({ ...m }),
		alerts,
	};
});

export async function GET() {
	const denied = await requireSuperadmin();
	if (denied) return denied;
	const result = await check();
	return NextResponse.json(result);
}
