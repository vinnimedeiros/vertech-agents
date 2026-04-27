"use client";

import { FloatingPanel } from "@saas/shared/floating";
import { cn } from "@ui/lib";
import {
	PolarAngleAxis,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";

type Props = {
	leads: Array<{ origin: string | null }>;
	className?: string;
};

const PALETTE = [
	"#10b981",
	"#3b82f6",
	"#f59e0b",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#84cc16",
	"#f97316",
];

export function OriginRadialChart({ leads, className }: Props) {
	const counts: Record<string, number> = {};
	for (const l of leads) {
		const k = (l.origin ?? "Não informado").toString();
		counts[k] = (counts[k] ?? 0) + 1;
	}

	const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
	const total = leads.length;
	const max = sorted[0]?.[1] ?? 1;

	const data = sorted.slice(0, 6).map(([name, value], idx) => ({
		name,
		value,
		fill: PALETTE[idx % PALETTE.length],
	}));

	return (
		<FloatingPanel className={cn("flex flex-col p-4", className)}>
			<header className="mb-2">
				<h3
					className="text-[13px] font-medium text-foreground"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					Origem
				</h3>
				<p className="text-[10.5px] text-foreground/55">
					Canais de aquisição de leads
				</p>
			</header>

			<div className="grid grid-cols-2 gap-3">
				<div className="relative h-40">
					<ResponsiveContainer width="100%" height="100%">
						<RadialBarChart
							innerRadius="35%"
							outerRadius="100%"
							data={data}
							startAngle={90}
							endAngle={-270}
							barCategoryGap={2}
						>
							<PolarAngleAxis
								type="number"
								domain={[0, max]}
								angleAxisId={0}
								tick={false}
							/>
							<RadialBar
								dataKey="value"
								background={{
									fill: "color-mix(in srgb, currentColor 6%, transparent)",
								}}
								cornerRadius={8}
							/>
							<Tooltip
								contentStyle={{
									background: "var(--color-background)",
									border: "1px solid var(--color-border)",
									borderRadius: 8,
									fontSize: 11,
									padding: "6px 10px",
								}}
								formatter={(val: unknown) => [String(val), "Leads"]}
							/>
						</RadialBarChart>
					</ResponsiveContainer>
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
						<span
							className="text-[20px] font-medium leading-none text-foreground"
							style={{ fontFamily: "var(--font-satoshi)" }}
						>
							{total}
						</span>
						<span className="mt-0.5 text-[9.5px] text-foreground/55 uppercase tracking-wider">
							Total
						</span>
					</div>
				</div>

				<div className="flex flex-col justify-center gap-1.5">
					{data.map((d) => (
						<div
							key={d.name}
							className="flex items-center justify-between gap-2 text-[11px]"
						>
							<div className="flex min-w-0 items-center gap-1.5">
								<span
									className="size-2 shrink-0 rounded-full"
									style={{ background: d.fill }}
								/>
								<span className="truncate text-foreground/85" title={d.name}>
									{d.name}
								</span>
							</div>
							<span className="shrink-0 tabular-nums font-medium text-foreground/75">
								{d.value}
							</span>
						</div>
					))}
				</div>
			</div>
		</FloatingPanel>
	);
}
