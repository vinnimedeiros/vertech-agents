/**
 * Types publicos do modulo RAG — consumidos por packages/ai/mastra/tools/architect
 * (story 08A.3) e pelo worker BullMQ (story 08A.2).
 */

export type KnowledgeFileType = "pdf" | "docx" | "csv" | "xlsx" | "txt" | "url";

/**
 * Metadata persistido em cada chunk em knowledge_chunks.metadata (JSONB).
 * Denormalizado pra permitir filter/retrieval sem JOIN com knowledge_documents.
 * Durante rascunho (sessao do Arquiteto), sessionId e populado e agentId null.
 * Ao publicar agente, sessionId vira null e agentId assume via transacao atomica.
 */
export type KnowledgeChunkMetadata = {
	text: string;
	documentTitle: string;
	position: number;
	totalChunks: number;
	sessionId?: string | null;
	agentId?: string | null;
};

/**
 * Shape de retorno de queryKnowledge — chunk com similarity score.
 */
export type RetrievedChunk = {
	content: string;
	similarity: number;
	documentId: string;
	documentTitle: string;
	position: number;
};

/**
 * Resultado final de ingestDocument — consumido pelo worker pra log.
 */
export type IngestResult = {
	documentId: string;
	chunkCount: number;
	summary: string;
};

/**
 * Eventos emitidos pelo pipeline via Supabase Realtime (ou stub log em dev).
 */
export type KnowledgeEvent =
	| {
			type: "knowledge.document.ready";
			documentId: string;
			sessionId: string | null;
			agentId: string | null;
			chunkCount: number;
	  }
	| {
			type: "knowledge.document.failed";
			documentId: string;
			errorCode: string;
			errorMessage: string;
	  };
