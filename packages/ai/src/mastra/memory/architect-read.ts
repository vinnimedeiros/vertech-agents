import { getLogger } from "../logger";
import type { ArchitectWorkingMemory } from "../tools/architect/helpers";
import { getArchitectAgentMemory } from "./architect";

const log = getLogger("memory/architect");

/**
 * Lê o working memory atual do Arquiteto pra uma sessão (story 09.5 fix).
 *
 * Consumido pelo route handler `/api/architect/chat` pra popular o
 * `requestContext.workingMemory` com o estado real (o que o LLM tem
 * atualizado via tool `updateWorkingMemory` built-in do Mastra), em
 * vez de um placeholder estático.
 *
 * Retorna `null` se a sessão nunca teve WM (primeiro turn) — caller
 * aplica snapshot zerado.
 */
export async function getArchitectWorkingMemory(params: {
	sessionId: string;
	userId: string;
}): Promise<ArchitectWorkingMemory | null> {
	const memory = getArchitectAgentMemory();
	const wmJson = await memory.getWorkingMemory({
		threadId: params.sessionId,
		resourceId: params.userId,
	});

	if (!wmJson) return null;

	try {
		return JSON.parse(wmJson) as ArchitectWorkingMemory;
	} catch (err) {
		log.warn({ err, sessionId: params.sessionId }, "JSON.parse failed on working memory");
		return null;
	}
}
