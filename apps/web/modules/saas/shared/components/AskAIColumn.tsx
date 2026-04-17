"use client";

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { SparklesIcon, XIcon } from "lucide-react";

type AskAIColumnProps = {
	open: boolean;
	onClose: () => void;
};

export function AskAIColumn({ open, onClose }: AskAIColumnProps) {
	return (
		<aside
			id="ask-ai-panel"
			aria-hidden={!open}
			className={cn(
				"shrink-0 overflow-hidden transition-[width] duration-300 ease-out",
				open ? "w-full md:w-80 lg:w-[var(--shell-askai-width)]" : "w-0",
			)}
		>
			<div
				className={cn(
					"flex h-full flex-col rounded-xl border border-border/50 bg-card shadow-sm",
					!open && "invisible",
				)}
			>
				<header className="flex h-10 shrink-0 items-center justify-between border-b border-border/50 px-3">
					<div className="flex items-center gap-1.5">
						<SparklesIcon className="size-3.5 text-primary" />
						<span className="text-sm font-semibold">
							Pergunte à IA
						</span>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-7 rounded-md"
						onClick={onClose}
						aria-label="Fechar painel de IA"
					>
						<XIcon className="size-4" />
					</Button>
				</header>

				<div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
						<SparklesIcon className="size-5 text-primary" />
					</div>
					<div className="space-y-1">
						<p className="text-sm font-semibold">Agente de IA</p>
						<p className="text-xs text-foreground/60">
							Em breve — ativaremos o agente comercial com
							contexto do workspace, memória e integração aos seus
							leads.
						</p>
					</div>
					<span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-foreground/60">
						Chega na Fase 7
					</span>
				</div>
			</div>
		</aside>
	);
}
