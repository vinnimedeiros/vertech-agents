/**
 * Registry de tools do Arquiteto (meta-agente de co-criacao).
 *
 * Stub em Phase 07A — vazio. Populado na Phase 09 com tools que operam
 * sobre `agent_creation_session` em modo draft: addStageToDraft,
 * configureAgentPersona, publishAgentWithFunnel, etc.
 *
 * ISOLATION BY DESIGN: Arquiteto NUNCA recebe `commercialTools` nem
 * `orchestratorTools`. Ele so opera em draft session ate publicar.
 */
export const architectTools = {} as const;

export type ArchitectToolKey = keyof typeof architectTools;
