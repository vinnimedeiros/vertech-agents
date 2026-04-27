import { cn } from "@ui/lib";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
	type FloatingColor,
	ICON_COLOR_BY_TINT,
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
 * Card de métrica do dashboard comercial — pattern Vinni 2026-04-26 noite.
 *
 * Anatomia:
 *   1. Wrapper com padding 1px + background linear-gradient diagonal (135deg)
 *      → cantos sup-esq + inf-dir metálicos, cantos sup-dir + inf-esq somem.
 *   2. Inner card sólido bg-card cobrindo tudo, deixando só a "borda gradient"
 *      visível ao redor.
 *   3. Blur tint colorido no topo (radial gradient suave por color).
 *   4. Conteúdo: label uppercase pequena + value Satoshi medium + trend opcional.
 *
 * Sem mais "linhas em 2 cantos" — agora borda contínua que esmaece em diagonal.
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
				"rounded-xl p-px",
				// Light: borda sólida metálica (zinc-300 → zinc-400 → zinc-300, sem transparência)
				"bg-[linear-gradient(135deg,#d4d4d8_0%,#a1a1aa_50%,#d4d4d8_100%)]",
				// Dark: gradient diagonal translúcido (cantos sup-esq + inf-dir visíveis, opostos somem)
				"dark:bg-[linear-gradient(135deg,rgba(228,228,231,0.40)_0%,rgba(228,228,231,0.04)_30%,rgba(228,228,231,0.04)_70%,rgba(228,228,231,0.40)_100%)]",
				SHADOW_TOKENS.elevated,
				className,
			)}
		>
			<div className="relative isolate overflow-hidden rounded-[11px] bg-card p-4">
				{/* Blur tint colorido (top) */}
				<div
					aria-hidden
					className={cn(
						"pointer-events-none absolute inset-x-0 top-0 z-0 h-20",
						TINT_BY_COLOR[color],
					)}
				/>

				{/* Conteúdo */}
				<div className="relative z-10 flex flex-col gap-1">
					<div className="flex items-center justify-between gap-2">
						<span className="text-[10px] uppercase tracking-wider text-muted-foreground">
							{label}
						</span>
						{Icon ? (
							<Icon className={cn("size-3", ICON_COLOR_BY_TINT[color])} />
						) : null}
					</div>
					<div
						className="font-medium text-[20px] text-foreground leading-tight"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						{value}
					</div>
					{trend ? (
						<div className="text-[10px] text-muted-foreground">{trend}</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
