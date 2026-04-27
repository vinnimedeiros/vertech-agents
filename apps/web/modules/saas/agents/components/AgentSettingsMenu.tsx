"use client";

import { AiStudioIcon } from "@saas/shared/components/AiStudioIcon";
import { cn } from "@ui/lib";
import {
	BriefcaseIcon,
	CpuIcon,
	FlaskConicalIcon,
	MessageSquareIcon,
	PhoneIcon,
	UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

type MenuItem = {
	id: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
	pathSuffix: string; // "" pro item raiz (Identidade)
};

const ITEMS: MenuItem[] = [
	{ id: "identity", label: "Identidade", icon: UserIcon, pathSuffix: "" },
	{
		id: "persona",
		label: "Persona",
		icon: AiStudioIcon,
		pathSuffix: "/persona",
	},
	{
		id: "business",
		label: "Negócio",
		icon: BriefcaseIcon,
		pathSuffix: "/business",
	},
	{
		id: "conversation",
		label: "Conversas",
		icon: MessageSquareIcon,
		pathSuffix: "/conversation",
	},
	{ id: "model", label: "Modelo", icon: CpuIcon, pathSuffix: "/model" },
	{
		id: "whatsapp",
		label: "WhatsApp",
		icon: PhoneIcon,
		pathSuffix: "/whatsapp",
	},
	{
		id: "sandbox",
		label: "Sandbox",
		icon: FlaskConicalIcon,
		pathSuffix: "/sandbox",
	},
];

type Props = {
	organizationSlug: string;
	agentId: string;
};

export function AgentSettingsMenu({ organizationSlug, agentId }: Props) {
	const pathname = usePathname();
	const basePath = `/app/${organizationSlug}/agents/${agentId}`;

	const isActive = (suffix: string) => {
		const href = basePath + suffix;
		if (suffix === "") {
			// A aba Identidade e a raiz — so ativa se pathname bate exatamente
			return pathname === href || pathname === `${href}/`;
		}
		return pathname === href || pathname.startsWith(`${href}/`);
	};

	return (
		<nav aria-label="Abas do agente">
			<ul className="flex list-none flex-row gap-6 lg:flex-col lg:gap-1">
				{ITEMS.map((item) => {
					const href = basePath + item.pathSuffix;
					const active = isActive(item.pathSuffix);
					const Icon = item.icon;
					return (
						<li key={item.id}>
							<Link
								href={href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex items-center gap-2 py-2 text-sm transition-colors",
									// mobile: borda inferior no ativo
									"border-b-2 lg:border-b-0",
									// desktop: borda esquerda no ativo
									"lg:-ml-0.5 lg:border-l-2 lg:pl-3",
									active
										? "border-primary font-semibold text-foreground"
										: "border-transparent text-foreground/60 hover:text-foreground",
								)}
							>
								<Icon className="size-4 shrink-0" />
								<span>{item.label}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
