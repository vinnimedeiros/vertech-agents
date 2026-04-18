"use client";

import { cn } from "@ui/lib";
import { SparklesIcon } from "lucide-react";

type OrchestratorButtonProps = {
	open: boolean;
	onToggle: () => void;
};

/**
 * Botão compacto na direita da searchbar.
 * Estado normal: só a estrelinha.
 * Hover: desliza pra esquerda revelando "Peça ao Orquestrador".
 */
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
				"group/orchestrator flex h-6 shrink-0 items-center rounded-md text-xs transition-all duration-300 ease-out",
				open
					? "bg-primary/15 px-2 text-primary"
					: "px-1 text-foreground/70 hover:bg-primary/10 hover:px-2 hover:text-primary",
			)}
		>
			<span
				className={cn(
					"overflow-hidden whitespace-nowrap font-medium transition-all duration-300 ease-out",
					open
						? "max-w-[180px] pr-1.5 opacity-100"
						: "max-w-0 pr-0 opacity-0 group-hover/orchestrator:max-w-[180px] group-hover/orchestrator:pr-1.5 group-hover/orchestrator:opacity-100",
				)}
			>
				Peça ao Orquestrador
			</span>
			<SparklesIcon
				className={cn(
					"size-4 shrink-0 text-primary transition-transform duration-300",
					"group-hover/orchestrator:rotate-180",
					open && "rotate-180",
				)}
			/>
		</button>
	);
}
