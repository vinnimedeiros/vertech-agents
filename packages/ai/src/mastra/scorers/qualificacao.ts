import { extractText, type Scorer } from "./types";

/**
 * Scorer "qualificação correta" — Roadmap V3 M1-05.
 *
 * Code-based: heurística textual, sem LLM. Score 0-1 = proporção de campos
 * do groundTruth.qualificacaoEsperada cobertos na resposta do Atendente.
 */
export const qualificacaoScorer: Scorer = {
	id: "atendente-qualificacao",
	name: "Qualificação correta",
	description:
		"Verifica se Atendente cobriu campos esperados do briefing (nome/vertical/dor/momento/etc) na resposta",
	score(run) {
		const response = extractText(run.output).toLowerCase();
		const groundTruth =
			(run.groundTruth as { qualificacaoEsperada?: Record<string, unknown> } | undefined)
				?.qualificacaoEsperada ?? {};

		const expectedFields = Object.entries(groundTruth)
			.filter(([, v]) => v !== undefined && v !== null && v !== "")
			.map(([k, v]) => ({ field: k, value: String(v).toLowerCase() }));

		if (expectedFields.length === 0) {
			return { score: 1, reason: "Nenhum campo esperado — passa por default." };
		}

		const covered = expectedFields.filter(({ field, value }) => {
			const firstWord = value.split(/\s+/)[0];
			if (firstWord && firstWord.length >= 3 && response.includes(firstWord)) return true;
			return response.includes(field.toLowerCase());
		});

		const score = covered.length / expectedFields.length;
		const pct = Math.round(score * 100);
		return {
			score,
			reason: `Score ${pct}% — ${expectedFields.length} campos esperados, ${covered.length} cobertos.`,
		};
	},
};
