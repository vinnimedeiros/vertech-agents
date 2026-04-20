import {
	agentCreationSession,
	and,
	db,
	eq,
	knowledgeDocument,
} from "@repo/database";
import { dispatchIngestDocument } from "@repo/queue";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";

/**
 * Helpers server-side do upload do Arquiteto (story 08A.4).
 *
 * Compartilhado entre route handlers `POST /api/architect/upload` e
 * `POST /api/architect/upload-link`. Mantém a lógica de validação, path
 * building, upload pro Storage, insert em knowledge_document e enqueue
 * de ingest em um único lugar pra evitar drift entre os dois endpoints.
 */

export const BUCKET_NAME = "architect-uploads";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (bucket-enforced)
export const MAX_ATTACHMENTS_PER_REQUEST = 5;

export type UploadErrorCode =
	| "INVALID_FILE_TYPE"
	| "FILE_TOO_LARGE"
	| "EMPTY_FILE"
	| "TOO_MANY_ATTACHMENTS"
	| "SESSION_NOT_FOUND"
	| "FORBIDDEN"
	| "STORAGE_FAILED"
	| "ENQUEUE_FAILED"
	| "INVALID_URL"
	| "URL_FETCH_FAILED"
	| "RATE_LIMITED"
	| "SUPABASE_NOT_CONFIGURED"
	| "UNAUTHENTICATED";

export class UploadError extends Error {
	constructor(
		public readonly code: UploadErrorCode,
		message: string,
		public readonly status = 400,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "UploadError";
	}
}

// =============================================================================
// MIME type mapping
// =============================================================================

type SupportedMime =
	| "application/pdf"
	| "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	| "text/csv"
	| "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	| "text/plain";

const MIME_TO_FILE_TYPE: Record<
	SupportedMime,
	"PDF" | "DOCX" | "CSV" | "XLSX" | "TXT"
> = {
	"application/pdf": "PDF",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		"DOCX",
	"text/csv": "CSV",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
	"text/plain": "TXT",
};

export const SUPPORTED_DOCUMENT_MIME_TYPES = Object.keys(
	MIME_TO_FILE_TYPE,
) as SupportedMime[];

/**
 * Mapeia MIME type pra knowledge_document.fileType enum.
 *
 * **Imagens (png/jpg/webp) são aceitas pelo bucket pra preview na UI mas
 * NÃO são indexadas no RAG nesta phase** (nenhum extractor implementado em
 * 08A.1). Se a UI quiser preview, deve usar o AttachmentMenu (09.4) com um
 * fluxo separado que apenas sobe pro bucket sem criar row em
 * knowledge_document. Este helper rejeita imagens propositalmente — AC7
 * lista imagens como "suportadas pra imagem" no sentido de bucket, mas
 * não para ingest. Divergência documentada na story.
 */
export function mimeToFileType(
	mime: string,
): "PDF" | "DOCX" | "CSV" | "XLSX" | "TXT" | null {
	return MIME_TO_FILE_TYPE[mime as SupportedMime] ?? null;
}

// =============================================================================
// File validation
// =============================================================================

export function validateFile(file: File): {
	fileType: "PDF" | "DOCX" | "CSV" | "XLSX" | "TXT";
} {
	if (file.size === 0) {
		throw new UploadError("EMPTY_FILE", "Arquivo vazio.");
	}
	if (file.size > MAX_FILE_BYTES) {
		throw new UploadError(
			"FILE_TOO_LARGE",
			`Arquivo excede o limite de ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)}MB.`,
		);
	}
	const fileType = mimeToFileType(file.type);
	if (!fileType) {
		throw new UploadError(
			"INVALID_FILE_TYPE",
			`Tipo não suportado: ${file.type || "desconhecido"}. Aceitos: PDF, DOCX, CSV, XLSX, TXT.`,
		);
	}
	return { fileType };
}

// =============================================================================
// Path builder (estrutura no bucket)
// =============================================================================

/**
 * Path pattern (AC3 story 08A.4): `{orgId}/{sessionId}/{docId}/{safeFilename}`.
 *
 * `safeFilename` mantém extensão original mas remove caracteres problemáticos
 * pra Storage (spaces, unicode complexo, path separators).
 */
export function buildStoragePath(
	organizationId: string,
	sessionId: string,
	documentId: string,
	originalFilename: string,
): string {
	return `${organizationId}/${sessionId}/${documentId}/${safeFilename(originalFilename)}`;
}

/**
 * Remove combining diacritical marks (Unicode U+0300–U+036F) após NFD normalize.
 *
 * Alternativa idiomática seria `.replace(/\p{Diacritic}/gu, "")`, mas flag `u`
 * requer ES6+ e o tsconfig do web é ES5. Character class literal é flaggada
 * pelo Biome (noMisleadingCharacterClass). Iteração via charCodeAt contorna
 * ambos e funciona em qualquer target.
 */
function stripCombiningMarks(s: string): string {
	let out = "";
	for (let i = 0; i < s.length; i++) {
		const code = s.charCodeAt(i);
		if (code < 0x0300 || code > 0x036f) {
			out += s.charAt(i);
		}
	}
	return out;
}

function safeFilename(name: string): string {
	const base = name.split(/[/\\]/).pop() ?? "file";
	const dot = base.lastIndexOf(".");
	const stem = dot > 0 ? base.slice(0, dot) : base;
	const ext = dot > 0 ? base.slice(dot + 1) : "";
	const safeStem = stripCombiningMarks(stem.normalize("NFD"))
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.slice(0, 80);
	const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
	// Se stem virou só caracteres não-alfanuméricos (ex: "!!!" → "___"), usa fallback.
	const hasAlphanum = /[a-zA-Z0-9]/.test(safeStem);
	const finalStem = safeStem.length > 0 && hasAlphanum ? safeStem : "file";
	return safeExt ? `${finalStem}.${safeExt}` : finalStem;
}

// =============================================================================
// Supabase Storage client (service_role)
// =============================================================================

let cachedClient: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient {
	if (cachedClient) return cachedClient;

	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new UploadError(
			"SUPABASE_NOT_CONFIGURED",
			"Supabase não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
			500,
		);
	}
	cachedClient = createClient(url, key, { auth: { persistSession: false } });
	return cachedClient;
}

/**
 * Upload binário pro bucket `architect-uploads` no path dado.
 * Lança UploadError("STORAGE_FAILED") se falhar.
 */
export async function uploadToStorage(
	path: string,
	body: Buffer | ArrayBuffer,
	contentType: string,
): Promise<void> {
	const client = getStorageClient();
	const { error } = await client.storage
		.from(BUCKET_NAME)
		.upload(path, body, {
			contentType: contentType || "application/octet-stream",
			upsert: false,
		});
	if (error) {
		throw new UploadError(
			"STORAGE_FAILED",
			`Falha no upload pro bucket: ${error.message}`,
			500,
			{ path },
		);
	}
}

// =============================================================================
// Session ownership
// =============================================================================

export async function requireSessionOwnership(
	sessionId: string,
	userId: string,
): Promise<{ organizationId: string }> {
	const session = await db.query.agentCreationSession.findFirst({
		where: and(
			eq(agentCreationSession.id, sessionId),
			eq(agentCreationSession.userId, userId),
			eq(agentCreationSession.status, "DRAFT"),
		),
		columns: {
			id: true,
			organizationId: true,
		},
	});
	if (!session) {
		throw new UploadError(
			"SESSION_NOT_FOUND",
			`Sessão ${sessionId} não encontrada ou não pertence ao usuário.`,
			404,
		);
	}
	return { organizationId: session.organizationId };
}

// =============================================================================
// knowledge_document insert + enqueue
// =============================================================================

export type PersistUploadInput = {
	organizationId: string;
	sessionId: string;
	documentId: string;
	title: string;
	fileUrl: string; // path no bucket (ou URL externa pra fileType URL)
	fileType: "PDF" | "DOCX" | "CSV" | "XLSX" | "TXT" | "URL";
	fileSize: number;
};

export type PersistUploadResult = {
	id: string;
	title: string;
	fileType: PersistUploadInput["fileType"];
	fileSize: number;
	status: "PENDING";
};

/**
 * Insere row em knowledge_document e enfileira job na queue ingest-document.
 *
 * Se a enfileiração falhar APÓS o insert bem-sucedido, atualiza a row pra
 * `status: ERROR` (AC16) e relança UploadError — evita doc fantasma em PENDING.
 */
export async function persistUploadAndEnqueue(
	input: PersistUploadInput,
): Promise<PersistUploadResult> {
	const [row] = await db
		.insert(knowledgeDocument)
		.values({
			id: input.documentId,
			organizationId: input.organizationId,
			sessionId: input.sessionId,
			agentId: null,
			title: input.title,
			fileUrl: input.fileUrl,
			fileType: input.fileType,
			fileSize: input.fileSize,
			status: "PENDING",
			chunkCount: 0,
			extractedSummary: null,
			errorMessage: null,
		})
		.returning();

	if (!row) {
		throw new UploadError(
			"STORAGE_FAILED",
			"INSERT em knowledge_document não retornou row.",
			500,
		);
	}

	try {
		await dispatchIngestDocument({ documentId: row.id });
	} catch (enqueueErr) {
		await db
			.update(knowledgeDocument)
			.set({
				status: "ERROR",
				errorMessage: `Enqueue falhou: ${enqueueErr instanceof Error ? enqueueErr.message : String(enqueueErr)}`,
				updatedAt: new Date(),
			})
			.where(eq(knowledgeDocument.id, row.id));

		throw new UploadError(
			"ENQUEUE_FAILED",
			"Arquivo subiu mas falha ao enfileirar ingest. Tente novamente em instantes.",
			500,
		);
	}

	return {
		id: row.id,
		title: row.title,
		fileType: row.fileType,
		fileSize: row.fileSize,
		status: "PENDING",
	};
}
