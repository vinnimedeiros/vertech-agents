"use client";

import { FloatingTabs } from "@saas/shared/floating";
import {
	BriefcaseBusinessIcon,
	CalendarIcon,
	KanbanSquareIcon,
	LinkIcon,
	type LucideIcon,
	MessageSquareTextIcon,
	UserCheckIcon,
	UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

type TabKey =
	| "chat"
	| "pipeline"
	| "leads"
	| "clientes"
	| "contatos"
	| "agenda"
	| "integracoes";

type TabDef = {
	key: TabKey;
	label: string;
	href: string;
	icon: LucideIcon;
};

type Props = {
	organizationSlug: string;
};

/**
 * Header floating com tabs do setor comercial. Renderizado no topo
 * de TODA rota `/crm/*` (Dashboard, Chat, Pipeline, Leads, Contatos,
 * Agenda, Integrações).
 *
 * Pattern Vinni 2026-04-26 — tabs floating selected translúcido,
 * sobre canvas dot grid.
 */
export function CommercialTabs({ organizationSlug }: Props) {
	const pathname = usePathname();
	const router = useRouter();
	const base = `/app/${organizationSlug}/crm`;

	const tabs: TabDef[] = useMemo(
		() => [
			{
				key: "chat",
				label: "Chat",
				href: `${base}/chat`,
				icon: MessageSquareTextIcon,
			},
			{
				key: "pipeline",
				label: "Pipeline",
				href: `${base}/pipeline`,
				icon: KanbanSquareIcon,
			},
			{
				key: "leads",
				label: "Leads",
				href: `${base}/leads`,
				icon: BriefcaseBusinessIcon,
			},
			{
				key: "clientes",
				label: "Clientes ativos",
				href: `${base}/clientes`,
				icon: UserCheckIcon,
			},
			{
				key: "contatos",
				label: "Contatos",
				href: `${base}/contatos`,
				icon: UsersIcon,
			},
			{
				key: "agenda",
				label: "Agenda",
				href: `${base}/agenda`,
				icon: CalendarIcon,
			},
			{
				key: "integracoes",
				label: "Integrações",
				href: `${base}/integracoes`,
				icon: LinkIcon,
			},
		],
		[base],
	);

	const current = useMemo<TabKey>(() => {
		for (const t of tabs) {
			if (pathname?.startsWith(t.href)) return t.key;
		}
		return "chat";
	}, [pathname, tabs]);

	return (
		<div className="px-1">
			<FloatingTabs
				items={tabs.map((t) => ({
					key: t.key,
					label: t.label,
					icon: t.icon,
				}))}
				current={current}
				onChange={(key) => {
					const target = tabs.find((t) => t.key === key);
					if (target) router.push(target.href);
				}}
			/>
		</div>
	);
}
