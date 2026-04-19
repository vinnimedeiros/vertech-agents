import { checkDatabase } from "@repo/health";
import { NextResponse } from "next/server";
import { requireSuperadmin } from "@saas/auth/lib/superadmin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	const denied = await requireSuperadmin();
	if (denied) return denied;
	const result = await checkDatabase();
	return NextResponse.json(result);
}
