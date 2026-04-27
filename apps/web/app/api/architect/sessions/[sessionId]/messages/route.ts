import { getArchitectMessages } from "@repo/ai";
import { agentCreationSession, and, db, eq } from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/architect/sessions/[sessionId]/messages (story 09.5 retomada)
 *
 * Retorna histórico de mensagens persistidas pelo Mastra Memory pro
 * useChat reconstruir a UI ao retomar `/agents/new?session=xxx`.
 */
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ sessionId: string }> },
) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json(
				{ error: "UNAUTHENTICATED" },
				{ status: 401 },
			);
		}

		const { sessionId } = await params;
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

		const messages = await getArchitectMessages({
			sessionId,
			userId: session.user.id,
		});

		return NextResponse.json({ messages });
	} catch (err) {
		console.error("[architect/sessions/messages] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
