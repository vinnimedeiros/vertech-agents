import { generateObject } from "ai";
import { z } from "zod";
import { extractText, type Scorer } from "./types";

/**
 * Scorer "tom apropriado" — Roadmap V3 M1-05.
 *
 * LLM-as-Judge (gpt-4.1-mini via Vercel AI SDK). Compara tom da resposta
 * com `groundTruth.toneEsperado` (texto livre).
 */
const judgeSchema = z.object({
	combina: z.boolean(),
	scoreTom: z.number().min(0).max(1),
	justificativa: z.string(),
});

export const toneScorer: Scorer = {
	id: "atendente-tone",
	name: "Tom apropriado",
	description:
		"LLM-as-Judge avalia se tom da resposta do Atendente casa com toneEsperado do groundTruth",
	async score(run) {
		const userMessage = extractText(run.input);
		const response = extractText(run.output);
		const toneEsperado =
			(run.groundTruth as { toneEsperado?: string } | undefined)?.toneEsperado ?? "";

		if (!toneEsperado) {
			return { score: 1, reason: "Sem toneEsperado no groundTruth — passa por default." };
		}

		const { object } = await generateObject({
			model: "openai/gpt-4.1-mini" as never,
			schema: judgeSchema,
			system:
				"Você é avaliador especialista em comunicação comercial. Compara o tom de uma resposta de atendente com o tom esperado descrito. Avalie tom, não conteúdo.",
			prompt: `Avalie se o tom da resposta do Atendente abaixo corresponde ao tom esperado.

**Mensagem do lead:**
"${userMessage}"

**Resposta do Atendente:**
"${response}"

**Tom esperado:**
"${toneEsperado}"

Retorne combina (bool), scoreTom (0.0-1.0) e justificativa (1-2 frases).`,
		});

		const pct = Math.round(object.scoreTom * 100);
		return {
			score: object.scoreTom,
			reason: `Tom ${pct}% — ${object.justificativa}`,
		};
	},
};
