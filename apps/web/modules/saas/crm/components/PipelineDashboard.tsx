"use client";

import { FloatingPanel, MetricCard } from "@saas/shared/floating";
import {
	BadgeCheckIcon,
	FileSignatureIcon,
	LineChartIcon,
	PercentIcon,
	TrophyIcon,
	UsersIcon,
} from "lucide-react";
import { useMemo } from "react";
import { ConversionFunnelArea } from "./charts/ConversionFunnelArea";
import { FunnelStageChart } from "./charts/FunnelStageChart";
import { InterestsList } from "./charts/InterestsList";
import { OriginRadialChart } from "./charts/OriginRadialChart";
import { TemperatureDonutChart } from "./charts/TemperatureDonutChart";
import type { KanbanLead, KanbanStage } from "./PipelineKanban";

type Props = {
	stages: KanbanStage[];
	leads: KanbanLead[];
};

const PROPOSAL_RX = /proposta|negocia|proposal|negotiat/i;

const BRL = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("pt-BR");

export function PipelineDashboard({ stages, leads }: Props) {
	const wonStageIds = useMemo(
		() => new Set(stages.filter((s) => s.isWon).map((s) => s.id)),
		[stages],
	);
	const lostStageIds = useMemo(
		() =>
			new Set(
				stages.filter((s) => s.isClosing && !s.isWon).map((s) => s.id),
			),
		[stages],
	);
	const activeStageIds = useMemo(
		() =>
			new Set(
				stages
					.filter((s) => !s.isClosing && !s.isWon)
					.map((s) => s.id),
			),
		[stages],
	);

	const proposalStageIds = useMemo(
		() =>
			new Set(
				stages.filter((s) => PROPOSAL_RX.test(s.name ?? "")).map((s) => s.id),
			),
		[stages],
	);

	const wonLeads = useMemo(
		() => leads.filter((l) => wonStageIds.has(l.stageId)),
		[leads, wonStageIds],
	);
	const lostLeads = useMemo(
		() => leads.filter((l) => lostStageIds.has(l.stageId)),
		[leads, lostStageIds],
	);
	const proposalLeads = useMemo(
		() =>
			proposalStageIds.size > 0
				? leads.filter((l) => proposalStageIds.has(l.stageId))
				: leads.filter((l) => activeStageIds.has(l.stageId)),
		[leads, proposalStageIds, activeStageIds],
	);

	const totalLeads = leads.length;
	const closedTotal = wonLeads.length + lostLeads.length;
	const conversionRate =
		closedTotal > 0 ? (wonLeads.length / closedTotal) * 100 : 0;
	const wonValue = wonLeads.reduce((s, l) => s + Number(l.value ?? 0), 0);

	if (totalLeads === 0) {
		return (
			<FloatingPanel
				variant="elevated"
				className="flex min-h-72 flex-col items-center justify-center gap-3 p-10 text-center"
			>
				<div className="flex size-10 items-center justify-center rounded-full bg-foreground/5">
					<LineChartIcon className="size-5 text-foreground/40" />
				</div>
				<div className="flex flex-col gap-0.5">
					<h3 className="text-sm font-semibold text-foreground">
						Sem leads no período
					</h3>
					<p className="max-w-sm text-[11.5px] text-foreground/55">
						Quando começarem a chegar leads, esse painel reflete a saúde do
						funil em tempo real.
					</p>
				</div>
			</FloatingPanel>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
			<div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
				<MetricCard
					label="Leads"
					value={NUM.format(totalLeads)}
					icon={UsersIcon}
					color="cyan"
				/>
				<MetricCard
					label="Propostas"
					value={NUM.format(proposalLeads.length)}
					icon={FileSignatureIcon}
					color="violet"
				/>
				<MetricCard
					label="Convertidos"
					value={NUM.format(wonLeads.length)}
					icon={BadgeCheckIcon}
					color="lime"
				/>
				<MetricCard
					label="Taxa de conversão"
					value={`${conversionRate.toFixed(1).replace(".", ",")}%`}
					icon={PercentIcon}
					color="amber"
				/>
				<MetricCard
					label="Receita"
					value={BRL.format(wonValue)}
					icon={TrophyIcon}
					color="orange"
				/>
			</div>

			<div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
				<FunnelStageChart
					stages={stages}
					leads={leads}
					className="lg:col-span-8"
				/>
				<TemperatureDonutChart leads={leads} className="lg:col-span-4" />
				<ConversionFunnelArea
					stages={stages}
					leads={leads}
					className="lg:col-span-7"
				/>
				<OriginRadialChart leads={leads} className="lg:col-span-5" />
				<InterestsList leads={leads} className="lg:col-span-12" />
			</div>
		</div>
	);
}
