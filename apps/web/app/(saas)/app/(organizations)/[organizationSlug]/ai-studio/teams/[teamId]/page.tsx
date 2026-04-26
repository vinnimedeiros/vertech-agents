import { db, eq, team } from "@repo/database";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { Button } from "@ui/components/button";
import { ArrowLeftIcon, ConstructionIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TeamStatusBadge } from "@saas/ai-studio/components/TeamStatusBadge";
import { ROLE_LABELS } from "@saas/ai-studio/lib/types";

/**
 * Construtor do TIME — Phase 11.2 (Área 2).
 *
 * Placeholder em Phase 11.0/11.1: mostra info do TIME + link pra agentes
 * via UI legacy `/agents/{id}`. Canvas React Flow chega em Phase 11.2.
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
					<Button variant="outline" size="sm" disabled>
						<ExternalLinkIcon className="size-3.5" />
						Inspetor
					</Button>
					<Button size="sm" disabled>
						Salvar
					</Button>
				</div>
			</header>

			<div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border border-dashed bg-muted/10 px-6 py-16 text-center">
				<div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
					<ConstructionIcon className="size-7" />
				</div>
				<div className="flex flex-col gap-1">
					<h2 className="font-semibold text-foreground text-lg">
						Construtor visual em desenvolvimento
					</h2>
					<p className="max-w-md text-muted-foreground text-sm">
						Canvas com Líder + sub-agentes (Analista, Campanhas, Assistente)
						chega na Phase 11.2. Por enquanto, edite os agentes individualmente
						pelo modo legado.
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				<h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
					Membros do TIME ({teamRow.members.length})
				</h3>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{teamRow.members.map((m) => (
						<Link
							key={m.id}
							href={`/app/${organizationSlug}/agents/${m.agentId}`}
							className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
						>
							<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
								{ROLE_LABELS[m.role]}
							</span>
							<span className="font-semibold text-foreground text-sm">
								{m.agent.name}
							</span>
							<span className="line-clamp-2 text-muted-foreground text-xs">
								{m.bio || m.agent.description || "Sem bio"}
							</span>
							<span className="mt-2 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
								Editar (modo legado) →
							</span>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
