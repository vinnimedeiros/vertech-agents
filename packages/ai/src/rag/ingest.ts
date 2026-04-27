import { openai } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import { db, eq, knowledgeDocument } from "@repo/database";
import { embedMany } from "ai";
import { IngestError } from "./errors";
import { extractText } from "./extractors";
import { KNOWLEDGE_INDEX_NAME, getPgVector } from "./pgvector";
import { downloadFromStorage } from "./storage";
import { generateDocSummary } from "./summary";
import type {
	IngestResult,
	KnowledgeChunkMetadata,
	KnowledgeFileType,
} from "./types";

/**
 * Parametros do chunking (tech spec § 5.1, research § 2).
 * Calibrado pra conteudo de negocio em portugues (catalogos, PDFs, tabelas).
 *
 * API do @mastra/rag v2 usa `maxSize` (v1 era `size`). Separators controlam
 * a hierarquia do splitter recursivo.
 */
const CHUNK_CONFIG = {
	strategy: "recursive" as const,
	maxSize: 512,
	overlap: 50,
	separators: ["\n\n", "\n", ". ", " "],
};

/**
 * Embedding model global do RAG (tech spec § 5.1).
 * OpenAI text-embedding-3-small gera vetores 1536d compativeis com o index
 * HNSW vector_cosine_ops criado pela migration 0015.
 *
 * Usamos o provider @ai-sdk/openai direto (em vez de ModelRouterEmbeddingModel)
 * porque a assinatura bate com o embedMany do pacote `ai` v4 (spec v1).
 */
const EMBEDDING_MODEL_NAME = "text-embedding-3-small" as const;

/**
 * Pipeline completo de ingest de um documento de conhecimento.
 *
 * Executa em 11 etapas (tech spec § 5.2) dentro de error handling estruturado.
 * Chamado pelo worker BullMQ (story 08A.2) ou direto pelo upload endpoint
 * (08A.4) quando ingest sincrono for aceitavel.
 *
 * Contratos:
 * - Atualiza knowledge_document.status: PROCESSING -> READY ou ERROR
 * - Upserta N chunks em knowledge_chunk com embeddings 1536d
 * - Preenche knowledge_document.chunkCount + extractedSummary em sucesso
 * - Preserva errorMessage em falha
 * - NAO re-joga exception (worker decide retry via BullMQ)
 *
 * @returns IngestResult em sucesso, null em falha (erro ja persistido na row)
 */
export async function ingestDocument(
	documentId: string,
): Promise<IngestResult | null> {
	// 1. Carrega row
	const doc = await db.query.knowledgeDocument.findFirst({
		where: eq(knowledgeDocument.id, documentId),
	});

	if (!doc) {
		throw new IngestError(
			"DOC_NOT_FOUND",
			`Documento ${documentId} nao existe`,
			{
				documentId,
			},
		);
	}

	// Idempotencia: se ja esta READY, retorna sem re-processar (tech spec § 7.2.8)
	if (doc.status === "READY") {
		return {
			documentId: doc.id,
			chunkCount: doc.chunkCount,
			summary: doc.extractedSummary ?? "",
		};
	}

	// 2. Marca PROCESSING
	try {
		await db
			.update(knowledgeDocument)
			.set({
				status: "PROCESSING",
				errorMessage: null,
				updatedAt: new Date(),
			})
			.where(eq(knowledgeDocument.id, documentId));
	} catch (error) {
		throw new IngestError(
			"UPSERT_FAILED",
			"Falha ao marcar documento como PROCESSING",
			{ documentId, cause: error },
		);
	}

	try {
		// 3. Baixa file (exceto URL, que e fetched direto pelo extractor)
		let source: Buffer | string;
		if (doc.fileType === "URL") {
			source = doc.fileUrl;
		} else {
			source = await downloadFromStorage(doc.fileUrl);
		}

		// 4. Extrai texto via dispatcher
		const fileTypeLower = doc.fileType.toLowerCase() as KnowledgeFileType;
		const text = await extractText(fileTypeLower, source);

		// 5. Chunk (API v2: maxSize em vez de size)
		const mdoc = MDocument.fromText(text);
		const chunks = await mdoc.chunk({
			strategy: CHUNK_CONFIG.strategy,
			maxSize: CHUNK_CONFIG.maxSize,
			overlap: CHUNK_CONFIG.overlap,
			separators: CHUNK_CONFIG.separators,
		});

		if (chunks.length === 0) {
			throw new IngestError(
				"CHUNK_FAILED",
				"Chunking retornou zero chunks (texto muito curto ou vazio)",
				{ documentId },
			);
		}

		// 6. Embed (batch) via @ai-sdk/openai direto pra compatibilidade com
		//    embedMany do pacote `ai` v4 (spec v1).
		const { embeddings } = await embedMany({
			model: openai.embedding(EMBEDDING_MODEL_NAME),
			values: chunks.map((c) => c.text),
		});

		if (embeddings.length !== chunks.length) {
			throw new IngestError(
				"EMBED_FAILED",
				`Mismatch de tamanho: ${chunks.length} chunks vs ${embeddings.length} embeddings`,
				{ documentId },
			);
		}

		// 7. Upsert no vector store
		const pgVector = getPgVector();

		// Garante existencia do index (idempotente)
		await pgVector.createIndex({
			indexName: KNOWLEDGE_INDEX_NAME,
			dimension: 1536,
		});

		const metadata: KnowledgeChunkMetadata[] = chunks.map((chunk, i) => ({
			text: chunk.text,
			documentTitle: doc.title,
			position: i,
			totalChunks: chunks.length,
			sessionId: doc.sessionId,
			agentId: doc.agentId,
		}));

		await pgVector.upsert({
			indexName: KNOWLEDGE_INDEX_NAME,
			vectors: embeddings,
			metadata,
		});

		// 8. Summary heuristico
		const summary = generateDocSummary(text);

		// 9. Atualiza row como READY
		await db
			.update(knowledgeDocument)
			.set({
				status: "READY",
				chunkCount: chunks.length,
				extractedSummary: summary,
				errorMessage: null,
				updatedAt: new Date(),
			})
			.where(eq(knowledgeDocument.id, documentId));

		// 10. Evento implicito via mudanca de status em knowledge_document.status
		//     Frontend subscribe via Supabase Realtime ao UPDATE da tabela.
		//     (Story 08A.4 habilita realtime na tabela via SQL se ainda nao esta.)

		return {
			documentId: doc.id,
			chunkCount: chunks.length,
			summary,
		};
	} catch (error) {
		// 11. Preserva erro na row, nao re-joga
		const isIngestError = error instanceof IngestError;
		const errorMessage = isIngestError
			? error.message
			: error instanceof Error
				? error.message
				: "Erro desconhecido durante ingest";

		try {
			await db
				.update(knowledgeDocument)
				.set({
					status: "ERROR",
					errorMessage: errorMessage.slice(0, 500), // limita pra nao explodir row
					updatedAt: new Date(),
				})
				.where(eq(knowledgeDocument.id, documentId));
		} catch (persistError) {
			// Se nao conseguir nem persistir o erro, loga e segue
			// (worker vai marcar job como failed)
			console.error(
				"[ingest] Falha ao persistir erro da ingestao",
				persistError,
			);
		}

		console.error(`[ingest] Document ${documentId} falhou:`, errorMessage);
		return null;
	}
}
