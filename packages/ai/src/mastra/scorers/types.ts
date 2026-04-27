/**
 * Tipos comuns dos scorers customizados — Roadmap V3 M1-05.
 *
 * **Nota técnica:** `createScorer` do Mastra ainda não está exposto em
 * type declarations da @mastra/core@1.28.0 (só em chunk JS interno).
 * Implementamos scorers como funções TS puras com mesma interface
 * (input run → output score+reason). Quando Mastra estabilizar a API
 * pública, refatoramos pra plug nativo via `new Mastra({ scorers })`.
 */

export type ScorerRun = {
	input: unknown;
	output: unknown;
	groundTruth?: unknown;
};

export type ScorerResult = {
	score: number; // 0-1
	reason: string;
};

export type Scorer = {
	id: string;
	name: string;
	description: string;
	score: (run: ScorerRun) => Promise<ScorerResult> | ScorerResult;
};

export function extractText(value: unknown): string {
	if (!value) return "";
	if (typeof value === "string") return value;
	if (Array.isArray(value)) {
		return value
			.map((item) =>
				typeof item === "string"
					? item
					: ((item as { content?: string; text?: string })?.content ??
						(item as { content?: string; text?: string })?.text ??
						""),
			)
			.join("\n");
	}
	if (typeof value === "object") {
		const obj = value as Record<string, unknown>;
		return String(obj.text ?? obj.content ?? "");
	}
	return String(value);
}
