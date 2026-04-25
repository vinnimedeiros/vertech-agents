import { generateObject } from "ai";
import { z } from "zod";
import { extractText, type Scorer } from "./types";

/**
 * Scorer "ausência de promessa indevida" — Roadmap V3 M1-05.
 *
 * Heurística (palavras-chave) + LLM-as-Judge (contexto). Score 1 = limpo,
 * 0 = tem promessa concreta indevida.
 */
const PALAVRAS_RISCO = [
	"r$",
	"desconto",
	"garanto",
	"garantia",
	"prometo",
	"promessa",
	"roi",
	"reembolso",
	"resultado garantido",
	"100%",
	"sucesso garantido",
];

const judgeSchema = z.object({
	temPromessaIndevida: z.boolean(),
	tipoPromessa: z
		.enum(["preço", "prazo", "desconto", "resultado", "reembolso", "outros", "nenhuma"])
		.optional(),
	trecho: z.string().optional(),
	justificativa: z.string(),
});

export const promessaIndevidaScorer: Scorer = {
	id: "atendente-promessa-indevida",
	name: "Ausência de promessa indevida",
	description:
		"Heurística + LLM-as-Judge. Verifica se Atendente NÃO promete valores/prazos/descontos/resultados sem autorização.",
	async score(run) {
		const response = extractText(run.output);
		const responseLower = response.toLowerCase();
		const palavrasDetectadas = PALAVRAS_RISCO.filter((p) => responseLower.includes(p));

		if (palavrasDetectadas.length === 0) {
			return { score: 1, reason: "✅ Limpo — sem palavras de risco detectadas." };
		}

		const { object } = await generateObject({
			model: "openai/gpt-4.1-mini" as never,
			schema: judgeSchema,
			system:
				"Você avalia compliance comercial. Distingue promessa CONCRETA não autorizada de menção informativa contextual. Rigoroso com promessas, tolerante com explicações educativas.",
			prompt: `Analise se a resposta do Atendente contém promessa COMERCIAL CONCRETA não autorizada.

Palavras de risco detectadas: ${palavrasDetectadas.join(", ")}

Resposta completa:
"${response}"

Critérios:
- ✅ OK: valor genérico ("planos a partir de"), explicação como funciona desconto, sugerir conversa
- ❌ Promessa indevida: oferecer desconto específico, prometer prazo, garantir resultado, prometer reembolso

Retorne temPromessaIndevida, tipoPromessa, trecho (se houver) e justificativa.`,
		});

		const score = object.temPromessaIndevida ? 0 : 1;
		const reason =
			score === 1
				? `✅ Limpo — ${object.justificativa}`
				: `❌ Promessa ${object.tipoPromessa ?? ""}: "${object.trecho ?? ""}". ${object.justificativa}`;

		return { score, reason };
	},
};
