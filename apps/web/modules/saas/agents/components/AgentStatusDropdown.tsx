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
import { ChevronDownIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
	archiveAgentAction,
	toggleAgentStatusAction,
	unarchiveAgentAction,
} from "../lib/actions";
import type { AgentStatus } from "../lib/schemas";
import { AgentStatusBadge } from "./AgentStatusBadge";

const MISSING_LABELS: Record<string, string> = {
	name: "nome",
	role: "função",
	model: "modelo",
	whatsappInstance: "instância de WhatsApp",
};

type Props = {
	agentId: string;
	status: AgentStatus;
	organizationSlug: string;
};

export function AgentStatusDropdown({
	agentId,
	status,
	organizationSlug,
}: Props) {
	const [pending, startTransition] = useTransition();
	const [archiveOpen, setArchiveOpen] = useState(false);

	const handleToggle = (to: "ACTIVE" | "PAUSED") => {
		startTransition(async () => {
			try {
				const result = await toggleAgentStatusAction(
					{ agentId, to },
					organizationSlug,
				);
				if (result && "ok" in result && result.ok === false) {
					const fields = result.missing
						.map((k) => MISSING_LABELS[k] ?? k)
						.join(", ");
					toast.error(`Preencha antes de ativar: ${fields}`);
					return;
				}
				toast.success(
					to === "ACTIVE" ? "Agente ativado." : "Agente pausado.",
				);
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível atualizar o status.");
			}
		});
	};

	const handleArchive = () => {
		setArchiveOpen(false);
		startTransition(async () => {
			try {
				await archiveAgentAction({ agentId }, organizationSlug);
				toast.success("Agente arquivado.");
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível arquivar.");
			}
		});
	};

	const handleUnarchive = () => {
		startTransition(async () => {
			try {
				await unarchiveAgentAction({ agentId }, organizationSlug);
				toast.success("Agente desarquivado.");
			} catch (err) {
				console.error(err);
				toast.error("Não foi possível desarquivar.");
			}
		});
	};

	// Quando arquivado, so oferece a acao de desarquivar
	if (status === "ARCHIVED") {
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={handleUnarchive}
				disabled={pending}
			>
				<AgentStatusBadge status="ARCHIVED" className="mr-2" />
				Desarquivar
			</Button>
		);
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						disabled={pending}
					>
						<AgentStatusBadge status={status} />
						<ChevronDownIcon className="size-3.5 opacity-60" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{status === "ACTIVE" ? (
						<DropdownMenuItem
							onSelect={() => handleToggle("PAUSED")}
						>
							Pausar
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem
							onSelect={() => handleToggle("ACTIVE")}
						>
							Ativar
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={(e) => {
							e.preventDefault();
							setArchiveOpen(true);
						}}
						className="text-red-600 focus:text-red-600"
					>
						Arquivar
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Arquivar agente?</AlertDialogTitle>
						<AlertDialogDescription>
							O agente some da lista e é desvinculado do WhatsApp.
							Você pode desarquivar depois.
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
