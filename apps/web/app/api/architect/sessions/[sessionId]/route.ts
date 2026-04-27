import {
	agentCreationSession,
	and,
	db,
	eq,
	knowledgeDocument,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/architect/sessions/[sessionId] (story 09.10)
 *
 * Exclui rascunho DRAFT do usuário. Cascade do Postgres remove artefatos.
 * Knowledge_documents órfãos ficam pra cleanup cron (já existente).
 * Sessões PUBLISHED não podem ser excluídas (agente já existe).
 */
export async function DELETE(
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
			columns: { id: true, status: true },
		});
		if (!sessionRow) {
			return NextResponse.json(
				{ error: "SESSION_NOT_FOUND" },
				{ status: 404 },
			);
		}
		if (sessionRow.status !== "DRAFT") {
			return NextResponse.json(
				{
					error: "CANNOT_DELETE_NON_DRAFT",
					message:
						"Só rascunhos podem ser excluídos. Agentes publicados precisam ser arquivados pelo painel.",
				},
				{ status: 409 },
			);
		}

		// Desassocia knowledge_documents (soft — fica sem sessionId pra cleanup cron)
		await db
			.update(knowledgeDocument)
			.set({ sessionId: null })
			.where(eq(knowledgeDocument.sessionId, sessionId));

		// Deleta a sessão — FK CASCADE remove agent_artifact
		await db
			.delete(agentCreationSession)
			.where(eq(agentCreationSession.id, sessionId));

		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error("[architect/sessions/delete] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
