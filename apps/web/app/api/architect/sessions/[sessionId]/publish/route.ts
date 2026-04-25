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

		// Wizard requer BusinessProfile + Blueprint aprovados (Step 1 e Step 2).
		// Step 4 "Criar agente" é o aprovar implícito — não tem artifact separado.
		const [businessProfile, blueprint] = await Promise.all([
			db.query.agentArtifact.findFirst({
				where: and(
					eq(agentArtifact.sessionId, sessionId),
					eq(agentArtifact.type, "BUSINESS_PROFILE"),
				),
			}),
			db.query.agentArtifact.findFirst({
				where: and(
					eq(agentArtifact.sessionId, sessionId),
					eq(agentArtifact.type, "AGENT_BLUEPRINT"),
				),
			}),
		]);
		if (!businessProfile) {
			return NextResponse.json(
				{
					error: "ANALYSIS_MISSING",
					message:
						"Análise do negócio não encontrada. Volte ao Step 1.",
				},
				{ status: 409 },
			);
		}
		if (!blueprint) {
			return NextResponse.json(
				{
					error: "PLAN_MISSING",
					message: "Plano não encontrado. Volte ao Step 2.",
				},
				{ status: 409 },
			);
		}

		// Safety rail H6 (fix Smith verify 2026-04-21).
		// Não forçar APPROVED. Se artefato não está aprovado (user refinou
		// e não clicou "Aprovar versão ajustada"), recusar publish com 409.
		// UI deve mandar user de volta ao step correto pra aprovar.
		if (businessProfile.status !== "APPROVED") {
			return NextResponse.json(
				{
					error: "ANALYSIS_NOT_APPROVED",
					message:
						"Você ajustou a análise e ainda não aprovou a versão nova. Volte ao Step 1 e clique em 'Aprovar'.",
					artifactStatus: businessProfile.status,
				},
				{ status: 409 },
			);
		}
		if (blueprint.status !== "APPROVED") {
			return NextResponse.json(
				{
					error: "PLAN_NOT_APPROVED",
					message:
						"Você ajustou o plano e ainda não aprovou a versão nova. Volte ao Step 2 e clique em 'Aprovar plano'.",
					artifactStatus: blueprint.status,
				},
				{ status: 409 },
			);
		}

		// Wizard não usa Mastra working memory — artefatos aprovados são
		// a fonte de verdade. Monta o shape que publishAgentFromSessionCore
		// espera a partir do BusinessProfile + Blueprint contents.
		const biz = businessProfile.content as {
			businessName?: string;
			summary?: string;
			offering?: string[];
			targetAudience?: string;
			goalForAgent?: string;
			differentiator?: string;
			suggestedIdentity?: { toneKeyword?: string; role?: string };
		};
		const plan = blueprint.content as {
			persona?: {
				name?: string;
				gender?: "FEMININE" | "MASCULINE" | "feminine" | "masculine";
				tone?: number;
				formality?: number;
				humor?: number;
				empathy?: number;
				antiPatterns?: string[];
			};
			salesTechniques?: Array<{
				presetId: string;
				intensity: string;
			}>;
			emojiConfig?: {
				mode?: "none" | "curated" | "free";
				curatedList?: string[];
				allowed?: string[];
				forbidden?: string[];
			};
			voiceConfig?: {
				enabled?: boolean;
				provider?: string | null;
				voiceId?: string | null;
				mode?: "always_text" | "always_audio" | "triggered";
				triggers?: string[];
			};
			capabilities?: string[];
		};

		const genderNormalized =
			plan.persona?.gender === "MASCULINE" ||
			plan.persona?.gender === "masculine"
				? "masculine"
				: "feminine";

		const completeWorkingMemory = {
			sessionId,
			templateId: sessionRow.templateId,
			currentStage: "creation" as const,
			checklist: {
				ideation: {
					businessName: biz.businessName ?? null,
					industry: sessionRow.templateId,
					targetAudience: biz.targetAudience ?? null,
					offering: biz.offering?.join(", ") ?? null,
					differentiator: biz.differentiator ?? null,
					goalForAgent: biz.goalForAgent ?? null,
					ticketMean: null,
					status: "done" as const,
				},
				planning: {
					persona: {
						name: plan.persona?.name ?? null,
						gender: genderNormalized as "feminine" | "masculine",
						tone: plan.persona?.tone ?? 50,
						formality: plan.persona?.formality ?? 50,
						humor: plan.persona?.humor ?? 40,
						empathy: plan.persona?.empathy ?? 70,
						antiPatterns: plan.persona?.antiPatterns ?? [],
					},
					salesTechniques: (plan.salesTechniques ?? []) as Array<{
						presetId:
							| "rapport"
							| "spin"
							| "aida"
							| "pas"
							| "objection"
							| "followup";
						intensity: "soft" | "balanced" | "aggressive";
					}>,
					emojiConfig: {
						mode: plan.emojiConfig?.mode ?? "curated",
						curatedList: plan.emojiConfig?.curatedList ?? [],
						allowed: plan.emojiConfig?.allowed ?? [],
						forbidden: plan.emojiConfig?.forbidden ?? [],
					},
					voiceConfig: {
						enabled: plan.voiceConfig?.enabled ?? false,
						provider: (plan.voiceConfig?.provider ?? null) as
							| "elevenlabs"
							| "qwen-self-hosted"
							| null,
						voiceId: plan.voiceConfig?.voiceId ?? null,
						mode: plan.voiceConfig?.mode ?? "always_text",
						triggers: plan.voiceConfig?.triggers ?? [],
					},
					capabilities: (plan.capabilities ?? []) as Array<
						| "qualification"
						| "scheduling"
						| "faq"
						| "handoff"
						| "followup"
					>,
					status: "done" as const,
				},
				knowledge: {
					documentIds: [],
					additionalNotes: null,
					domainAnswers: {},
					status: "done" as const,
				},
				creation: {
					finalized: false,
					publishedAgentId: null,
					status: "in_progress" as const,
				},
			},
			artifactIds: {
				businessProfile: businessProfile.id,
				agentBlueprint: blueprint.id,
				knowledgeBase: null,
				finalSummary: null,
			},
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
