/**
 * Gera resumo curto do conteudo de um documento pra mostrar ao usuario
 * no recap da etapa Conhecimento (chat do Arquiteto, story 09.5).
 *
 * Estrategia v1 (heuristica, zero custo): pega as primeiras 160 chars da
 * primeira frase nao-vazia como "abertura", e concatena com as ultimas 80
 * chars relevantes. Serve pra orientar o usuario sobre o que foi absorvido
 * sem incorrer em custo de LLM extra por documento.
 *
 * Versao 2 (futura, Phase 10 ou antes): usar openai/gpt-4o-mini com prompt
 * "resume este texto em 1-2 frases em portugues".
 */

const MAX_LENGTH = 240;

/**
 * Gera resumo heuristico dos primeiros ~3000 chars do texto.
 */
export function generateDocSummary(fullText: string): string {
	if (!fullText || fullText.trim().length === 0) {
		return "";
	}

	const text = fullText.slice(0, 3000).trim();

	// Pega primeira frase densa (nao-title, nao-placeholder)
	const sentences = text
		.split(/(?<=[.!?])\s+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 20 && s.length < 300);

	if (sentences.length === 0) {
		return (
			text.slice(0, MAX_LENGTH).trim() +
			(text.length > MAX_LENGTH ? "..." : "")
		);
	}

	const firstDense = sentences[0];

	// Junta primeira frase + segunda se couber
	if (
		sentences.length > 1 &&
		firstDense.length + sentences[1].length < MAX_LENGTH
	) {
		return `${firstDense} ${sentences[1]}`;
	}

	if (firstDense.length > MAX_LENGTH) {
		return `${firstDense.slice(0, MAX_LENGTH).trim()}...`;
	}

	return firstDense;
}
