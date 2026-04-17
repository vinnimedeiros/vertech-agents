"use client";

import { cn } from "@ui/lib";
import { SparklesIcon } from "lucide-react";

type OrchestratorButtonProps = {
	open: boolean;
	onToggle: () => void;
};

export function OrchestratorButton({
	open,
	onToggle,
}: OrchestratorButtonProps) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={open}
			aria-controls="orchestrator-panel"
			aria-label="Peça ao Orquestrador"
			className={cn(
				"group flex items-center gap-0 rounded-md px-0 py-1 text-xs transition-all duration-300",
				"hover:gap-1.5 hover:bg-primary/10 hover:px-2",
				open
					? "gap-1.5 bg-primary/15 px-2 text-primary"
					: "text-foreground/70 hover:text-primary",
			)}
		>
			<span
				className={cn(
					"grid overflow-hidden transition-[grid-template-columns,opacity] duration-300",
					"grid-cols-[0fr] opacity-0 group-hover:grid-cols-[1fr] group-hover:opacity-100",
				)}
			>
				<span className="whitespace-nowrap font-medium">
					Peça ao Orquestrador
				</span>
			</span>
			<SparklesIcon
				className={cn(
					"size-4 shrink-0 transition-transform duration-300",
					"group-hover:rotate-180",
					"text-primary",
				)}
			/>
		</button>
	);
}
