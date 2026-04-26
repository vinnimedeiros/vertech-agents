import { db, eq, team } from "@repo/database";
import { StudioCanvas } from "@saas/ai-studio/components/StudioCanvas";
import { TeamCanvas } from "@saas/ai-studio/components/TeamCanvas";
import { TeamHeader } from "@saas/ai-studio/components/TeamHeader";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { cn } from "@ui/lib";
import { notFound, redirect } from "next/navigation";

/**
 * Construtor do TIME — Phase 11.2 (Área 2).
 *
 * Canvas full-bleed (StudioCanvas com dot grid). Header floating no topo
 * + content flow embaixo. Sem painel duplicado — main do AppShell já cedeu
 * espaço via FULL_BLEED_ROUTES.
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
	const floatingPanel = cn(
		"rounded-2xl border border-border/40 bg-card/95 backdrop-blur",
		"shadow-[0_10px_40px_-20px_rgba(0,0,0,0.18),0_4px_12px_-6px_rgba(0,0,0,0.08)]",
		"dark:bg-card/80 dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]",
	);

	return (
		<StudioCanvas>
			<div className="flex h-full min-h-0 flex-col gap-3 p-3">
				{/* Header floating */}
				<header className={cn(floatingPanel, "shrink-0 px-4 py-2")}>
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
				</header>

				{/* TIME canvas — React Flow direto sobre canvas dots, SEM panel */}
				<div className="min-h-0 flex-1 overflow-hidden">
					<TeamCanvas team={teamRow} organizationSlug={organizationSlug} />
				</div>
			</div>
		</StudioCanvas>
	);
}
