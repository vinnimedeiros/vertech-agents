import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { WhatsAppContactsTable } from "@saas/whatsapp-contacts/components/WhatsAppContactsTable";
import {
	getWhatsAppContactStats,
	listWhatsAppContactsForOrg,
} from "@saas/whatsapp-contacts/lib/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WhatsAppContactsPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const [org, session] = await Promise.all([
		getActiveOrganization(organizationSlug),
		getSession(),
	]);
	if (!org) return notFound();
	if (!session?.user) return notFound();

	const [contacts, stats] = await Promise.all([
		listWhatsAppContactsForOrg(org.id),
		getWhatsAppContactStats(org.id),
	]);

	return (
		<>
			<PageHeader
				title="Contatos WhatsApp"
				subtitle="Contatos da sua agenda sincronizados do WhatsApp. Promova qualquer um a lead no pipeline com um clique."
			/>
			<WhatsAppContactsTable
				organizationId={org.id}
				organizationSlug={organizationSlug}
				initialContacts={contacts}
				stats={stats}
			/>
		</>
	);
}
