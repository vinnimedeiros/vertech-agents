import { z } from "zod";

/**
 * Schema da Working Memory do Atendente — 8 campos críticos do briefing
 * conforme Visão V3 (`project_vision_v3_produto.md` + análise independente
 * `analise-independente-construtor.md` seção 1.2).
 *
 * Atendente atualiza estes campos automaticamente conforme aprende sobre
 * o lead durante a conversa. Persiste por `resourceId` (= leadId), portanto
 * múltiplas threads (WhatsApp + email + form) compartilham mesmo perfil.
 *
 * Todos opcionais — Atendente preenche progressivamente. Usado pra:
 * - Personalizar respostas (chamar por nome, lembrar dor anterior)
 * - Decidir handoff humano (urgência alta + decisor)
 * - Análise futura pelo Analista (M2-03) e segmentação Campanhas (M2-04)
 *
 * Refs: docs/PROJECT-ROADMAP-V3.md (M1-03), Mastra Working Memory
 * (https://mastra.ai/docs/memory/working-memory).
 */
export const leadProfileSchema = z.object({
	nome: z
		.string()
		.optional()
		.describe("Nome do lead como ele se apresentou"),

	vertical: z
		.string()
		.optional()
		.describe(
			"Segmento de negócio do lead (ex: clínica, e-commerce, info-produto, imobiliária)",
		),

	dor: z
		.string()
		.optional()
		.describe(
			"Principal dor que o lead expressou — problema que ele quer resolver",
		),

	momento: z
		.enum([
			"descoberta",
			"consideração",
			"decisão",
			"pós-venda",
			"reativação",
		])
		.optional()
		.describe("Estágio do lead no funil comercial"),

	ticket: z
		.string()
		.optional()
		.describe(
			"Estimativa de ticket/orçamento do lead (faixa em texto livre, ex: 'até R$5k', 'R$10-50k', 'enterprise')",
		),

	decisor: z
		.enum(["sim", "não", "influenciador", "desconhecido"])
		.optional()
		.describe(
			"Se o lead é o decisor de compra OU influenciador OU desconhecido",
		),

	urgencia: z
		.enum(["baixa", "média", "alta"])
		.optional()
		.describe(
			"Nível de urgência percebido (alta = precisa resolver em dias/semanas)",
		),

	objecaoPrincipal: z
		.string()
		.optional()
		.describe(
			"Principal objeção que o lead levantou (preço, prazo, confiança, alternativa, etc)",
		),
});

export type LeadProfile = z.infer<typeof leadProfileSchema>;
