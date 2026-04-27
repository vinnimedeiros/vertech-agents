import { db, eq, team } from "@repo/database";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Phase 11.4 — Inspetor (Mastra Studio em aba externa).
 *
 * Redireciona pra Mastra Studio nativo rodando em :4111 (default) ou URL
 * configurada via env. Anexa teamId como queryparam pra Studio filtrar.
 *
 * V4+: substitui por iframe embarcado quando auth share for resolvido.
 */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ organizationSlug: string; teamId: string }> },
) {
	const { organizationSlug, teamId } = await params;

	const organization = await getActiveOrganization(organizationSlug);
	if (!organization) {
		return NextResponse.redirect(new URL("/app", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
	}

	const teamRow = await db.query.team.findFirst({
		where: eq(team.id, teamId),
	});
	if (!teamRow || teamRow.organizationId !== organization.id) {
		return NextResponse.json({ error: "TEAM_NOT_FOUND" }, { status: 404 });
	}

	const studioUrl = process.env.MASTRA_STUDIO_URL ?? "http://localhost:4111";
	const target = `${studioUrl}/?team=${encodeURIComponent(teamId)}`;

	return NextResponse.redirect(target);
}
