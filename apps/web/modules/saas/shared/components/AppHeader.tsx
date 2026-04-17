"use client";

import { UserMenu } from "@saas/shared/components/UserMenu";
import { cn } from "@ui/lib";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AskAIButton } from "./AskAIButton";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type AppHeaderProps = {
	askAIOpen: boolean;
	onToggleAskAI: () => void;
	onOpenCommand: () => void;
};

export function AppHeader({
	askAIOpen,
	onToggleAskAI,
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
				"flex h-[var(--shell-header-height)] shrink-0 items-center justify-between gap-3 px-3",
			)}
		>
			<div className="flex min-w-0 items-center gap-2">
				<WorkspaceSwitcher />
			</div>

			<div className="flex flex-1 items-center justify-center px-2">
				<div
					className={cn(
						"flex h-8 w-full max-w-md items-center gap-2 rounded-md border border-border/60 bg-card/60 px-2.5",
						"text-foreground/60 shadow-xs transition-colors focus-within:bg-card hover:bg-card",
					)}
				>
					<button
						type="button"
						onClick={onOpenCommand}
						aria-label="Abrir busca"
						className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none"
					>
						<SearchIcon className="size-3.5 shrink-0 opacity-70" />
						<span className="flex-1 truncate text-xs">
							Pesquisar
						</span>
						<kbd className="hidden shrink-0 items-center gap-1 rounded border border-border/60 bg-muted/70 px-1 py-0.5 font-mono text-[10px] text-foreground/60 md:flex">
							{shortcut}
						</kbd>
					</button>
					<span className="flex shrink-0 items-center border-l border-border/40 pl-1.5">
						<AskAIButton
							open={askAIOpen}
							onToggle={onToggleAskAI}
						/>
					</span>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-1">
				<UserMenu />
			</div>
		</header>
	);
}
