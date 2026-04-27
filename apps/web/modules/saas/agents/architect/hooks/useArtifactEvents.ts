"use client";

import { getSupabaseBrowser } from "@saas/chat/lib/supabase-browser";
import { useEffect } from "react";
import type { ArchitectArtifact } from "../lib/artifact-types";

type UseArtifactEventsOptions = {
	sessionId?: string;
	onInsert: (artifact: ArchitectArtifact) => void;
	onUpdate: (artifact: ArchitectArtifact) => void;
};

/**
 * Subscribe em mudanças de `agent_artifact` da sessão (story 09.6).
 *
 * Arquiteto gera artefato via tool `generateArtifact` → row INSERT → hook
 * notifica UI → card aparece no chat. Tool `refineArtifact` ou
 * `approveArtifact` → row UPDATE → hook troca status/content.
 *
 * Filtra por sessionId pra isolamento multi-sessão.
 */
export function useArtifactEvents({
	sessionId,
	onInsert,
	onUpdate,
}: UseArtifactEventsOptions) {
	useEffect(() => {
		if (!sessionId) return;

		const client = getSupabaseBrowser();
		const channel = client
			.channel(`architect-artifacts-${sessionId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "agent_artifact",
					filter: `sessionId=eq.${sessionId}`,
				},
				(payload) => {
					const row = payload.new as ArchitectArtifact | null;
					if (!row?.id) return;
					onInsert(row);
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "agent_artifact",
					filter: `sessionId=eq.${sessionId}`,
				},
				(payload) => {
					const row = payload.new as ArchitectArtifact | null;
					if (!row?.id) return;
					onUpdate(row);
				},
			)
			.subscribe();

		return () => {
			void client.removeChannel(channel);
		};
	}, [sessionId, onInsert, onUpdate]);
}
