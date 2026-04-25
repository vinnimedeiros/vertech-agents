import type {
	AtendenteGroundTruth,
	AtendenteInput,
	AtendenteMode,
} from "./atendente-schemas";

/**
 * Cases seed pros datasets do Atendente — Roadmap V3 M1-04.
 *
 * 2 cases por modo (6 total) pra ter o mínimo viável pra rodar Experiments.
 * Vinni adiciona conversas reais de produção via Studio UI ao longo do
 * tempo (meta: 30+ por modo).
 *
 * Selecionados pra cobrir patterns críticos:
 * - SDR: lead frio descobrindo, lead morno qualificado
 * - Closer: objeção preço, decisão final de compra
 * - Pós-venda: suporte simples, escalação pra humano
 */

type SeedCase = {
	input: AtendenteInput;
	groundTruth: AtendenteGroundTruth;
	metadata: { source: "seed"; description: string };
};

export const ATENDENTE_SEED_CASES: Record<AtendenteMode, SeedCase[]> = {
	sdr: [
		{
			input: {
				mensagensLead: [
					"Oi, vi anúncio de vocês. O que é exatamente esse agente de IA?",
				],
				contextoLead: {
					origem: "Meta Ads",
					conversasAnteriores: 0,
				},
			},
			groundTruth: {
				qualificacaoEsperada: {
					momento: "descoberta",
					urgencia: "baixa",
				},
				acaoEsperada: "continuar-conversa",
				toneEsperado:
					"Acolhedor + curioso. Apresenta valor em 1-2 frases. Faz pergunta aberta pra entender o que lead procura. Sem jargão técnico.",
				deveEvitar: [
					"Despejar feature list",
					"Pedir email/telefone na primeira msg",
					"Prometer prazos ou preços",
				],
			},
			metadata: {
				source: "seed",
				description: "Lead frio chegou via anúncio, primeira mensagem genérica",
			},
		},
		{
			input: {
				mensagensLead: [
					"Oi! Sou dona de uma clínica de estética em Curitiba e to perdendo lead porque não consigo responder rápido no WhatsApp à noite. Vocês resolvem isso?",
					"Tenho 4 atendentes mas saem 18h",
				],
				contextoLead: {
					origem: "indicação",
					vertical: "estética",
					conversasAnteriores: 0,
				},
			},
			groundTruth: {
				qualificacaoEsperada: {
					vertical: "estética",
					dor: "perde lead à noite por falta de atendimento",
					momento: "consideração",
					urgencia: "média",
					decisor: "sim",
				},
				acaoEsperada: "agendar",
				toneEsperado:
					"Empático + assertivo. Confirma a dor com 1 frase. Propõe agendar conversa de 20-30min com humano OU demonstra valor via case similar. Captura nome se ainda não tem.",
				deveEvitar: [
					"Vender em pitch longo",
					"Inventar case que não existe",
					"Prometer ROI específico",
				],
			},
			metadata: {
				source: "seed",
				description: "Lead morno qualificado: dor clara + decisora + vertical conhecido",
			},
		},
	],

	closer: [
		{
			input: {
				mensagensLead: [
					"Olha, gostei muito da apresentação. Mas pra ser sincero, R$3k/mês ta meio salgado. Tem como dar desconto?",
				],
				contextoLead: {
					vertical: "consultório",
					ticketEstimado: "R$3-5k/mês",
					conversasAnteriores: 8,
				},
			},
			groundTruth: {
				qualificacaoEsperada: {
					momento: "decisão",
					objecaoPrincipal: "preço",
					urgencia: "alta",
				},
				acaoEsperada: "pedir-humano",
				toneEsperado:
					"Reconhece a objeção sem desvalorizar. NÃO promete desconto sem autorização (regra de negócio). Sugere conversa rápida com humano (vendedor agência) pra alinhar condição. Mantém tom firme + cordial.",
				deveEvitar: [
					"Prometer desconto sem autorização",
					"Pressionar com urgência fake",
					"Desvalorizar o preço ('não é tão caro assim')",
				],
			},
			metadata: {
				source: "seed",
				description: "Objeção preço — exige handoff pra humano (regra negócio)",
			},
		},
		{
			input: {
				mensagensLead: [
					"Beleza, decidimos fechar. Como faz pagamento? E quando começa?",
				],
				contextoLead: {
					vertical: "imobiliária",
					ticketEstimado: "R$5k/mês",
					conversasAnteriores: 15,
				},
			},
			groundTruth: {
				qualificacaoEsperada: {
					momento: "decisão",
					decisor: "sim",
					urgencia: "alta",
				},
				acaoEsperada: "enviar-proposta",
				toneEsperado:
					"Celebra a decisão com 1 emoji apropriado. Envia proposta formal estruturada (link/PDF). Confirma timeline de onboarding (7-14 dias). Captura dados pra cobrança (PIX/boleto/cartão).",
				deveEvitar: [
					"Mais perguntas de descoberta",
					"Tentar upsell agressivo no fechamento",
					"Demorar pra responder",
				],
			},
			metadata: {
				source: "seed",
				description: "Sim final — fechar com proposta + dados pagamento",
			},
		},
	],

	"pos-venda": [
		{
			input: {
				mensagensLead: [
					"Oi, como faço pra trocar a foto do meu agente?",
				],
				contextoLead: {
					vertical: "consultório",
					conversasAnteriores: 23,
				},
			},
			groundTruth: {
				qualificacaoEsperada: {
					momento: "pós-venda",
					urgencia: "baixa",
				},
				acaoEsperada: "continuar-conversa",
				toneEsperado:
					"Direto + amigável. Responde a pergunta passo a passo (3 steps max). Oferece print/vídeo se cliente quiser. Não sobrecarrega com info extra.",
				deveEvitar: [
					"Resposta longa cobrindo tudo do produto",
					"Pedir feedback sem necessidade",
					"Sugerir features que cliente não pediu",
				],
			},
			metadata: {
				source: "seed",
				description: "Pergunta operacional simples pós-venda",
			},
		},
		{
			input: {
				mensagensLead: [
					"To muito puto, o agente respondeu errado pro meu cliente VIP e ele cancelou consulta. Quero falar com responsável AGORA.",
				],
				contextoLead: {
					vertical: "consultório",
					conversasAnteriores: 47,
				},
			},
			groundTruth: {
				qualificacaoEsperada: {
					momento: "pós-venda",
					urgencia: "alta",
					objecaoPrincipal: "qualidade do produto",
				},
				acaoEsperada: "pedir-humano",
				toneEsperado:
					"Acolhe a frustração SEM minimizar. Pede desculpa de verdade (1 frase). Confirma que escalou pra humano AGORA. Pede 1 detalhe (qual cliente/quando) pra acelerar análise. NÃO defende o produto.",
				deveEvitar: [
					"Defender o produto na primeira resposta",
					"Pedir reformulação ('pode explicar melhor')",
					"Demorar mais de 1min pra confirmar handoff",
					"Prometer reembolso/compensação sem autorização",
				],
			},
			metadata: {
				source: "seed",
				description: "Cliente bravo — escalação imediata pra humano",
			},
		},
	],
};
