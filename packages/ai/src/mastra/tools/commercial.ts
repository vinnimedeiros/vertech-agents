/**
 * Registry de tools do Atendente — re-exporta `atendenteTools` da Roadmap V3 M2-01.
 *
 * Substitui o stub vazio anterior (07A). Atendente dinâmico (agents/commercial.ts)
 * filtra essa constante pelas `enabledTools` configuradas no banco por agente.
 *
 * Tools disponíveis (11): criarLead, moverLeadStage, atualizarLead, definirTemperatura,
 * verHistoricoLead, buscarConhecimento, verDisponibilidade, agendarEvento, criarTarefa,
 * pedirHumano, enviarPropostaPdf.
 *
 * 8 são reais (lead/agenda/atividade), 3 são stubs Mastra-compliant aguardando wire
 * em phases futuras (buscarConhecimento M2-02, pedirHumano M2-05, enviarPropostaPdf M7).
 */
export {
	agendarEvento,
	atendenteTools,
	atendenteTools as commercialTools,
	atualizarLead,
	buscarConhecimento,
	criarLead,
	criarTarefa,
	definirTemperatura,
	enviarPropostaPdf,
	moverLeadStage,
	pedirHumano,
	verDisponibilidade,
	verHistoricoLead,
	type AtendenteToolKey,
	type AtendenteToolKey as CommercialToolKey,
} from "./atendente";
