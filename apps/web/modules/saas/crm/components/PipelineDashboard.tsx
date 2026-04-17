"use client";

import { Card } from "@ui/components/card";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { KanbanLead, KanbanStage } from "./PipelineKanban";

type PipelineDashboardProps = {
	stages: KanbanStage[];
	leads: KanbanLead[];
};

function formatCurrency(value: number): string {
	try {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
			maximumFractionDigits: 0,
		}).format(value);
	} catch {
		return `R$ ${value}`;
	}
}

export function PipelineDashboard({ stages, leads }: PipelineDashboardProps) {
	const totalLeads = leads.length;

	const totalValue = leads.reduce((sum, l) => {
		const v = Number(l.value ?? 0);
		return sum + (Number.isNaN(v) ? 0 : v);
	}, 0);

	const wonStageIds = new Set(stages.filter((s) => s.isWon).map((s) => s.id));
	const lostStageIds = new Set(
		stages.filter((s) => s.isClosing && !s.isWon).map((s) => s.id),
	);

	const wonLeads = leads.filter((l) => wonStageIds.has(l.stageId));
	const lostLeads = leads.filter((l) => lostStageIds.has(l.stageId));
	const openLeads = leads.filter(
		(l) => !wonStageIds.has(l.stageId) && !lostStageIds.has(l.stageId),
	);

	const wonValue = wonLeads.reduce((sum, l) => {
		const v = Number(l.value ?? 0);
		return sum + (Number.isNaN(v) ? 0 : v);
	}, 0);

	const closedTotal = wonLeads.length + lostLeads.length;
	const conversionRate =
		closedTotal > 0 ? (wonLeads.length / closedTotal) * 100 : 0;

	const ticketMedio = wonLeads.length > 0 ? wonValue / wonLeads.length : 0;

	const funnelData = stages.map((stage) => {
		const stageLeads = leads.filter((l) => l.stageId === stage.id);
		const stageValue = stageLeads.reduce((sum, l) => {
			const v = Number(l.value ?? 0);
			return sum + (Number.isNaN(v) ? 0 : v);
		}, 0);
		return {
			name: stage.name,
			leads: stageLeads.length,
			valor: stageValue,
			fill: stage.color,
		};
	});

	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Leads ativos"
					value={openLeads.length.toString()}
					hint={`${totalLeads} totais`}
				/>
				<StatCard
					label="Valor em pipeline"
					value={formatCurrency(totalValue)}
				/>
				<StatCard
					label="Taxa de conversão"
					value={`${conversionRate.toFixed(1)}%`}
					hint={`${wonLeads.length} ganhos / ${lostLeads.length} perdidos`}
				/>
				<StatCard
					label="Ticket médio"
					value={formatCurrency(ticketMedio)}
					hint={`${wonLeads.length} leads ganhos`}
				/>
			</div>

			<Card className="p-6">
				<h3 className="font-semibold text-foreground text-sm">
					Leads por estágio
				</h3>
				<p className="mb-4 text-foreground/50 text-xs">
					Quantidade de oportunidades em cada etapa do pipeline.
				</p>
				<div className="h-72 w-full">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={funnelData}
							layout="vertical"
							margin={{ left: 16 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="rgba(0,0,0,0.05)"
							/>
							<XAxis
								type="number"
								allowDecimals={false}
								tick={{ fontSize: 12 }}
							/>
							<YAxis
								dataKey="name"
								type="category"
								tick={{ fontSize: 12 }}
								width={120}
							/>
							<Tooltip
								cursor={{ fill: "rgba(0,0,0,0.04)" }}
								contentStyle={{
									background: "var(--background)",
									border: "1px solid var(--border)",
									borderRadius: 8,
									fontSize: 12,
								}}
								formatter={(val, key) => {
									const n = Number(val);
									return key === "valor"
										? formatCurrency(
												Number.isNaN(n) ? 0 : n,
											)
										: String(val);
								}}
							/>
							<Bar dataKey="leads" radius={[0, 6, 6, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</Card>

			<Card className="p-6">
				<h3 className="font-semibold text-foreground text-sm">
					Valor por estágio
				</h3>
				<p className="mb-4 text-foreground/50 text-xs">
					Soma dos valores das oportunidades em cada etapa.
				</p>
				<div className="h-72 w-full">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={funnelData}
							margin={{ left: 8, right: 8 }}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="rgba(0,0,0,0.05)"
							/>
							<XAxis
								dataKey="name"
								tick={{ fontSize: 11 }}
								interval={0}
							/>
							<YAxis
								tick={{ fontSize: 11 }}
								tickFormatter={(v) =>
									v >= 1000
										? `${(v / 1000).toFixed(0)}k`
										: v.toString()
								}
							/>
							<Tooltip
								cursor={{ fill: "rgba(0,0,0,0.04)" }}
								contentStyle={{
									background: "var(--background)",
									border: "1px solid var(--border)",
									borderRadius: 8,
									fontSize: 12,
								}}
								formatter={(val) => {
									const n = Number(val);
									return formatCurrency(
										Number.isNaN(n) ? 0 : n,
									);
								}}
							/>
							<Bar dataKey="valor" radius={[6, 6, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</Card>
		</div>
	);
}

function StatCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<Card className="p-4">
			<div className="text-foreground/60 text-xs uppercase tracking-wide">
				{label}
			</div>
			<div className="mt-2 font-semibold text-2xl text-foreground tabular-nums">
				{value}
			</div>
			{hint ? (
				<div className="mt-1 text-foreground/50 text-xs">{hint}</div>
			) : null}
		</Card>
	);
}
