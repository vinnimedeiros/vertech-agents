import { IdentityTab } from "@saas/agents/components/IdentityTab";

export default async function AgentIdentityPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	return <IdentityTab organizationSlug={organizationSlug} />;
}
