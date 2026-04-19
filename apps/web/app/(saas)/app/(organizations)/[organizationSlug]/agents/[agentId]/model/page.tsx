import { ModelTab } from "@saas/agents/components/ModelTab";

export default async function AgentModelPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	return <ModelTab organizationSlug={organizationSlug} />;
}
