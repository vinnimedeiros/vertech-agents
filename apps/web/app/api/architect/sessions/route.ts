import { agentCreationSession, createId, db } from "@repo/database";
import { findArchitectTemplate } from "@saas/agents/architect/lib/templates";
import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/architect/sessions (story 09.4)
 *
 * Body JSON: `{ organizationSlug: string, templateId: string }`
 *
 * Cria sessão DRAFT com os ponteiros Mastra Memory (threadId = sessionId,
 * resourceId = userId). Antes do envio da primeira mensagem (09.5), upload de
 * anexos ja precisa de sessionId valida — esta rota destrava esse fluxo.
 *
 * Idempotência: cada chamada cria uma nova sessão. Se cliente quer reutilizar,
 * deve passar ?session=xxx direto na URL. Aqui é criação pura.
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

		const body = (await req.json().catch(() => null)) as {
			organizationSlug?: unknown;
			templateId?: unknown;
		} | null;

		const organizationSlug =
			typeof body?.organizationSlug === "string"
				? body.organizationSlug
				: "";
		const templateId =
			typeof body?.templateId === "string" ? body.templateId : "";

		if (!organizationSlug || !templateId) {
			return NextResponse.json(
				{ error: "MISSING_FIELDS" },
				{ status: 400 },
			);
		}

		const template = findArchitectTemplate(templateId);
		if (!template) {
			return NextResponse.json(
				{ error: "INVALID_TEMPLATE" },
				{ status: 400 },
			);
		}

		const activeOrganization =
			await getActiveOrganization(organizationSlug);
		if (!activeOrganization) {
			return NextResponse.json(
				{ error: "ORGANIZATION_NOT_FOUND" },
				{ status: 404 },
			);
		}

		const sessionId = createId();

		const [row] = await db
			.insert(agentCreationSession)
			.values({
				id: sessionId,
				organizationId: activeOrganization.id,
				userId: session.user.id,
				templateId: template.id,
				status: "DRAFT",
				mastraThreadId: sessionId,
				mastraResourceId: session.user.id,
				draftSnapshot: {
					templateLabel: template.label,
					currentStage: "ideation",
					progressPercent: 0,
				},
			})
			.returning({ id: agentCreationSession.id });

		if (!row) {
			return NextResponse.json(
				{ error: "INSERT_FAILED" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ sessionId: row.id });
	} catch (err) {
		console.error("[architect/sessions] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}
