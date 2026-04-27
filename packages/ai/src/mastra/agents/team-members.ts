import type { Agent } from "@mastra/core/agent";

/**
 * Membros do TIME comercial Vertech V3 (Visão V3 — `project_vision_v3_produto.md`).
 *
 * Estrutura preparada pra adicionar sub-agents progressivamente conforme as
 * phases do roadmap V3 (`docs/PROJECT-ROADMAP-V3.md`):
 *
 * - M2-01 ✅ Atendente solo (= commercialAgent atual, é o Supervisor)
 * - M2-03 ⏳ + Analista de Inteligência (lê pipeline + RAG-3, propõe ações)
 * - M2-04 ⏳ + Campanhas (Workflow + queue BullMQ + delay anti-bloqueio)
 * - M2-05 ⏳ + Assistente Comercial (handoff humano via grupo WhatsApp)
 *
 * Cada nova adição segue critério mensurável R2 (mitigação multi-agent failure
 * 41-86%): "se 3 coordenam >70% sucesso em sandbox → escala pra 4. Senão recua".
 *
 * **M1-02 stub:** retorna objeto vazio. Atendente opera solo. Quando M2-03
 * implementar Analista, esta função adiciona `analystAgent` aqui sem refactor
 * do `commercial.ts` (Supervisor descobre sub-agents via `agents` property).
 *
 * Mastra Supervisor Pattern docs:
 * https://mastra.ai/docs/agents/supervisor-agents
 */
export function getTeamMembers(): Record<string, Agent> {
	// M1-02 stub — populado em M2-03/04/05
	return {};
}

/**
 * IDs canônicos dos membros do TIME (referência pra futuras adições).
 * Usar como key na Record retornada por `getTeamMembers()` quando implementar.
 */
export const TEAM_MEMBER_IDS = {
	atendente: "atendente-agent", // = commercialAgent (Supervisor)
	analista: "analista-agent", // M2-03
	campanhas: "campanhas-agent", // M2-04
	assistente: "assistente-agent", // M2-05
} as const;

export type TeamMemberId = (typeof TEAM_MEMBER_IDS)[keyof typeof TEAM_MEMBER_IDS];
