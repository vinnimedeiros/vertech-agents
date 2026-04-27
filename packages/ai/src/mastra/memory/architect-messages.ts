import { getArchitectAgentMemory } from "./architect";

export type ArchitectMessage = {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	createdAt: string;
};

/**
 * Lê mensagens persistidas da thread do Arquiteto (story 09.5 retomada).
 *
 * Consumido pelo endpoint GET /api/architect/sessions/[id]/messages pra
 * hidratar useChat ao retomar sessão existente. Filtra system messages
 * e extrai texto de content.content (parts array do Mastra).
 */
export async function getArchitectMessages(params: {
	sessionId: string;
	userId: string;
}): Promise<ArchitectMessage[]> {
	const memory = getArchitectAgentMemory();
	const result = await memory.recall({
		threadId: params.sessionId,
		resourceId: params.userId,
	});

	const out: ArchitectMessage[] = [];
	for (const msg of result.messages) {
		if (msg.role !== "user" && msg.role !== "assistant") continue;
		const text = extractTextFromMastraContent(msg.content);
		if (!text) continue;
		out.push({
			id: msg.id,
			role: msg.role,
			content: text,
			createdAt:
				msg.createdAt instanceof Date
					? msg.createdAt.toISOString()
					: new Date(msg.createdAt).toISOString(),
		});
	}
	return out;
}

function extractTextFromMastraContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!content || typeof content !== "object") return "";
	const c = content as {
		content?: string;
		parts?: Array<{ type?: string; text?: string }>;
	};
	if (typeof c.content === "string" && c.content.trim()) return c.content;
	if (Array.isArray(c.parts)) {
		return c.parts
			.filter((p) => p?.type === "text" && typeof p.text === "string")
			.map((p) => p.text as string)
			.join("\n")
			.trim();
	}
	return "";
}
