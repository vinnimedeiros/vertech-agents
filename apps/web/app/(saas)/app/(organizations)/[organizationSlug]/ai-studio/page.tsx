import { db, eq, team } from "@repo/database";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { Button } from "@ui/components/button";
import { SparklesIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { TeamGrid } from "@saas/ai-studio/components/TeamGrid";
import { TeamFilters } from "@saas/ai-studio/components/TeamFilters";

/**
 * Casa dos TIMES — Phase 11.1 (Área 1).
 *
 * Lista TIMES da organização ativa. Cards mostram status, identidade,
 * métricas snapshot e CTA pra abrir Construtor (Área 2).
 *
 * Master Agency vê CTA "+ Criar TIME" (V3: só TIME Comercial).
 * Agência cliente sem TIMES vê empty state guiado.
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
		<div className="flex flex-1 flex-col gap-8 p-6 lg:p-8">
			<header className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<h1 className="font-semibold text-3xl tracking-tight flex items-center gap-2">
						<SparklesIcon className="size-7 text-primary" />
						AI Studio
					</h1>
					<p className="text-muted-foreground text-sm">
						TIMES de IA configurados para a {organization.name}.
					</p>
				</div>

				<Button size="sm" disabled className="opacity-60" title="Disponível para Master Agency">
					+ Criar TIME
				</Button>
			</header>

			<TeamFilters counts={counts} currentStatus={status} basePath={`/app/${organizationSlug}/ai-studio`} />

			<TeamGrid
				teams={filteredTeams}
				organizationSlug={organizationSlug}
				isEmpty={teams.length === 0}
			/>
		</div>
	);
}
