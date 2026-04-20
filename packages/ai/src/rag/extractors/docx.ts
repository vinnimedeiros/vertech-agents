import mammoth from "mammoth";
import { ExtractorError } from "../errors";

/**
 * Extrai texto de DOCX via mammoth.
 *
 * mammoth.extractRawText retorna texto sem formatacao (ignora bold/italic/lists
 * markup), o que e ideal pra embedding. Preserva quebras de paragrafo.
 *
 * Lanca ExtractorError em: buffer corrompido, DOCX sem texto.
 */
export async function extractDocx(buffer: Buffer): Promise<string> {
	if (!buffer || buffer.length === 0) {
		throw new ExtractorError("EMPTY_CONTENT", "Buffer de DOCX esta vazio", {
			fileType: "docx",
		});
	}

	try {
		const result = await mammoth.extractRawText({ buffer });
		const text = result.value?.trim() ?? "";

		if (text.length === 0) {
			throw new ExtractorError("EMPTY_CONTENT", "DOCX nao contem texto", {
				fileType: "docx",
			});
		}

		return text;
	} catch (error) {
		if (error instanceof ExtractorError) {
			throw error;
		}
		throw new ExtractorError("PARSE_FAILED", "Falha ao parsear DOCX", {
			fileType: "docx",
			cause: error,
		});
	}
}
