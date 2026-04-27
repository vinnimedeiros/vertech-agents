import type { ArchitectTemplateId } from "./templates";

/**
 * Biblioteca de perguntas curadas por vertical (refactor wizard 2026-04-20).
 *
 * Usadas na Etapa 1 (Idealização) do wizard. User marca 3+ perguntas e
 * preenche com limite dinâmico de 10k chars total divididos entre as
 * marcadas (ex: 4 marcadas = 2.5k cada).
 *
 * Estrutura inspirada no Mercado Agentes (pesquisa 2026-04-19). Adaptada
 * pra cada vertical suportado no Vertech.
 */

export type VerticalQuestion = {
	id: string;
	label: string;
	placeholder: string;
};

export const VERTICAL_QUESTIONS: Record<
	ArchitectTemplateId,
	VerticalQuestion[]
> = {
	clinical: [
		{
			id: "specialties",
			label: "Quais especialidades e procedimentos oferecem?",
			placeholder:
				"Ex: odontologia estética, implantes, clareamento, ortodontia...",
		},
		{
			id: "appointments",
			label: "Como funcionam os agendamentos hoje?",
			placeholder:
				"Ex: via WhatsApp com recepção, agenda compartilhada entre 4 dentistas...",
		},
		{
			id: "insurance",
			label: "Quais convênios aceitam e política de pagamento?",
			placeholder:
				"Ex: Unimed, Bradesco Saúde, parcelamento em até 12x, PIX à vista com 10% off...",
		},
		{
			id: "urgencies",
			label: "Como lidam com urgências e emergências?",
			placeholder:
				"Ex: urgência odontológica é atendida no mesmo dia, emergência médica encaminhamos pro pronto-socorro...",
		},
		{
			id: "hours",
			label: "Horário de atendimento e localização?",
			placeholder:
				"Ex: seg-sex 8h-19h, sáb 8h-13h, bairro Jardins em SP...",
		},
		{
			id: "policy",
			label: "Política de cancelamento e remarcação?",
			placeholder:
				"Ex: cancelamento sem custo até 24h antes, remarcação gratuita, no-show cobra 30%...",
		},
		{
			id: "goal",
			label: "Qual o principal objetivo do agente?",
			placeholder:
				"Ex: qualificar leads e agendar consulta de avaliação, reduzir no-show...",
		},
	],
	ecommerce: [
		{
			id: "products",
			label: "Categorias e principais produtos?",
			placeholder:
				"Ex: suplementos esportivos, foco em whey protein e creatina, ticket médio R$300...",
		},
		{
			id: "shipping",
			label: "Política de frete e prazos?",
			placeholder:
				"Ex: frete grátis acima de R$199, prazo 3-7 dias úteis, Sedex retirada no balcão...",
		},
		{
			id: "payment",
			label: "Formas de pagamento aceitas?",
			placeholder:
				"Ex: cartão em até 10x, PIX com 5% off, boleto, Mercado Pago, PayPal...",
		},
		{
			id: "returns",
			label: "Política de troca e devolução?",
			placeholder:
				"Ex: 7 dias pra arrependimento, 30 dias pra defeito de fábrica, coleta gratuita...",
		},
		{
			id: "channels",
			label: "Canais de venda e integrações?",
			placeholder:
				"Ex: só site próprio, ou também Mercado Livre, Amazon, Instagram Shopping...",
		},
		{
			id: "objections",
			label: "Principais objeções dos clientes?",
			placeholder:
				"Ex: preço mais alto que concorrência, prazo de entrega, dúvidas sobre autenticidade...",
		},
		{
			id: "goal",
			label: "Qual o principal objetivo do agente?",
			placeholder:
				"Ex: responder dúvidas de produto, recuperar carrinho abandonado, acompanhar pedido...",
		},
	],
	real_estate: [
		{
			id: "types",
			label: "Tipos de imóveis que trabalham?",
			placeholder:
				"Ex: apartamentos residenciais 2-4 quartos, casas em condomínio fechado, salas comerciais...",
		},
		{
			id: "regions",
			label: "Regiões de atuação?",
			placeholder:
				"Ex: zona sul de SP (Moema, Vila Mariana, Itaim), Litoral Norte (Guarujá, Bertioga)...",
		},
		{
			id: "modalities",
			label: "Trabalham com aluguel, venda ou ambos?",
			placeholder:
				"Ex: 70% venda, 30% locação residencial; vendas a partir de R$800k...",
		},
		{
			id: "leads",
			label: "Como atendem novos leads hoje?",
			placeholder:
				"Ex: chegam via portal e Instagram, cadastro manual em planilha, corretor liga em até 2h...",
		},
		{
			id: "visits",
			label: "Como funcionam as visitas aos imóveis?",
			placeholder:
				"Ex: agendamento prévio com corretor, visitas seg-sáb 9h-19h, máximo 3 imóveis por visita...",
		},
		{
			id: "financing",
			label: "Oferecem assessoria em financiamento?",
			placeholder:
				"Ex: sim, parceria com Caixa e Itaú, auxiliamos na simulação e documentação...",
		},
		{
			id: "goal",
			label: "Qual o principal objetivo do agente?",
			placeholder:
				"Ex: qualificar leads, agendar visitas automaticamente, responder FAQ sobre imóveis...",
		},
	],
	info_product: [
		{
			id: "offer",
			label: "Qual o produto/curso e transformação entregue?",
			placeholder:
				"Ex: curso de copywriting pra empreendedores, alunos aprendem a escrever anúncios que convertem...",
		},
		{
			id: "audience",
			label: "Quem é o público-alvo (ICP)?",
			placeholder:
				"Ex: donos de negócio 30-50 anos, faturam R$10-50k/mês, buscam escalar sem depender de tráfego pago...",
		},
		{
			id: "pricing",
			label: "Preço, garantia e formato?",
			placeholder:
				"Ex: R$1.997 à vista ou 12x R$199, garantia 7 dias, curso gravado com mentoria ao vivo semanal...",
		},
		{
			id: "sales",
			label: "Canal principal de venda?",
			placeholder:
				"Ex: lançamento trimestral via Instagram + YouTube, carrinho aberto 5 dias, funil com vídeo + lives...",
		},
		{
			id: "objections",
			label: "Objeções mais comuns?",
			placeholder:
				"Ex: 'não tenho tempo', 'já fiz outros e não deu certo', 'é caro'...",
		},
		{
			id: "social_proof",
			label: "Provas sociais disponíveis?",
			placeholder:
				"Ex: +500 alunos, 15 cases de faturamento acima de R$30k/mês, depoimentos em vídeo no site...",
		},
		{
			id: "goal",
			label: "Qual o principal objetivo do agente?",
			placeholder:
				"Ex: captar lead na lista de espera, quebrar objeções no carrinho aberto, follow-up...",
		},
	],
	saas: [
		{
			id: "problem",
			label: "Problema que o produto resolve?",
			placeholder:
				"Ex: CRM para imobiliárias pequenas que usam planilha e Whatsapp bagunçado...",
		},
		{
			id: "icp",
			label: "ICP (cliente ideal)?",
			placeholder:
				"Ex: imobiliárias de 3-15 corretores, faturam R$200k-1M/mês, têm problema com lead em múltiplos canais...",
		},
		{
			id: "pricing",
			label: "Modelo de pricing?",
			placeholder:
				"Ex: trial 14 dias sem cartão, planos Starter R$99/mês, Pro R$299/mês, Enterprise custom...",
		},
		{
			id: "features",
			label: "Principais features e diferenciais?",
			placeholder:
				"Ex: CRM + captura de lead automática + WhatsApp oficial + integração com 20 portais...",
		},
		{
			id: "integrations",
			label: "Integrações e stack típica?",
			placeholder:
				"Ex: integra com OLX, Viva Real, Zap Imóveis, Vista, Kommo; REST API aberta...",
		},
		{
			id: "onboarding",
			label: "Como é o onboarding e time-to-value?",
			placeholder:
				"Ex: self-serve em 15 min, import CSV de contatos, primeira integração configurada no D+1...",
		},
		{
			id: "goal",
			label: "Qual o principal objetivo do agente?",
			placeholder:
				"Ex: qualificar leads por ICP, agendar demo, responder FAQ técnica, reativar trial expirado...",
		},
	],
	local_services: [
		{
			id: "service",
			label: "Tipo de serviço e especialidades?",
			placeholder:
				"Ex: restaurante italiano contemporâneo, especialidade em massas artesanais e vinhos...",
		},
		{
			id: "location",
			label: "Localização e ambiente?",
			placeholder:
				"Ex: bairro Vila Madalena em SP, 40 lugares, música ao vivo quartas e sextas...",
		},
		{
			id: "hours",
			label: "Horário de funcionamento?",
			placeholder:
				"Ex: ter-dom 19h-23h30, sáb-dom também almoço 12h-15h, fechado seg...",
		},
		{
			id: "reservations",
			label: "Como funciona reserva / agendamento?",
			placeholder:
				"Ex: reserva só pra grupos de 6+, mesas até 5 pessoas walk-in, confirmação até 2h antes...",
		},
		{
			id: "payment",
			label: "Formas de pagamento e ticket médio?",
			placeholder:
				"Ex: cartão, PIX, dinheiro; ticket médio R$120/pessoa com couvert incluso...",
		},
		{
			id: "differential",
			label: "Diferencial competitivo?",
			placeholder:
				"Ex: única casa com autenticidade italiana no bairro, chef formado na Itália...",
		},
		{
			id: "goal",
			label: "Qual o principal objetivo do agente?",
			placeholder:
				"Ex: aceitar reservas automaticamente, responder dúvidas sobre cardápio, confirmar reservas...",
		},
	],
	custom: [
		{
			id: "business",
			label: "Me conta sobre o seu negócio?",
			placeholder:
				"Ex: o que faz, como opera, quem atende, há quanto tempo...",
		},
		{
			id: "audience",
			label: "Quem é o seu cliente ideal?",
			placeholder:
				"Ex: perfil demográfico, onde encontra, qual a dor principal...",
		},
		{
			id: "offer",
			label: "Qual a oferta principal?",
			placeholder:
				"Ex: produtos, serviços, faixa de preço, modalidade de entrega...",
		},
		{
			id: "channel",
			label: "Canal principal de atendimento?",
			placeholder:
				"Ex: WhatsApp, site com chat, Instagram, presencial, central telefônica...",
		},
		{
			id: "process",
			label: "Como funciona seu processo comercial hoje?",
			placeholder:
				"Ex: quem atende, em quanto tempo, o que qualifica, o que fecha...",
		},
		{
			id: "pain",
			label: "Qual o maior desafio comercial?",
			placeholder:
				"Ex: volume de leads x capacidade de atender, tempo de resposta, perda por falta de follow-up...",
		},
		{
			id: "goal",
			label: "Qual o principal objetivo do agente?",
			placeholder:
				"Ex: responder 24/7, qualificar antes do humano, automatizar agendamento...",
		},
	],
};

export const QUESTIONS_CHAR_POOL = 10_000;
export const MIN_QUESTIONS_REQUIRED = 3;

/**
 * Calcula limite de chars por pergunta marcada.
 * 10k / N selecionadas, arredondado pra baixo.
 */
export function getCharLimitPerQuestion(selectedCount: number): number {
	if (selectedCount <= 0) return QUESTIONS_CHAR_POOL;
	return Math.floor(QUESTIONS_CHAR_POOL / selectedCount);
}
