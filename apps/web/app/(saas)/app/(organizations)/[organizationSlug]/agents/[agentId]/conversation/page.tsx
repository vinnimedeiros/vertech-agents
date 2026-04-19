import { ConversationTab } from "@saas/agents/components/ConversationTab";

export default async function AgentConversationPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	return <ConversationTab organizationSlug={organizationSlug} />;
}
