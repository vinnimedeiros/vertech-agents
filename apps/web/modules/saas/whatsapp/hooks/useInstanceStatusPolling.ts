"use client";

import type { InstanceStatusSnapshot } from "@saas/whatsapp/lib/server";
import { useEffect, useState } from "react";

/**
 * Polling simples do status da instância via API interna.
 * Desliga sozinho quando `enabled` é false.
 */
export function useInstanceStatusPolling({
	instanceId,
	organizationSlug,
	enabled,
	intervalMs = 2000,
}: {
	instanceId: string | null;
	organizationSlug: string;
	enabled: boolean;
	intervalMs?: number;
}): {
	snapshot: InstanceStatusSnapshot | null;
	error: string | null;
} {
	const [snapshot, setSnapshot] = useState<InstanceStatusSnapshot | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!enabled || !instanceId) {
			setSnapshot(null);
			setError(null);
			return;
		}

		let cancelled = false;

		async function tick() {
			try {
				const res = await fetch(
					`/api/whatsapp/status/${instanceId}?org=${encodeURIComponent(organizationSlug)}`,
					{ cache: "no-store" },
				);
				if (!res.ok) {
					const body = (await res.json().catch(() => null)) as
						| { error?: string }
						| null;
					throw new Error(body?.error ?? `status ${res.status}`);
				}
				const data = (await res.json()) as InstanceStatusSnapshot;
				if (!cancelled) {
					setSnapshot(data);
					setError(null);
				}
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Erro no polling");
				}
			}
		}

		void tick();
		const id = setInterval(tick, intervalMs);
		return () => {
			cancelled = true;
			clearInterval(id);
		};
	}, [instanceId, organizationSlug, enabled, intervalMs]);

	return { snapshot, error };
}
