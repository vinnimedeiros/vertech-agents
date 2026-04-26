import { db, eq, team } from "@repo/database";
import { TeamFilters } from "@saas/ai-studio/components/TeamFilters";
import { TeamGrid } from "@saas/ai-studio/components/TeamGrid";
import { StudioTitle } from "@saas/ai-studio/components/StudioTitle";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { Button } from "@ui/components/button";
import { PlusIcon } from "lucide-react";
import { redirect } from "next/navigation";

/**
 * Casa dos TIMES — Phase 11.1 (Área 1).
 *
 * Header compacto pra liberar espaço útil acima da fold. Cards premium
 * com glow tint por status, sombras profundas, sem bordas. Mesmo padrão
 * visual do canvas do TIME builder.
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
		<div className="flex flex-1 flex-col gap-5 px-6 py-5 lg:px-8 lg:py-6">
			{/* Header compacto: título small + descrição inline + botão direita */}
			<header className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					<StudioTitle />
					<span className="hidden h-4 w-px bg-zinc-800 sm:block" />
					<p className="hidden text-[13px] text-zinc-500 sm:block">
						TIMES de IA configurados para a {organization.name}.
					</p>
				</div>

				<Button
					size="sm"
					variant="outline"
					disabled
					className="h-8 gap-1.5 border-zinc-800 bg-zinc-900 text-[12px] text-zinc-400 hover:bg-zinc-800/60"
					title="Disponível para Master Agency"
				>
					<PlusIcon className="size-3.5" />
					Criar TIME
				</Button>
			</header>

			<TeamFilters
				counts={counts}
				currentStatus={status}
				basePath={`/app/${organizationSlug}/ai-studio`}
			/>

			<TeamGrid
				teams={filteredTeams}
				organizationSlug={organizationSlug}
				isEmpty={teams.length === 0}
			/>
		</div>
	);
}
