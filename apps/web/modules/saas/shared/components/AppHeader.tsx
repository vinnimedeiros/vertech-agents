"use client";

import { UserMenu } from "@saas/shared/components/UserMenu";
import { cn } from "@ui/lib";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { OrchestratorButton } from "./OrchestratorButton";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type AppHeaderProps = {
	orchestratorOpen: boolean;
	onToggleOrchestrator: () => void;
	onOpenCommand: () => void;
};

export function AppHeader({
	orchestratorOpen,
	onToggleOrchestrator,
	onOpenCommand,
}: AppHeaderProps) {
	const [shortcut, setShortcut] = useState("Ctrl K");

	useEffect(() => {
		if (
			typeof navigator !== "undefined" &&
			/Mac/i.test(navigator.platform)
		) {
			setShortcut("⌘ K");
		}
	}, []);

	return (
		<header
			className={cn(
				"flex h-[var(--shell-header-height)] shrink-0 items-center gap-3",
			)}
		>
			<div className="flex shrink-0 items-center pl-1">
				<WorkspaceSwitcher />
			</div>

			<div className="flex flex-1 items-center justify-center">
				{/* biome-ignore lint/a11y/useSemanticElements: div with role=button is required because OrchestratorButton (a real <button>) is nested inside for stopPropagation handling */}
				<div
					role="button"
					tabIndex={0}
					onClick={onOpenCommand}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onOpenCommand();
						}
					}}
					aria-label="Abrir busca"
					className={cn(
						"flex h-7 w-full max-w-md cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-2",
						"text-foreground/60 shadow-xs transition-colors focus-within:bg-card hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
					)}
				>
					<SearchIcon className="size-3 shrink-0 opacity-70" />
					<span className="text-xs">Pesquisar</span>
					<kbd className="ml-auto hidden shrink-0 items-center gap-1 rounded border border-border/60 bg-muted/70 px-1 font-mono text-[10px] text-foreground/60 md:flex">
						{shortcut}
					</kbd>
					<span
						className="ml-1.5 flex shrink-0 items-center border-l border-border/40 pl-1.5"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<OrchestratorButton
							open={orchestratorOpen}
							onToggle={onToggleOrchestrator}
						/>
					</span>
				</div>
			</div>

			<div className="flex shrink-0 items-center pr-1">
				<UserMenu />
			</div>
		</header>
	);
}
