import { db, eq, team } from "@repo/database";
import { TeamCanvas } from "@saas/ai-studio/components/TeamCanvas";
import { TeamHeader } from "@saas/ai-studio/components/TeamHeader";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { notFound, redirect } from "next/navigation";

/**
 * Construtor do TIME — Phase 11.2 (Área 2).
 *
 * Painel floating único: TeamHeader colado no topo + canvas de TIME embaixo.
 * Tudo num cartão com sombra suave sobre canvas dot grid do layout.
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
		<div className="flex flex-1 flex-col p-4 lg:p-6">
			<section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/95 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.18),0_4px_12px_-6px_rgba(0,0,0,0.08)] backdrop-blur dark:bg-card/80 dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]">
				<div className="border-border/40 border-b px-5 py-3.5">
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
				</div>

				<div className="flex-1 overflow-y-auto p-5">
					<TeamCanvas team={teamRow} organizationSlug={organizationSlug} />
				</div>
			</section>
		</div>
	);
}
