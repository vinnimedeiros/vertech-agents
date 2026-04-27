"use client";

import { FloatingPanel } from "@saas/shared/floating";
import { cn } from "@ui/lib";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type Stage = {
	id: string;
	name: string;
	position: number;
	isWon: boolean;
	isClosing: boolean;
};

type Props = {
	stages: Stage[];
	leads: Array<{ stageId: string }>;
	className?: string;
};

export function ConversionFunnelArea({ stages, leads, className }: Props) {
	const sortedStages = [...stages].sort((a, b) => a.position - b.position);

	let cumulative = leads.length;
	const data = sortedStages.map((stage, idx) => {
		const stageLeads = leads.filter((l) => l.stageId === stage.id);
		const remaining = idx === 0 ? cumulative : Math.max(0, cumulative);
		cumulative -= stageLeads.length;
		return {
			name: stage.name,
			leads: remaining,
		};
	});

	const lastValue = data[data.length - 1]?.leads ?? 0;
	const firstValue = data[0]?.leads ?? 0;
	const conversionRate =
		firstValue > 0 ? ((lastValue / firstValue) * 100).toFixed(1) : "0,0";

	return (
		<FloatingPanel className={cn("flex flex-col p-4", className)}>
			<header className="mb-3 flex items-center justify-between">
				<div className="flex flex-col gap-0.5">
					<h3
						className="text-[13px] font-medium text-foreground"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						Funil de conversão
					</h3>
					<p className="text-[10.5px] text-foreground/55">
						Volume restante a cada etapa
					</p>
				</div>
				<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-emerald-400">
					{conversionRate.replace(".", ",")}%
				</span>
			</header>

			<div className="h-44 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={data}
						margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
					>
						<defs>
							<linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
								<stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
							</linearGradient>
						</defs>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="color-mix(in srgb, currentColor 8%, transparent)"
							vertical={false}
						/>
						<XAxis
							dataKey="name"
							tick={{ fontSize: 9.5, fill: "currentColor", opacity: 0.6 }}
							axisLine={false}
							tickLine={false}
							interval={0}
						/>
						<YAxis
							tick={{ fontSize: 10, fill: "currentColor", opacity: 0.55 }}
							axisLine={false}
							tickLine={false}
							allowDecimals={false}
						/>
						<Tooltip
							cursor={{
								stroke: "color-mix(in srgb, currentColor 25%, transparent)",
								strokeWidth: 1,
							}}
							contentStyle={{
								background: "var(--color-background)",
								border: "1px solid var(--color-border)",
								borderRadius: 8,
								fontSize: 11,
								padding: "6px 10px",
							}}
							formatter={(val: unknown) => [String(val), "Leads"]}
						/>
						<Area
							type="monotone"
							dataKey="leads"
							stroke="#10b981"
							strokeWidth={2}
							fill="url(#funnelGradient)"
							isAnimationActive={true}
							animationDuration={700}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</FloatingPanel>
	);
}
