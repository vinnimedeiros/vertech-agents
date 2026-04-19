import { WhatsAppTab } from "@saas/agents/components/WhatsAppTab";
import { getAgentById } from "@saas/agents/lib/server";
import {
	getAvailableWhatsAppInstances,
	getWhatsAppInstanceById,
} from "@saas/agents/lib/whatsapp-server";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { notFound } from "next/navigation";

export default async function AgentWhatsAppPage({
	params,
}: {
	params: Promise<{ organizationSlug: string; agentId: string }>;
}) {
	const { organizationSlug, agentId } = await params;

	const activeOrganization = await getActiveOrganization(organizationSlug);
	if (!activeOrganization) {
		notFound();
	}

	const agent = await getAgentById(agentId);
	if (!agent || agent.organizationId !== activeOrganization.id) {
		notFound();
	}

	const [availableInstances, currentInstance] = await Promise.all([
		getAvailableWhatsAppInstances(activeOrganization.id, agent.id),
		agent.whatsappInstanceId
			? getWhatsAppInstanceById(
					activeOrganization.id,
					agent.whatsappInstanceId,
				)
			: Promise.resolve(null),
	]);

	return (
		<WhatsAppTab
			organizationSlug={organizationSlug}
			availableInstances={availableInstances}
			currentInstance={currentInstance}
		/>
	);
}
