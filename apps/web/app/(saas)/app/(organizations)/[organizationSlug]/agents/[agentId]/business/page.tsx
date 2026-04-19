import { BusinessTab } from "@saas/agents/components/BusinessTab";

export default async function AgentBusinessPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	return <BusinessTab organizationSlug={organizationSlug} />;
}
