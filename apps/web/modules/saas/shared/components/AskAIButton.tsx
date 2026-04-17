"use client";

import { cn } from "@ui/lib";
import { SparklesIcon } from "lucide-react";

type AskAIButtonProps = {
	open: boolean;
	onToggle: () => void;
};

export function AskAIButton({ open, onToggle }: AskAIButtonProps) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={open}
			aria-controls="ask-ai-panel"
			aria-label="Pergunte à IA"
			className={cn(
				"group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-all",
				"hover:bg-primary/10 hover:pl-2 hover:pr-2",
				open
					? "bg-primary/15 text-primary"
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
					Pergunte à IA
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
