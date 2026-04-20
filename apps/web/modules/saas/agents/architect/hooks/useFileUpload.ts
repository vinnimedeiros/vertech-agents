"use client";

import { useCallback, useRef } from "react";
import {
	type ArchitectAttachment,
	createAttachmentClientId,
	validateClientFile,
} from "../lib/attachment-helpers";

type UploadDocumentResponse = {
	documents?: Array<{
		ok: true;
		id: string;
		fileName: string;
		fileType: string;
		fileSize: number;
		status: string;
	}>;
	errors?: Array<{
		ok: false;
		fileName: string;
		error: string;
		message: string;
	}>;
	error?: string;
	message?: string;
};

type UploadLinkResponse = {
	document?: {
		id: string;
		title: string;
		fileType: string;
		fileSize: number;
	};
	error?: string;
	message?: string;
};

type CreateSessionResponse = {
	sessionId?: string;
	error?: string;
};

type UseFileUploadOptions = {
	organizationSlug: string;
	templateId: string;
	initialSessionId?: string;
	onSessionCreated?: (sessionId: string) => void;
	onAttachmentsChange: (
		updater: (prev: ArchitectAttachment[]) => ArchitectAttachment[],
	) => void;
};

/**
 * Hook de upload do composer do Arquiteto (story 09.4).
 *
 * Cria sessão DRAFT lazy no primeiro upload se `initialSessionId` não vier.
 * Depois dispatcha upload de arquivos (FormData) ou link (JSON), e atualiza
 * a lista de attachments do parent via `onAttachmentsChange`.
 *
 * AbortController por attachment permite remover durante upload em andamento.
 */
export function useFileUpload({
	organizationSlug,
	templateId,
	initialSessionId,
	onSessionCreated,
	onAttachmentsChange,
}: UseFileUploadOptions) {
	const sessionIdRef = useRef<string | undefined>(initialSessionId);
	const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

	const ensureSession = useCallback(async (): Promise<string> => {
		if (sessionIdRef.current) return sessionIdRef.current;

		const res = await fetch("/api/architect/sessions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ organizationSlug, templateId }),
		});

		const data = (await res
			.json()
			.catch(() => null)) as CreateSessionResponse | null;

		if (!res.ok || !data?.sessionId) {
			throw new Error(
				data?.error === "ORGANIZATION_NOT_FOUND"
					? "Organização não encontrada."
					: "Não consegui iniciar a sessão. Tenta de novo.",
			);
		}

		sessionIdRef.current = data.sessionId;
		onSessionCreated?.(data.sessionId);
		return data.sessionId;
	}, [organizationSlug, templateId, onSessionCreated]);

	const addPending = useCallback(
		(attachment: ArchitectAttachment) => {
			onAttachmentsChange((prev) => [...prev, attachment]);
		},
		[onAttachmentsChange],
	);

	const patchAttachment = useCallback(
		(id: string, patch: Partial<ArchitectAttachment>) => {
			onAttachmentsChange((prev) =>
				prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
			);
		},
		[onAttachmentsChange],
	);

	const removeAttachment = useCallback(
		(id: string) => {
			const controller = abortControllersRef.current.get(id);
			if (controller) {
				controller.abort();
				abortControllersRef.current.delete(id);
			}
			onAttachmentsChange((prev) => prev.filter((a) => a.id !== id));
		},
		[onAttachmentsChange],
	);

	const uploadFiles = useCallback(
		async (files: File[]) => {
			if (files.length === 0) return;

			const validated = files.map((file) => ({
				file,
				result: validateClientFile(file),
			}));

			// Registra pendings com validação falha como erros imediatos (visual).
			for (const { file, result } of validated) {
				if (!result.ok) {
					const id = createAttachmentClientId();
					addPending({
						id,
						kind: "document",
						fileName: file.name,
						fileType: file.type,
						fileSize: file.size,
						status: "error",
						errorMessage: result.reason,
					});
				}
			}

			const validFiles = validated.filter(
				(
					v,
				): v is {
					file: File;
					result: { ok: true; kind: "document" | "image" };
				} => v.result.ok,
			);
			if (validFiles.length === 0) return;

			// Cria entries pending pra todos, pra UI responder imediatamente.
			const pendingEntries = validFiles.map(({ file, result }) => {
				const id = createAttachmentClientId();
				const attachment: ArchitectAttachment = {
					id,
					kind: result.kind,
					fileName: file.name,
					fileType: file.type,
					fileSize: file.size,
					status: "uploading",
				};
				addPending(attachment);
				return { id, file };
			});

			let sessionId: string;
			try {
				sessionId = await ensureSession();
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Erro desconhecido.";
				for (const { id } of pendingEntries) {
					patchAttachment(id, {
						status: "error",
						errorMessage: message,
					});
				}
				return;
			}

			// Imagem ainda não é indexada no RAG (upload-helpers server rejeita).
			// Enquanto isso não muda, filtrar imagens aqui e marcar como "ready"
			// local sem subir. Assim UI mostra o mini-card mas não quebra server.
			const imageEntries = pendingEntries.filter(({ file }) =>
				file.type.startsWith("image/"),
			);
			const documentEntries = pendingEntries.filter(
				({ file }) => !file.type.startsWith("image/"),
			);

			for (const { id, file } of imageEntries) {
				patchAttachment(id, {
					status: "ready",
					url: URL.createObjectURL(file),
				});
			}

			if (documentEntries.length === 0) return;

			const formData = new FormData();
			formData.append("sessionId", sessionId);
			for (const { file } of documentEntries) {
				formData.append("file", file);
			}

			// Um controller por lote. Remove individual aborta todo lote — como
			// upload é multiplex no mesmo request, não dá pra cancelar só um.
			// Esse é o tradeoff aceitável dessa story (documentado).
			const controller = new AbortController();
			for (const { id } of documentEntries) {
				abortControllersRef.current.set(id, controller);
			}

			try {
				const res = await fetch("/api/architect/upload", {
					method: "POST",
					body: formData,
					signal: controller.signal,
				});

				const data = (await res
					.json()
					.catch(() => null)) as UploadDocumentResponse | null;

				if (!res.ok) {
					const serverMessage =
						data?.message || data?.error || "Falha no upload.";
					for (const { id } of documentEntries) {
						patchAttachment(id, {
							status: "error",
							errorMessage: serverMessage,
						});
					}
					return;
				}

				const documents = data?.documents ?? [];
				const errors = data?.errors ?? [];

				// Mapeia response por fileName (ordem não garantida com Promise.allSettled).
				const byName = new Map<string, (typeof documents)[number]>();
				for (const doc of documents) {
					byName.set(doc.fileName, doc);
				}
				const errorsByName = new Map<string, (typeof errors)[number]>();
				for (const err of errors) {
					errorsByName.set(err.fileName, err);
				}

				for (const { id, file } of documentEntries) {
					const doc = byName.get(file.name);
					const err = errorsByName.get(file.name);
					if (doc) {
						patchAttachment(id, {
							status: "ready",
							documentId: doc.id,
						});
					} else if (err) {
						patchAttachment(id, {
							status: "error",
							errorMessage: err.message,
						});
					} else {
						patchAttachment(id, {
							status: "error",
							errorMessage: "Resposta inesperada do servidor.",
						});
					}
				}
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") {
					// Usuário removeu durante upload — silencioso.
					return;
				}
				const message =
					err instanceof Error ? err.message : "Erro de rede.";
				for (const { id } of documentEntries) {
					patchAttachment(id, {
						status: "error",
						errorMessage: message,
					});
				}
			} finally {
				for (const { id } of documentEntries) {
					abortControllersRef.current.delete(id);
				}
			}
		},
		[addPending, ensureSession, patchAttachment],
	);

	const uploadLink = useCallback(
		async (url: string) => {
			const id = createAttachmentClientId();
			addPending({
				id,
				kind: "link",
				fileName: url,
				fileType: "URL",
				fileSize: 0,
				status: "uploading",
				url,
			});

			let sessionId: string;
			try {
				sessionId = await ensureSession();
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Erro desconhecido.";
				patchAttachment(id, { status: "error", errorMessage: message });
				return;
			}

			try {
				const res = await fetch("/api/architect/upload-link", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ sessionId, url }),
				});

				const data = (await res
					.json()
					.catch(() => null)) as UploadLinkResponse | null;

				if (!res.ok || !data?.document) {
					const serverMessage =
						data?.message ||
						data?.error ||
						"Falha ao processar link.";
					patchAttachment(id, {
						status: "error",
						errorMessage: serverMessage,
					});
					return;
				}

				patchAttachment(id, {
					status: "ready",
					documentId: data.document.id,
					fileName: data.document.title || url,
				});
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Erro de rede.";
				patchAttachment(id, { status: "error", errorMessage: message });
			}
		},
		[addPending, ensureSession, patchAttachment],
	);

	return {
		uploadFiles,
		uploadLink,
		removeAttachment,
	};
}
