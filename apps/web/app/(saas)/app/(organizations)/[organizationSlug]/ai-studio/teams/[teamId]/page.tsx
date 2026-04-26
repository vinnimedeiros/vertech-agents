import { db, eq, team } from "@repo/database";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { TeamCanvas } from "@saas/ai-studio/components/TeamCanvas";
import { TeamStatusBadge } from "@saas/ai-studio/components/TeamStatusBadge";
import { Button } from "@ui/components/button";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

/**
 * Construtor do TIME — Phase 11.2 (Área 2).
 *
 * Canvas visual: Supervisor (Atendente) topo + 3 sub-agents (Analista,
 * Campanhas, Assistente) fan-out conectados via SVG dashed lines.
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
		<div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
			<header className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<Link
						href={`/app/${organizationSlug}/ai-studio`}
						className="flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
					>
						<ArrowLeftIcon className="size-4" />
					</Link>
					<div className="flex flex-col gap-0.5">
						<div className="flex items-center gap-2 text-muted-foreground text-xs">
							<Link href={`/app/${organizationSlug}/ai-studio`} className="hover:text-foreground">
								AI Studio
							</Link>
							<span>›</span>
							<span className="text-foreground">{teamRow.name}</span>
						</div>
						<h1 className="font-semibold text-2xl tracking-tight">
							{teamRow.name}
						</h1>
					</div>
					<TeamStatusBadge status={teamRow.status} />
				</div>

				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" asChild>
						<a href={inspectorHref} target="_blank" rel="noopener noreferrer">
							<ExternalLinkIcon className="size-3.5" />
							Inspetor
						</a>
					</Button>
					<Button size="sm" disabled>
						Salvar
					</Button>
				</div>
			</header>

			<TeamCanvas team={teamRow} organizationSlug={organizationSlug} />

			<aside className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/10 p-4 text-xs">
				<p className="font-medium text-foreground">
					Phase 11.2 — Construtor do TIME
				</p>
				<p className="text-muted-foreground">
					Canvas visual entregue como MVP. Próximas iterações: drag-and-drop
					entre cards, edição inline da Brand Voice, validações de Deploy.
					Click no Atendente abre Editor (Phase 11.3).
				</p>
			</aside>
		</div>
	);
}
