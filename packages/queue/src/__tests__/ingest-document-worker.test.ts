import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/ai", () => ({
	ingestDocument: vi.fn(),
}));

import { ingestDocument } from "@repo/ai";
import {
	INGEST_DOCUMENT_QUEUE_NAME,
	dispatchIngestDocument,
	ingestDocumentJobSchema,
} from "../../index";
import { processIngestDocumentJob } from "../workers/ingest-document";

const mockedIngest = vi.mocked(ingestDocument);

describe("ingest-document queue (story 08A.2)", () => {
	beforeEach(() => {
		mockedIngest.mockReset();
	});

	describe("ingestDocumentJobSchema", () => {
		it("aceita payload valido com documentId", () => {
			const result = ingestDocumentJobSchema.parse({
				documentId: "doc_abc123",
			});
			expect(result.documentId).toBe("doc_abc123");
		});

		it("rejeita documentId vazio", () => {
			expect(() =>
				ingestDocumentJobSchema.parse({ documentId: "" }),
			).toThrow();
		});

		it("rejeita payload sem documentId", () => {
			expect(() => ingestDocumentJobSchema.parse({})).toThrow();
		});
	});

	describe("INGEST_DOCUMENT_QUEUE_NAME", () => {
		it("tem o nome esperado pra telemetry/health/QueueDash", () => {
			expect(INGEST_DOCUMENT_QUEUE_NAME).toBe("ingest-document");
		});
	});

	describe("dispatchIngestDocument (jobId idempotente)", () => {
		it("exporta funcao dispatcher", () => {
			expect(typeof dispatchIngestDocument).toBe("function");
		});
	});

	describe("processIngestDocumentJob", () => {
		it("chama ingestDocument com documentId validado e retorna shape esperado (AC5, AC6)", async () => {
			mockedIngest.mockResolvedValueOnce({
				documentId: "doc_1",
				chunkCount: 42,
				summary: "resumo",
			});

			const result = await processIngestDocumentJob({
				documentId: "doc_1",
			});

			expect(mockedIngest).toHaveBeenCalledWith("doc_1");
			expect(result).toEqual({
				success: true,
				documentId: "doc_1",
				chunkCount: 42,
			});
		});

		it("throw quando ingestDocument retorna null para acionar retry do BullMQ (AC7)", async () => {
			mockedIngest.mockResolvedValueOnce(null);

			await expect(
				processIngestDocumentJob({ documentId: "doc_fail" }),
			).rejects.toThrow(/doc_fail/);
		});

		it("retorna sucesso se pipeline for idempotente (doc READY early-return, AC10)", async () => {
			// Pipeline retorna valor valido mesmo quando doc ja estava READY
			mockedIngest.mockResolvedValueOnce({
				documentId: "doc_already_ready",
				chunkCount: 17,
				summary: "cacheado",
			});

			const result = await processIngestDocumentJob({
				documentId: "doc_already_ready",
			});

			expect(result.success).toBe(true);
			expect(result.chunkCount).toBe(17);
		});

		it("rejeita job data invalido antes de tocar a pipeline", async () => {
			await expect(
				processIngestDocumentJob({ documentId: "" }),
			).rejects.toThrow();
			expect(mockedIngest).not.toHaveBeenCalled();
		});
	});
});
