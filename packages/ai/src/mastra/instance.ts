import { Mastra } from "@mastra/core";
import { commercialAgent } from "./agents/commercial";
import { getMastraStorage } from "./storage";

/**
 * Instancia singleton do Mastra pro projeto Vertech.
 *
 * - 1 agente registrado em 07A: commercialAgent (dinamico, multi-tenant)
 * - architectAgent adicionado em Phase 09
 * - orchestratorAgent adicionado em Phase 10
 *
 * Lazy init — evita side effects no import. Primeira chamada a
 * `getMastra()` cria a instancia e faz boot do storage.
 */
let mastraInstance: Mastra | null = null;

export function getMastra(): Mastra {
	if (!mastraInstance) {
		mastraInstance = new Mastra({
			agents: {
				commercialAgent,
			},
			storage: getMastraStorage(),
		});
	}
	return mastraInstance;
}
