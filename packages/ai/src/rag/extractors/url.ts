import * as cheerio from "cheerio";
import { ExtractorError } from "../errors";

/**
 * Extrai texto visivel de uma URL via fetch + cheerio.
 *
 * Estrategia:
 * - Remove <script>, <style>, <nav>, <footer>, <aside> (conteudo nao relevante).
 * - Extrai texto das tags semanticas principais (h1-h6, p, li, article, section, main).
 * - Normaliza whitespace.
 *
 * Lanca ExtractorError em: URL invalida, fetch 4xx/5xx, timeout, HTML sem texto
 * extraivel.
 *
 * Timeout default: 15 segundos.
 */
export async function extractUrl(
	url: string,
	options?: { timeoutMs?: number },
): Promise<{ text: string; title: string; pagesVisited: number }> {
	if (!url || typeof url !== "string") {
		throw new ExtractorError("FETCH_FAILED", "URL invalida", {
			fileType: "url",
		});
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
		if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
			throw new Error("URL deve usar http ou https");
		}
	} catch (error) {
		throw new ExtractorError("FETCH_FAILED", `URL malformada: ${url}`, {
			fileType: "url",
			cause: error,
		});
	}

	const timeoutMs = options?.timeoutMs ?? 15_000;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(parsedUrl.toString(), {
			signal: controller.signal,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (compatible; VertechAgentsBot/1.0; +https://vertech-agents.com)",
			},
		});

		if (!response.ok) {
			throw new ExtractorError(
				"FETCH_FAILED",
				`HTTP ${response.status} ${response.statusText} ao buscar ${url}`,
				{ fileType: "url" },
			);
		}

		const contentType = response.headers.get("content-type") ?? "";
		if (!contentType.includes("text/html")) {
			throw new ExtractorError(
				"UNSUPPORTED_FILE_TYPE",
				`Content-Type nao suportado: ${contentType}`,
				{ fileType: "url" },
			);
		}

		const html = await response.text();
		const $ = cheerio.load(html);

		// Remove elementos nao-conteudo
		$("script, style, nav, footer, aside, noscript, iframe, svg").remove();

		const title = $("title").first().text().trim() || parsedUrl.hostname;

		const relevantSelectors =
			"h1, h2, h3, h4, h5, h6, p, li, article, section main";
		const texts: string[] = [];
		$(relevantSelectors).each((_, el) => {
			const t = $(el).text().trim();
			if (t.length > 0) {
				texts.push(t);
			}
		});

		// Fallback: se nao achou tags semanticas, pega texto do body
		const extracted =
			texts.length > 0 ? texts.join("\n") : $("body").text().trim();

		const normalized = extracted
			.replace(/\s+/g, " ")
			.replace(/\n\s+/g, "\n")
			.trim();

		if (normalized.length === 0) {
			throw new ExtractorError(
				"EMPTY_CONTENT",
				"Pagina sem texto extraivel",
				{
					fileType: "url",
				},
			);
		}

		return { text: normalized, title, pagesVisited: 1 };
	} catch (error) {
		if (error instanceof ExtractorError) {
			throw error;
		}
		if (error instanceof Error && error.name === "AbortError") {
			throw new ExtractorError(
				"FETCH_FAILED",
				`Timeout apos ${timeoutMs}ms ao buscar ${url}`,
				{ fileType: "url", cause: error },
			);
		}
		throw new ExtractorError("FETCH_FAILED", `Erro ao buscar ${url}`, {
			fileType: "url",
			cause: error,
		});
	} finally {
		clearTimeout(timeoutId);
	}
}
