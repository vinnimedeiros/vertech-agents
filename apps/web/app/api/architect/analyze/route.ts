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

type AnalyzeBody = {
	sessionId?: unknown;
	gender?: unknown;
	answers?: unknown;
	additionalInfo?: unknown;
};

type Answer = { questionId: string; question: string; answer: string };

const analysisSchema = z.object({
	businessTitle: z
		.string()
		.max(80)
		.describe("Título curto do negócio, 2-6 palavras."),
	executiveSummary: z
		.string()
		.max(500)
		.describe(
			"Resumo em 1 parágrafo denso: contexto do negócio + dor principal + o que o agente resolverá.",
		),
	identifiedServices: z
		.array(z.string())
		.min(3)
		.max(10)
		.describe("Lista de serviços/produtos identificados na conversa."),
	agentGoals: z
		.array(z.string())
		.min(3)
		.max(8)
		.describe("Objetivos concretos do agente (o que ele faz)."),
	targetAudience: z
		.string()
		.max(300)
		.describe("Quem é o público-alvo descrito pelo usuário."),
	differentiator: z
		.string()
		.max(300)
		.nullable()
		.describe("Diferencial competitivo, se mencionado."),
	suggestedName: z
		.string()
		.max(30)
		.describe(
			"Nome sugerido pro agente, coerente com vertical e gênero escolhido. Ex: Sofia, Amanda, Carlos, Ricardo.",
		),
	suggestedRole: z
		.string()
		.max(80)
		.describe(
			"Título/função do agente em 3-6 palavras. Ex: Consultora Digital de Imóveis, Atendente Virtual da Clínica.",
		),
	suggestedTone: z
		.enum([
			"caloroso",
			"consultivo",
			"profissional",
			"amigável",
			"entusiasmado",
			"acolhedor",
			"direto",
			"empático",
		])
		.describe("Tom de voz sugerido pro agente."),
});

/**
 * POST /api/architect/analyze (wizard refactor 2026-04-20)
 *
 * Etapa 1 do wizard (Idealização). Recebe vertical + gender + respostas
 * às perguntas marcadas e gera mini-PRD estruturado via gpt-4o.
 *
 * Persiste como artifact BUSINESS_PROFILE com status GENERATED. Se já
 * existe um pra essa sessão, substitui com REGENERATED.
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

		const body = (await req.json().catch(() => null)) as AnalyzeBody | null;
		const sessionId =
			typeof body?.sessionId === "string" ? body.sessionId : "";
		const gender =
			body?.gender === "FEMININE" || body?.gender === "MASCULINE"
				? body.gender
				: null;
		const answersInput = Array.isArray(body?.answers) ? body.answers : [];
		const additionalInfo =
			typeof body?.additionalInfo === "string"
				? body.additionalInfo
				: "";

		if (!sessionId || !gender) {
			return NextResponse.json(
				{ error: "MISSING_FIELDS" },
				{ status: 400 },
			);
		}

		const answers: Answer[] = [];
		for (const a of answersInput) {
			if (
				a &&
				typeof a === "object" &&
				typeof (a as Answer).questionId === "string" &&
				typeof (a as Answer).question === "string" &&
				typeof (a as Answer).answer === "string"
			) {
				answers.push({
					questionId: (a as Answer).questionId,
					question: (a as Answer).question,
					answer: (a as Answer).answer,
				});
			}
		}
		if (answers.length < 3) {
			return NextResponse.json(
				{ error: "MIN_ANSWERS", required: 3 },
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
			columns: {
				id: true,
				templateId: true,
				organizationId: true,
			},
		});
		if (!sessionRow) {
			return NextResponse.json(
				{ error: "SESSION_NOT_FOUND_OR_FORBIDDEN" },
				{ status: 404 },
			);
		}

		const { object } = await generateObject({
			model: openai("gpt-4o"),
			schema: analysisSchema,
			prompt: buildAnalysisPrompt({
				templateId: sessionRow.templateId,
				gender,
				answers,
				additionalInfo,
			}),
		});

		const content = {
			businessName: object.businessTitle,
			summary: object.executiveSummary,
			offering: object.identifiedServices,
			targetAudience: object.targetAudience,
			goalForAgent: object.agentGoals[0] ?? "",
			differentiator: object.differentiator ?? undefined,
			agentGoals: object.agentGoals,
			suggestedIdentity: {
				name: object.suggestedName,
				role: object.suggestedRole,
				toneKeyword: object.suggestedTone,
				gender,
			},
		} as (typeof agentArtifact.$inferInsert)["content"];

		const existing = await db.query.agentArtifact.findFirst({
			where: and(
				eq(agentArtifact.sessionId, sessionId),
				eq(agentArtifact.type, "BUSINESS_PROFILE"),
			),
		});

		let saved;
		if (!existing) {
			[saved] = await db
				.insert(agentArtifact)
				.values({
					sessionId,
					type: "BUSINESS_PROFILE",
					content,
					status: "GENERATED",
				})
				.returning();
		} else {
			[saved] = await db
				.update(agentArtifact)
				.set({
					content,
					status: "REGENERATED",
					version: existing.version + 1,
					updatedAt: new Date(),
				})
				.where(eq(agentArtifact.id, existing.id))
				.returning();
		}

		// Atualiza draftSnapshot pra próxima tela saber que passamos
		// da Idealização pra Planejamento.
		await db
			.update(agentCreationSession)
			.set({
				draftSnapshot: {
					currentStage: "ideation",
					businessName: object.businessTitle,
					agentName: object.suggestedName,
					lastActivity: new Date().toISOString(),
				},
				updatedAt: new Date(),
			})
			.where(eq(agentCreationSession.id, sessionId));

		return NextResponse.json({ artifact: saved });
	} catch (err) {
		console.error("[architect/analyze] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}

function buildAnalysisPrompt(params: {
	templateId: string;
	gender: "FEMININE" | "MASCULINE";
	answers: Answer[];
	additionalInfo: string;
}): string {
	const genderLabel =
		params.gender === "FEMININE" ? "feminino" : "masculino";

	const answersFormatted = params.answers
		.map(
			(a) => `**${a.question}**\nResposta: ${a.answer}`,
		)
		.join("\n\n");

	const extraSection = params.additionalInfo
		? `\n\n## Informações adicionais\n${params.additionalInfo}`
		: "";

	return `
Você é um consultor sênior de automação comercial. Analise as respostas do dono de um negócio do vertical "${params.templateId}" e produza um mini-PRD do agente de IA a ser criado.

Regras:
- Use SOMENTE as informações fornecidas. Não invente.
- Tom consultivo, direto, pt-BR natural.
- O agente terá gênero ${genderLabel} (use nome coerente).
- Nome sugerido: escolha 1 nome curto e memorável do gênero ${genderLabel}. Ex: feminino (Sofia, Amanda, Helena, Camila), masculino (Rafael, Bruno, Lucas, Eduardo).
- "suggestedRole" deve refletir a função específica do negócio. Evite "Atendente" genérico.
- "suggestedTone" pra clínica/saúde: caloroso ou empático. E-commerce: direto ou amigável. Imobiliária: consultivo. Infoproduto: entusiasmado. SaaS: profissional. Serviços locais: acolhedor.

## Respostas do usuário

${answersFormatted}${extraSection}
`.trim();
}
