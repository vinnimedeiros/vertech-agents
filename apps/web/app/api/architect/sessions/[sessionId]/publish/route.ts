import {
	getArchitectWorkingMemory,
	publishAgentFromSessionCore,
} from "@repo/ai";
import { agentArtifact, agentCreationSession, and, db, eq } from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/architect/sessions/[sessionId]/publish (story 09.9)
 *
 * Dispara a transação atômica `publishAgentFromSessionCore` (tech-spec § 6)
 * sem precisar passar pelo LLM. Hidrata working memory via Mastra Memory
 * + valida ownership + exige final_summary APPROVED antes de publicar.
 *
 * Sucesso: retorna `{ agent: { id, name, status, version } }`. Cliente
 * redireciona pra `/agents/[agentId]` (placeholder até 07B-v2).
 */
export async function POST(
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
		});
		if (!sessionRow) {
			return NextResponse.json(
				{ error: "SESSION_NOT_FOUND_OR_FORBIDDEN" },
				{ status: 404 },
			);
		}
		if (sessionRow.status !== "DRAFT") {
			return NextResponse.json(
				{ error: "NOT_DRAFT", status: sessionRow.status },
				{ status: 409 },
			);
		}

		// Exige FinalSummary APPROVED antes de publicar — proteção UX.
		const finalSummary = await db.query.agentArtifact.findFirst({
			where: and(
				eq(agentArtifact.sessionId, sessionId),
				eq(agentArtifact.type, "FINAL_SUMMARY"),
			),
		});
		if (!finalSummary || finalSummary.status !== "APPROVED") {
			return NextResponse.json(
				{
					error: "FINAL_SUMMARY_NOT_APPROVED",
					message:
						"Aprove o Resumo Final antes de criar o agente.",
				},
				{ status: 409 },
			);
		}

		const workingMemory = await getArchitectWorkingMemory({
			sessionId,
			userId: session.user.id,
		});
		if (!workingMemory) {
			return NextResponse.json(
				{
					error: "WORKING_MEMORY_EMPTY",
					message:
						"Checklist ainda não foi preenchido pelo Arquiteto.",
				},
				{ status: 409 },
			);
		}

		// publishAgentFromSessionCore exige o shape completo com sessionId +
		// templateId. Injeta o metadata (Mastra só guarda checklist).
		const completeWorkingMemory = {
			...workingMemory,
			sessionId,
			templateId: sessionRow.templateId,
		};

		const agent = await publishAgentFromSessionCore({
			sessionId,
			userId: session.user.id,
			organizationId: sessionRow.organizationId,
			workingMemory: completeWorkingMemory as Parameters<
				typeof publishAgentFromSessionCore
			>[0]["workingMemory"],
		});

		return NextResponse.json({ agent });
	} catch (err) {
		const anyErr = err as { code?: string; message?: string };
		if (anyErr?.code === "CHECKLIST_INCOMPLETE") {
			return NextResponse.json(
				{
					error: "CHECKLIST_INCOMPLETE",
					message:
						anyErr.message ?? "Checklist incompleto.",
				},
				{ status: 422 },
			);
		}
		console.error("[architect/sessions/publish] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
