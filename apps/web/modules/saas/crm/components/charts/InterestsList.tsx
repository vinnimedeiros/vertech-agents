"use client";

import { FloatingPanel } from "@saas/shared/floating";
import { cn } from "@ui/lib";

type Props = {
	leads: Array<{ interests?: string[] }>;
	className?: string;
};

const PALETTE = [
	{ from: "#6ee7b7", to: "#10b981" },
	{ from: "#93c5fd", to: "#3b82f6" },
	{ from: "#fcd34d", to: "#f59e0b" },
	{ from: "#c4b5fd", to: "#8b5cf6" },
	{ from: "#f9a8d4", to: "#ec4899" },
	{ from: "#67e8f9", to: "#06b6d4" },
];

export function InterestsList({ leads, className }: Props) {
	const counts: Record<string, number> = {};
	for (const l of leads) {
		const arr = l.interests ?? [];
		if (arr.length === 0) {
			counts["Não informado"] = (counts["Não informado"] ?? 0) + 1;
		} else {
			for (const tag of arr) counts[tag] = (counts[tag] ?? 0) + 1;
		}
	}

	const sorted = Object.entries(counts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 6);
	const total = sorted.reduce((s, [, v]) => s + v, 0);
	const max = Math.max(1, ...sorted.map(([, v]) => v));

	return (
		<FloatingPanel className={cn("flex flex-col p-4", className)}>
			<header className="mb-3 flex items-center justify-between">
				<div className="flex flex-col gap-0.5">
					<h3
						className="text-[13px] font-medium text-foreground"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						Interesses
					</h3>
					<p className="text-[10.5px] text-foreground/55">
						Top tópicos mencionados pelos leads
					</p>
				</div>
				<span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-foreground/55">
					{sorted.length} · {total}
				</span>
			</header>

			{sorted.length === 0 ? (
				<div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/40 text-[11px] text-foreground/45">
					Sem dados.
				</div>
			) : (
				<ul className="flex flex-col gap-2.5">
					{sorted.map(([label, count], idx) => {
						const palette = PALETTE[idx % PALETTE.length];
						const widthPercent = (count / max) * 100;
						const percent = total > 0 ? (count / total) * 100 : 0;
						return (
							<li key={label} className="flex flex-col gap-1.5">
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
											title={label}
										>
											{label}
										</span>
									</div>
									<span className="shrink-0 tabular-nums text-foreground/55">
										<span className="font-medium text-foreground/80">
											{count}
										</span>
										<span className="ml-1 text-foreground/45">
											{percent.toFixed(1).replace(".", ",")}%
										</span>
									</span>
								</div>
								<div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
									<div
										className="h-full rounded-full transition-all duration-700 ease-out"
										style={{
											width: `${widthPercent}%`,
											background: `linear-gradient(90deg, ${palette.from}, ${palette.to})`,
											boxShadow: `0 0 12px ${palette.to}30`,
										}}
									/>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</FloatingPanel>
	);
}
