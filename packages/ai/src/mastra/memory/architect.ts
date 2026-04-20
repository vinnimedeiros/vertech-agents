import { Memory } from "@mastra/memory";
import { getPgVector } from "../../rag/pgvector";
import { getMastraStorage } from "../storage";
import { architectWorkingMemorySchema } from "../types/architect-working-memory";

/**
 * Factory da Memory do Arquiteto (story 09.5).
 *
 * Config completa tech-spec § 3.4:
 * - `storage`: PostgresStore singleton (mesmo do Commercial Agent)
 * - `vector`: PgVector do @repo/ai/rag (HNSW dotproduct em knowledge_chunk)
 * - `embedder`: string `openai/text-embedding-3-small` (1536d, compatível com
 *   o index já criado em 08A.1)
 * - `options.lastMessages`: 20 msgs recentes sempre no prompt
 * - `options.semanticRecall`: topK=5, scope='resource', HNSW params
 * - `options.workingMemory`: Zod schema via `architectWorkingMemorySchema`
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
				workingMemory: {
					enabled: true,
					schema: architectWorkingMemorySchema,
					scope: "thread",
				},
			},
		});
	}
	return memoryInstance;
}
