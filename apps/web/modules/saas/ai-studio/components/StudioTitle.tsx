import { AiStudioIcon } from "@saas/shared/components/AiStudioIcon";
import { cn } from "@ui/lib";

type Props = {
	className?: string;
	size?: "sm" | "md";
};

/**
 * Marca tipográfica do AI Studio.
 *
 * "AI" em Satoshi medium + "Studio" em Libre Baskerville italic com
 * gradient metálico (do gelo ao chumbo). Tamanhos contidos pra liberar
 * espaço útil acima da fold.
 */
export function StudioTitle({ className, size = "md" }: Props) {
	const isMd = size === "md";

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<AiStudioIcon className={cn(isMd ? "size-6" : "size-5")} />
			<h1
				className={cn(
					"flex items-baseline gap-1.5 leading-none",
					isMd ? "text-[20px]" : "text-base",
				)}
			>
				<span
					className="font-medium tracking-tight text-foreground"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					AI
				</span>
				<span
					className={cn(
						"bg-clip-text font-normal italic text-transparent",
						"bg-gradient-to-b from-zinc-700 via-zinc-600 to-zinc-400",
						"dark:from-zinc-200 dark:via-zinc-300 dark:to-zinc-500",
					)}
					style={{ fontFamily: "var(--font-baskerville)" }}
				>
					Studio
				</span>
			</h1>
		</div>
	);
}
