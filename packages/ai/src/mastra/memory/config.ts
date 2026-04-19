import { Memory } from "@mastra/memory";
import { getMastraStorage } from "../storage";

/**
 * Factory pra Memory do agente comercial.
 *
 * Configuracao atualizada conforme divergencia aprovada por @architect
 * (Aria) em 2026-04-19: usar `semanticRecall` + `workingMemory` em vez
 * de `observationalMemory` (obsoleto).
 *
 * - `lastMessages: 20` — janela de recencia
 * - `semanticRecall`: top-K retrieval semantico por thread
 * - `workingMemory`: resumo contextual persistente (nome, preferencias, etc)
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
				semanticRecall: {
					topK: 5,
					messageRange: { before: 2, after: 1 },
					scope: "resource",
				},
				workingMemory: {
					enabled: true,
				},
			},
		});
	}
	return memoryInstance;
}
