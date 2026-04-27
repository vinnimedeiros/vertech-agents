import { cn } from "@ui/lib";
import type { LucideIcon } from "lucide-react";

type Props = {
	primary: string;
	accent: string;
	icon: LucideIcon;
	subtitle?: string;
	className?: string;
};

/**
 * Marca tipográfica das rotas do setor comercial — pareia com StudioTitle
 * do AI Studio. Primary em Satoshi medium + accent em Baskerville italic
 * com gradient metálico (gelo ao chumbo).
 *
 * Pattern Vinni 2026-04-26: feedback_typography_premium.md.
 */
export function CommercialPageTitle({
	primary,
	accent,
	icon: Icon,
	subtitle,
	className,
}: Props) {
	return (
		<div className={cn("flex items-start gap-2.5", className)}>
			<span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground/5 ring-1 ring-foreground/10">
				<Icon className="size-3.5 text-muted-foreground" />
			</span>
			<div className="flex flex-col gap-1">
				<h1 className="flex items-baseline gap-1.5 text-[20px] leading-none">
					<span
						className="font-medium tracking-tight text-foreground"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						{primary}
					</span>
					<span
						className={cn(
							"bg-clip-text font-normal italic text-transparent",
							"bg-gradient-to-b from-zinc-700 via-zinc-600 to-zinc-400",
							"dark:from-zinc-200 dark:via-zinc-300 dark:to-zinc-500",
						)}
						style={{ fontFamily: "var(--font-baskerville)" }}
					>
						{accent}
					</span>
				</h1>
				{subtitle ? (
					<p className="text-xs text-foreground/55">{subtitle}</p>
				) : null}
			</div>
		</div>
	);
}
