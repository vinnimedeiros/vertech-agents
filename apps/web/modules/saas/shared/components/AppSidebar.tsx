"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { Logo } from "@shared/components/Logo";
import { cn } from "@ui/lib";
import {
	BriefcaseBusinessIcon,
	CalendarIcon,
	HomeIcon,
	type LucideIcon,
	SettingsIcon,
	SparklesIcon,
	UserCogIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
	label: string;
	href: string;
	icon: LucideIcon;
	isActive: boolean;
};

export function AppSidebar() {
	const pathname = usePathname();
	const { user } = useSession();
	const { activeOrganization } = useActiveOrganization();

	const base = activeOrganization
		? `/app/${activeOrganization.slug}`
		: "/app";

	const items: NavItem[] = [
		{
			label: "Início",
			href: base,
			icon: HomeIcon,
			isActive: pathname === base,
		},
		...(activeOrganization
			? [
					{
						label: "Comercial",
						href: `${base}/crm/chat`,
						icon: BriefcaseBusinessIcon,
						isActive: pathname.startsWith(`${base}/crm`),
					},
					{
						label: "Agenda",
						href: `${base}/crm/agenda`,
						icon: CalendarIcon,
						isActive: pathname.startsWith(`${base}/crm/agenda`),
					},
					{
						label: "Agentes",
						href: `${base}/agents`,
						icon: SparklesIcon,
						isActive: pathname.startsWith(`${base}/agents`),
					},
					{
						label: "Ajustes",
						href: `${base}/settings`,
						icon: SettingsIcon,
						isActive: pathname.startsWith(`${base}/settings`),
					},
				]
			: [
					{
						label: "Minha conta",
						href: "/app/settings",
						icon: SettingsIcon,
						isActive: pathname.startsWith("/app/settings"),
					},
				]),
		...(user?.role === "admin"
			? [
					{
						label: "Admin",
						href: "/app/admin",
						icon: UserCogIcon,
						isActive: pathname.startsWith("/app/admin"),
					},
				]
			: []),
	];

	return (
		<aside
			className={cn(
				"flex shrink-0 flex-col items-center gap-0.5 py-2",
				"w-[var(--shell-sidebar-width-mobile)] lg:w-[var(--shell-sidebar-width)]",
				"rounded-md bg-sidebar text-sidebar-foreground shadow-md",
			)}
			aria-label="Navegação principal"
		>
			<Link
				href="/app"
				className="mb-1 flex size-8 items-center justify-center rounded text-primary transition-colors hover:bg-white/5"
				aria-label="Ir para início"
			>
				<Logo withLabel={false} className="[&>svg]:size-5" />
			</Link>

			<div className="mx-2 h-px w-6 bg-white/10" />

			<nav className="flex w-full flex-1 flex-col items-center gap-0.5 px-1 pt-1">
				{items.map((item) => {
					const Icon = item.icon;
					return (
						<Link
							key={item.href}
							href={item.href}
							prefetch
							className={cn(
								"group flex w-full flex-col items-center gap-0.5 rounded px-0.5 py-1.5 transition-colors",
								item.isActive
									? "bg-white/10 text-white"
									: "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white",
							)}
							aria-current={item.isActive ? "page" : undefined}
						>
							<Icon
								className={cn(
									"size-4 transition-colors",
									item.isActive && "text-primary",
								)}
							/>
							<span className="text-[9px] font-medium leading-tight">
								{item.label}
							</span>
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
