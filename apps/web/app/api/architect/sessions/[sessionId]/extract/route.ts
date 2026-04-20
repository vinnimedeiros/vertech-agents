import {
	extractArchitectArtifact,
	getArchitectMessages,
} from "@repo/ai";
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

const STAGE_TO_ARTIFACT_TYPE = {
	ideation: "BUSINESS_PROFILE",
	planning: "AGENT_BLUEPRINT",
	knowledge: "KNOWLEDGE_BASE",
} as const;

type Stage = keyof typeof STAGE_TO_ARTIFACT_TYPE;

/**
 * POST /api/architect/sessions/[sessionId]/extract (arquitetura
 * extractor-driven, story 09.5 refactor)
 *
 * Dispatched pelo cliente (onFinish do useChat) após cada resposta do
 * Arquiteto terminar. Faz:
 *
 * 1. Valida ownership + carrega sessão + stage atual (de draftSnapshot)
 * 2. Lê histórico de mensagens do Mastra Memory
 * 3. Chama extractArchitectArtifact com stage + messages + templateId
 * 4. Se hasMinimumData: upsert em agent_artifact (INSERT se não existe,
 *    UPDATE se já existe REGENERATED). Realtime dispara → card aparece
 *    no chat sem o main LLM precisar fazer nada
 * 5. Skip silencioso se dados insuficientes — tenta de novo no próximo turno
 *
 * Fire-and-forget: cliente não espera resposta. Falha não atrapalha UX.
 */
export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ sessionId: string }> },
) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json({ ok: false }, { status: 401 });
		}

		const { sessionId } = await params;
		if (!sessionId) {
			return NextResponse.json({ ok: false }, { status: 400 });
		}

		const sessionRow = await db.query.agentCreationSession.findFirst({
			where: and(
				eq(agentCreationSession.id, sessionId),
				eq(agentCreationSession.userId, session.user.id),
			),
		});
		if (!sessionRow) {
			return NextResponse.json({ ok: false }, { status: 404 });
		}

		const currentStage = (sessionRow.draftSnapshot?.currentStage ??
			"ideation") as Stage | "creation";

		// Etapa creation não tem extração — só consolida ao publicar.
		if (currentStage === "creation") {
			return NextResponse.json({ ok: true, skipped: "creation_stage" });
		}

		const messages = await getArchitectMessages({
			sessionId,
			userId: session.user.id,
		});

		// Precisa de ao menos 1 turno user + 1 assistant pra extrair algo.
		if (messages.length < 2) {
			return NextResponse.json({ ok: true, skipped: "not_enough_turns" });
		}

		const result = await extractArchitectArtifact({
			stage: currentStage,
			templateId: sessionRow.templateId,
			messages: messages.map((m) => ({
				role: m.role === "system" ? "assistant" : m.role,
				content: m.content,
			})),
		});

		if (!result || !result.hasMinimumData) {
			return NextResponse.json({
				ok: true,
				skipped: "insufficient_data",
			});
		}

		const artifactType = STAGE_TO_ARTIFACT_TYPE[result.stage];
		const content = result.content as unknown as (typeof agentArtifact.$inferInsert)["content"];

		// Procura artifact existente pra essa etapa + sessão.
		const existing = await db.query.agentArtifact.findFirst({
			where: and(
				eq(agentArtifact.sessionId, sessionId),
				eq(agentArtifact.type, artifactType),
			),
		});

		if (!existing) {
			const [inserted] = await db
				.insert(agentArtifact)
				.values({
					sessionId,
					type: artifactType,
					content,
					status: "GENERATED",
				})
				.returning();
			return NextResponse.json({ ok: true, action: "inserted", artifact: inserted });
		}

		// Não sobrescreve artifact aprovado — user já chancelou.
		if (existing.status === "APPROVED") {
			return NextResponse.json({ ok: true, skipped: "already_approved" });
		}

		const [updated] = await db
			.update(agentArtifact)
			.set({
				content,
				status: "REGENERATED",
				version: existing.version + 1,
				updatedAt: new Date(),
			})
			.where(eq(agentArtifact.id, existing.id))
			.returning();
		return NextResponse.json({ ok: true, action: "updated", artifact: updated });
	} catch (err) {
		console.error("[architect/sessions/extract] fatal", err);
		// Falha silenciosa: cliente não espera resposta mesmo.
		return NextResponse.json(
			{
				ok: false,
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
