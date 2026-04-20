"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { ArrowRightIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
 * Card horizontal de rascunho de sessão Arquiteto (story 09.1 + 09.10).
 *
 * Mostra:
 * - Avatar com emoji do template
 * - Nome do agente/rascunho
 * - Etapa atual + tempo desde última atividade
 * - CTA "Continuar" (area clicável via Link)
 * - Botão excluir (AlertDialog de confirmação) — 09.10
 */
export function DraftCard({ session, organizationSlug }: Props) {
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

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

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const res = await fetch(`/api/architect/sessions/${session.id}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				throw new Error(
					payload?.message ?? "Falha ao excluir rascunho.",
				);
			}
			toast.success("Rascunho excluído.");
			setDialogOpen(false);
			router.refresh();
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Erro ao excluir rascunho.",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
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

				<div className="relative z-20 flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Excluir rascunho ${title}`}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setDialogOpen(true);
						}}
						className="text-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
					>
						<Trash2Icon className="size-4" />
					</Button>
					<Button asChild variant="ghost" size="sm">
						<Link href={href}>
							Continuar
							<ArrowRightIcon className="ml-1 size-4" />
						</Link>
					</Button>
				</div>
			</div>

			<AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir este rascunho?</AlertDialogTitle>
						<AlertDialogDescription>
							A conversa e os artefatos deste rascunho serão
							removidos. Essa ação não pode ser desfeita.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								void handleDelete();
							}}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? (
								<>
									<Loader2Icon className="mr-1.5 size-4 animate-spin" />
									Excluindo...
								</>
							) : (
								"Excluir rascunho"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
