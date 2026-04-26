import { cn } from "@ui/lib";
import { SparklesIcon } from "lucide-react";

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
			<span
				className={cn(
					"inline-flex items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10",
					isMd ? "size-6" : "size-5",
				)}
			>
				<SparklesIcon
					className={cn(
						"text-zinc-400",
						isMd ? "size-3.5" : "size-3",
					)}
				/>
			</span>
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
					className="bg-gradient-to-b from-zinc-200 via-zinc-300 to-zinc-500 bg-clip-text font-normal italic text-transparent"
					style={{ fontFamily: "var(--font-baskerville)" }}
				>
					Studio
				</span>
			</h1>
		</div>
	);
}
