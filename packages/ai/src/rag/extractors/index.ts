/**
 * Barrel dos extractors + dispatcher por tipo de arquivo.
 *
 * Consumido pelo pipeline de ingest (ingest.ts).
 */

import { ExtractorError } from "../errors";
import type { KnowledgeFileType } from "../types";
import { extractCsv } from "./csv";
import { extractDocx } from "./docx";
import { extractPdf } from "./pdf";
import { extractTxt } from "./txt";
import { extractUrl } from "./url";
import { extractXlsx } from "./xlsx";

export { extractPdf } from "./pdf";
export { extractDocx } from "./docx";
export { extractCsv } from "./csv";
export { extractXlsx } from "./xlsx";
export { extractTxt } from "./txt";
export { extractUrl } from "./url";

/**
 * Dispatcher principal. Recebe tipo + fonte (buffer ou URL) e retorna o texto
 * extraido. Centraliza a decisao de qual extractor chamar.
 *
 * Pra URL, source deve ser string (a URL). Pra demais, source deve ser Buffer.
 */
export async function extractText(
	fileType: KnowledgeFileType,
	source: Buffer | string,
): Promise<string> {
	if (fileType === "url") {
		if (typeof source !== "string") {
			throw new ExtractorError(
				"UNSUPPORTED_FILE_TYPE",
				"Extractor URL espera string (URL), recebeu Buffer",
				{ fileType },
			);
		}
		const { text } = await extractUrl(source);
		return text;
	}

	if (typeof source === "string") {
		throw new ExtractorError(
			"UNSUPPORTED_FILE_TYPE",
			`Extractor ${fileType} espera Buffer, recebeu string`,
			{ fileType },
		);
	}

	switch (fileType) {
		case "pdf":
			return extractPdf(source);
		case "docx":
			return extractDocx(source);
		case "csv":
			return extractCsv(source);
		case "xlsx":
			return extractXlsx(source);
		case "txt":
			return extractTxt(source);
		default: {
			const exhaustiveCheck: never = fileType;
			throw new ExtractorError(
				"UNSUPPORTED_FILE_TYPE",
				`Tipo de arquivo nao suportado: ${String(exhaustiveCheck)}`,
			);
		}
	}
}
