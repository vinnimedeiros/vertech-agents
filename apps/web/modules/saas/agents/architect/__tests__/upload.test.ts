/**
 * Unit tests dos helpers de upload do Arquiteto (story 08A.4).
 *
 * Escopo:
 * - validateFile: tipo/tamanho/vazio
 * - mimeToFileType: mapping de MIME pra enum do DB
 * - buildStoragePath: pattern `{orgId}/{sessionId}/{docId}/{safeFilename}`
 * - UploadError: shape + status codes
 *
 * Fora de escopo aqui (cobertos em 08A.5 com DB/Storage live):
 * - persistUploadAndEnqueue (requer DB)
 * - uploadToStorage (requer Supabase)
 * - requireSessionOwnership (requer DB)
 * - checkRateLimit (requer Redis)
 */

import { describe, expect, it } from "vitest";
import {
	MAX_ATTACHMENTS_PER_REQUEST,
	MAX_FILE_BYTES,
	SUPPORTED_DOCUMENT_MIME_TYPES,
	UploadError,
	buildStoragePath,
	mimeToFileType,
	validateFile,
} from "../lib/upload-helpers";

function makeFile(
	name: string,
	type: string,
	size: number,
	content = "x",
): File {
	const buffer = new Uint8Array(size).fill(content.charCodeAt(0) || 120);
	return new File([buffer], name, { type });
}

describe("upload-helpers (story 08A.4)", () => {
	describe("mimeToFileType", () => {
		it.each([
			["application/pdf", "PDF"],
			[
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"DOCX",
			],
			["text/csv", "CSV"],
			[
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"XLSX",
			],
			["text/plain", "TXT"],
		])("mapeia %s -> %s", (mime, expected) => {
			expect(mimeToFileType(mime)).toBe(expected);
		});

		it("retorna null para imagens (scope OUT desta phase)", () => {
			expect(mimeToFileType("image/png")).toBe(null);
			expect(mimeToFileType("image/jpeg")).toBe(null);
			expect(mimeToFileType("image/webp")).toBe(null);
		});

		it("retorna null para tipos desconhecidos", () => {
			expect(mimeToFileType("application/x-shockwave-flash")).toBe(null);
			expect(mimeToFileType("")).toBe(null);
		});

		it("SUPPORTED_DOCUMENT_MIME_TYPES bate com mapping keys", () => {
			expect(SUPPORTED_DOCUMENT_MIME_TYPES.length).toBe(5);
		});
	});

	describe("validateFile", () => {
		it("aceita PDF válido dentro do limite", () => {
			const file = makeFile("doc.pdf", "application/pdf", 1024);
			expect(validateFile(file).fileType).toBe("PDF");
		});

		it("rejeita arquivo vazio", () => {
			const file = makeFile("empty.pdf", "application/pdf", 0);
			expect(() => validateFile(file)).toThrow(
				expect.objectContaining({ code: "EMPTY_FILE" }),
			);
		});

		it("rejeita arquivo > MAX_FILE_BYTES", () => {
			const file = makeFile(
				"huge.pdf",
				"application/pdf",
				MAX_FILE_BYTES + 1,
			);
			expect(() => validateFile(file)).toThrow(
				expect.objectContaining({ code: "FILE_TOO_LARGE" }),
			);
		});

		it("rejeita tipo não suportado", () => {
			const file = makeFile("cat.png", "image/png", 1024);
			expect(() => validateFile(file)).toThrow(
				expect.objectContaining({ code: "INVALID_FILE_TYPE" }),
			);
		});

		it("rejeita tipo vazio", () => {
			const file = makeFile("unknown", "", 1024);
			expect(() => validateFile(file)).toThrow(
				expect.objectContaining({ code: "INVALID_FILE_TYPE" }),
			);
		});
	});

	describe("buildStoragePath", () => {
		it("segue pattern orgId/sessionId/docId/safeFilename (AC3)", () => {
			const path = buildStoragePath(
				"org_1",
				"sess_xyz",
				"doc_abc",
				"report.pdf",
			);
			expect(path).toBe("org_1/sess_xyz/doc_abc/report.pdf");
		});

		it("sanitiza espaços em branco no filename", () => {
			const path = buildStoragePath("o", "s", "d", "my weird file.pdf");
			expect(path).toBe("o/s/d/my_weird_file.pdf");
		});

		it("remove diacriticos (português)", () => {
			const path = buildStoragePath("o", "s", "d", "relatório_anual.pdf");
			expect(path).toMatch(/^o\/s\/d\/relato?rio_anual\.pdf$/);
		});

		it("remove path separators do filename (/ ou \\)", () => {
			const path = buildStoragePath("o", "s", "d", "../etc/passwd.txt");
			expect(path).toBe("o/s/d/passwd.txt");
		});

		it("trunca filenames muito longos mas mantém extensão", () => {
			const long = `${"a".repeat(200)}.pdf`;
			const path = buildStoragePath("o", "s", "d", long);
			expect(path.startsWith("o/s/d/")).toBe(true);
			expect(path.endsWith(".pdf")).toBe(true);
			expect(path.length).toBeLessThan(200);
		});

		it("trata filename sem extensão", () => {
			const path = buildStoragePath("o", "s", "d", "justaname");
			expect(path).toBe("o/s/d/justaname");
		});

		it("fallback pra 'file' quando filename é só caracteres inválidos", () => {
			const path = buildStoragePath("o", "s", "d", "!!!???");
			expect(path).toContain("file");
		});
	});

	describe("MAX_ATTACHMENTS_PER_REQUEST", () => {
		it("é 5 conforme AC9", () => {
			expect(MAX_ATTACHMENTS_PER_REQUEST).toBe(5);
		});
	});

	describe("UploadError", () => {
		it("carrega code + message + status default 400", () => {
			const err = new UploadError("FILE_TOO_LARGE", "tamanho");
			expect(err.code).toBe("FILE_TOO_LARGE");
			expect(err.message).toBe("tamanho");
			expect(err.status).toBe(400);
		});

		it("aceita status customizado (500 pra falhas server-side)", () => {
			const err = new UploadError("STORAGE_FAILED", "x", 500);
			expect(err.status).toBe(500);
		});

		it("preserva details opcionais", () => {
			const err = new UploadError("INVALID_URL", "bad", 400, {
				given: "ftp://x",
			});
			expect(err.details).toEqual({ given: "ftp://x" });
		});
	});
});
