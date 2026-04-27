"use client";

import { AiStudioIcon } from "@saas/shared/components/AiStudioIcon";

/**
 * Indicador "digitando..." exibido enquanto o Arquiteto processa
 * (story 09.5 UX refinement). Aparece imediato após envio do user e
 * some quando o primeiro token do stream chega.
 *
 * Layout igual ao MessageBubble do assistant (avatar Sparkles) pra
 * manter continuidade visual — o balão com 3 dots some e vira bubble
 * de texto fluidamente.
 */
export function TypingIndicator() {
	return (
		<div className="flex items-start gap-3" aria-live="polite">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<AiStudioIcon className="size-4" />
			</div>
			<div className="flex items-center gap-1.5 rounded-2xl bg-foreground/5 px-4 py-3">
				<Dot delay={0} />
				<Dot delay={150} />
				<Dot delay={300} />
				<span className="sr-only">Arquiteto está digitando</span>
			</div>
		</div>
	);
}

function Dot({ delay }: { delay: number }) {
	return (
		<span
			aria-hidden="true"
			className="size-1.5 animate-bounce rounded-full bg-foreground/40"
			style={{ animationDelay: `${delay}ms`, animationDuration: "1000ms" }}
		/>
	);
}
