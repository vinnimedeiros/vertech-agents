/**
 * Registry dos 7 templates da tela de boas-vindas do Arquiteto (story 09.1).
 *
 * Cada template fica no seu proprio emoji + label + microcopy curto. O
 * `id` alimenta o query param `/agents/new?template={id}` consumido pela
 * story 09.2 (chat do Arquiteto) pra customizar o prompt inicial.
 *
 * `custom` e o ultimo e tem estilo `dashed` — e o opt-out do template fixo
 * pra quem quer descrever o negocio do zero.
 *
 * Referencia: UI Spec § 3 + Tech Spec § 2.3 (template por vertical).
 */

export type ArchitectTemplateId =
	| "clinical"
	| "ecommerce"
	| "real_estate"
	| "info_product"
	| "saas"
	| "local_services"
	| "custom";

export type ArchitectTemplate = {
	id: ArchitectTemplateId;
	label: string;
	emoji: string;
	description: string;
	dashed?: boolean;
};

export const ARCHITECT_TEMPLATES: ArchitectTemplate[] = [
	{
		id: "clinical",
		label: "Clínica",
		emoji: "🏥",
		description: "Agendamento, pré-consulta e FAQ de procedimentos.",
	},
	{
		id: "ecommerce",
		label: "E-commerce",
		emoji: "🛒",
		description: "Dúvidas de produto, estoque e status de pedido.",
	},
	{
		id: "real_estate",
		label: "Imobiliária",
		emoji: "🏠",
		description: "Qualificação de lead, disponibilidade e visitas.",
	},
	{
		id: "info_product",
		label: "Infoprodutor",
		emoji: "💼",
		description: "Captura de lead, objeções e follow-up de carrinho.",
	},
	{
		id: "saas",
		label: "SaaS",
		emoji: "⚙️",
		description: "Onboarding, trials, upgrade e suporte inicial.",
	},
	{
		id: "local_services",
		label: "Serviços locais",
		emoji: "🍽️",
		description: "Reservas, orçamentos e dúvidas operacionais.",
	},
	{
		id: "custom",
		label: "Personalizado",
		emoji: "✨",
		description: "Descreva seu negócio do zero para o Arquiteto.",
		dashed: true,
	},
];

/**
 * Busca template pelo id. Retorna undefined se id nao existe.
 * Uso principal: rotas com query param `?template={id}`.
 */
export function findArchitectTemplate(
	id: string,
): ArchitectTemplate | undefined {
	return ARCHITECT_TEMPLATES.find((t) => t.id === id);
}
