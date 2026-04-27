import {
	agentArtifact,
	agentCreationSession,
	and,
	asc,
	db,
	eq,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/architect/artifacts?sessionId=xxx (story 09.6)
 *
 * Lista artefatos de uma sessão em ordem cronológica. Usado no mount do
 * chat (retomada) pra hidratar os cards já gerados antes do user abrir a
 * sessão. Durante a conversa, o Realtime (useArtifactEvents) mantém o
 * state atualizado.
 */
export async function GET(req: Request) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json(
				{ error: "UNAUTHENTICATED" },
				{ status: 401 },
			);
		}

		const url = new URL(req.url);
		const sessionId = url.searchParams.get("sessionId");
		if (!sessionId) {
			return NextResponse.json(
				{ error: "MISSING_SESSION_ID" },
				{ status: 400 },
			);
		}

		const sessionRow = await db.query.agentCreationSession.findFirst({
			where: and(
				eq(agentCreationSession.id, sessionId),
				eq(agentCreationSession.userId, session.user.id),
			),
			columns: { id: true },
		});
		if (!sessionRow) {
			return NextResponse.json(
				{ error: "SESSION_NOT_FOUND_OR_FORBIDDEN" },
				{ status: 404 },
			);
		}

		const rows = await db
			.select()
			.from(agentArtifact)
			.where(eq(agentArtifact.sessionId, sessionId))
			.orderBy(asc(agentArtifact.createdAt));

		return NextResponse.json({ artifacts: rows });
	} catch (err) {
		console.error("[architect/artifacts] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
