import { cn } from "@ui/lib";
import type { ElementType, ReactNode } from "react";
import { FLOATING_PANEL_BASE, SHADOW_TOKENS } from "./tokens";

type FloatingPanelVariant = "default" | "tight" | "elevated";

type FloatingPanelProps = {
	children: ReactNode;
	className?: string;
	variant?: FloatingPanelVariant;
	as?: ElementType;
};

/**
 * Painel floating canônico do setor comercial. Base pra todos os
 * containers visuais (header, sidebar, conteúdo central, cards).
 *
 * Variants:
 *   default   — sombra padrão
 *   tight     — sombra padrão (estrutural — visualmente igual ao default).
 *               Reservado pra futuros ajustes de spacing internal sem
 *               mudar a sombra. Hoje difere apenas semanticamente.
 *   elevated  — sombra mais forte pra cards imponentes (KPIs, dialogs).
 */
export function FloatingPanel({
	children,
	className,
	variant = "default",
	as,
}: FloatingPanelProps) {
	const Tag = (as ?? "div") as ElementType;
	const shadow =
		variant === "elevated" ? SHADOW_TOKENS.elevated : SHADOW_TOKENS.default;

	return (
		<Tag className={cn(FLOATING_PANEL_BASE, shadow, className)}>{children}</Tag>
	);
}
