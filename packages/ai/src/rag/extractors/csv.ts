import Papa from "papaparse";
import { ExtractorError } from "../errors";

/**
 * Extrai texto estruturado de CSV.
 *
 * Converte o CSV em representacao textual preservando headers e linhas. Cada
 * registro vira um paragrafo com pares `campo: valor`, facilitando embedding
 * semantico (o modelo entende relacao campo-valor em linguagem natural).
 *
 * Ex: CSV com `nome,preco,estoque`
 *     "nome: Kit A, preco: R$ 100, estoque: 15 | nome: Kit B, preco: R$ 200..."
 */
export async function extractCsv(buffer: Buffer): Promise<string> {
	if (!buffer || buffer.length === 0) {
		throw new ExtractorError("EMPTY_CONTENT", "Buffer de CSV esta vazio", {
			fileType: "csv",
		});
	}

	try {
		const csvText = buffer.toString("utf-8");
		const parsed = Papa.parse<Record<string, string>>(csvText, {
			header: true,
			skipEmptyLines: true,
			transformHeader: (h) => h.trim(),
		});

		if (parsed.errors.length > 0 && parsed.data.length === 0) {
			throw new ExtractorError(
				"PARSE_FAILED",
				"CSV invalido ou malformado",
				{
					fileType: "csv",
					cause: parsed.errors,
				},
			);
		}

		if (parsed.data.length === 0) {
			throw new ExtractorError("EMPTY_CONTENT", "CSV sem registros", {
				fileType: "csv",
			});
		}

		const lines = parsed.data.map((row) => {
			const entries = Object.entries(row)
				.filter(([_, v]) => v != null && String(v).trim().length > 0)
				.map(([k, v]) => `${k}: ${String(v).trim()}`);
			return entries.join(", ");
		});

		return lines.join("\n");
	} catch (error) {
		if (error instanceof ExtractorError) {
			throw error;
		}
		throw new ExtractorError("PARSE_FAILED", "Falha ao parsear CSV", {
			fileType: "csv",
			cause: error,
		});
	}
}
