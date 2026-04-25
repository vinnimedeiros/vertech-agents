import { Memory } from "@mastra/memory";
import { getPgVector } from "../../rag/pgvector";
import { getMastraStorage } from "../storage";
import { leadProfileSchema } from "./working-memory-schema";

/**
 * Factory pra Memory do Atendente (Supervisor).
 *
 * **M1-03 Roadmap V3** — config completa pra produção:
 *
 * - `storage`: PostgresStore singleton (persiste messages + threads)
 * - `vector`: PgVector pra semanticRecall cross-thread (RAG-2 memória do lead)
 * - `embedder`: text-embedding-3-small (1536d, baixo custo)
 * - `lastMessages: 30` — conversas WhatsApp tendem a ser longas
 * - `semanticRecall` HNSW dotproduct, top-K 5, escopo `resource` (lead)
 * - `workingMemory` com schema Zod 8 campos (`leadProfileSchema`):
 *   nome / vertical / dor / momento / ticket / decisor / urgência / objeção
 * - `observationalMemory` (Fev/2026): comprime conversas longas
 *   automaticamente em ~30k tokens via Observer + Reflector. Crítico pro
 *   RAG-2 em ciclos B2B longos. Modelo: gemini-2.5-flash (econômico + ctx longo).
 *
 * **Resource scope:** `resourceId = leadId` (múltiplas threads do mesmo
 * lead compartilham working memory + observações).
 *
 * Refs: docs/PROJECT-ROADMAP-V3.md (M1-03), project_mastra_strategy.md,
 * Mastra Memory docs (https://mastra.ai/docs/memory/overview).
 *
 * Lazy init pra evitar side effects no import.
 */
let memoryInstance: Memory | null = null;

export function getCommercialAgentMemory(): Memory {
	if (!memoryInstance) {
		memoryInstance = new Memory({
			storage: getMastraStorage(),
			vector: getPgVector(),
			embedder: "openai/text-embedding-3-small",
			options: {
				lastMessages: 30,
				semanticRecall: {
					topK: 5,
					messageRange: { before: 2, after: 1 },
					scope: "resource",
					indexConfig: {
						type: "hnsw",
						metric: "dotproduct",
						hnsw: {
							m: 16,
							efConstruction: 64,
						},
					},
				},
				workingMemory: {
					enabled: true,
					schema: leadProfileSchema,
				},
				observationalMemory: {
					model: "google/gemini-2.5-flash",
					scope: "resource",
					observation: {
						messageTokens: 30_000,
					},
					reflection: {
						observationTokens: 60_000,
					},
				},
			},
		});
	}
	return memoryInstance;
}
