/**
 * Classes de erro estruturado do pipeline RAG.
 *
 * Extractors lançam ExtractorError quando o buffer/URL falha parsing.
 * Pipeline de ingest lança IngestError quando qualquer etapa falha (download,
 * extract, chunk, embed, upsert, summary). O worker BullMQ (story 08A.2)
 * consome essas classes pra decidir retry vs DLQ.
 */

export type ExtractorErrorCode =
	| "UNSUPPORTED_FILE_TYPE"
	| "CORRUPTED_FILE"
	| "EMPTY_CONTENT"
	| "FETCH_FAILED"
	| "PARSE_FAILED";

export class ExtractorError extends Error {
	readonly code: ExtractorErrorCode;
	readonly fileType?: string;
	readonly cause?: unknown;

	constructor(
		code: ExtractorErrorCode,
		message: string,
		options?: { fileType?: string; cause?: unknown },
	) {
		super(message);
		this.name = "ExtractorError";
		this.code = code;
		this.fileType = options?.fileType;
		this.cause = options?.cause;
	}
}

export type IngestErrorCode =
	| "DOC_NOT_FOUND"
	| "DOWNLOAD_FAILED"
	| "EXTRACT_FAILED"
	| "CHUNK_FAILED"
	| "EMBED_FAILED"
	| "UPSERT_FAILED"
	| "SUMMARY_FAILED";

export class IngestError extends Error {
	readonly code: IngestErrorCode;
	readonly documentId?: string;
	readonly cause?: unknown;

	constructor(
		code: IngestErrorCode,
		message: string,
		options?: { documentId?: string; cause?: unknown },
	) {
		super(message);
		this.name = "IngestError";
		this.code = code;
		this.documentId = options?.documentId;
		this.cause = options?.cause;
	}
}
