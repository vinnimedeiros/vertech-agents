"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteProposalAction, updateProposalAction } from "../lib/actions";

type ProposalRow = {
	id: string;
	title: string;
	totalValue: string | null;
	status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
	leadId: string | null;
	sentAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	lead: { id: string; title: string | null } | null;
	contact: { id: string; name: string } | null;
};

type ProposalsTableProps = {
	organizationSlug: string;
	proposals: ProposalRow[];
};

const STATUS_OPTIONS = [
	{ value: "DRAFT", label: "Rascunho" },
	{ value: "SENT", label: "Enviada" },
	{ value: "ACCEPTED", label: "Aceita" },
	{ value: "REJECTED", label: "Rejeitada" },
] as const;

const STATUS_BADGE: Record<
	ProposalRow["status"],
	"info" | "success" | "warning" | "error"
> = {
	DRAFT: "info",
	SENT: "warning",
	ACCEPTED: "success",
	REJECTED: "error",
};

function formatCurrency(value: string | null): string {
	if (!value) return "—";
	const num = Number(value);
	if (Number.isNaN(num)) return "—";
	try {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
			maximumFractionDigits: 0,
		}).format(num);
	} catch {
		return `R$ ${num}`;
	}
}

function formatDate(date: Date | string | null) {
	if (!date) return "—";
	const d = date instanceof Date ? date : new Date(date);
	return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function ProposalsTable({
	organizationSlug,
	proposals,
}: ProposalsTableProps) {
	const [isPending, startTransition] = useTransition();

	function handleStatusChange(id: string, next: ProposalRow["status"]) {
		startTransition(async () => {
			try {
				await updateProposalAction(
					{ id, status: next },
					organizationSlug,
				);
				toast.success("Status atualizado");
			} catch (err) {
				toast.error("Não foi possível atualizar", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	function handleDelete(id: string) {
		if (!confirm("Excluir esta proposta?")) return;
		startTransition(async () => {
			try {
				await deleteProposalAction(id, organizationSlug);
				toast.success("Proposta excluída");
			} catch (err) {
				toast.error("Não foi possível excluir", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Título</TableHead>
						<TableHead>Lead</TableHead>
						<TableHead className="text-right">Valor</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Atualizado</TableHead>
						<TableHead className="w-[60px]" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{proposals.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={6}
								className="text-center text-foreground/40 text-sm"
							>
								Nenhuma proposta ainda.
							</TableCell>
						</TableRow>
					) : (
						proposals.map((p) => (
							<TableRow key={p.id}>
								<TableCell className="font-medium">
									{p.title}
								</TableCell>
								<TableCell>
									{p.contact?.name ?? p.lead?.title ?? "—"}
								</TableCell>
								<TableCell className="text-right font-medium tabular-nums">
									{formatCurrency(p.totalValue)}
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-2">
										<Badge status={STATUS_BADGE[p.status]}>
											{
												STATUS_OPTIONS.find(
													(s) => s.value === p.status,
												)?.label
											}
										</Badge>
										<Select
											value={p.status}
											onValueChange={(v) =>
												handleStatusChange(
													p.id,
													v as ProposalRow["status"],
												)
											}
										>
											<SelectTrigger className="h-7 w-32 text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{STATUS_OPTIONS.map((s) => (
													<SelectItem
														key={s.value}
														value={s.value}
													>
														{s.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</TableCell>
								<TableCell className="text-foreground/60 text-xs">
									{formatDate(p.updatedAt)}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleDelete(p.id)}
										disabled={isPending}
										aria-label="Excluir proposta"
									>
										<Trash2Icon className="size-4" />
									</Button>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
