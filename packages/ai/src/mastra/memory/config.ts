import { Memory } from "@mastra/memory";
import { getMastraStorage } from "../storage";

/**
 * Factory pra Memory do agente comercial.
 *
 * Phase 07A: configuracao minima sem vector store —
 * - `lastMessages: 20` (janela de recencia)
 * - `workingMemory` (resumo contextual persistente)
 *
 * `semanticRecall` sera habilitado na Phase 08 junto com pgvector,
 * porque requer vector store configurado (PgVector do @mastra/pg).
 * Referencia: https://mastra.ai/en/docs/memory/semantic-recall
 *
 * Lazy init pra evitar side effects no import.
 */
let memoryInstance: Memory | null = null;

export function getCommercialAgentMemory(): Memory {
	if (!memoryInstance) {
		memoryInstance = new Memory({
			storage: getMastraStorage(),
			options: {
				lastMessages: 20,
				semanticRecall: false,
				workingMemory: {
					enabled: true,
				},
			},
		});
	}
	return memoryInstance;
}
