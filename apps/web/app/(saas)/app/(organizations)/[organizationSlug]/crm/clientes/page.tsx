import { getActiveOrganization } from "@saas/auth/lib/server";
import { LeadsTable } from "@saas/crm/components/LeadsTable";
import {
	getDefaultPipelineWithStages,
	listLeadsForOrg,
} from "@saas/crm/lib/server";
import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { UserCheckIcon } from "lucide-react";
import { notFound } from "next/navigation";

export default async function CrmClientesPage({
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
					title="Clientes"
					subtitle="Leads convertidos em clientes ativos"
				/>
				<ComingSoon
					icon={UserCheckIcon}
					title="Pipeline não configurado"
					description="Este workspace ainda não tem um pipeline padrão."
				/>
			</>
		);
	}

	const leadsRaw = await listLeadsForOrg(org.id);
	const wonLeads = leadsRaw
		.filter((l) => l.stage.isWon)
		.map((l) => ({
			id: l.id,
			title: l.title,
			value: l.value,
			currency: l.currency,
			temperature: l.temperature,
			priority: l.priority,
			stageId: l.stageId,
			updatedAt: l.updatedAt,
			createdAt: l.createdAt,
			closedAt: l.closedAt,
			contact: l.contact,
			stage: l.stage,
		}));

	const stages = pipelineData.stages.map((s) => ({
		id: s.id,
		name: s.name,
		color: s.color,
		isClosing: s.isClosing,
		isWon: s.isWon,
	}));

	return (
		<>
			<PageHeader
				title="Clientes"
				subtitle={`${wonLeads.length} ${wonLeads.length === 1 ? "cliente fechado" : "clientes fechados"}`}
			/>
			<LeadsTable
				organizationSlug={organizationSlug}
				leads={wonLeads}
				stages={stages}
				hideStageFilter
				emptyMessage="Nenhum cliente fechado ainda. Mova um lead para um estágio de ganho no Kanban."
			/>
		</>
	);
}
