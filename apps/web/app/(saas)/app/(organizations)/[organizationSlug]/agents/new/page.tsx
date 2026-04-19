import { NewAgentForm } from "@saas/agents/components/NewAgentForm";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { notFound } from "next/navigation";

export default async function NewAgentPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;

	const activeOrganization = await getActiveOrganization(organizationSlug);
	if (!activeOrganization) {
		notFound();
	}

	return (
		<>
			<PageHeader
				title="Novo agente"
				subtitle="Configure o básico — você edita os detalhes depois"
			/>
			<NewAgentForm
				organizationId={activeOrganization.id}
				organizationSlug={organizationSlug}
			/>
		</>
	);
}
