import * as XLSX from "xlsx";
import { ExtractorError } from "../errors";

/**
 * Extrai texto estruturado de XLSX.
 *
 * Itera por todas as sheets do workbook, transforma cada uma em texto no formato
 * CSV interno, e concatena com cabecalho `## Sheet: {nome}` pra dar contexto ao
 * modelo de embedding sobre a origem dos dados.
 */
export async function extractXlsx(buffer: Buffer): Promise<string> {
	if (!buffer || buffer.length === 0) {
		throw new ExtractorError("EMPTY_CONTENT", "Buffer de XLSX esta vazio", {
			fileType: "xlsx",
		});
	}

	try {
		const workbook = XLSX.read(buffer, { type: "buffer" });

		if (workbook.SheetNames.length === 0) {
			throw new ExtractorError("EMPTY_CONTENT", "XLSX sem sheets", {
				fileType: "xlsx",
			});
		}

		const sections = workbook.SheetNames.map((sheetName) => {
			const sheet = workbook.Sheets[sheetName];
			const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
			return `## Sheet: ${sheetName}\n${csv.trim()}`;
		});

		const text = sections.join("\n\n");
		if (text.trim().length === 0) {
			throw new ExtractorError(
				"EMPTY_CONTENT",
				"XLSX sem dados extraiveis",
				{
					fileType: "xlsx",
				},
			);
		}

		return text;
	} catch (error) {
		if (error instanceof ExtractorError) {
			throw error;
		}
		throw new ExtractorError("PARSE_FAILED", "Falha ao parsear XLSX", {
			fileType: "xlsx",
			cause: error,
		});
	}
}
