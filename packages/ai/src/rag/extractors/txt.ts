import { ExtractorError } from "../errors";

/**
 * Extrai texto de TXT — essencialmente decode UTF-8.
 *
 * Normaliza CRLF para LF pra consistencia no chunking.
 */
export async function extractTxt(buffer: Buffer): Promise<string> {
	if (!buffer || buffer.length === 0) {
		throw new ExtractorError("EMPTY_CONTENT", "Buffer de TXT esta vazio", {
			fileType: "txt",
		});
	}

	try {
		const text = buffer.toString("utf-8").replace(/\r\n/g, "\n").trim();

		if (text.length === 0) {
			throw new ExtractorError("EMPTY_CONTENT", "TXT sem conteudo", {
				fileType: "txt",
			});
		}

		return text;
	} catch (error) {
		if (error instanceof ExtractorError) {
			throw error;
		}
		throw new ExtractorError("PARSE_FAILED", "Falha ao decodar TXT", {
			fileType: "txt",
			cause: error,
		});
	}
}
