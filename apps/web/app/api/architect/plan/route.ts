import { openai } from "@repo/ai";
import {
	agentArtifact,
	agentCreationSession,
	and,
	db,
	eq,
} from "@repo/database";
import {
	ARCHITECT_CHAT_LIMIT,
	checkRateLimit,
} from "@saas/agents/architect/lib/rate-limit";
import { getSession } from "@saas/auth/lib/server";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanBody = {
	sessionId?: unknown;
	adjustment?: unknown;
};

const planSchema = z.object({
	blocks: z
		.array(
			z.object({
				title: z.string(),
				description: z.string(),
			}),
		)
		.describe(
			"Blocos narrativos descrevendo o comportamento do agente (ideal 5-8).",
		),
	persona: z.object({
		name: z.string(),
		tone: z.number().min(0).max(100),
		formality: z.number().min(0).max(100),
		humor: z.number().min(0).max(100),
		empathy: z.number().min(0).max(100),
		antiPatterns: z.array(z.string()),
	}),
	capabilities: z
		.array(
			z.enum([
				"qualification",
				"scheduling",
				"faq",
				"handoff",
				"followup",
			]),
		)
		.describe(
			"Capabilities do agente. Pelo menos 1. Valores aceitos: qualification, scheduling, faq, handoff, followup.",
		),
	salesTechniques: z
		.array(
			z.object({
				presetId: z.enum([
					"rapport",
					"spin",
					"aida",
					"pas",
					"objection",
					"followup",
				]),
				intensity: z.enum(["soft", "balanced", "aggressive"]),
			}),
		)
		.describe(
			"Técnicas comerciais com intensidade. presetId: rapport/spin/aida/pas/objection/followup. intensity: soft/balanced/aggressive.",
		),
});

/**
 * POST /api/architect/plan (wizard refactor 2026-04-20)
 *
 * Etapa 2 do wizard (Planejamento). Lê BusinessProfile aprovado e gera
 * AgentBlueprint com blocos narrativos + persona sliders + capabilities.
 *
 * Aceita `adjustment` opcional (instrução do user pra refinar plano atual).
 */
export async function POST(req: Request) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json(
				{ error: "UNAUTHENTICATED" },
				{ status: 401 },
			);
		}

		const body = (await req.json().catch(() => null)) as PlanBody | null;
		const sessionId =
			typeof body?.sessionId === "string" ? body.sessionId : "";
		const adjustment =
			typeof body?.adjustment === "string" ? body.adjustment : "";

		if (!sessionId) {
			return NextResponse.json(
				{ error: "MISSING_SESSION_ID" },
				{ status: 400 },
			);
		}

		const rate = await checkRateLimit(sessionId, ARCHITECT_CHAT_LIMIT);
		if (!rate.allowed) {
			return NextResponse.json(
				{ error: "RATE_LIMITED", retryAfter: rate.retryAfter },
				{ status: 429 },
			);
		}

		const sessionRow = await db.query.agentCreationSession.findFirst({
			where: and(
				eq(agentCreationSession.id, sessionId),
				eq(agentCreationSession.userId, session.user.id),
				eq(agentCreationSession.status, "DRAFT"),
			),
			columns: { id: true, templateId: true },
		});
		if (!sessionRow) {
			return NextResponse.json(
				{ error: "SESSION_NOT_FOUND_OR_FORBIDDEN" },
				{ status: 404 },
			);
		}

		const bizProfile = await db.query.agentArtifact.findFirst({
			where: and(
				eq(agentArtifact.sessionId, sessionId),
				eq(agentArtifact.type, "BUSINESS_PROFILE"),
			),
		});
		if (!bizProfile) {
			return NextResponse.json(
				{ error: "ANALYSIS_REQUIRED" },
				{ status: 400 },
			);
		}

		const existingPlan = await db.query.agentArtifact.findFirst({
			where: and(
				eq(agentArtifact.sessionId, sessionId),
				eq(agentArtifact.type, "AGENT_BLUEPRINT"),
			),
		});

		let object: z.infer<typeof planSchema>;
		try {
			const result = await generateObject({
				model: openai("gpt-4o"),
				schema: planSchema,
				mode: "json",
				schemaName: "AgentBlueprint",
				schemaDescription: "Plano do agente comercial a ser criado",
				maxRetries: 2,
				prompt: buildPlanPrompt({
					templateId: sessionRow.templateId,
					businessProfile: bizProfile.content as Record<string, unknown>,
					adjustment,
					previousPlan: existingPlan?.content,
				}),
			});
			object = result.object;
		} catch (genErr) {
			const anyErr = genErr as {
				text?: string;
				cause?: { text?: string };
			};
			console.error("[architect/plan] generateObject failed", {
				error:
					genErr instanceof Error ? genErr.message : String(genErr),
				rawText: anyErr?.text ?? anyErr?.cause?.text,
			});
			return NextResponse.json(
				{
					error: "LLM_SCHEMA_MISMATCH",
					message:
						"A IA retornou um formato inesperado ao gerar o plano. Tente novamente.",
				},
				{ status: 502 },
			);
		}

		const profile = bizProfile.content as {
			suggestedIdentity?: { gender?: "FEMININE" | "MASCULINE" };
		};
		const gender = profile.suggestedIdentity?.gender ?? "FEMININE";

		const blueprintContent = {
			persona: {
				name: object.persona.name,
				gender,
				tone: object.persona.tone,
				formality: object.persona.formality,
				humor: object.persona.humor,
				empathy: object.persona.empathy,
				antiPatterns: object.persona.antiPatterns,
			},
			salesTechniques: object.salesTechniques,
			emojiConfig: {
				mode: "curated",
				curatedList: [],
				allowed: [],
				forbidden: [],
			},
			voiceConfig: {
				enabled: false,
				mode: "always_text",
				triggers: [],
			},
			capabilities: object.capabilities,
			// Extensão wizard: blocos narrativos vão em campo livre
			narrativeBlocks: object.blocks,
		} as (typeof agentArtifact.$inferInsert)["content"];

		let saved;
		if (!existingPlan) {
			[saved] = await db
				.insert(agentArtifact)
				.values({
					sessionId,
					type: "AGENT_BLUEPRINT",
					content: blueprintContent,
					status: "GENERATED",
				})
				.returning();
		} else {
			[saved] = await db
				.update(agentArtifact)
				.set({
					content: blueprintContent,
					status: "REGENERATED",
					version: existingPlan.version + 1,
					updatedAt: new Date(),
				})
				.where(eq(agentArtifact.id, existingPlan.id))
				.returning();
		}

		await db
			.update(agentCreationSession)
			.set({
				draftSnapshot: {
					currentStage: "planning",
					agentName: object.persona.name,
					lastActivity: new Date().toISOString(),
				},
				updatedAt: new Date(),
			})
			.where(eq(agentCreationSession.id, sessionId));

		return NextResponse.json({ artifact: saved });
	} catch (err) {
		console.error("[architect/plan] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}

function buildPlanPrompt(params: {
	templateId: string;
	businessProfile: Record<string, unknown>;
	adjustment: string;
	previousPlan?: unknown;
}): string {
	const profileJson = JSON.stringify(params.businessProfile, null, 2);
	const prevJson = params.previousPlan
		? JSON.stringify(params.previousPlan, null, 2)
		: "";

	const adjustmentSection = params.adjustment
		? `\n\n## Ajuste pedido pelo usuário\n${params.adjustment}\n\nReescreva o plano aplicando esse ajuste. Mantenha o resto coerente.`
		: "";

	const previousSection = prevJson
		? `\n\n## Plano anterior (pra referência)\n\`\`\`json\n${prevJson}\n\`\`\``
		: "";

	return `
Você é um consultor sênior de automação comercial. Com base no perfil do negócio abaixo (vertical "${params.templateId}"), monte o plano do agente de IA que será criado.

Regras:
- Produza 5-8 blocos narrativos. Cada bloco = 1 comportamento/capability do agente. Título curto + parágrafo denso (3-5 linhas) em pt-BR natural.
- Tom consultivo direto. Blocos no formato "Amanda vai [...]" — pessoal, específicos do vertical.
- Capabilities: só inclua as relevantes ao negócio (qualification, scheduling, faq, handoff, followup).
- Persona: infira tom/formalidade/humor/empatia (0-100) do tom sugerido no perfil.
- salesTechniques: 2-4 técnicas adequadas ao vertical e público.
- antiPatterns: 3-5 coisas que o agente NUNCA deve fazer, específicas do negócio.

## Perfil do negócio

\`\`\`json
${profileJson}
\`\`\`${previousSection}${adjustmentSection}
`.trim();
}
