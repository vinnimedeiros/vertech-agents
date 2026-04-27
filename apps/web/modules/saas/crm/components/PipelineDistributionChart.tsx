"use client";

import { FloatingPanel } from "@saas/shared/floating";
import { cn } from "@ui/lib";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

const PALETTE = [
	{ from: "#6ee7b7", to: "#10b981" },
	{ from: "#93c5fd", to: "#3b82f6" },
	{ from: "#fcd34d", to: "#f59e0b" },
	{ from: "#c4b5fd", to: "#8b5cf6" },
	{ from: "#f9a8d4", to: "#ec4899" },
	{ from: "#67e8f9", to: "#06b6d4" },
	{ from: "#bef264", to: "#84cc16" },
	{ from: "#fdba74", to: "#f97316" },
	{ from: "#5eead4", to: "#14b8a6" },
	{ from: "#d8b4fe", to: "#a855f7" },
];

export type DistributionItem = {
	label: string;
	count: number;
	percent: number;
};

type Props = {
	title: string;
	icon?: LucideIcon;
	items: DistributionItem[];
	emptyLabel?: string;
	onItemClick?: (item: DistributionItem) => void;
	className?: string;
};

export function PipelineDistributionChart({
	title,
	icon: Icon,
	items,
	emptyLabel = "Sem dados.",
	onItemClick,
	className,
}: Props) {
	const max = useMemo(
		() => Math.max(1, ...items.map((i) => i.percent)),
		[items],
	);
	const total = useMemo(
		() => items.reduce((s, i) => s + i.count, 0),
		[items],
	);

	return (
		<FloatingPanel className={cn("flex flex-col p-4", className)}>
			<header className="mb-3.5 flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						{Icon ? (
							<span className="inline-flex size-6 items-center justify-center rounded-md bg-foreground/5 ring-1 ring-foreground/10">
								<Icon className="size-3.5 text-foreground/65" />
							</span>
						) : null}
						<h3
							className="text-[13px] font-medium text-foreground"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							{title}
						</h3>
					</div>
					<span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-foreground/55">
						{items.length} · {total}
					</span>
				</header>

				{items.length === 0 ? (
					<div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/40 text-[11px] text-foreground/45">
						{emptyLabel}
					</div>
				) : (
					<ul className="flex flex-col gap-2.5">
						{items.map((item, idx) => {
							const palette = PALETTE[idx % PALETTE.length];
							const widthPercent = (item.percent / max) * 100;
							const interactive = Boolean(onItemClick);
							return (
								<li key={item.label}>
									<button
										type="button"
										onClick={
											interactive ? () => onItemClick?.(item) : undefined
										}
										disabled={!interactive}
										className={cn(
											"group flex w-full flex-col gap-1.5 rounded-md px-1 py-0.5 text-left",
											interactive
												? "cursor-pointer hover:bg-foreground/[0.04] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
												: "cursor-default",
										)}
									>
										<div className="flex items-center justify-between gap-2 text-[11.5px]">
											<div className="flex min-w-0 items-center gap-2">
												<span
													className="size-2 shrink-0 rounded-full"
													style={{
														background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
													}}
												/>
												<span
													className="truncate font-medium text-foreground/85"
													title={item.label}
												>
													{item.label}
												</span>
											</div>
											<span className="shrink-0 tabular-nums text-foreground/55">
												<span className="font-medium text-foreground/80">
													{item.count}
												</span>
												<span className="ml-1 text-foreground/45">
													{item.percent.toFixed(1).replace(".", ",")}%
												</span>
											</span>
										</div>
										<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
											<div
												className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
												style={{
													width: `${widthPercent}%`,
													background: `linear-gradient(90deg, ${palette.from}, ${palette.to})`,
													boxShadow: `0 0 12px ${palette.to}30`,
												}}
											/>
										</div>
									</button>
								</li>
							);
						})}
					</ul>
			)}
		</FloatingPanel>
	);
}
