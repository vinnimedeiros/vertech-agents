import { PersonaTab } from "@saas/agents/components/PersonaTab";

export default async function AgentPersonaPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	return <PersonaTab organizationSlug={organizationSlug} />;
}
