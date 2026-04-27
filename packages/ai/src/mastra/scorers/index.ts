/**
 * Scorers customizados pro Atendente — Roadmap V3 M1-05.
 *
 * Implementados como funções TS puras com interface `Scorer` (ver `types.ts`).
 *
 * **Nota técnica:** `createScorer` do Mastra não está exposto em type declarations
 * da @mastra/core@1.28.0 (só em chunk JS interno). Quando estabilizar a API
 * pública, refatorar pra plug nativo via `new Mastra({ scorers: {...} })`.
 *
 * Como usar agora (M2 e adiante):
 * ```ts
 * import { qualificacaoScorer } from "@repo/ai";
 * const result = await qualificacaoScorer.score({ input, output, groundTruth });
 * ```
 *
 * - `qualificacaoScorer`: code-based, % campos do briefing cobertos
 * - `toneScorer`: LLM-as-Judge gpt-4.1-mini, tom esperado vs real
 * - `promessaIndevidaScorer`: heurística + LLM-as-Judge, compliance comercial
 */
export type { Scorer, ScorerResult, ScorerRun } from "./types";
export { qualificacaoScorer } from "./qualificacao";
export { toneScorer } from "./tone";
export { promessaIndevidaScorer } from "./promessa-indevida";
