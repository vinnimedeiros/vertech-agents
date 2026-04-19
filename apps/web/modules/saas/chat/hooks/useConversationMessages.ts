"use client";

import type { ChatMessage } from "@saas/chat/lib/server";
import { getSupabaseBrowser } from "@saas/chat/lib/supabase-browser";
import { useCallback, useEffect, useRef, useState } from "react";

function normalizeRealtimePayload(raw: any): ChatMessage {
	return {
		id: raw.id,
		conversationId: raw.conversationId ?? raw.conversation_id,
		senderType: raw.senderType ?? raw.sender_type,
		senderId: raw.senderId ?? raw.sender_id ?? null,
		senderName: raw.senderName ?? raw.sender_name ?? null,
		senderAvatar: raw.senderAvatar ?? raw.sender_avatar ?? null,
		direction: raw.direction,
		type: raw.type,
		status: raw.status,
		text: raw.text ?? null,
		mediaUrl: raw.mediaUrl ?? raw.media_url ?? null,
		mediaMimeType: raw.mediaMimeType ?? raw.media_mime_type ?? null,
		mediaFileName: raw.mediaFileName ?? raw.media_file_name ?? null,
		mediaSize: raw.mediaSize ?? raw.media_size ?? null,
		durationSeconds: raw.durationSeconds ?? raw.duration_seconds ?? null,
		caption: raw.caption ?? null,
		createdAt: new Date(raw.createdAt ?? raw.created_at),
	};
}

export type ConversationMessagesBag = {
	messages: ChatMessage[];
	appendMessage: (msg: ChatMessage) => void;
	/** Troca uma msg otimista (por tempId) pelo resultado real do servidor */
	confirmMessage: (tempId: string, real: ChatMessage) => void;
	removeMessage: (id: string) => void;
};

export function useConversationMessages(
	conversationId: string,
	initialMessages: ChatMessage[],
): ConversationMessagesBag {
	const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
	const lastConversationIdRef = useRef(conversationId);

	// Só reseta o state quando a conversa ativa MUDA.
	// Re-renders da página (ex: router.refresh após send) NÃO devem sobrescrever
	// o state — otimismo local + Realtime ficariam apagados e o scroll pularia.
	// Quem trouxer mensagens novas é o Realtime (INSERT/UPDATE).
	useEffect(() => {
		if (lastConversationIdRef.current !== conversationId) {
			lastConversationIdRef.current = conversationId;
			setMessages(initialMessages);
		}
	}, [conversationId, initialMessages]);

	useEffect(() => {
		const supabase = getSupabaseBrowser();
		const channel = supabase
			.channel(`conversation:${conversationId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "message",
					filter: `conversationId=eq.${conversationId}`,
				},
				(payload) => {
					const next = normalizeRealtimePayload(payload.new);
					setMessages((prev) => {
						// Já existe (caso comum de evento duplicado) — ignora
						if (prev.some((m) => m.id === next.id)) return prev;

						// Se é nossa própria mensagem OUTBOUND e temos um temp
						// equivalente (com mesmo text ou mesmo mediaFileName), troca
						// o temp pelo real pra evitar flash de duplicação enquanto a
						// action não retorna.
						if (next.direction === "OUTBOUND") {
							const tempIdx = prev.findIndex((m) => {
								if (!m.id.startsWith("temp-")) return false;
								if (m.direction !== "OUTBOUND") return false;
								if (m.type !== next.type) return false;
								if (next.type === "TEXT") return m.text === next.text;
								return m.mediaFileName === next.mediaFileName;
							});
							if (tempIdx >= 0) {
								const copy = prev.slice();
								copy[tempIdx] = next;
								return copy;
							}
						}

						return [...prev, next];
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "message",
					filter: `conversationId=eq.${conversationId}`,
				},
				(payload) => {
					const next = normalizeRealtimePayload(payload.new);
					setMessages((prev) =>
						prev.map((m) => (m.id === next.id ? next : m)),
					);
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [conversationId]);

	const appendMessage = useCallback((msg: ChatMessage) => {
		setMessages((prev) => {
			if (prev.some((m) => m.id === msg.id)) return prev;
			return [...prev, msg];
		});
	}, []);

	const confirmMessage = useCallback(
		(tempId: string, real: ChatMessage) => {
			setMessages((prev) => {
				const withoutTemp = prev.filter((m) => m.id !== tempId);
				// Se o Realtime já trouxe a mensagem real, só remove o temp
				if (withoutTemp.some((m) => m.id === real.id)) return withoutTemp;
				return [...withoutTemp, real];
			});
		},
		[],
	);

	const removeMessage = useCallback((id: string) => {
		setMessages((prev) => prev.filter((m) => m.id !== id));
	}, []);

	return { messages, appendMessage, confirmMessage, removeMessage };
}
