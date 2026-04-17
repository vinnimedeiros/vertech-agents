"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { cn } from "@ui/lib";
import {
	CalendarIcon,
	FileTextIcon,
	KanbanSquareIcon,
	MessageSquareIcon,
	PlugIcon,
	UserCheckIcon,
	UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type TopbarTab = {
	label: string;
	path: string;
	icon: LucideIcon;
};

const TABS: TopbarTab[] = [
	{ label: "Chat", path: "chat", icon: MessageSquareIcon },
	{ label: "Pipeline", path: "pipeline", icon: KanbanSquareIcon },
	{ label: "Agenda", path: "agenda", icon: CalendarIcon },
	{ label: "Leads", path: "leads", icon: UsersIcon },
	{ label: "Clientes", path: "clientes", icon: UserCheckIcon },
	{ label: "Propostas", path: "propostas", icon: FileTextIcon },
	{ label: "Integrações", path: "integracoes", icon: PlugIcon },
];

export function CrmTopbar() {
	const { activeOrganization } = useActiveOrganization();
	const pathname = usePathname();

	if (!activeOrganization) {
		return null;
	}

	const basePath = `/app/${activeOrganization.slug}/crm`;

	return (
		<nav className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0">
			{TABS.map((tab) => {
				const href = `${basePath}/${tab.path}`;
				const isActive = pathname.startsWith(href);
				const Icon = tab.icon;

				return (
					<Link
						key={tab.path}
						href={href}
						prefetch
						className={cn(
							"flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm transition-colors",
							isActive
								? "border-primary font-semibold text-foreground"
								: "border-transparent text-foreground/60 hover:text-foreground",
						)}
					>
						<Icon className="size-4" />
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
