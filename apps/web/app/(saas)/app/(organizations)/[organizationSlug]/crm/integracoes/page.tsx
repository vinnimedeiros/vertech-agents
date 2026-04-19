import { getActiveOrganization, getSession } from "@saas/auth/lib/server";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { WhatsAppIntegrationCard } from "@saas/whatsapp/components/WhatsAppIntegrationCard";
import { listInstancesForOrg } from "@saas/whatsapp/lib/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CrmIntegracoesPage({
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

	const instances = await listInstancesForOrg(org.id);

	return (
		<>
			<PageHeader
				title="Integrações"
				subtitle="Conecte WhatsApp, Google Calendar e outras ferramentas"
			/>
			<div className="flex flex-col gap-4">
				<WhatsAppIntegrationCard
					organizationId={org.id}
					organizationSlug={organizationSlug}
					instances={instances}
				/>
			</div>
		</>
	);
}
