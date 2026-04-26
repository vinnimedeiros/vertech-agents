"use client";

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { ArrowLeftIcon, ExternalLinkIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { TeamStatusBadge } from "./TeamStatusBadge";

type TeamLike = {
	id: string;
	name: string;
	status: "DRAFT" | "ACTIVE" | "SANDBOX" | "PAUSED" | "ARCHIVED";
	brandVoice: { name?: string } | null;
};

type Props = {
	team: TeamLike;
	organizationSlug: string;
	inspectorHref: string;
};

/**
 * Header compacto do Construtor do TIME — Phase 11.2.
 *
 * Mantém padrão premium da Casa: linha única (back + breadcrumb + nome + status),
 * actions à direita (Inspetor/Salvar). Sem títulos exagerados.
 */
export function TeamHeader({ team, organizationSlug, inspectorHref }: Props) {
	const brandName = team.brandVoice?.name;

	return (
		<header className="flex items-center justify-between gap-4">
			<div className="flex min-w-0 items-center gap-3">
				<Link
					href={`/app/${organizationSlug}/ai-studio`}
					className={cn(
						"flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500",
						"transition-colors hover:bg-zinc-900 hover:text-zinc-200",
					)}
				>
					<ArrowLeftIcon className="size-3.5" />
				</Link>

				<nav className="flex items-baseline gap-1.5 text-[12px] text-zinc-500">
					<Link
						href={`/app/${organizationSlug}/ai-studio`}
						className="transition-colors hover:text-zinc-300"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						AI Studio
					</Link>
					<span className="text-zinc-700">/</span>
					<span
						className="font-medium text-[15px] text-zinc-100 leading-none tracking-tight"
						style={{ fontFamily: "var(--font-satoshi)" }}
					>
						{team.name}
					</span>
					{brandName ? (
						<span className="text-[12px] text-zinc-500">— {brandName}</span>
					) : null}
				</nav>

				<TeamStatusBadge status={team.status} />
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					className="h-8 gap-1.5 border-zinc-800 bg-zinc-900 text-[12px] text-zinc-300 hover:bg-zinc-800/60"
				>
					<PencilIcon className="size-3.5" />
					Editar
				</Button>
				<Button
					variant="outline"
					size="sm"
					asChild
					className="h-8 gap-1.5 border-zinc-800 bg-zinc-900 text-[12px] text-zinc-300 hover:bg-zinc-800/60"
				>
					<a href={inspectorHref} target="_blank" rel="noopener noreferrer">
						<ExternalLinkIcon className="size-3.5" />
						Inspetor
					</a>
				</Button>
				<Button
					size="sm"
					disabled
					className="h-8 bg-zinc-100 text-[12px] text-zinc-900 hover:bg-zinc-200"
				>
					Salvar
				</Button>
			</div>
		</header>
	);
}
