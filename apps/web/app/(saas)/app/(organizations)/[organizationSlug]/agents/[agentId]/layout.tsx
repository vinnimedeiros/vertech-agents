import { AgentArchivedBanner } from "@saas/agents/components/AgentArchivedBanner";
import { AgentDetailHeader } from "@saas/agents/components/AgentDetailHeader";
import { AgentSettingsMenu } from "@saas/agents/components/AgentSettingsMenu";
import { AgentProvider } from "@saas/agents/lib/agent-context";
import { getAgentById } from "@saas/agents/lib/server";
import { getActiveOrganization } from "@saas/auth/lib/server";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

export default async function AgentDetailLayout({
	children,
	params,
}: {
	children: ReactNode;
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

	const isArchived = agent.status === "ARCHIVED";

	return (
		<AgentProvider agent={agent}>
			{isArchived ? (
				<AgentArchivedBanner
					agentId={agent.id}
					organizationSlug={organizationSlug}
				/>
			) : null}

			<AgentDetailHeader organizationSlug={organizationSlug} />

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr] lg:gap-0">
				<aside className="lg:sticky lg:top-20 lg:self-start lg:pr-6">
					<AgentSettingsMenu
						organizationSlug={organizationSlug}
						agentId={agent.id}
					/>
				</aside>
				<section className="lg:border-border lg:border-l lg:pl-8">
					{children}
				</section>
			</div>
		</AgentProvider>
	);
}
