import { getActiveOrganization } from "@saas/auth/lib/server";
import { PipelineDashboard } from "@saas/crm/components/PipelineDashboard";
import { PipelineKanban } from "@saas/crm/components/PipelineKanban";
import { PipelineToolbar } from "@saas/crm/components/PipelineToolbar";
import {
	getPipelineWithStages,
	listLeadsByPipeline,
	listPipelinesWithStats,
} from "@saas/crm/lib/server";
import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { KanbanSquareIcon } from "lucide-react";
import { notFound } from "next/navigation";

export default async function CrmPipelinePage({
	params,
	searchParams,
}: {
	params: Promise<{ organizationSlug: string }>;
	searchParams: Promise<{ view?: string; pipelineId?: string }>;
}) {
	const { organizationSlug } = await params;
	const { view, pipelineId: queryPipelineId } = await searchParams;

	const org = await getActiveOrganization(organizationSlug);
	if (!org) return notFound();

	const pipelines = await listPipelinesWithStats(org.id);

	if (pipelines.length === 0) {
		return (
			<>
				<PageHeader
					title="Pipeline"
					subtitle="Kanban de vendas com estágios customizáveis"
				/>
				<ComingSoon
					icon={KanbanSquareIcon}
					title="Pipeline não configurado"
					description="Este workspace ainda não tem pipelines. Crie o primeiro no seletor acima."
				/>
			</>
		);
	}

	// Resolver pipeline ativo: query param → default → primeiro
	const resolvedPipeline =
		(queryPipelineId && pipelines.find((p) => p.id === queryPipelineId)) ||
		pipelines.find((p) => p.isDefault) ||
		pipelines[0];

	const pipelineData = await getPipelineWithStages(resolvedPipeline.id);
	if (!pipelineData) return notFound();

	const leadsRaw = await listLeadsByPipeline(pipelineData.id);
	const leads = leadsRaw.map((l) => ({
		id: l.id,
		title: l.title,
		value: l.value,
		currency: l.currency,
		temperature: l.temperature,
		priority: l.priority,
		stageId: l.stageId,
		contact: l.contact,
	}));

	// Lead count por stage pra usar no StageEditorModal (migration flow)
	const leadCountByStage: Record<string, number> = {};
	for (const l of leads) {
		leadCountByStage[l.stageId] = (leadCountByStage[l.stageId] ?? 0) + 1;
	}

	const stages = pipelineData.stages.map((s) => ({
		id: s.id,
		name: s.name,
		color: s.color,
		position: s.position,
		isClosing: s.isClosing,
		isWon: s.isWon,
	}));

	const editableStages = pipelineData.stages.map((s) => ({
		id: s.id,
		name: s.name,
		color: s.color,
		position: s.position,
		category: s.category,
		probability: s.probability,
		maxDays: s.maxDays,
	}));

	const pipelineOptions = pipelines.map((p) => ({
		id: p.id,
		name: p.name,
		isDefault: p.isDefault,
		leadCount: p.leadCount,
		totalValue: p.totalValue,
	}));

	const basePath = `/app/${organizationSlug}/crm/pipeline`;
	const showDashboard = view === "dashboard";

	return (
		<>
			<PageHeader title="Pipeline" subtitle={pipelineData.name}>
				<PipelineToolbar
					organizationId={org.id}
					organizationSlug={organizationSlug}
					pipelineId={pipelineData.id}
					pipelineName={pipelineData.name}
					pipelines={pipelineOptions}
					stages={editableStages}
					leadCountByStage={leadCountByStage}
					basePath={basePath}
				/>
			</PageHeader>
			{showDashboard ? (
				<PipelineDashboard stages={stages} leads={leads} />
			) : (
				<PipelineKanban
					organizationId={org.id}
					organizationSlug={organizationSlug}
					pipelineId={pipelineData.id}
					stages={stages}
					initialLeads={leads}
				/>
			)}
		</>
	);
}
