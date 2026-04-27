import {
	agentArtifact,
	agentCreationSession,
	and,
	db,
	eq,
	inArray,
	knowledgeDocument,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BusinessProfilePatch = {
	businessName: string;
	summary: string;
	offering: string[];
	targetAudience: string;
	goalForAgent: string;
	differentiator?: string;
};

type KnowledgeBasePatch = {
	additionalNotes?: string;
	removedDocumentIds?: string[];
};

/**
 * POST /api/architect/artifacts/[artifactId]/refine (story 09.7)
 *
 * Atualiza direto o `content` do artefato com patch estrutural — sem
 * passar pelo LLM (refinamento inline é edição direta). Incrementa
 * version pra optimistic locking.
 *
 * Tipos suportados:
 * - BUSINESS_PROFILE: substitui content completo (5 campos)
 * - KNOWLEDGE_BASE: merge com patch parcial (notes + remove docs)
 *
 * Para AGENT_BLUEPRINT usar Dialog (09.8, route separado).
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
		const body = (await req.json().catch(() => null)) as Record<
			string,
			unknown
		> | null;

		if (!artifactId || !body) {
			return NextResponse.json(
				{ error: "MISSING_FIELDS" },
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

		let newContent: Record<string, unknown>;

		if (artifact.type === "BUSINESS_PROFILE") {
			const patch = body as BusinessProfilePatch;
			newContent = {
				businessName: patch.businessName,
				summary: patch.summary,
				offering: patch.offering,
				targetAudience: patch.targetAudience,
				goalForAgent: patch.goalForAgent,
				differentiator: patch.differentiator,
			};
		} else if (artifact.type === "KNOWLEDGE_BASE") {
			const patch = body as KnowledgeBasePatch;
			const current = artifact.content as {
				documents: Array<{ id: string }>;
				additionalNotes?: string;
				domainAnswers?: Record<string, string>;
			};

			const removedSet = new Set(patch.removedDocumentIds ?? []);
			const remaining = current.documents.filter(
				(d) => !removedSet.has(d.id),
			);

			// Remove os docs da sessão (soft delete: desassocia sessionId).
			// Worker cron limpa eventualmente via cleanup-abandoned-sessions.
			if (removedSet.size > 0) {
				await db
					.update(knowledgeDocument)
					.set({ sessionId: null })
					.where(
						and(
							eq(knowledgeDocument.sessionId, artifact.sessionId),
							inArray(
								knowledgeDocument.id,
								Array.from(removedSet),
							),
						),
					);
			}

			newContent = {
				...current,
				documents: remaining,
				additionalNotes: patch.additionalNotes,
			};
		} else {
			return NextResponse.json(
				{ error: "UNSUPPORTED_TYPE" },
				{ status: 400 },
			);
		}

		const [updated] = await db
			.update(agentArtifact)
			.set({
				content: newContent as (typeof agentArtifact.$inferInsert)["content"],
				status: "REGENERATED",
				version: artifact.version + 1,
				updatedAt: new Date(),
			})
			.where(eq(agentArtifact.id, artifactId))
			.returning();

		return NextResponse.json({ artifact: updated });
	} catch (err) {
		console.error("[architect/artifacts/refine] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
