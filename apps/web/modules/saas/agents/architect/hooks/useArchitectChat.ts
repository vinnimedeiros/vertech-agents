"use client";

import { type Message, useChat } from "ai/react";
import { useCallback, useRef } from "react";

type UseArchitectChatOptions = {
	sessionId?: string;
	initialMessages?: Message[];
	onRateLimited?: (retryAfter: number, message: string) => void;
	onError?: (error: Error) => void;
};

type ArchitectRequestBody = {
	sessionId: string;
	messages: Message[];
	attachmentIds: string[];
};

/**
 * Hook do chat do Arquiteto (story 09.5, tech-spec § 7.2).
 *
 * Wrapper em torno do `useChat` do @ai-sdk/react com:
 * - `streamProtocol: 'text'` pra consumir `textStream` puro que o route handler
 *   retorna (Mastra `result.textStream`)
 * - `experimental_prepareRequestBody` pra injetar `sessionId` e `attachmentIds`
 *   no payload a cada envio (o UI mantém `attachments` em state separado)
 * - Interceptação de 429 para acionar callback `onRateLimited` (UI mostra
 *   toast + countdown no composer)
 *
 * `sendWithAttachments(text, attachmentIds)` é a API exposta ao consumer:
 * envia msg + lista de documentIds prontos na mesma chamada.
 */
export function useArchitectChat({
	sessionId,
	initialMessages,
	onRateLimited,
	onError,
}: UseArchitectChatOptions) {
	const pendingAttachmentIdsRef = useRef<string[]>([]);

	const chat = useChat({
		api: "/api/architect/chat",
		id: sessionId,
		initialMessages,
		streamProtocol: "text",
		experimental_prepareRequestBody: ({ messages }) => {
			const body: ArchitectRequestBody = {
				sessionId: sessionId ?? "",
				messages: messages as Message[],
				attachmentIds: pendingAttachmentIdsRef.current,
			};
			return body;
		},
		onResponse: async (response: Response) => {
			if (response.status !== 429) return;
			try {
				const payload = (await response.clone().json()) as {
					retryAfter?: number;
					message?: string;
				};
				const retryAfter =
					typeof payload.retryAfter === "number"
						? payload.retryAfter
						: 60;
				const message =
					payload.message ??
					"Você está falando muito rápido. Aguarda pro Arquiteto processar.";
				onRateLimited?.(retryAfter, message);
			} catch {
				onRateLimited?.(
					60,
					"Você está falando muito rápido. Aguarda pro Arquiteto processar.",
				);
			}
		},
		onError: (err: Error) => {
			onError?.(err);
		},
	});

	const append = chat.append;
	const sendWithAttachments = useCallback(
		async (text: string, attachmentIds: string[] = []) => {
			if (!sessionId) {
				throw new Error(
					"sessionId obrigatório — chamar ensureSession antes de enviar.",
				);
			}
			pendingAttachmentIdsRef.current = attachmentIds;
			try {
				await append({
					role: "user",
					content: text,
				});
			} finally {
				pendingAttachmentIdsRef.current = [];
			}
		},
		[append, sessionId],
	);

	return {
		messages: chat.messages,
		isLoading: chat.isLoading,
		error: chat.error,
		stop: chat.stop,
		reload: chat.reload,
		sendWithAttachments,
		setMessages: chat.setMessages,
	};
}
