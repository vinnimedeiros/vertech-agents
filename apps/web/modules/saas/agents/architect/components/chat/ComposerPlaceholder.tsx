"use client";

import { Button } from "@ui/components/button";
import { PaperclipIcon, SendIcon } from "lucide-react";

/**
 * Placeholder visual do composer (story 09.2, zona 4).
 *
 * Textarea e botoes totalmente disabled. Story 09.3 substitui este componente
 * pelo composer funcional com textarea expansivel + shortcuts + upload trigger.
 * Aqui mantemos so o visual pra o shell parecer completo.
 */
export function ComposerPlaceholder() {
	return (
		<div className="border-border border-t bg-background p-3 md:p-4">
			<div className="mx-auto flex max-w-[800px] items-end gap-2 rounded-xl border border-border bg-card p-2">
				<Button
					variant="ghost"
					size="icon"
					disabled
					className="size-9 shrink-0 text-foreground/40"
					aria-label="Anexar arquivo (em breve)"
				>
					<PaperclipIcon className="size-4" />
				</Button>
				<textarea
					disabled
					placeholder="Aguarde o Arquiteto iniciar a conversa…"
					className="min-h-[44px] w-full resize-none border-0 bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none disabled:cursor-not-allowed"
					rows={1}
				/>
				<Button
					size="icon"
					disabled
					className="size-9 shrink-0"
					aria-label="Enviar mensagem (em breve)"
				>
					<SendIcon className="size-4" />
				</Button>
			</div>
		</div>
	);
}
