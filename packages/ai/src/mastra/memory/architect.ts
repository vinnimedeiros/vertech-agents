import { Memory } from "@mastra/memory";
import { getPgVector } from "../../rag/pgvector";
import { getMastraStorage } from "../storage";

/**
 * Factory da Memory do Arquiteto (story 09.5, arquitetura extractor-driven).
 *
 * Config enxuta:
 * - `storage`: PostgresStore singleton (persiste messages + threads)
 * - `vector`: PgVector pra semanticRecall cross-thread
 * - `embedder`: text-embedding-3-small (1536d)
 * - `lastMessages: 20` + semanticRecall HNSW dotproduct
 *
 * Working memory foi removida — o extractor LLM secundário cuida de
 * estruturar o estado, não o Arquiteto principal.
 *
 * Lazy init — evita side effects no import (DATABASE_URL só é checado
 * na primeira `get`).
 */
let memoryInstance: Memory | null = null;

export function getArchitectAgentMemory(): Memory {
	if (!memoryInstance) {
		memoryInstance = new Memory({
			storage: getMastraStorage(),
			vector: getPgVector(),
			embedder: "openai/text-embedding-3-small",
			options: {
				lastMessages: 20,
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
				workingMemory: { enabled: false },
			},
		});
	}
	return memoryInstance;
}
