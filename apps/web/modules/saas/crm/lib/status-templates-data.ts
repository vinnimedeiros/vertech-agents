/**
 * Dados dos 5 templates built-in (Phase 04F).
 * Fonte única de verdade — usada pelo seeder (populando `status_template` com `isBuiltIn=true`)
 * e também como fallback UI caso o banco ainda não tenha sido seedado.
 */

export type TemplateStage = {
	name: string;
	color: string;
	category: "NOT_STARTED" | "ACTIVE" | "SCHEDULED" | "WON" | "LOST";
	probability: number;
	maxDays: number | null;
	position: number;
};

export type TemplateMetadata = {
	iconKey?: string;
	suggestedAgent?: {
		persona: string;
		tone: string;
		openingMessage: string;
		tools: string[];
	};
};

export type BuiltInTemplate = {
	name: string;
	description: string;
	vertical: string;
	stages: TemplateStage[];
	metadata: TemplateMetadata;
};

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
	// ============================================================
	// 1. Genérico
	// ============================================================
	{
		name: "Genérico",
		vertical: "generico",
		description:
			"Funil enxuto pra qualquer negócio que vende algo. 4 etapas, sem fricção.",
		metadata: {
			iconKey: "Sparkles",
			suggestedAgent: {
				persona: "SDR generalista",
				tone: "Profissional e amigável",
				openingMessage:
					"Olá! Obrigado pelo contato. Como posso ajudar você hoje?",
				tools: [
					"moveLeadStage",
					"scheduleMeeting",
					"sendProposal",
					"handoffToHuman",
				],
			},
		},
		stages: [
			{ name: "Entrada", color: "#64748b", category: "NOT_STARTED", probability: 10, maxDays: 3, position: 0 },
			{ name: "Proposta", color: "#3b82f6", category: "ACTIVE", probability: 40, maxDays: 7, position: 1 },
			{ name: "Fechado", color: "#10b981", category: "WON", probability: 100, maxDays: null, position: 2 },
			{ name: "Perdido", color: "#f43f5e", category: "LOST", probability: 0, maxDays: null, position: 3 },
		],
	},

	// ============================================================
	// 2. Consultoria B2B
	// ============================================================
	{
		name: "Consultoria B2B",
		vertical: "consultoria-b2b",
		description:
			"Venda consultiva com qualificação, briefing e negociação. Para serviços B2B de alto ticket.",
		metadata: {
			iconKey: "Briefcase",
			suggestedAgent: {
				persona: "SDR consultivo",
				tone: "Formal-consultivo, conduz descoberta antes de pitch",
				openingMessage:
					"Oi! Vi que você se interessou pelos nossos serviços. Posso entender melhor o contexto da sua empresa pra ver se conseguimos realmente ajudar?",
				tools: [
					"moveLeadStage",
					"scheduleMeeting",
					"searchKnowledgeBase",
					"sendProposal",
					"createTask",
					"handoffToHuman",
				],
			},
		},
		stages: [
			{ name: "Entrada", color: "#64748b", category: "NOT_STARTED", probability: 5, maxDays: 2, position: 0 },
			{ name: "Qualificação", color: "#f59e0b", category: "ACTIVE", probability: 20, maxDays: 5, position: 1 },
			{ name: "Briefing", color: "#fb923c", category: "ACTIVE", probability: 40, maxDays: 10, position: 2 },
			{ name: "Proposta", color: "#3b82f6", category: "ACTIVE", probability: 60, maxDays: 7, position: 3 },
			{ name: "Negociação", color: "#8b5cf6", category: "ACTIVE", probability: 80, maxDays: 14, position: 4 },
			{ name: "Fechado", color: "#10b981", category: "WON", probability: 100, maxDays: null, position: 5 },
			{ name: "Perdido", color: "#f43f5e", category: "LOST", probability: 0, maxDays: null, position: 6 },
		],
	},

	// ============================================================
	// 3. Clínica / Saúde
	// ============================================================
	{
		name: "Clínica / Saúde",
		vertical: "clinica",
		description:
			"Agendamento de consultas/procedimentos. Inclui etapa Agendado que sincroniza com a agenda.",
		metadata: {
			iconKey: "Stethoscope",
			suggestedAgent: {
				persona: "Atendente empática",
				tone: "Acolhedor-profissional, pergunta sintomas/necessidade antes de ofertar horários",
				openingMessage:
					"Olá! Seja bem-vindo(a). Me conta brevemente o que você precisa que vou te ajudar a agendar com o profissional certo.",
				tools: [
					"moveLeadStage",
					"scheduleMeeting",
					"checkCalendarAvailability",
					"sendAddress",
					"sendPreparationInstructions",
					"handoffToHuman",
				],
			},
		},
		stages: [
			{ name: "Entrada", color: "#64748b", category: "NOT_STARTED", probability: 10, maxDays: 1, position: 0 },
			{ name: "Qualificação", color: "#f59e0b", category: "ACTIVE", probability: 30, maxDays: 2, position: 1 },
			{ name: "Agendado", color: "#06b6d4", category: "SCHEDULED", probability: 60, maxDays: 30, position: 2 },
			{ name: "Atendido", color: "#3b82f6", category: "ACTIVE", probability: 80, maxDays: 7, position: 3 },
			{ name: "Fechado", color: "#10b981", category: "WON", probability: 100, maxDays: null, position: 4 },
			{ name: "Perdido", color: "#f43f5e", category: "LOST", probability: 0, maxDays: null, position: 5 },
		],
	},

	// ============================================================
	// 4. E-commerce / Infoproduto
	// ============================================================
	{
		name: "E-commerce / Infoproduto",
		vertical: "ecommerce",
		description:
			"Venda direta de produto com checkout. Para lojas online e infoprodutos.",
		metadata: {
			iconKey: "ShoppingCart",
			suggestedAgent: {
				persona: "Vendedora direta",
				tone: "Energético-objetivo, quebra objeções, aciona escassez/urgência",
				openingMessage:
					"Oi! Vi seu interesse no produto. Posso te mandar o link pra finalizar agora? Tenho uma condição especial que termina hoje.",
				tools: [
					"moveLeadStage",
					"sendCheckoutLink",
					"applyDiscount",
					"sendTestimonial",
					"handoffToHuman",
					"searchKnowledgeBase",
				],
			},
		},
		stages: [
			{ name: "Entrada", color: "#64748b", category: "NOT_STARTED", probability: 15, maxDays: 2, position: 0 },
			{ name: "Interessado", color: "#f59e0b", category: "ACTIVE", probability: 35, maxDays: 3, position: 1 },
			{ name: "Carrinho", color: "#fb923c", category: "ACTIVE", probability: 60, maxDays: 2, position: 2 },
			{ name: "Pagamento", color: "#3b82f6", category: "ACTIVE", probability: 85, maxDays: 1, position: 3 },
			{ name: "Pago", color: "#10b981", category: "WON", probability: 100, maxDays: null, position: 4 },
			{ name: "Abandonado", color: "#f43f5e", category: "LOST", probability: 0, maxDays: null, position: 5 },
		],
	},

	// ============================================================
	// 5. Imobiliária
	// ============================================================
	{
		name: "Imobiliária",
		vertical: "imobiliaria",
		description:
			"Ciclo imobiliário com visita agendada ao imóvel. Inclui etapa sincronizável com agenda.",
		metadata: {
			iconKey: "Home",
			suggestedAgent: {
				persona: "Corretor consultivo",
				tone: "Profissional-confiante, entende perfil e sugere imóveis alinhados",
				openingMessage:
					"Olá! Que bom que você procurou a gente. Pra eu te mostrar os imóveis certos, me conta: você busca pra morar ou investir?",
				tools: [
					"moveLeadStage",
					"scheduleMeeting",
					"sendProperty",
					"sendDocuments",
					"handoffToHuman",
				],
			},
		},
		stages: [
			{ name: "Entrada", color: "#64748b", category: "NOT_STARTED", probability: 5, maxDays: 2, position: 0 },
			{ name: "Qualificação", color: "#f59e0b", category: "ACTIVE", probability: 15, maxDays: 5, position: 1 },
			{ name: "Visita Agendada", color: "#06b6d4", category: "SCHEDULED", probability: 35, maxDays: 14, position: 2 },
			{ name: "Visitou", color: "#3b82f6", category: "ACTIVE", probability: 55, maxDays: 10, position: 3 },
			{ name: "Proposta", color: "#8b5cf6", category: "ACTIVE", probability: 75, maxDays: 14, position: 4 },
			{ name: "Fechado", color: "#10b981", category: "WON", probability: 100, maxDays: null, position: 5 },
			{ name: "Perdido", color: "#f43f5e", category: "LOST", probability: 0, maxDays: null, position: 6 },
		],
	},
];

/** Verticais disponíveis pra dropdown ao salvar template customizado */
export const KNOWN_VERTICALS = [
	{ slug: "generico", label: "Genérico" },
	{ slug: "consultoria-b2b", label: "Consultoria B2B" },
	{ slug: "clinica", label: "Clínica / Saúde" },
	{ slug: "ecommerce", label: "E-commerce / Infoproduto" },
	{ slug: "imobiliaria", label: "Imobiliária" },
	{ slug: "educacao", label: "Educação / Cursos" },
	{ slug: "agencia", label: "Agência / Marketing" },
	{ slug: "servicos-locais", label: "Serviços Locais" },
	{ slug: "outro", label: "Outro" },
];
