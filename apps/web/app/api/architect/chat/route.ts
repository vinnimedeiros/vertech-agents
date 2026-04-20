import { RequestContext, getMastra } from "@repo/ai";
import { agentCreationSession, and, db, eq } from "@repo/database";
import {
	ARCHITECT_CHAT_LIMIT,
	checkRateLimit,
} from "@saas/agents/architect/lib/rate-limit";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessagePart = {
	role?: string;
	content?: string | Array<{ type: string; text?: string }>;
};

type ChatRequestBody = {
	sessionId?: unknown;
	messages?: unknown;
	attachmentIds?: unknown;
};

/**
 * POST /api/architect/chat (story 09.5, tech-spec § 7.1)
 *
 * Body JSON:
 * - `sessionId`: string (id da agent_creation_session em DRAFT)
 * - `messages`: AI SDK message list (serão passadas ao Agent; só a última
 *   user message é enviada ao Mastra.stream pra manter compatibilidade com o
 *   padrão de memória da plataforma)
 * - `attachmentIds`: string[] opcional (documentIds anexados nesta msg)
 *
 * Pipeline:
 * 1. Auth (better-auth session)
 * 2. Rate limit 10/min por sessionId (tech-spec § 7.3)
 * 3. Valida ownership da sessão (userId + status DRAFT)
 * 4. Invoca `mastra.getAgent('architectAgent').stream()` com memory
 *    (thread=sessionId, resource=userId) e requestContext populado com
 *    sessionId, userId, organizationId, templateId, attachmentIds e
 *    workingMemory mínimo (placeholder até o Mastra Memory hidratar o real).
 * 5. Retorna `textStream` como Response streaming plain-text. Client usa
 *    `useChat({ streamProtocol: 'text' })` pra consumir.
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

		const body = (await req
			.json()
			.catch(() => null)) as ChatRequestBody | null;

		const sessionId =
			typeof body?.sessionId === "string" ? body.sessionId : "";
		if (!sessionId) {
			return NextResponse.json(
				{ error: "MISSING_SESSION_ID" },
				{ status: 400 },
			);
		}

		const messages = Array.isArray(body?.messages)
			? (body.messages as ChatMessagePart[])
			: [];
		if (messages.length === 0) {
			return NextResponse.json(
				{ error: "MISSING_MESSAGES" },
				{ status: 400 },
			);
		}

		const attachmentIds = Array.isArray(body?.attachmentIds)
			? (body.attachmentIds as unknown[]).filter(
					(id): id is string =>
						typeof id === "string" && id.length > 0,
				)
			: [];

		const rate = await checkRateLimit(sessionId, ARCHITECT_CHAT_LIMIT);
		if (!rate.allowed) {
			return NextResponse.json(
				{
					error: "RATE_LIMITED",
					retryAfter: rate.retryAfter,
					message: `Você está falando muito rápido. Aguarda ${rate.retryAfter}s pro Arquiteto processar.`,
				},
				{
					status: 429,
					headers: { "Retry-After": String(rate.retryAfter) },
				},
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
				organizationId: true,
				templateId: true,
				draftSnapshot: true,
			},
		});

		if (!sessionRow) {
			return NextResponse.json(
				{ error: "SESSION_NOT_FOUND_OR_FORBIDDEN" },
				{ status: 404 },
			);
		}

		const lastMessage = messages[messages.length - 1];
		const userText = extractMessageText(lastMessage);
		if (!userText) {
			return NextResponse.json(
				{ error: "EMPTY_USER_MESSAGE" },
				{ status: 400 },
			);
		}

		const currentStage =
			sessionRow.draftSnapshot?.currentStage ?? "ideation";

		const requestContext = new RequestContext<Record<string, unknown>>([
			["sessionId", sessionRow.id],
			["userId", session.user.id],
			["organizationId", sessionRow.organizationId],
			["templateId", sessionRow.templateId],
			["currentStage", currentStage],
			["attachmentIds", attachmentIds],
			// Placeholder — as tools architectTools chamam requireArchitectContext
			// que exige workingMemory presente. Mastra Memory hidrata o real via
			// workingMemory.enabled=true na próxima iteração; aqui passamos um
			// snapshot mínimo derivado do draftSnapshot pra destravar execução.
			[
				"workingMemory",
				buildWorkingMemorySnapshot(sessionRow, currentStage),
			],
		]);

		const mastra = getMastra();
		const architect = mastra.getAgent("architectAgent");

		const result = await architect.stream(userText, {
			memory: {
				thread: sessionRow.id,
				resource: session.user.id,
			},
			requestContext,
		});

		// Auto-save: atualiza updatedAt da sessão a cada turno (server-side).
		// O working memory do Mastra persiste automaticamente via Memory config.
		await db
			.update(agentCreationSession)
			.set({ updatedAt: new Date() })
			.where(eq(agentCreationSession.id, sessionRow.id));

		return new Response(result.textStream as ReadableStream<string>, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-store",
				"X-Accel-Buffering": "no",
			},
		});
	} catch (err) {
		console.error("[architect/chat] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message:
					err instanceof Error ? err.message : "Erro desconhecido.",
			},
			{ status: 500 },
		);
	}
}

function extractMessageText(msg: ChatMessagePart | undefined): string {
	if (!msg) return "";
	const content = msg.content;
	if (typeof content === "string") return content.trim();
	if (!Array.isArray(content)) return "";
	const parts = content
		.filter((p) => p && p.type === "text" && typeof p.text === "string")
		.map((p) => String(p.text));
	return parts.join("\n").trim();
}

function buildWorkingMemorySnapshot(
	_session: {
		id: string;
		templateId: string;
		draftSnapshot: unknown;
	},
	currentStage: "ideation" | "planning" | "knowledge" | "creation",
) {
	return {
		currentStage,
		checklist: {
			ideation: {
				businessName: null,
				industry: null,
				targetAudience: null,
				offering: null,
				differentiator: null,
				goalForAgent: null,
				ticketMean: null,
				status: "pending",
			},
			planning: {
				persona: {
					name: null,
					gender: null,
					tone: null,
					formality: null,
					humor: null,
					empathy: null,
					antiPatterns: [],
				},
				salesTechniques: [],
				emojiConfig: {
					mode: "curated",
					curatedList: [],
					allowed: [],
					forbidden: [],
				},
				voiceConfig: {
					enabled: false,
					provider: null,
					voiceId: null,
					mode: "always_text",
					triggers: [],
				},
				capabilities: [],
				status: "pending",
			},
			knowledge: {
				documentIds: [],
				additionalNotes: null,
				domainAnswers: {},
				status: "pending",
			},
			creation: {
				finalized: false,
				publishedAgentId: null,
				status: "pending",
			},
		},
		artifactIds: {
			businessProfile: null,
			agentBlueprint: null,
			knowledgeBase: null,
			finalSummary: null,
		},
	};
}
