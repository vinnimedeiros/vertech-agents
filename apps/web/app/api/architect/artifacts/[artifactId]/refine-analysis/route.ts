import { openai } from "@repo/ai";
import {
	agentArtifact,
	agentCreationSession,
	and,
	db,
	eq,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refineSchema = z.object({
	businessTitle: z.string(),
	executiveSummary: z.string(),
	identifiedServices: z.array(z.string()),
	agentGoals: z.array(z.string()),
	targetAudience: z.string(),
	differentiator: z.string().nullable(),
	suggestedName: z.string(),
	suggestedRole: z.string(),
	suggestedTone: z.string(),
});

/**
 * POST /api/architect/artifacts/[id]/refine-analysis (wizard 2026-04-20)
 *
 * Aplica instrução narrativa do user ao artifact BUSINESS_PROFILE.
 * LLM lê content atual + instrução e regenera o mini-PRD preservando
 * coerência com o resto.
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
		const body = (await req.json().catch(() => null)) as {
			instruction?: unknown;
		} | null;
		const instruction =
			typeof body?.instruction === "string" ? body.instruction.trim() : "";

		if (!artifactId || !instruction) {
			return NextResponse.json(
				{ error: "MISSING_FIELDS" },
				{ status: 400 },
			);
		}

		const artifact = await db.query.agentArtifact.findFirst({
			where: eq(agentArtifact.id, artifactId),
		});
		if (!artifact || artifact.type !== "BUSINESS_PROFILE") {
			return NextResponse.json(
				{ error: "ARTIFACT_NOT_FOUND_OR_WRONG_TYPE" },
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
			columns: { id: true, templateId: true },
		});
		if (!sessionRow) {
			return NextResponse.json(
				{ error: "FORBIDDEN" },
				{ status: 403 },
			);
		}

		const currentContent = artifact.content as Record<string, unknown>;
		const identity = currentContent.suggestedIdentity as
			| { gender?: "FEMININE" | "MASCULINE" }
			| undefined;
		const gender = identity?.gender ?? "FEMININE";

		const { object } = await generateObject({
			model: openai("gpt-4o"),
			schema: refineSchema,
			mode: "json",
			schemaName: "BusinessAnalysisRefined",
			schemaDescription: "Mini-PRD atualizado conforme instrução do user",
			maxRetries: 2,
			prompt: `
Você é consultor sênior de automação comercial. O usuário pediu um ajuste no mini-PRD atual do agente dele (vertical "${sessionRow.templateId}").

Reescreva o mini-PRD inteiro aplicando a instrução, mantendo coerência com o resto. NÃO invente informação — use só o que já está no mini-PRD atual + a instrução.

## Mini-PRD atual

\`\`\`json
${JSON.stringify(currentContent, null, 2)}
\`\`\`

## Instrução do usuário

${instruction}

Regras:
- Mantenha tom consultivo, direto, pt-BR natural
- Mantenha nome sugerido do gênero ${gender === "FEMININE" ? "feminino" : "masculino"} a não ser que o user peça trocar
- Preserve o diferencial e contexto do negócio
`.trim(),
		});

		const newContent = {
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

		const [updated] = await db
			.update(agentArtifact)
			.set({
				content: newContent,
				status: "REGENERATED",
				version: artifact.version + 1,
				updatedAt: new Date(),
			})
			.where(eq(agentArtifact.id, artifactId))
			.returning();

		return NextResponse.json({ artifact: updated });
	} catch (err) {
		console.error("[architect/artifacts/refine-analysis] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
