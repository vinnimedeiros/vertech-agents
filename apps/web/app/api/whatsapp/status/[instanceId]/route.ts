import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { getInstanceStatusSnapshot } from "@saas/whatsapp/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polling endpoint usado pelo UI pra saber o status atual da instância:
 * - PENDING / CONNECTING: retorna o QR code pra renderizar
 * - CONNECTED: retorna phoneNumber e UI fecha modal
 * - LOGGED_OUT / DISCONNECTED / ERROR: mostra lastError
 */
export async function GET(
	req: Request,
	ctx: { params: Promise<{ instanceId: string }> },
) {
	const { instanceId } = await ctx.params;
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

	const snapshot = await getInstanceStatusSnapshot(instanceId, org.id);
	if (!snapshot) {
		return NextResponse.json(
			{ error: "instance not found" },
			{ status: 404 },
		);
	}

	return NextResponse.json(snapshot);
}
