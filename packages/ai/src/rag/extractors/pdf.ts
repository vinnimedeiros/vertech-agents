import { ExtractorError } from "../errors";

/**
 * Extrai texto de PDF via pdf-parse.
 *
 * pdf-parse concatena o texto de todas as paginas separadas por `\n\n`.
 * Tabelas e formatacao complexa sao aproximadas em texto plano, o que e
 * aceitavel pro caso de uso do Arquiteto (conteudo de negocio, nao layout).
 *
 * Lanca ExtractorError em: buffer corrompido, PDF vazio, erro de parse.
 */
export async function extractPdf(buffer: Buffer): Promise<string> {
	if (!buffer || buffer.length === 0) {
		throw new ExtractorError("EMPTY_CONTENT", "Buffer de PDF esta vazio", {
			fileType: "pdf",
		});
	}

	try {
		// pdf-parse v2 exporta funcao nomeada; typing e fraco, cast pontual.
		const pdfModule = (await import("pdf-parse")) as unknown as {
			default?: (b: Buffer) => Promise<{ text: string }>;
			pdf?: (b: Buffer) => Promise<{ text: string }>;
		};
		const pdfParseFn = pdfModule.default ?? pdfModule.pdf;
		if (typeof pdfParseFn !== "function") {
			throw new ExtractorError(
				"PARSE_FAILED",
				"pdf-parse nao expoe funcao esperada",
				{ fileType: "pdf" },
			);
		}
		const result = await pdfParseFn(buffer);

		const text = result.text?.trim() ?? "";
		if (text.length === 0) {
			throw new ExtractorError(
				"EMPTY_CONTENT",
				"PDF nao contem texto extraivel (pode ser apenas imagem ou scan)",
				{ fileType: "pdf" },
			);
		}

		return text;
	} catch (error) {
		if (error instanceof ExtractorError) {
			throw error;
		}
		throw new ExtractorError("PARSE_FAILED", "Falha ao parsear PDF", {
			fileType: "pdf",
			cause: error,
		});
	}
}
