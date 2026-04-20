"use client";

import { cn } from "@ui/lib";

type Props = {
	current: number;
	max: number;
};

/**
 * Counter de caracteres do composer (story 09.3 AC16-19).
 *
 * Thresholds:
 * - < (max - 500): nao renderiza (< 3500 por default)
 * - [max-500, max-100): muted
 * - [max-100, max): amber (warning visual)
 * - >= max: destructive red (composer trava envio via parent)
 */
export function CharCounter({ current, max }: Props) {
	const warnStart = max - 500;
	const amberStart = max - 100;

	if (current < warnStart) return null;

	const isOver = current >= max;
	const isAmber = !isOver && current >= amberStart;

	return (
		<span
			className={cn(
				"select-none font-mono text-[10px] tabular-nums transition-colors",
				isOver && "text-destructive",
				isAmber && "text-amber-600 dark:text-amber-400",
				!isOver && !isAmber && "text-foreground/50",
			)}
			aria-live="polite"
			aria-atomic="true"
		>
			{current}/{max}
		</span>
	);
}
