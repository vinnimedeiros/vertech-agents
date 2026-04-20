/**
 * Helpers client-side de anexos do composer do Arquiteto (story 09.4).
 *
 * Limites coerentes com server (`upload-helpers.ts`):
 * - Documento: 10MB, tipos PDF/DOCX/CSV/XLSX/TXT
 * - Imagem: 5MB, tipos PNG/JPG/WEBP (ainda não indexadas no RAG, só preview)
 * - Max 5 anexos por mensagem
 *
 * Validação aqui é só UX — server valida de novo e é fonte de verdade.
 */

export const MAX_ATTACHMENTS = 5;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const DOCUMENT_MIME_TYPES = [
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"text/csv",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"text/plain",
] as const;

export const DOCUMENT_ACCEPT = ".pdf,.docx,.csv,.xlsx,.txt";
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

export const IMAGE_MIME_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
] as const;

export type AttachmentKind = "document" | "image" | "link";

export type AttachmentStatus =
	| "uploading"
	| "ready"
	| "error"
	| "processing"
	| "indexed";

/**
 * Attachment no estado do composer. `id` é gerado client-side, `documentId` vem
 * do servidor após upload bem-sucedido (necessário pra subscribe Realtime e
 * referenciar no envio da mensagem em 09.5).
 */
export type ArchitectAttachment = {
	id: string;
	documentId?: string;
	kind: AttachmentKind;
	fileName: string;
	fileType: string;
	fileSize: number;
	status: AttachmentStatus;
	errorMessage?: string;
	url?: string;
};

export type FileValidationResult =
	| { ok: true; kind: "document" | "image" }
	| { ok: false; reason: string };

export function validateClientFile(file: File): FileValidationResult {
	if (file.size === 0) {
		return { ok: false, reason: "Arquivo vazio." };
	}

	if ((DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
		if (file.size > MAX_DOCUMENT_BYTES) {
			return {
				ok: false,
				reason: `Arquivo muito grande. Limite de ${formatBytes(MAX_DOCUMENT_BYTES)}.`,
			};
		}
		return { ok: true, kind: "document" };
	}

	if ((IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
		if (file.size > MAX_IMAGE_BYTES) {
			return {
				ok: false,
				reason: `Imagem muito grande. Limite de ${formatBytes(MAX_IMAGE_BYTES)}.`,
			};
		}
		return { ok: true, kind: "image" };
	}

	return {
		ok: false,
		reason: "Tipo de arquivo não suportado.",
	};
}

/**
 * Formata bytes em unidade legível. 1536 → "1,5 KB".
 */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Gera id temporário único pro attachment no client. Formato prefixado facilita
 * debug em logs (distingue de documentId server, que é CUID2).
 */
export function createAttachmentClientId(): string {
	return `att_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
