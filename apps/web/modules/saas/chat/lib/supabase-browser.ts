"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Browser-only Supabase client, usado pra Realtime e uploads de mídia.
 * Singleton pra evitar múltiplas conexões WS durante a vida da página.
 */
export function getSupabaseBrowser(): SupabaseClient {
	if (cached) return cached;

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!url || !key) {
		throw new Error(
			"NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.",
		);
	}

	cached = createClient(url, key, {
		realtime: {
			params: { eventsPerSecond: 10 },
		},
		auth: { persistSession: false },
	});

	return cached;
}
