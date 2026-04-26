import { db, eq, team } from "@repo/database";
import { StudioTitle } from "@saas/ai-studio/components/StudioTitle";
import { TeamFilters } from "@saas/ai-studio/components/TeamFilters";
import { TeamGrid } from "@saas/ai-studio/components/TeamGrid";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { Button } from "@ui/components/button";
import { PlusIcon } from "lucide-react";
import { redirect } from "next/navigation";

/**
 * Casa dos TIMES — Phase 11.1 (Área 1).
 *
 * Painel floating único: header colado no topo + filtros + grid de cards.
 * Tudo num cartão único com sombra suave sobre canvas dot grid.
 */
export default async function AiStudioHomePage({
	params,
	searchParams,
}: {
	params: Promise<{ organizationSlug: string }>;
	searchParams: Promise<{ status?: string }>;
}) {
	const { organizationSlug } = await params;
	const { status } = await searchParams;

	const organization = await getActiveOrganization(organizationSlug);
	if (!organization) redirect("/app");

	const teams = await db.query.team.findMany({
		where: eq(team.organizationId, organization.id),
		with: {
			members: {
				with: { agent: true },
			},
		},
		orderBy: (t, { desc }) => desc(t.updatedAt),
	});

	const filteredTeams = status
		? teams.filter((t) => t.status === status.toUpperCase())
		: teams;

	const counts = {
		ACTIVE: teams.filter((t) => t.status === "ACTIVE").length,
		SANDBOX: teams.filter((t) => t.status === "SANDBOX").length,
		PAUSED: teams.filter((t) => t.status === "PAUSED").length,
		DRAFT: teams.filter((t) => t.status === "DRAFT").length,
	};

	return (
		<div className="flex flex-1 flex-col p-4 lg:p-6">
			{/* Painel floating unificado */}
			<section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/95 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.18),0_4px_12px_-6px_rgba(0,0,0,0.08)] backdrop-blur dark:bg-card/80 dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]">
				{/* Header colado no topo do painel */}
				<header className="flex items-center justify-between gap-4 border-border/40 border-b px-5 py-3.5">
					<div className="flex min-w-0 items-center gap-4">
						<StudioTitle />
						<span className="hidden h-4 w-px bg-border sm:block" />
						<p className="hidden text-[13px] text-muted-foreground sm:block">
							TIMES de IA configurados para a {organization.name}.
						</p>
					</div>

					<Button
						size="sm"
						variant="outline"
						disabled
						className="h-8 gap-1.5 text-[12px]"
						title="Disponível para Master Agency"
					>
						<PlusIcon className="size-3.5" />
						Criar TIME
					</Button>
				</header>

				{/* Filtros */}
				<div className="border-border/40 border-b px-5 py-2.5">
					<TeamFilters
						counts={counts}
						currentStatus={status}
						basePath={`/app/${organizationSlug}/ai-studio`}
					/>
				</div>

				{/* Grid de TIMES */}
				<div className="flex-1 overflow-y-auto p-5">
					<TeamGrid
						teams={filteredTeams}
						organizationSlug={organizationSlug}
						isEmpty={teams.length === 0}
					/>
				</div>
			</section>
		</div>
	);
}
