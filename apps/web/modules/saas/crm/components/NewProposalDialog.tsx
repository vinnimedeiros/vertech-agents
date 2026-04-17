"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Textarea } from "@ui/components/textarea";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { createProposalAction } from "../lib/actions";

export type ProposalLeadOption = {
	id: string;
	label: string;
};

type NewProposalDialogProps = {
	organizationId: string;
	organizationSlug: string;
	leadOptions: ProposalLeadOption[];
	trigger?: ReactNode;
};

const STATUSES = [
	{ value: "DRAFT", label: "Rascunho" },
	{ value: "SENT", label: "Enviada" },
	{ value: "ACCEPTED", label: "Aceita" },
	{ value: "REJECTED", label: "Rejeitada" },
] as const;

export function NewProposalDialog({
	organizationId,
	organizationSlug,
	leadOptions,
	trigger,
}: NewProposalDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const [title, setTitle] = useState("");
	const [text, setText] = useState("");
	const [totalValue, setTotalValue] = useState("");
	const [status, setStatus] =
		useState<(typeof STATUSES)[number]["value"]>("DRAFT");
	const [leadId, setLeadId] = useState<string>("NONE");

	function resetForm() {
		setTitle("");
		setText("");
		setTotalValue("");
		setStatus("DRAFT");
		setLeadId("NONE");
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!title.trim()) {
			toast.error("Informe o título");
			return;
		}

		const value = totalValue.trim() === "" ? null : Number(totalValue);
		if (value !== null && Number.isNaN(value)) {
			toast.error("Valor inválido");
			return;
		}

		startTransition(async () => {
			try {
				await createProposalAction(
					{
						organizationId,
						leadId: leadId === "NONE" ? null : leadId,
						title: title.trim(),
						text: text.trim() || null,
						totalValue: value,
						status,
					},
					organizationSlug,
				);
				toast.success("Proposta criada");
				resetForm();
				setOpen(false);
			} catch (err) {
				toast.error("Não foi possível criar a proposta", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button size="sm">
						<PlusIcon className="size-4" />
						Nova proposta
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Nova proposta</DialogTitle>
					<DialogDescription>
						Crie uma proposta comercial vinculada ou não a um lead.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="prop-title">Título *</Label>
						<Input
							id="prop-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Ex: Consultoria mensal"
							required
							autoFocus
						/>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-2">
							<Label htmlFor="prop-value">Valor total (R$)</Label>
							<Input
								id="prop-value"
								type="number"
								min="0"
								step="0.01"
								value={totalValue}
								onChange={(e) => setTotalValue(e.target.value)}
								placeholder="0,00"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="prop-status">Status</Label>
							<Select
								value={status}
								onValueChange={(v) =>
									setStatus(v as typeof status)
								}
							>
								<SelectTrigger id="prop-status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STATUSES.map((s) => (
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
					</div>

					<div className="space-y-2">
						<Label htmlFor="prop-lead">Lead vinculado</Label>
						<Select value={leadId} onValueChange={setLeadId}>
							<SelectTrigger id="prop-lead">
								<SelectValue placeholder="Opcional" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="NONE">Nenhum</SelectItem>
								{leadOptions.map((l) => (
									<SelectItem key={l.id} value={l.id}>
										{l.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="prop-text">Conteúdo</Label>
						<Textarea
							id="prop-text"
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Escopo, prazos, condições…"
							rows={5}
						/>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : null}
							Criar proposta
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
