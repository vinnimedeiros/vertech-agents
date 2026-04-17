import { getActiveOrganization } from "@saas/auth/lib/server";
import { NewProposalDialog } from "@saas/crm/components/NewProposalDialog";
import { ProposalsTable } from "@saas/crm/components/ProposalsTable";
import { listLeadsForOrg, listProposalsByOrg } from "@saas/crm/lib/server";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { notFound } from "next/navigation";

export default async function CrmPropostasPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const org = await getActiveOrganization(organizationSlug);
	if (!org) return notFound();

	const [proposalsRaw, leadsRaw] = await Promise.all([
		listProposalsByOrg(org.id),
		listLeadsForOrg(org.id),
	]);

	const proposals = proposalsRaw.map((p) => ({
		id: p.id,
		title: p.title,
		totalValue: p.totalValue,
		status: p.status,
		leadId: p.leadId,
		sentAt: p.sentAt,
		createdAt: p.createdAt,
		updatedAt: p.updatedAt,
		lead: p.lead?.id ? { id: p.lead.id, title: p.lead.title } : null,
		contact: p.contact?.id
			? { id: p.contact.id, name: p.contact.name }
			: null,
	}));

	const leadOptions = leadsRaw.map((l) => ({
		id: l.id,
		label: `${l.contact.name}${l.title ? ` — ${l.title}` : ""}`,
	}));

	return (
		<>
			<PageHeader
				title="Propostas"
				subtitle={`${proposals.length} ${proposals.length === 1 ? "proposta" : "propostas"} na organização`}
			>
				<NewProposalDialog
					organizationId={org.id}
					organizationSlug={organizationSlug}
					leadOptions={leadOptions}
				/>
			</PageHeader>
			<ProposalsTable
				organizationSlug={organizationSlug}
				proposals={proposals}
			/>
		</>
	);
}
