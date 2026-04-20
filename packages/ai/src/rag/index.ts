/**
 * Modulo RAG (Retrieval-Augmented Generation) do Vertech Agents.
 *
 * Responsavel por ingest de documentos (PDF/DOCX/CSV/XLSX/TXT/URL),
 * chunking semantico, embedding via OpenAI, storage vetorial via pgvector
 * com HNSW index, e retrieval por similarity cosine.
 *
 * Entregue em Phase 08-alpha pra alimentar o Arquiteto (Phase 09) durante
 * conversas de criacao de agente e o agente comercial (Phase 08-beta) em
 * producao.
 *
 * Principais API:
 * - `ingestDocument(documentId)` — pipeline completo de um documento
 * - `queryKnowledge(query, { sessionId | agentId })` — retrieval semantico
 * - `generateDocSummary(text)` — resumo heuristico pro recap
 * - `extractText(fileType, source)` — dispatcher dos 6 extractors
 */

export { ingestDocument } from "./ingest";
export { queryKnowledge, type QueryKnowledgeOptions } from "./query";
export { generateDocSummary } from "./summary";
export { extractText } from "./extractors";

export {
	extractPdf,
	extractDocx,
	extractCsv,
	extractXlsx,
	extractTxt,
	extractUrl,
} from "./extractors";

export { downloadFromStorage } from "./storage";
export { getPgVector, KNOWLEDGE_INDEX_NAME } from "./pgvector";

export { ExtractorError, IngestError } from "./errors";

export type {
	KnowledgeFileType,
	KnowledgeChunkMetadata,
	RetrievedChunk,
	IngestResult,
	KnowledgeEvent,
} from "./types";
