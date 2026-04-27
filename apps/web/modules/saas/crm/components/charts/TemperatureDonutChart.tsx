"use client";

import { FloatingPanel } from "@saas/shared/floating";
import { cn } from "@ui/lib";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
	leads: Array<{ temperature: "COLD" | "WARM" | "HOT" }>;
	className?: string;
};

const TEMP_META = {
	COLD: { label: "Frio", color: "#3b82f6" },
	WARM: { label: "Morno", color: "#f59e0b" },
	HOT: { label: "Quente", color: "#ef4444" },
} as const;

export function TemperatureDonutChart({ leads, className }: Props) {
	const counts = { COLD: 0, WARM: 0, HOT: 0 };
	for (const l of leads) counts[l.temperature]++;

	const data = (["HOT", "WARM", "COLD"] as const).map((k) => ({
		name: TEMP_META[k].label,
		value: counts[k],
		color: TEMP_META[k].color,
	}));

	const total = leads.length;

	return (
		<FloatingPanel className={cn("flex flex-col p-4", className)}>
			<header className="mb-2">
				<h3
					className="text-[13px] font-medium text-foreground"
					style={{ fontFamily: "var(--font-satoshi)" }}
				>
					Temperatura
				</h3>
				<p className="text-[10.5px] text-foreground/55">
					Distribuição de aquecimento
				</p>
			</header>

			<div className="relative flex items-center justify-center">
				<div className="h-44 w-full">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={data}
								innerRadius={48}
								outerRadius={70}
								paddingAngle={2}
								cornerRadius={6}
								dataKey="value"
								strokeWidth={0}
							>
								{data.map((d) => (
									<Cell key={d.name} fill={d.color} />
								))}
							</Pie>
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
						</PieChart>
					</ResponsiveContainer>
				</div>
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span
						className="text-[24px] font-medium leading-none text-foreground"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						{total}
					</span>
					<span className="mt-0.5 text-[10px] text-foreground/55 uppercase tracking-wider">
						Leads
					</span>
				</div>
			</div>

			<div className="mt-3 flex flex-col gap-1">
				{data.map((d) => (
					<div
						key={d.name}
						className="flex items-center justify-between text-[11px]"
					>
						<div className="flex items-center gap-1.5">
							<span
								className="size-2 rounded-full"
								style={{ background: d.color }}
							/>
							<span className="text-foreground/85">{d.name}</span>
						</div>
						<span className="tabular-nums font-medium text-foreground/80">
							{d.value}
							<span className="ml-1 text-foreground/45">
								{total > 0
									? `(${((d.value / total) * 100).toFixed(0)}%)`
									: "(0%)"}
							</span>
						</span>
					</div>
				))}
			</div>
		</FloatingPanel>
	);
}
