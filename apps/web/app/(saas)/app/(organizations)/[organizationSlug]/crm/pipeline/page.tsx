import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { PipelineDashboard } from "@saas/crm/components/PipelineDashboard";
import { PipelineKanban } from "@saas/crm/components/PipelineKanban";
import { PipelineList } from "@saas/crm/components/PipelineList";
import { PipelineShell } from "@saas/crm/components/PipelineShell";
import {
	filterLeads,
	sortLeads,
} from "@saas/crm/lib/filter-leads";
import {
	getPipelineWithStages,
	listAllInterestsForOrg,
	listLeadsByPipeline,
	listOrgMembers,
	listPipelineViewsForUser,
	listPipelinesWithStats,
	listStatusTemplatesForOrg,
} from "@saas/crm/lib/server";
import { type ViewState } from "@saas/crm/lib/view-filters";
import {
	paramsFromRecord,
	readCurrentStateFromParams,
} from "@saas/crm/lib/view-params";
import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { KanbanSquareIcon } from "lucide-react";
import { notFound } from "next/navigation";

export default async function CrmPipelinePage({
	params,
	searchParams,
}: {
	params: Promise<{ organizationSlug: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { organizationSlug } = await params;
	const rawParams = await searchParams;
	const sp = paramsFromRecord(rawParams);
	const queryPipelineId = sp.get("pipelineId");
	const queryViewId = sp.get("viewId");

	const [org, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);
	if (!org) return notFound();
	if (!session?.user) return notFound();

	const pipelines = await listPipelinesWithStats(org.id);

	if (pipelines.length === 0) {
		return (
			<ComingSoon
				icon={KanbanSquareIcon}
				title="Pipeline não configurado"
				description="Este workspace ainda não tem pipelines. Crie o primeiro no seletor acima."
			/>
		);
	}

	const resolvedPipeline =
		(queryPipelineId && pipelines.find((p) => p.id === queryPipelineId)) ||
		pipelines.find((p) => p.isDefault) ||
		pipelines[0];

	const [pipelineData, views, members, allInterests, templates] =
		await Promise.all([
			getPipelineWithStages(resolvedPipeline.id),
			listPipelineViewsForUser(resolvedPipeline.id, session.user.id),
			listOrgMembers(org.id),
			listAllInterestsForOrg(org.id),
			listStatusTemplatesForOrg(org.id),
		]);
	if (!pipelineData) return notFound();

	const activeView = queryViewId
		? views.find((v) => v.id === queryViewId) ?? null
		: views.find((v) => v.isDefault) ?? null;

	const baseState: ViewState | null = activeView
		? {
				filters: activeView.filters,
				viewMode: activeView.viewMode,
				sortBy: activeView.sortBy,
			}
		: null;

	const currentState: ViewState = readCurrentStateFromParams(
		sp,
		baseState ?? undefined,
	);

	const leadsRaw = await listLeadsByPipeline(pipelineData.id);
	const stagesById: Record<
		string,
		{ id: string; isClosing: boolean; maxDays: number | null }
	> = {};
	for (const s of pipelineData.stages) {
		stagesById[s.id] = {
			id: s.id,
			isClosing: s.isClosing,
			maxDays: s.maxDays,
		};
	}

	const normalizedLeads = leadsRaw.map((l) => ({
		...l,
		stageDates: (l.stageDates ?? null) as Record<string, string> | null,
	}));

	const filteredLeads = sortLeads(
		filterLeads(normalizedLeads, currentState.filters, stagesById),
		currentState.sortBy,
	);

	const leadsForUi = filteredLeads.map((l) => ({
		id: l.id,
		title: l.title,
		value: l.value,
		currency: l.currency,
		temperature: l.temperature,
		priority: l.priority,
		origin: l.origin,
		interests: l.interests,
		stageId: l.stageId,
		assignedTo: l.assignedTo,
		createdAt: l.createdAt,
		stageDates: l.stageDates,
		contact: l.contact,
	}));

	const allLeadsCount = leadsRaw.length;
	const visibleLeadsCount = filteredLeads.length;

	const leadCountByStage: Record<string, number> = {};
	for (const l of leadsForUi) {
		leadCountByStage[l.stageId] = (leadCountByStage[l.stageId] ?? 0) + 1;
	}

	const stages = pipelineData.stages.map((s) => ({
		id: s.id,
		name: s.name,
		color: s.color,
		position: s.position,
		isClosing: s.isClosing,
		isWon: s.isWon,
		maxDays: s.maxDays,
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

	return (
		<PipelineShell
			organizationId={org.id}
			organizationSlug={organizationSlug}
			pipelineId={pipelineData.id}
			pipelineName={pipelineData.name}
			pipelines={pipelineOptions}
			stages={editableStages}
			leadCountByStage={leadCountByStage}
			basePath={basePath}
			views={views}
			activeViewId={activeView?.id ?? null}
			currentState={currentState}
			baseState={baseState}
			members={members}
			templates={templates}
			totalLeads={allLeadsCount}
			visibleLeads={visibleLeadsCount}
		>
			{currentState.viewMode === "dashboard" ? (
				<PipelineDashboard stages={stages} leads={leadsForUi} />
			) : currentState.viewMode === "list" ? (
				<PipelineList
					leads={filteredLeads.map((l) => ({
						id: l.id,
						title: l.title,
						value: l.value,
						currency: l.currency,
						priority: l.priority,
						temperature: l.temperature,
						stageId: l.stageId,
						assignedTo: l.assignedTo,
						createdAt: l.createdAt,
						stageDates: l.stageDates,
						contact: l.contact,
					}))}
					stages={pipelineData.stages.map((s) => ({
						id: s.id,
						name: s.name,
						color: s.color,
						maxDays: s.maxDays,
						position: s.position,
						isClosing: s.isClosing,
						isWon: s.isWon,
					}))}
					members={members}
					baseState={baseState}
					basePath={basePath}
					organizationSlug={organizationSlug}
				/>
			) : (
				<PipelineKanban
					organizationId={org.id}
					organizationSlug={organizationSlug}
					pipelineId={pipelineData.id}
					stages={stages}
					initialLeads={leadsForUi}
					members={members}
					allInterests={allInterests}
				/>
			)}
		</PipelineShell>
	);
}
