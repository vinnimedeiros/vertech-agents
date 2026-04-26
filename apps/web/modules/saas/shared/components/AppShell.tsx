"use client";

import { cn } from "@ui/lib";
import { usePathname } from "next/navigation";
import {
	type PropsWithChildren,
	useCallback,
	useEffect,
	useState,
} from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { CommandPalette } from "./CommandPalette";
import { OrchestratorColumn } from "./OrchestratorColumn";

/**
 * Rotas que controlam a própria altura (não precisam de scroll no container da página).
 * Cada painel interno dessas páginas gerencia seu próprio overflow.
 */
const FIXED_HEIGHT_ROUTES = ["/crm/chat", "/ai-studio"];

/**
 * Rotas que renderizam canvas full-bleed (sem bg-card, border ou padding do shell).
 * Usado por AI Studio que cria seu próprio canvas com panels floating.
 */
const FULL_BLEED_ROUTES = ["/ai-studio"];

const ORCHESTRATOR_STORAGE_KEY = "vertech:orchestrator-open";

export function AppShell({ children }: PropsWithChildren) {
	const [orchestratorOpen, setOrchestratorOpen] = useState(false);
	const [commandOpen, setCommandOpen] = useState(false);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(ORCHESTRATOR_STORAGE_KEY);
			if (stored === "true") setOrchestratorOpen(true);
		} catch {
			/* no-op */
		}
	}, []);

	const toggleOrchestrator = useCallback(() => {
		setOrchestratorOpen((prev) => {
			const next = !prev;
			try {
				localStorage.setItem(ORCHESTRATOR_STORAGE_KEY, String(next));
			} catch {
				/* no-op */
			}
			return next;
		});
	}, []);

	const closeOrchestrator = useCallback(() => {
		setOrchestratorOpen(false);
		try {
			localStorage.setItem(ORCHESTRATOR_STORAGE_KEY, "false");
		} catch {
			/* no-op */
		}
	}, []);

	const pathname = usePathname();
	const isFixedHeightPage = FIXED_HEIGHT_ROUTES.some((r) =>
		pathname?.includes(r),
	);
	const isFullBleed = FULL_BLEED_ROUTES.some((r) => pathname?.includes(r));

	return (
		<div
			className={cn(
				"flex h-dvh flex-col gap-[var(--shell-gap)] overflow-hidden p-[var(--shell-gap)]",
				"bg-[radial-gradient(farthest-corner_at_0%_0%,color-mix(in_oklch,var(--color-primary),transparent_95%)_0%,var(--color-background)_50%)]",
				"dark:bg-[radial-gradient(farthest-corner_at_0%_0%,color-mix(in_oklch,var(--color-primary),transparent_90%)_0%,var(--color-background)_50%)]",
			)}
		>
			<AppHeader
				orchestratorOpen={orchestratorOpen}
				onToggleOrchestrator={toggleOrchestrator}
				onOpenCommand={() => setCommandOpen(true)}
			/>

			<div className="flex flex-1 gap-[var(--shell-gap)] overflow-hidden">
				<AppSidebar />

				<main
					className={cn(
						"flex min-w-0 flex-1 flex-col overflow-hidden",
						isFullBleed
							? "rounded-md"
							: "rounded-md border border-border/50 bg-card shadow-sm",
					)}
				>
					<div
						className={cn(
							"flex-1",
							!isFullBleed && "p-4 md:p-6",
							isFixedHeightPage
								? "flex min-h-0 flex-col overflow-hidden"
								: "overflow-y-auto",
						)}
					>
						{children}
					</div>
				</main>

				<OrchestratorColumn
					open={orchestratorOpen}
					onClose={closeOrchestrator}
				/>
			</div>

			<CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
		</div>
	);
}
