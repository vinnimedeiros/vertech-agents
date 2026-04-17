"use client";

import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { OrganizationLogo } from "@saas/organizations/components/OrganizationLogo";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useOrganizationListQuery } from "@saas/organizations/lib/api";
import { UserAvatar } from "@shared/components/UserAvatar";
import { useRouter } from "@shared/hooks/router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { cn } from "@ui/lib";
import { ChevronDownIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function WorkspaceSwitcher({ className }: { className?: string }) {
	const t = useTranslations();
	const { user } = useSession();
	const router = useRouter();
	const { activeOrganization, setActiveOrganization } =
		useActiveOrganization();
	const { data: allOrganizations } = useOrganizationListQuery();

	if (!user) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"flex items-center gap-1.5 rounded-md px-2 py-1 text-left outline-none hover:bg-accent/50 focus-visible:bg-accent/50",
					className,
				)}
			>
				{activeOrganization ? (
					<>
						<OrganizationLogo
							name={activeOrganization.name}
							logoUrl={activeOrganization.logo}
							className="size-6 shrink-0"
						/>
						<span className="hidden max-w-[160px] truncate text-sm font-medium md:block">
							{activeOrganization.name}
						</span>
					</>
				) : (
					<>
						<UserAvatar
							name={user.name ?? ""}
							avatarUrl={user.image}
							className="size-6 shrink-0"
						/>
						<span className="hidden max-w-[160px] truncate text-sm font-medium md:block">
							{t(
								"organizations.organizationSelect.personalAccount",
							)}
						</span>
					</>
				)}
				<ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
			</DropdownMenuTrigger>

			<DropdownMenuContent align="start" className="w-64">
				{!config.organizations.requireOrganization && (
					<>
						<DropdownMenuRadioGroup
							value={activeOrganization?.id ?? user.id}
							onValueChange={(value: string) => {
								if (value === user.id) router.replace("/app");
							}}
						>
							<DropdownMenuLabel className="text-foreground/60 text-xs">
								{t(
									"organizations.organizationSelect.personalAccount",
								)}
							</DropdownMenuLabel>
							<DropdownMenuRadioItem
								value={user.id}
								className="flex cursor-pointer items-center gap-2 pl-3"
							>
								<UserAvatar
									name={user.name ?? ""}
									avatarUrl={user.image}
									className="size-6"
								/>
								<span className="truncate">{user.name}</span>
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
						<DropdownMenuSeparator />
					</>
				)}

				<DropdownMenuRadioGroup
					value={activeOrganization?.slug}
					onValueChange={(slug: string) =>
						setActiveOrganization(slug)
					}
				>
					<DropdownMenuLabel className="text-foreground/60 text-xs">
						{t("organizations.organizationSelect.organizations")}
					</DropdownMenuLabel>
					{allOrganizations?.map((organization) => (
						<DropdownMenuRadioItem
							key={organization.slug}
							value={organization.slug}
							className="flex cursor-pointer items-center gap-2 pl-3"
						>
							<OrganizationLogo
								name={organization.name}
								logoUrl={organization.logo}
								className="size-6"
							/>
							<span className="truncate">
								{organization.name}
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>

				{config.organizations.enableUsersToCreateOrganizations && (
					<DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							asChild
							className="cursor-pointer text-primary!"
						>
							<Link href="/app/new-organization">
								<PlusIcon className="mr-2 size-4" />
								{t(
									"organizations.organizationSelect.createNewOrganization",
								)}
							</Link>
						</DropdownMenuItem>
					</DropdownMenuGroup>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
