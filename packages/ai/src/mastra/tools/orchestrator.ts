/**
 * Registry de tools do Orquestrador (copiloto universal).
 *
 * Stub em Phase 07A — vazio. Populado na Phase 10 com ~50 tools de
 * operacao da aplicacao: updatePipeline, moveLeadStage, createAgent,
 * scheduleEvent, updateWorkspaceBranding, etc.
 *
 * ISOLATION BY DESIGN: Orquestrador NUNCA recebe `commercialTools` (nao
 * conversa com leads) nem `architectTools` (nao manipula draft sessions).
 */
export const orchestratorTools = {} as const;

export type OrchestratorToolKey = keyof typeof orchestratorTools;
