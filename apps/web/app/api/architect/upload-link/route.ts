import { createId } from "@repo/database";
import {
	ARCHITECT_UPLOAD_LIMIT,
	checkRateLimit,
} from "@saas/agents/architect/lib/rate-limit";
import {
	UploadError,
	persistUploadAndEnqueue,
	requireSessionOwnership,
} from "@saas/agents/architect/lib/upload-helpers";
import { getSession } from "@saas/auth/lib/server";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2MB é o suficiente pra extrair title

/**
 * POST /api/architect/upload-link (story 08A.4)
 *
 * Body JSON: `{ sessionId: string, url: string }`
 *
 * Fluxo:
 * 1. Auth + rate limit (mesmo bucket do /upload)
 * 2. Valida URL http(s)
 * 3. Fetch HTML com timeout (10s), extrai <title> via cheerio
 * 4. Insert knowledge_document com fileType URL, fileUrl = URL externa
 * 5. Enfileira job ingest-document (extractor URL de 08A.1 faz scrape completo)
 *
 * fileSize = 0 porque não baixamos o conteúdo aqui (o ingest vai fazer fetch
 * completo via extractor URL).
 */
export async function POST(req: Request) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json(
				{ error: "UNAUTHENTICATED" },
				{ status: 401 },
			);
		}

		const rate = await checkRateLimit(
			session.user.id,
			ARCHITECT_UPLOAD_LIMIT,
		);
		if (!rate.allowed) {
			return NextResponse.json(
				{ error: "RATE_LIMITED", retryAfter: rate.retryAfter },
				{
					status: 429,
					headers: { "Retry-After": String(rate.retryAfter) },
				},
			);
		}

		const body = (await req.json().catch(() => null)) as {
			sessionId?: unknown;
			url?: unknown;
		} | null;
		if (!body) {
			return NextResponse.json(
				{ error: "INVALID_BODY" },
				{ status: 400 },
			);
		}
		const sessionId =
			typeof body.sessionId === "string" ? body.sessionId : "";
		const urlRaw = typeof body.url === "string" ? body.url.trim() : "";
		if (!sessionId || !urlRaw) {
			return NextResponse.json(
				{ error: "MISSING_FIELDS" },
				{ status: 400 },
			);
		}

		const parsedUrl = parseHttpUrl(urlRaw);
		if (!parsedUrl) {
			return NextResponse.json(
				{
					error: "INVALID_URL",
					message: "URL deve começar com http:// ou https://.",
				},
				{ status: 400 },
			);
		}

		const { organizationId } = await requireSessionOwnership(
			sessionId,
			session.user.id,
		);

		const title = await fetchHtmlTitle(parsedUrl).catch((err: unknown) => {
			throw new UploadError(
				"URL_FETCH_FAILED",
				`Não consegui acessar a URL: ${err instanceof Error ? err.message : String(err)}`,
				400,
			);
		});

		const documentId = createId();
		const persisted = await persistUploadAndEnqueue({
			organizationId,
			sessionId,
			documentId,
			title: title || parsedUrl.hostname,
			fileUrl: parsedUrl.toString(),
			fileType: "URL",
			fileSize: 0,
		});

		return NextResponse.json({ document: persisted });
	} catch (err) {
		if (err instanceof UploadError) {
			return NextResponse.json(
				{ error: err.code, message: err.message, details: err.details },
				{ status: err.status },
			);
		}
		console.error("[architect/upload-link] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}

function parseHttpUrl(raw: string): URL | null {
	try {
		const url = new URL(raw);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return null;
		}
		return url;
	} catch {
		return null;
	}
}

async function fetchHtmlTitle(url: URL): Promise<string> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const res = await fetch(url.toString(), {
			signal: controller.signal,
			redirect: "follow",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (compatible; VertechArchitectBot/1.0; +https://vertech-agents.com/bot)",
			},
		});
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}

		const contentType = res.headers.get("content-type") ?? "";
		if (
			!contentType.includes("text/html") &&
			!contentType.includes("application/xhtml")
		) {
			return url.hostname;
		}

		const reader = res.body?.getReader();
		if (!reader) return url.hostname;

		let received = 0;
		const chunks: Uint8Array[] = [];
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			if (value) {
				chunks.push(value);
				received += value.byteLength;
				if (received >= MAX_HTML_BYTES) {
					await reader.cancel();
					break;
				}
			}
		}

		const html = new TextDecoder().decode(concatChunks(chunks));
		const $ = cheerio.load(html);
		const title =
			$("title").first().text().trim() ||
			$('meta[property="og:title"]').attr("content")?.trim() ||
			"";
		return (title || url.hostname).slice(0, 200);
	} finally {
		clearTimeout(timer);
	}
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
	let total = 0;
	for (const c of chunks) total += c.byteLength;
	const out = new Uint8Array(total);
	let offset = 0;
	for (const c of chunks) {
		out.set(c, offset);
		offset += c.byteLength;
	}
	return out;
}
