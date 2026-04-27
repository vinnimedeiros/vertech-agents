"use client";

import { getSupabaseBrowser } from "@saas/chat/lib/supabase-browser";
import { useEffect } from "react";

type DocumentEventPayload = {
	id: string;
	status: "PENDING" | "PROCESSING" | "READY" | "ERROR";
	errorMessage: string | null;
	chunkCount: number;
};

type UseDocumentEventsOptions = {
	sessionId?: string;
	onStatusChange: (payload: DocumentEventPayload) => void;
};

/**
 * Subscribe em mudanças de `knowledge_document` da sessão atual (story 09.4).
 *
 * Liga o status do mini-card ao resultado do worker ingest (08A.2): cliente vê
 * processing → indexed (READY) ou error em tempo real sem polling. Se sessionId
 * não existir ainda (usuário não anexou nada), o efeito é no-op.
 *
 * Filtro Supabase Realtime por `sessionId` mantém isolamento multi-tenant —
 * mesmo que outro user anexe em outra sessão, este canal não recebe.
 */
export function useDocumentEvents({
	sessionId,
	onStatusChange,
}: UseDocumentEventsOptions) {
	useEffect(() => {
		if (!sessionId) return;

		const client = getSupabaseBrowser();
		const channel = client
			.channel(`architect-session-${sessionId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "knowledge_document",
					filter: `sessionId=eq.${sessionId}`,
				},
				(payload) => {
					const row = payload.new as Partial<DocumentEventPayload>;
					if (!row?.id || !row?.status) return;
					onStatusChange({
						id: row.id,
						status: row.status,
						errorMessage: row.errorMessage ?? null,
						chunkCount: row.chunkCount ?? 0,
					});
				},
			)
			.subscribe();

		return () => {
			void client.removeChannel(channel);
		};
	}, [sessionId, onStatusChange]);
}
