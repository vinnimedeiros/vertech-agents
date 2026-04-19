"use client";

import { getSupabaseBrowser } from "@saas/chat/lib/supabase-browser";
import type { ConversationListItem } from "@saas/chat/lib/server";
import { useEffect, useState } from "react";

/**
 * Mantém a lista de conversas sincronizada via Supabase Realtime.
 * - INSERT: refetch (nova conversa precisa do JOIN com contact)
 * - UPDATE: refetch (dados enriquecidos via RPC não dá pelo pg_changes)
 *
 * O refetch usa a rota `/api/chat/conversations?org={id}` (criada em seguida).
 */
export function useOrgConversations({
	organizationId,
	organizationSlug,
	initial,
}: {
	organizationId: string;
	organizationSlug: string;
	initial: ConversationListItem[];
}): ConversationListItem[] {
	const [items, setItems] = useState(initial);

	useEffect(() => {
		setItems(initial);
	}, [organizationId, initial]);

	useEffect(() => {
		const supabase = getSupabaseBrowser();

		async function refetch() {
			try {
				const res = await fetch(
					`/api/chat/conversations?org=${encodeURIComponent(organizationSlug)}`,
					{ cache: "no-store" },
				);
				if (!res.ok) return;
				const data = (await res.json()) as ConversationListItem[];
				setItems(
					data.map((c) => ({
						...c,
						lastMessageAt: c.lastMessageAt
							? new Date(c.lastMessageAt)
							: null,
					})),
				);
			} catch {
				/* fallback silencioso */
			}
		}

		const channel = supabase
			.channel(`org-conversations:${organizationId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "conversation",
					filter: `organizationId=eq.${organizationId}`,
				},
				() => {
					void refetch();
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [organizationId, organizationSlug]);

	return items;
}
