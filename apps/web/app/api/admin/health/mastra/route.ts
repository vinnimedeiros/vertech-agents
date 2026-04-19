import { getMastraStorage } from "@repo/ai";
import { defineHealthCheck, formatMetrics } from "@repo/health";
import { NextResponse } from "next/server";
import { requireSuperadmin } from "@saas/auth/lib/superadmin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const check = defineHealthCheck("mastra", async () => {
	// Smoke test: instanciar storage (lazy). Se throw no constructor ou no
	// getMastraStorage por falta de DATABASE_URL, o wrapper defineHealthCheck
	// captura e retorna unhealthy com alert critical automaticamente.
	getMastraStorage();

	return {
		status: "healthy" as const,
		metrics: formatMetrics({
			storageInitialized: true,
			provider: "@mastra/pg",
		}),
		alerts: [],
	};
});

export async function GET() {
	const denied = await requireSuperadmin();
	if (denied) return denied;
	const result = await check();
	return NextResponse.json(result);
}
