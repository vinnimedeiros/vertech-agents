import {
	agentArtifact,
	agentCreationSession,
	and,
	db,
	eq,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";
import { blueprintRefineSchema } from "@saas/agents/architect/lib/blueprint-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/architect/artifacts/[artifactId]/refine-blueprint (story 09.8)
 *
 * Substitui content do AGENT_BLUEPRINT com payload validado via Zod.
 * Mantém consistência com refinamento inline: incrementa version,
 * status REGENERATED, sem passar pelo LLM.
 */
export async function POST(
	req: Request,
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
		const body = await req.json().catch(() => null);
		if (!artifactId || !body) {
			return NextResponse.json(
				{ error: "MISSING_FIELDS" },
				{ status: 400 },
			);
		}

		const parsed = blueprintRefineSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "VALIDATION_FAILED", issues: parsed.error.issues },
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
		if (artifact.type !== "AGENT_BLUEPRINT") {
			return NextResponse.json(
				{ error: "WRONG_ARTIFACT_TYPE" },
				{ status: 400 },
			);
		}
		if (artifact.status === "APPROVED") {
			return NextResponse.json(
				{ error: "ALREADY_APPROVED" },
				{ status: 409 },
			);
		}

		const sessionRow = await db.query.agentCreationSession.findFirst({
			where: and(
				eq(agentCreationSession.id, artifact.sessionId),
				eq(agentCreationSession.userId, session.user.id),
			),
			columns: { id: true },
		});
		if (!sessionRow) {
			return NextResponse.json(
				{ error: "FORBIDDEN" },
				{ status: 403 },
			);
		}

		const [updated] = await db
			.update(agentArtifact)
			.set({
				content:
					parsed.data as (typeof agentArtifact.$inferInsert)["content"],
				status: "REGENERATED",
				version: artifact.version + 1,
				updatedAt: new Date(),
			})
			.where(eq(agentArtifact.id, artifactId))
			.returning();

		return NextResponse.json({ artifact: updated });
	} catch (err) {
		console.error("[architect/artifacts/refine-blueprint] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
