import { RequestContext, getMastra } from "@repo/ai";
import {
	agent as agentTable,
	db,
	eq,
	pipelineStage,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatBody = {
	messages?: Array<{ role: string; content: string }>;
	mode?: "sdr" | "closer" | "pos-venda";
};

/**
 * POST /api/agents/[agentId]/sandbox/chat — M2-02 Sandbox Playground.
 *
 * Invoca commercialAgent (Atendente) com `requestContext.isSandbox: true`.
 * Tools criam lead/atividade/evento com flag isSandbox=true (isolado de prod).
 *
 * Body: { messages: [{role, content}, ...], mode? }
 * Resp: text/plain stream (useChat streamProtocol: 'text').
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ agentId: string }> },
) {
	const session = await getSession();
	if (!session?.user) {
		return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
	}

	const { agentId } = await params;
	const body = (await req.json().catch(() => null)) as ChatBody | null;
	const messages = Array.isArray(body?.messages) ? body.messages : [];
	if (messages.length === 0) {
		return NextResponse.json({ error: "MISSING_MESSAGES" }, { status: 400 });
	}

	const agentRow = await db.query.agent.findFirst({
		where: eq(agentTable.id, agentId),
	});
	if (!agentRow) {
		return NextResponse.json({ error: "AGENT_NOT_FOUND" }, { status: 404 });
	}

	// Modo: explícito do body OU infere do stage default do pipeline (best-effort)
	let mode = body?.mode;
	if (!mode) {
		const stage = await db.query.pipelineStage.findFirst({
			where: eq(pipelineStage.pipelineId, agentRow.organizationId),
		});
		mode = inferModeFromStageName(stage?.name) ?? "sdr";
	}

	const ctx = new RequestContext();
	ctx.set("agentId", agentId);
	ctx.set("organizationId", agentRow.organizationId);
	ctx.set("isSandbox", true);
	ctx.set("atendenteMode", mode);

	const mastra = getMastra();
	const agent = mastra.getAgent("commercialAgent");
	const lastUser = messages.filter((m) => m.role === "user").at(-1);
	const userMessage = lastUser?.content ?? "";

	console.log(
		`[sandbox/chat] agentId=${agentId} mode=${mode} userMessage="${userMessage.slice(0, 80)}"`,
	);

	const stream = await agent.stream(userMessage, {
		memory: {
			thread: `sandbox-${agentId}-${session.user.id}`,
			resource: `sandbox-lead-${session.user.id}`,
		},
		requestContext: ctx,
	});

	const encoder = new TextEncoder();
	const out = new ReadableStream<Uint8Array>({
		async start(controller) {
			for await (const chunk of stream.textStream) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});

	return new Response(out, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-cache",
		},
	});
}

function inferModeFromStageName(name: string | undefined): "sdr" | "closer" | "pos-venda" | undefined {
	if (!name) return;
	const s = name.toLowerCase();
	if (/(propos|negoci|fech|deal|closing)/.test(s)) return "closer";
	if (/(ganho|cliente|pós|pos[-_ ]venda|onboard|sucesso)/.test(s)) return "pos-venda";
	return "sdr";
}
