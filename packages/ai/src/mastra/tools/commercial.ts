/**
 * Registry de tools do Agente Comercial.
 *
 * Stub em Phase 07A — registry vazio. Populado na Phase 08 com 7 tools:
 * searchKnowledgeBase, moveLeadStage, updateLeadData, createLeadActivity,
 * scheduleMeeting, sendWhatsAppMedia, handoffToHuman.
 *
 * Agente dinamico (agents/commercial.ts) le esta constante e filtra pelas
 * `enabledTools` configuradas no banco por agente.
 */
export const commercialTools = {} as const;

export type CommercialToolKey = keyof typeof commercialTools;
