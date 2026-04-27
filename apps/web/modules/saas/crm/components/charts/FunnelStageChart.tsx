"use client";

import { FloatingPanel } from "@saas/shared/floating";
import { cn } from "@ui/lib";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type Stage = {
	id: string;
	name: string;
	color: string;
	position: number;
};

type Props = {
	stages: Stage[];
	leads: Array<{ stageId: string; value: string | null }>;
	className?: string;
};

const BRL = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	maximumFractionDigits: 0,
});

const TAILWIND_COLOR_MAP: Record<string, string> = {
	"bg-rose-500": "#f43f5e",
	"bg-pink-500": "#ec4899",
	"bg-fuchsia-500": "#d946ef",
	"bg-purple-500": "#a855f7",
	"bg-violet-500": "#8b5cf6",
	"bg-indigo-500": "#6366f1",
	"bg-blue-500": "#3b82f6",
	"bg-sky-500": "#0ea5e9",
	"bg-cyan-500": "#06b6d4",
	"bg-teal-500": "#14b8a6",
	"bg-emerald-500": "#10b981",
	"bg-green-500": "#22c55e",
	"bg-lime-500": "#84cc16",
	"bg-yellow-500": "#eab308",
	"bg-amber-500": "#f59e0b",
	"bg-orange-500": "#f97316",
	"bg-red-500": "#ef4444",
	"bg-gray-500": "#6b7280",
	"bg-zinc-500": "#71717a",
	"bg-slate-500": "#64748b",
};

function resolveColor(tailwind: string | null | undefined): string {
	if (!tailwind) return "#8b5cf6";
	return TAILWIND_COLOR_MAP[tailwind] ?? "#8b5cf6";
}

export function FunnelStageChart({ stages, leads, className }: Props) {
	const data = [...stages]
		.sort((a, b) => a.position - b.position)
		.map((stage) => {
			const stageLeads = leads.filter((l) => l.stageId === stage.id);
			const total = stageLeads.reduce(
				(s, l) => s + Number(l.value ?? 0),
				0,
			);
			return {
				name: stage.name,
				count: stageLeads.length,
				value: total,
				fill: resolveColor(stage.color),
			};
		});

	return (
		<FloatingPanel className={cn("flex flex-col p-4", className)}>
			<header className="mb-3 flex items-center justify-between">
				<div className="flex flex-col gap-0.5">
					<h3
						className="text-[13px] font-medium text-foreground"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						Leads por estágio
					</h3>
					<p className="text-[10.5px] text-foreground/55">
						Distribuição de oportunidades no funil
					</p>
				</div>
				<span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-foreground/55">
					{leads.length}
				</span>
			</header>

			<div className="h-64 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={data}
						margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							stroke="color-mix(in srgb, currentColor 8%, transparent)"
							vertical={false}
						/>
						<XAxis
							dataKey="name"
							tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
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
								fill: "color-mix(in srgb, currentColor 5%, transparent)",
							}}
							contentStyle={{
								background: "var(--color-background)",
								border: "1px solid var(--color-border)",
								borderRadius: 8,
								fontSize: 11,
								padding: "6px 10px",
							}}
							labelStyle={{
								color: "var(--color-foreground)",
								fontWeight: 500,
								marginBottom: 2,
							}}
							formatter={(val: unknown) => {
								return [String(val), "Leads"];
							}}
						/>
						<Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
							{data.map((entry) => (
								<Cell key={entry.name} fill={entry.fill} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</FloatingPanel>
	);
}
