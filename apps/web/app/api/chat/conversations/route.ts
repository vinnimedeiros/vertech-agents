import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { listConversationsForOrg } from "@saas/chat/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const orgSlug = searchParams.get("org");
	if (!orgSlug) {
		return NextResponse.json({ error: "missing org" }, { status: 400 });
	}

	const [session, org] = await Promise.all([
		getSession(),
		getActiveOrganization(orgSlug),
	]);
	if (!session?.user) {
		return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
	}
	if (!org) {
		return NextResponse.json({ error: "org not found" }, { status: 404 });
	}

	const list = await listConversationsForOrg(org.id);
	return NextResponse.json(list);
}
