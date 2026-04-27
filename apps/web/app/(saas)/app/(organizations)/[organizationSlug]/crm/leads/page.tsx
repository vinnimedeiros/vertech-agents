import { getActiveOrganization } from "@saas/auth/lib/server";
import { LeadsTable } from "@saas/crm/components/LeadsTable";
import { NewLeadDialog } from "@saas/crm/components/NewLeadDialog";
import {
	getDefaultPipelineWithStages,
	listLeadsForOrg,
	listOrgMembers,
} from "@saas/crm/lib/server";
import { ComingSoon } from "@saas/shared/components/ComingSoon";
import { UsersIcon } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CrmLeadsPage({
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
			<div className="flex h-full flex-col gap-3 overflow-hidden">
				<ComingSoon
					icon={UsersIcon}
					title="Pipeline não configurado"
					description="Este workspace ainda não tem um pipeline padrão."
				/>
			</div>
		);
	}

	const [leadsRaw, members] = await Promise.all([
		listLeadsForOrg(org.id),
		listOrgMembers(org.id),
	]);

	// Aba Leads = só leads em prospecção (não-fechados). Won → /crm/clientes
	const inProspect = leadsRaw
		.filter((l) => !l.stage.isWon)
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
		position: s.position,
	}));

	return (
		<LeadsTable
			organizationSlug={organizationSlug}
			leads={inProspect}
			stages={stages}
			members={members}
			headerActions={
				<NewLeadDialog
					organizationId={org.id}
					organizationSlug={organizationSlug}
					pipelineId={pipelineData.id}
					stages={pipelineData.stages.map((s) => ({
						id: s.id,
						name: s.name,
						isClosing: s.isClosing,
						position: s.position,
					}))}
				/>
			}
		/>
	);
}
