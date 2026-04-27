import {
	agentArtifact,
	agentCreationSession,
	and,
	db,
	eq,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPE_TO_STAGE: Record<
	string,
	"ideation" | "planning" | "knowledge" | "creation"
> = {
	BUSINESS_PROFILE: "ideation",
	AGENT_BLUEPRINT: "planning",
	KNOWLEDGE_BASE: "knowledge",
	FINAL_SUMMARY: "creation",
};

const NEXT_STAGE: Record<
	"ideation" | "planning" | "knowledge" | "creation",
	"planning" | "knowledge" | "creation" | null
> = {
	ideation: "planning",
	planning: "knowledge",
	knowledge: "creation",
	creation: null,
};

/**
 * POST /api/architect/artifacts/[artifactId]/approve (story 09.6)
 *
 * Marca artifact como APPROVED e avança draftSnapshot.currentStage da
 * sessão. Não toca no working memory do Mastra diretamente — o Arquiteto
 * no próximo turno vê `currentStage` atualizado via requestContext e age
 * a partir da nova etapa.
 *
 * Auth: valida ownership da sessão via userId.
 */
export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ artifactId: string }> },
) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json(
				{ error: "UNAUTHENTICATED" },
				{ status: 401 },
			);
		}

		const { artifactId } = await params;
		if (!artifactId) {
			return NextResponse.json(
				{ error: "MISSING_ARTIFACT_ID" },
				{ status: 400 },
			);
		}

		const artifact = await db.query.agentArtifact.findFirst({
			where: eq(agentArtifact.id, artifactId),
		});
		if (!artifact) {
			return NextResponse.json(
				{ error: "ARTIFACT_NOT_FOUND" },
				{ status: 404 },
			);
		}

		const sessionRow = await db.query.agentCreationSession.findFirst({
			where: and(
				eq(agentCreationSession.id, artifact.sessionId),
				eq(agentCreationSession.userId, session.user.id),
			),
		});
		if (!sessionRow) {
			return NextResponse.json(
				{ error: "FORBIDDEN" },
				{ status: 403 },
			);
		}

		if (artifact.status === "APPROVED") {
			return NextResponse.json({ artifact });
		}

		const [updated] = await db
			.update(agentArtifact)
			.set({
				status: "APPROVED",
				approvedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(agentArtifact.id, artifactId))
			.returning();

		const currentStage = TYPE_TO_STAGE[artifact.type] ?? "ideation";
		const nextStage = NEXT_STAGE[currentStage];

		const prevSnapshot =
			(sessionRow.draftSnapshot as Record<string, unknown> | null) ??
			{};
		const newSnapshot = {
			...prevSnapshot,
			currentStage: nextStage ?? currentStage,
			lastActivity: new Date().toISOString(),
		};

		await db
			.update(agentCreationSession)
			.set({
				draftSnapshot: newSnapshot,
				updatedAt: new Date(),
			})
			.where(eq(agentCreationSession.id, sessionRow.id));

		return NextResponse.json({ artifact: updated, nextStage });
	} catch (err) {
		console.error("[architect/artifacts/approve] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
