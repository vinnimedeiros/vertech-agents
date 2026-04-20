"use client";

import { type Message, useChat } from "ai/react";
import { useCallback, useEffect, useRef } from "react";

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
 * Wrapper em torno do `useChat` do ai/react com:
 * - `streamProtocol: 'text'` pra consumir `textStream` puro que o route handler
 *   retorna (Mastra `result.textStream`)
 * - `experimental_prepareRequestBody` pra injetar `sessionId` e `attachmentIds`
 *   no payload a cada envio
 * - Interceptação de 429 para acionar callback `onRateLimited`
 *
 * Sessão pode ser criada depois do primeiro render (ensureSession lazy).
 * Por isso sessionId é armazenado em `sessionIdRef` e pode ser atualizado
 * via `setSessionId(id)` pelo parent — evita stale closure durante o mesmo
 * ciclo de render.
 */
export function useArchitectChat({
	sessionId,
	initialMessages,
	onRateLimited,
	onError,
}: UseArchitectChatOptions) {
	const pendingAttachmentIdsRef = useRef<string[]>([]);
	const sessionIdRef = useRef<string | undefined>(sessionId);

	useEffect(() => {
		sessionIdRef.current = sessionId;
	}, [sessionId]);

	// NÃO passamos `id: sessionId` pro useChat intencionalmente: sessionId
	// pode começar undefined (Welcome state) e virar um valor real após
	// ensureSession. Se usarmos como id do useChat, a instância remonta
	// e perde as mensagens do primeiro turn. sessionId viaja só no body
	// (via prepareRequestBody + ref). Para retomada de sessão, usamos
	// initialMessages hidratado externamente pelo parent.
	const chat = useChat({
		api: "/api/architect/chat",
		initialMessages,
		streamProtocol: "text",
		experimental_prepareRequestBody: ({ messages }) => {
			const body: ArchitectRequestBody = {
				sessionId: sessionIdRef.current ?? "",
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
		async (
			text: string,
			attachmentIds: string[] = [],
			sessionIdOverride?: string,
		) => {
			if (sessionIdOverride) {
				sessionIdRef.current = sessionIdOverride;
			}
			if (!sessionIdRef.current) {
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
		[append],
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
