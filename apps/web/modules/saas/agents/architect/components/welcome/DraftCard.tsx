import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { DraftSessionRow } from "../../lib/server";
import {
	ARCHITECT_TEMPLATES,
	findArchitectTemplate,
} from "../../lib/templates";
import { formatRelativeTime } from "../../lib/time-format";

type Props = {
	session: DraftSessionRow;
	organizationSlug: string;
};

const STAGE_LABEL: Record<string, string> = {
	ideation: "Ideação",
	planning: "Planejamento",
	knowledge: "Conhecimento",
	creation: "Criação",
};

/**
 * Card horizontal de rascunho de sessao Arquiteto (story 09.1).
 *
 * Mostra:
 * - Avatar com emoji do template
 * - Nome do agente/rascunho (draftSnapshot.agentName ou businessName ou template label)
 * - Etapa atual + tempo desde ultima atividade
 * - CTA "Continuar" (tambem clicavel na area inteira via Link)
 *
 * Link leva pra /agents/new?session={id} — a story 09.2 (chat do Arquiteto)
 * carrega a sessao pelo query param e retoma de onde parou.
 */
export function DraftCard({ session, organizationSlug }: Props) {
	const template =
		findArchitectTemplate(session.templateId) ??
		ARCHITECT_TEMPLATES[ARCHITECT_TEMPLATES.length - 1];
	if (!template) {
		return null;
	}

	const snapshot = session.draftSnapshot;
	const title =
		snapshot?.agentName ||
		snapshot?.businessName ||
		snapshot?.templateLabel ||
		template.label;
	const stage = snapshot?.currentStage
		? (STAGE_LABEL[snapshot.currentStage] ?? snapshot.currentStage)
		: "Começando";
	const relativeTime = formatRelativeTime(session.updatedAt);
	const href = `/app/${organizationSlug}/agents/new?session=${session.id}`;

	return (
		<div
			className={cn(
				"group relative flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all",
				"hover:border-primary/50 hover:shadow-md",
				"focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20",
			)}
		>
			<Link
				href={href}
				aria-label={`Continuar rascunho ${title}`}
				className="absolute inset-0 z-0 rounded-xl outline-hidden"
			/>

			<Avatar className="pointer-events-none relative z-10 size-12 shrink-0 rounded-lg">
				<AvatarFallback className="rounded-lg bg-primary/10 text-2xl">
					{template.emoji}
				</AvatarFallback>
			</Avatar>

			<div className="pointer-events-none relative z-10 min-w-0 flex-1">
				<h3 className="truncate font-semibold text-foreground text-sm">
					{title}
				</h3>
				<p className="truncate text-foreground/60 text-xs">
					Etapa {stage} · {relativeTime}
				</p>
			</div>

			<Button
				asChild
				variant="ghost"
				size="sm"
				className="relative z-20 shrink-0"
			>
				<Link href={href}>
					Continuar
					<ArrowRightIcon className="ml-1 size-4" />
				</Link>
			</Button>
		</div>
	);
}
