import { getActiveOrganization } from "@saas/auth/lib/server";
import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PipelineKanban } from "@saas/crm/components/PipelineKanban";
import { PageHeader } from "@saas/shared/components/PageHeader";
import {
	getDefaultPipelineWithStages,
	listLeadsByPipeline,
} from "@saas/crm/lib/server";
import { KanbanSquareIcon } from "lucide-react";
import { notFound } from "next/navigation";

export default async function CrmPipelinePage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;

	const org = await getActiveOrganization(organizationSlug);
	if (!org) return notFound();

	const pipelineData = await getDefaultPipelineWithStages(org.id);

	if (!pipelineData) {
		return (
			<>
				<PageHeader
					title="Pipeline"
					subtitle="Kanban de vendas com estágios customizáveis"
				/>
				<ComingSoon
					icon={KanbanSquareIcon}
					title="Pipeline não configurado"
					description="Este workspace ainda não tem um pipeline padrão. Isso não deveria acontecer para um Client — contate o suporte."
				/>
			</>
		);
	}

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

	return (
		<>
			<PageHeader
				title="Pipeline"
				subtitle={pipelineData.name}
			/>
			<PipelineKanban
				organizationSlug={organizationSlug}
				stages={pipelineData.stages.map((s) => ({
					id: s.id,
					name: s.name,
					color: s.color,
					position: s.position,
					isClosing: s.isClosing,
					isWon: s.isWon,
				}))}
				initialLeads={leads}
			/>
		</>
	);
}
