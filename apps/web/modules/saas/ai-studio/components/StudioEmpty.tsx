import { cn } from "@ui/lib";
import type { LucideIcon } from "lucide-react";

type Props = {
	icon: LucideIcon;
	title: string;
	description?: string;
	action?: React.ReactNode;
	variant?: "info" | "muted";
	className?: string;
};

export function StudioEmpty({
	icon: Icon,
	title,
	description,
	action,
	variant = "muted",
	className,
}: Props) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-14 text-center",
				variant === "muted"
					? "bg-muted/30 dark:bg-zinc-950/50"
					: "border border-border/40 bg-card/60 backdrop-blur",
				className,
			)}
		>
			<div className="flex size-12 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-foreground/10">
				<Icon className="size-5 text-muted-foreground" />
			</div>
			<div className="flex flex-col gap-1">
				<h2
					className="font-medium text-[15px] text-foreground"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					{title}
				</h2>
				{description ? (
					<p className="max-w-sm text-[12.5px] text-muted-foreground leading-relaxed">
						{description}
					</p>
				) : null}
			</div>
			{action ? <div className="mt-1">{action}</div> : null}
		</div>
	);
}
