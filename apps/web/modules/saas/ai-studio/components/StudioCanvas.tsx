import { cn } from "@ui/lib";
import type { PropsWithChildren } from "react";

/**
 * Wrapper canvas pra rotas full-bleed do AI Studio (Construtor, Editor).
 *
 * Background dot grid + radial sutil em zinc-950 (dark) / muted (light).
 * Conteúdo flutuante usa este canvas como camada de fundo.
 */
export function StudioCanvas({
	children,
	className,
}: PropsWithChildren<{ className?: string }>) {
	return (
		<div
			className={cn(
				"relative isolate flex min-h-full flex-col",
				"bg-muted/30 dark:bg-zinc-950",
				className,
			)}
		>
			{/* Dot grid */}
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
			{/* Radial gradient sutil pra dar profundidade */}
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
