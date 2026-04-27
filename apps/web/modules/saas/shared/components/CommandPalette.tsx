"use client";

import { useSession } from "@saas/auth/hooks/use-session";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useOrganizationListQuery } from "@saas/organizations/lib/api";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@ui/components/command";
import { AiStudioIcon } from "@saas/shared/components/AiStudioIcon";
import {
	BriefcaseBusinessIcon,
	CalendarIcon,
	FileTextIcon,
	HomeIcon,
	KanbanSquareIcon,
	MessageSquareIcon,
	PlugIcon,
	PlusIcon,
	SettingsIcon,
	UserCheckIcon,
	UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

type CommandPaletteProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const router = useRouter();
	const { user } = useSession();
	const { activeOrganization, setActiveOrganization } =
		useActiveOrganization();
	const { data: allOrganizations } = useOrganizationListQuery();

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				onOpenChange(!open);
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, onOpenChange]);

	const go = useCallback(
		(path: string) => {
			router.push(path);
			onOpenChange(false);
		},
		[router, onOpenChange],
	);

	const base = activeOrganization
		? `/app/${activeOrganization.slug}`
		: "/app";

	const navItems = activeOrganization
		? [
				{ label: "Início", icon: HomeIcon, path: base },
				{
					label: "Chat",
					icon: MessageSquareIcon,
					path: `${base}/crm/chat`,
				},
				{
					label: "Pipeline",
					icon: KanbanSquareIcon,
					path: `${base}/crm/pipeline`,
				},
				{ label: "Leads", icon: UsersIcon, path: `${base}/crm/leads` },
				{
					label: "Clientes",
					icon: UserCheckIcon,
					path: `${base}/crm/clientes`,
				},
				{
					label: "Propostas",
					icon: FileTextIcon,
					path: `${base}/crm/propostas`,
				},
				{
					label: "Agenda",
					icon: CalendarIcon,
					path: `${base}/crm/agenda`,
				},
				{
					label: "Integrações",
					icon: PlugIcon,
					path: `${base}/crm/integracoes`,
				},
				{
					label: "AI Studio",
					icon: AiStudioIcon,
					path: `${base}/ai-studio`,
				},
				{
					label: "Configurações",
					icon: SettingsIcon,
					path: `${base}/settings`,
				},
			]
		: [
				{ label: "Início", icon: HomeIcon, path: "/app" },
				{
					label: "Configurações da conta",
					icon: SettingsIcon,
					path: "/app/settings",
				},
			];

	const createItems = activeOrganization
		? [
				{
					label: "Novo lead",
					icon: PlusIcon,
					path: `${base}/crm/pipeline`,
				},
				{
					label: "Nova proposta",
					icon: PlusIcon,
					path: `${base}/crm/propostas`,
				},
				{
					label: "Novo agente",
					icon: PlusIcon,
					path: `${base}/ai-studio`,
				},
			]
		: [];

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput placeholder="Digite um comando ou busque…" />
			<CommandList>
				<CommandEmpty>Nada encontrado.</CommandEmpty>

				<CommandGroup heading="Navegação">
					{navItems.map((item) => {
						const Icon = item.icon;
						return (
							<CommandItem
								key={item.path}
								onSelect={() => go(item.path)}
							>
								<Icon className="mr-2 size-4" />
								{item.label}
							</CommandItem>
						);
					})}
				</CommandGroup>

				{createItems.length > 0 && (
					<>
						<CommandSeparator />
						<CommandGroup heading="Criar">
							{createItems.map((item) => {
								const Icon = item.icon;
								return (
									<CommandItem
										key={item.label}
										onSelect={() => go(item.path)}
									>
										<Icon className="mr-2 size-4" />
										{item.label}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</>
				)}

				{(allOrganizations?.length ?? 0) > 0 && (
					<>
						<CommandSeparator />
						<CommandGroup heading="Workspaces">
							{allOrganizations?.map((org) => (
								<CommandItem
									key={org.slug}
									onSelect={() => {
										setActiveOrganization(org.slug);
										onOpenChange(false);
									}}
								>
									<BriefcaseBusinessIcon className="mr-2 size-4" />
									{org.name}
									{activeOrganization?.slug === org.slug ? (
										<CommandShortcut>ativo</CommandShortcut>
									) : null}
								</CommandItem>
							))}
							{user ? (
								<CommandItem
									onSelect={() => {
										router.replace("/app");
										onOpenChange(false);
									}}
								>
									<UsersIcon className="mr-2 size-4" />
									Conta pessoal
								</CommandItem>
							) : null}
						</CommandGroup>
					</>
				)}
			</CommandList>
		</CommandDialog>
	);
}
