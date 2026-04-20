import { Mastra } from "@mastra/core";
import { getArchitectAgent } from "./agents/architect";
import { getCommercialAgent } from "./agents/commercial";
import { getMastraStorage } from "./storage";

/**
 * Instancia singleton do Mastra pro projeto Vertech.
 *
 * - commercialAgent (07A): dinamico, multi-tenant
 * - architectAgent (09.5): guia construção de agentes em 4 etapas
 * - orchestratorAgent: Phase 10
 *
 * Lazy init — evita side effects no import. Primeira chamada a
 * `getMastra()` cria a instancia, os agents e faz boot do storage.
 */
let mastraInstance: Mastra | null = null;

export function getMastra(): Mastra {
	if (!mastraInstance) {
		mastraInstance = new Mastra({
			agents: {
				commercialAgent: getCommercialAgent(),
				architectAgent: getArchitectAgent(),
			},
			storage: getMastraStorage(),
		});
	}
	return mastraInstance;
}
