import { z } from "zod";

/**
 * Schemas dos datasets de avaliação do Atendente — Roadmap V3 M1-04.
 *
 * Cada dataset (1 por modo: SDR / Closer / Pós-Venda) tem cases com
 * `input` (conversa simulada + contexto) e `groundTruth` (qualificação
 * esperada + próxima ação esperada). Studio roda Experiments comparando
 * output real do Atendente com groundTruth.
 *
 * Refs: docs/PROJECT-ROADMAP-V3.md (M1-04), Mastra Datasets
 * (https://mastra.ai/docs/evals/datasets/overview).
 */

export type AtendenteMode = "sdr" | "closer" | "pos-venda";

export const ATENDENTE_DATASET_NAMES = {
	sdr: "atendente-sdr",
	closer: "atendente-closer",
	"pos-venda": "atendente-pos-venda",
} as const satisfies Record<AtendenteMode, string>;

/**
 * Input de um case: simulação de conversa que o Atendente recebe.
 * - `mensagensLead`: histórico real de mensagens do lead (1+)
 * - `contextoLead`: o que sistema sabe sobre o lead antes da conversa
 *   (working memory inicial, RAG-2 contexto)
 */
export const atendenteInputSchema = z.object({
	mensagensLead: z
		.array(z.string())
		.min(1)
		.describe("Mensagens do lead na conversa simulada (em ordem)"),

	contextoLead: z
		.object({
			vertical: z.string().optional(),
			origem: z.string().optional().describe("Como chegou (campanha, indicação, orgânico)"),
			ticketEstimado: z.string().optional(),
			conversasAnteriores: z.number().optional().describe("Quantas msgs prévias com este lead"),
		})
		.optional(),
});

/**
 * GroundTruth: comportamento esperado do Atendente neste case.
 * - `qualificacaoEsperada`: campos do leadProfileSchema que Atendente
 *   deveria ter capturado (subset opcional)
 * - `acaoEsperada`: próximo passo correto pra esta conversa
 * - `toneEsperado`: descrição livre do tom apropriado (avaliação por LLM-as-Judge)
 */
export const atendenteGroundTruthSchema = z.object({
	qualificacaoEsperada: z
		.object({
			nome: z.string().optional(),
			vertical: z.string().optional(),
			dor: z.string().optional(),
			momento: z
				.enum(["descoberta", "consideração", "decisão", "pós-venda", "reativação"])
				.optional(),
			ticket: z.string().optional(),
			decisor: z.enum(["sim", "não", "influenciador", "desconhecido"]).optional(),
			urgencia: z.enum(["baixa", "média", "alta"]).optional(),
			objecaoPrincipal: z.string().optional(),
		})
		.describe("Subset esperado dos 8 campos da working memory após esta conversa"),

	acaoEsperada: z
		.enum([
			"continuar-conversa",
			"agendar",
			"enviar-proposta",
			"pedir-humano",
			"encerrar",
			"reativar-depois",
		])
		.describe("Próxima ação que Atendente deveria tomar"),

	toneEsperado: z
		.string()
		.describe(
			"Descrição livre do tom apropriado pra esta conversa (avaliado por LLM-as-Judge)",
		),

	deveEvitar: z
		.array(z.string())
		.optional()
		.describe(
			"Comportamentos/frases que Atendente NÃO pode fazer neste case (ex: 'prometer desconto sem autorização', 'inventar prazo')",
		),
});

export type AtendenteInput = z.infer<typeof atendenteInputSchema>;
export type AtendenteGroundTruth = z.infer<typeof atendenteGroundTruthSchema>;
