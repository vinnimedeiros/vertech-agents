import { PgVector } from "@mastra/pg";

/**
 * Singleton do PgVector, vector store do @mastra/pg apontando pro mesmo
 * Postgres do projeto (DATABASE_URL). Reutiliza a tabela `knowledge_chunk`
 * (criada por Tank na migration 0015) com coluna `embedding vector(1536)`
 * e index HNSW `vector_cosine_ops`.
 *
 * Lazy init pra permitir importar em contextos sem DATABASE_URL (testes).
 */

let instance: PgVector | null = null;

export function getPgVector(): PgVector {
	if (instance) {
		return instance;
	}

	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error(
			"DATABASE_URL nao configurada — PgVector requer Postgres",
		);
	}

	instance = new PgVector({
		id: "vertech-agents-rag",
		connectionString: url,
		max: 20,
	});
	return instance;
}

/**
 * Nome do index usado pra todos os chunks de conhecimento do Vertech.
 * Referencia a tabela `knowledge_chunk` via @mastra/pg convention.
 */
export const KNOWLEDGE_INDEX_NAME = "knowledge_chunk";
