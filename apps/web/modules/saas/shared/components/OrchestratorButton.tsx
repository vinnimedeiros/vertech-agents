"use client";

import { cn } from "@ui/lib";
import { SparklesIcon } from "lucide-react";

type OrchestratorButtonProps = {
	open: boolean;
	onToggle: () => void;
};

/**
 * Botão compacto no canto direito da searchbar.
 * Estado normal: só a estrelinha.
 * Hover: desliza pra esquerda e revela "Peça ao Orquestrador".
 * Estado aberto: mesma expansão, com destaque.
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
				"group/orchestrator flex h-6 items-center overflow-hidden rounded-md text-xs transition-all duration-300 ease-out",
				open
					? "max-w-[180px] bg-primary/15 px-2 text-primary"
					: "max-w-[28px] px-1 text-foreground/70 hover:max-w-[180px] hover:bg-primary/10 hover:px-2 hover:text-primary",
			)}
		>
			<span
				className={cn(
					"whitespace-nowrap pr-1.5 font-medium transition-opacity duration-200",
					open
						? "opacity-100"
						: "opacity-0 group-hover/orchestrator:opacity-100 group-hover/orchestrator:delay-100",
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
