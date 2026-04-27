import { agent, db, eq, team } from "@repo/database";
import { AgentEditorShell } from "@saas/ai-studio/components/AgentEditorShell";
import { StudioCanvas } from "@saas/ai-studio/components/StudioCanvas";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { notFound, redirect } from "next/navigation";

/**
 * Editor do Agente — Phase 11.3 (Área 3).
 *
 * Layout 3 colunas: nav etapas | canvas central (persona + seção ativa) |
 * properties panel direita (accordions).
 *
 * Bottom split: chat colaborador (Phase 11.3.2) + logs ao vivo (Phase 11.3.3).
 *
 * MVP atual: nav navegável (state local), persona card visual, properties
 * read-only no painel direito. Editores por seção e wire de chat/logs em
 * próximas iterações.
 */
export default async function AgentEditorPage({
	params,
}: {
	params: Promise<{
		organizationSlug: string;
		teamId: string;
		agentId: string;
	}>;
}) {
	const { organizationSlug, teamId, agentId } = await params;

	const organization = await getActiveOrganization(organizationSlug);
	if (!organization) redirect("/app");

	const teamRow = await db.query.team.findFirst({
		where: eq(team.id, teamId),
	});
	if (!teamRow || teamRow.organizationId !== organization.id) {
		notFound();
	}

	const agentRow = await db.query.agent.findFirst({
		where: eq(agent.id, agentId),
	});
	if (!agentRow || agentRow.organizationId !== organization.id) {
		notFound();
	}

	return (
		<StudioCanvas>
			<AgentEditorShell
				agent={{
					id: agentRow.id,
					name: agentRow.name,
					role: agentRow.role,
					description: agentRow.description,
					model: agentRow.model,
					temperature: agentRow.temperature,
					maxSteps: agentRow.maxSteps,
					enabledTools: agentRow.enabledTools,
					knowledgeDocIds: agentRow.knowledgeDocIds,
					gender: agentRow.gender,
				}}
				teamName={teamRow.name}
				organizationSlug={organizationSlug}
				teamId={teamId}
			/>
		</StudioCanvas>
	);
}
