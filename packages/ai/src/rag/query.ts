import { openai } from "@ai-sdk/openai";
import { db, sql } from "@repo/database";
import { embedMany } from "ai";
import { KNOWLEDGE_INDEX_NAME, getPgVector } from "./pgvector";
import type { KnowledgeChunkMetadata, RetrievedChunk } from "./types";

/**
 * Parametros de busca (tech spec § 5.1).
 */
const DEFAULT_TOP_K = 5;
const DEFAULT_THRESHOLD = 0.5;
const HNSW_EF_SEARCH = 100;
const EMBEDDING_MODEL_NAME = "text-embedding-3-small" as const;

export type QueryKnowledgeScope =
	| { sessionId: string; agentId?: never }
	| { sessionId?: never; agentId: string };

export type QueryKnowledgeOptions = QueryKnowledgeScope & {
	topK?: number;
	threshold?: number;
};

/**
 * Retrieval semantico de chunks indexados.
 *
 * Pipeline (tech spec § 5.3):
 * 1. Gera embedding do queryString com mesmo modelo usado no ingest (coerencia).
 * 2. Ajusta hnsw.ef_search = 100 no escopo da transacao pra balancear
 *    recall x latencia (pgvector default e 40).
 * 3. Busca top 2*K candidatos via cosine distance.
 * 4. Filtra por similarity > threshold.
 * 5. Aplica scope (sessionId ou agentId) no metadata.
 * 6. Slice topK final.
 *
 * @throws Error se embedding/query falharem (callers tratam)
 */
export async function queryKnowledge(
	query: string,
	options: QueryKnowledgeOptions,
): Promise<RetrievedChunk[]> {
	const topK = options.topK ?? DEFAULT_TOP_K;
	const threshold = options.threshold ?? DEFAULT_THRESHOLD;

	if (!query || query.trim().length === 0) {
		return [];
	}

	// 1. Embedding do query (mesmo modelo usado no ingest, coerencia de espaco vetorial)
	const { embeddings } = await embedMany({
		model: openai.embedding(EMBEDDING_MODEL_NAME),
		values: [query],
	});
	const queryVector = embeddings[0];

	// 2. Tune ef_search local ao escopo da conexao
	//    Nota: @mastra/pg PgVector usa pool proprio, entao SET LOCAL nao se aplica
	//    a ele diretamente. Setamos via SET session-level no db do app e confiamos
	//    que o PgVector internamente honra ajustes de sessao. Se nao honrar em
	//    versoes futuras, migrar pra query raw via db.execute.
	try {
		await db.execute(sql`SET LOCAL hnsw.ef_search = ${HNSW_EF_SEARCH}`);
	} catch {
		// SET LOCAL requer transacao. Fora dela, usar SET session-level silencioso.
		try {
			await db.execute(sql`SET hnsw.ef_search = ${HNSW_EF_SEARCH}`);
		} catch {
			// ignora — configuracao opcional, query ainda retorna resultados
		}
	}

	// 3. Query no PgVector (busca 2*K pra permitir filter por threshold/scope)
	const pgVector = getPgVector();
	const rawResults = await pgVector.query({
		indexName: KNOWLEDGE_INDEX_NAME,
		queryVector,
		topK: topK * 2,
	});

	// 4. Filter por threshold + scope
	const scoped = rawResults.filter((r) => {
		if (r.score < threshold) {
			return false;
		}
		const metadata = r.metadata as KnowledgeChunkMetadata | undefined;
		if (!metadata) {
			return false;
		}
		if ("sessionId" in options && options.sessionId) {
			return metadata.sessionId === options.sessionId;
		}
		if ("agentId" in options && options.agentId) {
			return metadata.agentId === options.agentId;
		}
		return false;
	});

	// 5. Slice topK final
	return scoped.slice(0, topK).map((r) => {
		const metadata = r.metadata as KnowledgeChunkMetadata;
		return {
			content: metadata.text,
			similarity: r.score,
			documentId: String(r.id),
			documentTitle: metadata.documentTitle,
			position: metadata.position,
		};
	});
}
