import { Mastra } from "@mastra/core";
import { getArchitectAgent } from "./agents/architect";
import { getCommercialAgent } from "./agents/commercial";
import { getMastraStorage } from "./storage";

/**
 * Instancia singleton do Mastra pro projeto Vertech.
 *
 * - commercialAgent (Atendente Supervisor — M1-02): dinamico, multi-tenant.
 *   Sub-agents do TIME adicionados em M2-03/04/05 via `getTeamMembers()`.
 * - architectAgent (09.5): guia construção de agentes em 4 etapas.
 *
 * **Scorers (M1-05)** vivem em `./scorers/` como funções TS puras
 * (interface `Scorer`). Quando Mastra estabilizar `createScorer` na API
 * pública, plugar aqui via `scorers: {...}` property.
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
