import { cn } from "@ui/lib";
import type { PropsWithChildren } from "react";

/**
 * AI Studio shell — Phase 11 Visão V3.
 *
 * Background canvas (dot grid radial) com tudo floating por cima:
 * panels com border-radius generoso, sombra suave, sem bordas duras.
 * Padrão SaaS premium estilo Kinetic AI.
 */
export default function AiStudioLayout({ children }: PropsWithChildren) {
	return (
		<div
			className={cn(
				"relative isolate flex min-h-[calc(100vh-var(--shell-header-height))] flex-col",
				"bg-muted/30 dark:bg-zinc-950",
			)}
		>
			{/* Canvas dot grid background */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0 opacity-60 dark:opacity-50"
				style={{
					backgroundImage:
						"radial-gradient(circle at 1px 1px, color-mix(in srgb, currentColor 8%, transparent) 1px, transparent 0)",
					backgroundSize: "24px 24px",
					color: "var(--color-foreground)",
				}}
			/>
			{/* Subtle radial gradient pra dar profundidade ao canvas */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0"
				style={{
					background:
						"radial-gradient(ellipse at 50% 0%, color-mix(in srgb, currentColor 4%, transparent) 0%, transparent 60%)",
					color: "var(--color-foreground)",
				}}
			/>
			<div className="relative z-10 flex flex-1 flex-col">{children}</div>
		</div>
	);
}
