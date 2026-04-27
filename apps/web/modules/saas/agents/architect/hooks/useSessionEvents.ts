"use client";

import { getSupabaseBrowser } from "@saas/chat/lib/supabase-browser";
import { useEffect } from "react";

type DraftSnapshot = {
	currentStage?: "ideation" | "planning" | "knowledge" | "creation";
	businessName?: string | null;
	agentName?: string | null;
	templateLabel?: string;
	progressPercent?: number;
	lastActivity?: string;
} | null;

type SessionEventPayload = {
	id: string;
	status: "DRAFT" | "PUBLISHED" | "ABANDONED";
	draftSnapshot: DraftSnapshot;
	publishedAgentId: string | null;
};

type UseSessionEventsOptions = {
	sessionId?: string;
	onSessionChange: (payload: SessionEventPayload) => void;
};

/**
 * Subscribe em mudanças de `agent_creation_session` (story 09.5).
 *
 * A StatusBar (09.2) precisa atualizar em tempo real quando o Arquiteto
 * termina uma etapa (gera artefato → working memory → draftSnapshot muda
 * → Realtime emite). Canal separado do useDocumentEvents pra manter cada
 * hook com um único contrato.
 *
 * Se `sessionId` ainda não existe, efeito é no-op.
 */
export function useSessionEvents({
	sessionId,
	onSessionChange,
}: UseSessionEventsOptions) {
	useEffect(() => {
		if (!sessionId) return;

		const client = getSupabaseBrowser();
		const channel = client
			.channel(`architect-session-meta-${sessionId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "agent_creation_session",
					filter: `id=eq.${sessionId}`,
				},
				(payload) => {
					const row = payload.new as Partial<SessionEventPayload>;
					if (!row?.id || !row?.status) return;
					onSessionChange({
						id: row.id,
						status: row.status,
						draftSnapshot: row.draftSnapshot ?? null,
						publishedAgentId: row.publishedAgentId ?? null,
					});
				},
			)
			.subscribe();

		return () => {
			void client.removeChannel(channel);
		};
	}, [sessionId, onSessionChange]);
}
