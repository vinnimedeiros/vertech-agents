import { cn } from "@ui/lib";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
	type FloatingColor,
	ICON_COLOR_BY_TINT,
	METALLIC_BORDER,
	SHADOW_TOKENS,
	TINT_BY_COLOR,
} from "./tokens";

type MetricCardProps = {
	label: string;
	value: ReactNode;
	trend?: ReactNode;
	icon?: LucideIcon;
	color?: FloatingColor;
	className?: string;
};

/**
 * Card de métrica do dashboard comercial — pattern SuperCash.
 *
 * Anatomia:
 *   1. Container floating (rounded-xl, bg-card, shadow elevated).
 *   2. Blur tint colorido no topo (radial gradient suave por color).
 *   3. Linhas metálicas SOMENTE no canto superior esquerdo + canto
 *      inferior direito (referência Vinni 2026-04-26).
 *   4. Conteúdo: label uppercase + value grande Satoshi + trend opcional.
 *
 * Aplicar em: Dashboard v2 (cards topo + métricas profundas), Tab
 * Follow-up (taxa resposta, conversão), Tab Campanhas (disparos).
 */
export function MetricCard({
	label,
	value,
	trend,
	icon: Icon,
	color = "violet",
	className,
}: MetricCardProps) {
	return (
		<div
			className={cn(
				"relative isolate overflow-hidden rounded-xl border border-border/40 bg-card p-5",
				SHADOW_TOKENS.elevated,
				className,
			)}
		>
			{/* Blur tint colorido (top) */}
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute inset-x-0 top-0 z-0 h-24",
					TINT_BY_COLOR[color],
				)}
			/>

			{/* Canto superior esquerdo metálico */}
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute top-0 left-0 z-20 size-14 rounded-tl-xl border-t border-l",
					METALLIC_BORDER,
				)}
			/>

			{/* Canto inferior direito metálico */}
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute right-0 bottom-0 z-20 size-14 rounded-br-xl border-r border-b",
					METALLIC_BORDER,
				)}
			/>

			{/* Conteúdo */}
			<div className="relative z-10 flex flex-col gap-1.5">
				<div className="flex items-center justify-between gap-2">
					<span className="text-[11px] uppercase tracking-wider text-muted-foreground">
						{label}
					</span>
					{Icon ? (
						<Icon className={cn("size-3.5", ICON_COLOR_BY_TINT[color])} />
					) : null}
				</div>
				<div
					className="font-medium text-2xl text-foreground leading-tight"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					{value}
				</div>
				{trend ? (
					<div className="text-[11px] text-muted-foreground">{trend}</div>
				) : null}
			</div>
		</div>
	);
}
