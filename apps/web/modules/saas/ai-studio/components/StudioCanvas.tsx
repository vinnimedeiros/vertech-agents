import { cn } from "@ui/lib";
import type { PropsWithChildren } from "react";

/**
 * Wrapper canvas pra rotas full-bleed do AI Studio (Construtor, Editor)
 * e do setor Comercial (Chat, Dashboard, Integrações).
 *
 * Background: dot grid estilo Figma/Miro.
 *   - Light: bg zinc-100 + dots zinc-400 visíveis
 *   - Dark: bg zinc-950 + dots brancos sutis
 *
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
				"bg-zinc-100 dark:bg-zinc-950",
				className,
			)}
		>
			{/* Dot grid — denso, visível em ambos os modos (Figma/Miro style) */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0"
				style={{
					backgroundImage:
						"radial-gradient(circle at 1px 1px, var(--canvas-dot-color) 1px, transparent 0)",
					backgroundSize: "22px 22px",
				}}
			/>
			{/* Radial gradient sutil pra dar profundidade */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0"
				style={{
					background:
						"radial-gradient(ellipse at 50% 0%, color-mix(in srgb, currentColor 5%, transparent) 0%, transparent 60%)",
					color: "var(--color-foreground)",
				}}
			/>
			<div className="relative z-10 flex min-h-0 flex-1 flex-col">
				{children}
			</div>
		</div>
	);
}
