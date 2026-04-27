"use client";

import { getWhatsAppSyncStatusAction } from "@saas/whatsapp/lib/actions";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type Props = {
	organizationId: string;
	className?: string;
};

const POLL_INTERVAL_MS = 5_000;

/**
 * Banner discreto que aparece enquanto o WhatsApp está sincronizando o
 * histórico (chats e contatos) do servidor em chunks. Some sozinho 30s
 * após o último batch.
 *
 * Também dispara `router.refresh()` quando a contagem de contatos cresce
 * entre polls — assim a lista de contatos/chat atualiza sem hard refresh.
 */
export function WhatsAppSyncBanner({ organizationId, className }: Props) {
	const router = useRouter();
	const lastCountRef = useRef<number | null>(null);

	const { data } = useQuery({
		queryKey: ["whatsapp-sync-status", organizationId],
		queryFn: () => getWhatsAppSyncStatusAction(organizationId),
		refetchInterval: (q) => {
			const status = q.state.data;
			// Poll enquanto sync ativo OU enquanto não tivemos primeira resposta
			if (!status) return POLL_INTERVAL_MS;
			return status.active ? POLL_INTERVAL_MS : false;
		},
		refetchIntervalInBackground: false,
	});

	useEffect(() => {
		if (!data) return;
		const prev = lastCountRef.current;
		// Se contagem cresceu desde último poll, invalidar páginas servidoras
		// pra refletir contatos novos sem hard refresh do usuário.
		if (prev !== null && data.contactsCount > prev) {
			router.refresh();
		}
		lastCountRef.current = data.contactsCount;
	}, [data, router]);

	if (!data?.active) return null;

	return (
		<div
			className={`flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300 ${className ?? ""}`}
		>
			<Loader2Icon className="size-3.5 animate-spin shrink-0" />
			<span className="flex-1">
				Sincronizando contatos do WhatsApp.{" "}
				<span className="font-semibold">{data.contactsCount}</span>{" "}
				importados até agora.
			</span>
		</div>
	);
}
