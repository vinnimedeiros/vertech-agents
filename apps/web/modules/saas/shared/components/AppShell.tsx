"use client";

import { cn } from "@ui/lib";
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

	return (
		<div
			className={cn(
				"flex min-h-dvh flex-col gap-[var(--shell-gap)] p-[var(--shell-gap)]",
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

				<main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border/50 bg-card shadow-sm">
					<div className="flex-1 overflow-y-auto p-4 md:p-6">
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
