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
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { EyeIcon, MoreHorizontalIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
	archiveAgentAction,
	duplicateAgentAction,
	toggleAgentStatusAction,
} from "../lib/actions";
import type { AgentStatus } from "../lib/schemas";

type Props = {
	agentId: string;
	agentName: string;
	status: AgentStatus;
	organizationSlug: string;
};

export function AgentCardActions({
	agentId,
	agentName,
	status,
	organizationSlug,
}: Props) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [archiveOpen, setArchiveOpen] = useState(false);

	const detailHref = `/app/${organizationSlug}/agents/${agentId}`;

	const runAction = (label: string, action: () => Promise<unknown>) => {
		startTransition(async () => {
			try {
				await action();
				toast.success(label);
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível completar a ação.");
			}
		});
	};

	const handleDuplicate = () => {
		startTransition(async () => {
			try {
				const res = (await duplicateAgentAction(
					{ agentId },
					organizationSlug,
				)) as { agentId: string };
				toast.success("Agente duplicado.");
				router.push(`/app/${organizationSlug}/agents/${res.agentId}`);
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível duplicar o agente.");
			}
		});
	};

	const handleToggle = (to: "ACTIVE" | "PAUSED") => {
		startTransition(async () => {
			try {
				const result = await toggleAgentStatusAction(
					{ agentId, to },
					organizationSlug,
				);
				if (result && "ok" in result && result.ok === false) {
					toast.error(
						`Configure antes de ativar: ${result.missing.join(", ")}`,
					);
					return;
				}
				toast.success(to === "ACTIVE" ? "Agente ativado." : "Agente pausado.");
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível atualizar o status.");
			}
		});
	};

	const handleArchive = () => {
		setArchiveOpen(false);
		runAction("Agente arquivado.", () =>
			archiveAgentAction({ agentId }, organizationSlug),
		);
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						disabled={pending}
						aria-label={`Ações do agente ${agentName}`}
						onClick={(e) => e.stopPropagation()}
					>
						<MoreHorizontalIcon className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					onClick={(e) => e.stopPropagation()}
				>
					<DropdownMenuItem asChild>
						<Link href={detailHref}>
							<EyeIcon className="mr-2 size-4" />
							Ver detalhe
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={handleDuplicate}>
						Duplicar
					</DropdownMenuItem>
					{status === "ACTIVE" ? (
						<DropdownMenuItem onSelect={() => handleToggle("PAUSED")}>
							Pausar
						</DropdownMenuItem>
					) : status === "DRAFT" || status === "PAUSED" ? (
						<DropdownMenuItem onSelect={() => handleToggle("ACTIVE")}>
							Ativar
						</DropdownMenuItem>
					) : null}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							setArchiveOpen(true);
						}}
						className="text-red-600 focus:text-red-600"
					>
						<TrashIcon className="mr-2 size-4" />
						Arquivar
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
				<AlertDialogContent onClick={(e) => e.stopPropagation()}>
					<AlertDialogHeader>
						<AlertDialogTitle>Arquivar agente?</AlertDialogTitle>
						<AlertDialogDescription>
							O agente some da lista e é desvinculado do WhatsApp. Você pode
							desarquivar depois pela tela de detalhe.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleArchive}
							className="bg-red-600 text-white hover:bg-red-700"
						>
							Arquivar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
