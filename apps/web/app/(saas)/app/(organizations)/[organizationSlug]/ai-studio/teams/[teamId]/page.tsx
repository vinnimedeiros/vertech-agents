import { db, eq, team } from "@repo/database";
import { TeamCanvas } from "@saas/ai-studio/components/TeamCanvas";
import { TeamHeader } from "@saas/ai-studio/components/TeamHeader";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { notFound, redirect } from "next/navigation";

/**
 * Construtor do TIME — Phase 11.2 (Área 2).
 *
 * Canvas visual: Supervisor (Atendente) topo + 3 sub-agents (Analista,
 * Campanhas, Assistente) fan-out conectados via curves Bezier.
 * Slots vazios mostram "Aguardando setup" até M2-03/04/05.
 *
 * Botão Inspetor (área 4) abre Mastra Studio em nova aba.
 */
export default async function TeamBuilderPage({
	params,
}: {
	params: Promise<{ organizationSlug: string; teamId: string }>;
}) {
	const { organizationSlug, teamId } = await params;

	const organization = await getActiveOrganization(organizationSlug);
	if (!organization) redirect("/app");

	const teamRow = await db.query.team.findFirst({
		where: eq(team.id, teamId),
		with: {
			members: {
				with: { agent: true },
			},
		},
	});

	if (!teamRow || teamRow.organizationId !== organization.id) {
		notFound();
	}

	const inspectorHref = `/app/${organizationSlug}/ai-studio/teams/${teamId}/inspector`;

	return (
		<div className="flex flex-1 flex-col gap-5 px-6 py-5 lg:px-8 lg:py-6">
			<TeamHeader
				team={{
					id: teamRow.id,
					name: teamRow.name,
					status: teamRow.status,
					brandVoice: teamRow.brandVoice as { name?: string } | null,
				}}
				organizationSlug={organizationSlug}
				inspectorHref={inspectorHref}
			/>

			<TeamCanvas team={teamRow} organizationSlug={organizationSlug} />
		</div>
	);
}
