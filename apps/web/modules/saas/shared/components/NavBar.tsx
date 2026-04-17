"use client";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { UserMenu } from "@saas/shared/components/UserMenu";
import { Logo } from "@shared/components/Logo";
import { cn } from "@ui/lib";
import {
	BriefcaseBusinessIcon,
	ChevronRightIcon,
	HomeIcon,
	SettingsIcon,
	SparklesIcon,
	UserCog2Icon,
	UserCogIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganzationSelect } from "../../organizations/components/OrganizationSelect";

export function NavBar() {
	const pathname = usePathname();
	const { user } = useSession();
	const { activeOrganization } = useActiveOrganization();

	const { useSidebarLayout } = config.ui.saas;

	const basePath = activeOrganization
		? `/app/${activeOrganization.slug}`
		: "/app";

	const menuItems = [
		{
			label: "Início",
			href: basePath,
			icon: HomeIcon,
			isActive: pathname === basePath,
		},
		...(activeOrganization
			? [
					{
						label: "Comercial",
						href: `${basePath}/crm/chat`,
						icon: BriefcaseBusinessIcon,
						isActive: pathname.startsWith(`${basePath}/crm`),
					},
					{
						label: "Agentes",
						href: `${basePath}/agents`,
						icon: SparklesIcon,
						isActive: pathname.startsWith(`${basePath}/agents`),
					},
					{
						label: "Configurações",
						href: `${basePath}/settings`,
						icon: SettingsIcon,
						isActive: pathname.startsWith(`${basePath}/settings/`),
					},
				]
			: []),
		{
			label: "Minha conta",
			href: "/app/settings",
			icon: UserCog2Icon,
			isActive: pathname.startsWith("/app/settings/"),
		},
		...(user?.role === "admin"
			? [
					{
						label: "Admin",
						href: "/app/admin",
						icon: UserCogIcon,
						isActive: pathname.startsWith("/app/admin/"),
					},
				]
			: []),
	];

	return (
		<nav
			className={cn("w-full", {
				"w-full md:fixed md:top-0 md:left-0 md:h-full md:w-[280px]":
					useSidebarLayout,
			})}
		>
			<div
				className={cn("container max-w-6xl py-4", {
					"container max-w-6xl py-4 md:flex md:h-full md:flex-col md:px-6 md:pt-6 md:pb-0":
						useSidebarLayout,
				})}
			>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div
						className={cn("flex items-center gap-4 md:gap-2", {
							"md:flex md:w-full md:flex-col md:items-stretch md:align-stretch":
								useSidebarLayout,
						})}
					>
						<Link href="/app" className="block">
							<Logo />
						</Link>

						{config.organizations.enable &&
							!config.organizations.hideOrganization && (
								<>
									<span
										className={cn(
											"hidden opacity-30 md:block",
											{
												"md:hidden": useSidebarLayout,
											},
										)}
									>
										<ChevronRightIcon className="size-4" />
									</span>

									<OrganzationSelect
										className={cn({
											"md:-mx-2 md:mt-2":
												useSidebarLayout,
										})}
									/>
								</>
							)}
					</div>

					<div
						className={cn(
							"mr-0 ml-auto flex items-center justify-end gap-4",
							{
								"md:hidden": useSidebarLayout,
							},
						)}
					>
						<UserMenu />
					</div>
				</div>

				<ul
					className={cn(
						"no-scrollbar -mx-4 -mb-4 mt-6 flex list-none items-center justify-start gap-4 overflow-x-auto px-4 text-sm",
						{
							"md:mx-0 md:my-4 md:flex md:flex-col md:items-stretch md:gap-1 md:px-0":
								useSidebarLayout,
						},
					)}
				>
					{menuItems.map((menuItem) => (
						<li key={menuItem.href}>
							<Link
								href={menuItem.href}
								className={cn(
									"flex items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3",
									[
										menuItem.isActive
											? "border-primary font-bold"
											: "border-transparent",
									],
									{
										"md:-mx-6 md:border-b-0 md:border-l-2 md:px-6 md:py-2":
											useSidebarLayout,
									},
								)}
								prefetch
							>
								<menuItem.icon
									className={`size-4 shrink-0 ${
										menuItem.isActive
											? "text-primary"
											: "opacity-50"
									}`}
								/>
								<span>{menuItem.label}</span>
							</Link>
						</li>
					))}
				</ul>

				<div
					className={cn(
						"-mx-4 md:-mx-6 mt-auto mb-0 hidden p-4 md:p-4",
						{
							"md:block": useSidebarLayout,
						},
					)}
				>
					<UserMenu showUserName />
				</div>
			</div>
		</nav>
	);
}
