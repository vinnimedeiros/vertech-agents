"use client";

import { useDroppable } from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	createContactAction,
	createLeadAction,
} from "../lib/actions";
import { LeadCard } from "./LeadCard";
import type { KanbanLead, KanbanStage } from "./PipelineKanban";

type KanbanColumnProps = {
	stage: KanbanStage;
	leads: KanbanLead[];
	onCardOpen?: (leadId: string) => void;
	organizationId: string;
	organizationSlug: string;
	pipelineId: string;
};

function formatPhoneBR(value: string): string {
	const digits = value.replace(/\D/g, "").slice(0, 11);
	if (digits.length <= 2) return digits;
	if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
	if (digits.length <= 10)
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function KanbanColumn({
	stage,
	leads,
	onCardOpen,
	organizationId,
	organizationSlug,
	pipelineId,
}: KanbanColumnProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: stage.id,
		data: { type: "column", stageId: stage.id },
	});

	const [creating, setCreating] = useState(false);
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [isPending, startTransition] = useTransition();
	const nameRef = useRef<HTMLInputElement>(null);

	function openForm() {
		setCreating(true);
		setTimeout(() => nameRef.current?.focus(), 10);
	}

	function closeForm() {
		setCreating(false);
		setName("");
		setPhone("");
	}

	function handleCreate() {
		if (!name.trim()) {
			toast.error("Informe o nome do contato");
			return;
		}
		const contactName = name.trim();
		const contactPhone = phone.trim();
		startTransition(async () => {
			try {
				const contact = await createContactAction(
					{
						organizationId,
						name: contactName,
						phone: contactPhone || null,
					},
					organizationSlug,
				);
				await createLeadAction(
					{
						organizationId,
						contactId: contact.id,
						pipelineId,
						stageId: stage.id,
					},
					organizationSlug,
				);
				setName("");
				setPhone("");
				// mantém o form aberto pra cadastro rápido em sequência
				nameRef.current?.focus();
			} catch (err) {
				toast.error("Não foi possível criar o lead", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	return (
		<div className="flex w-72 shrink-0 flex-col gap-2">
			<div className="flex items-center justify-between px-1">
				<div className="flex items-center gap-2">
					<span
						className="size-2 rounded-full"
						style={{ backgroundColor: stage.color }}
					/>
					<h3 className="font-semibold text-foreground/80 text-sm uppercase tracking-wide">
						{stage.name}
					</h3>
				</div>
				<span className="rounded-full bg-muted px-2 py-0.5 text-foreground/60 text-xs tabular-nums">
					{leads.length}
				</span>
			</div>

			<div
				ref={setNodeRef}
				className={cn(
					"flex min-h-[400px] flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
					isOver
						? "border-primary/50 bg-primary/5"
						: "border-transparent bg-muted/30",
				)}
			>
				{creating ? (
					<div className="flex flex-col gap-1.5 rounded-md border border-border/60 bg-card p-2 shadow-sm">
						<Input
							ref={nameRef}
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleCreate();
								}
								if (e.key === "Escape") closeForm();
							}}
							placeholder="Nome do contato"
							className="h-7 text-xs"
							disabled={isPending}
						/>
						<Input
							value={phone}
							onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleCreate();
								}
								if (e.key === "Escape") closeForm();
							}}
							placeholder="Telefone (opcional)"
							className="h-7 text-xs"
							inputMode="tel"
							disabled={isPending}
						/>
						<div className="flex items-center justify-between gap-1 pt-0.5">
							<button
								type="button"
								onClick={closeForm}
								disabled={isPending}
								className="rounded px-1.5 py-0.5 text-[11px] text-foreground/60 hover:bg-muted hover:text-foreground"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={handleCreate}
								disabled={isPending || !name.trim()}
								className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
							>
								{isPending ? (
									<Loader2Icon className="size-3 animate-spin" />
								) : null}
								Adicionar
							</button>
						</div>
					</div>
				) : (
					<button
						type="button"
						onClick={openForm}
						className={cn(
							"flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-foreground/50 transition-colors",
							"hover:bg-muted hover:text-foreground",
						)}
					>
						<PlusIcon className="size-3" />
						Novo lead
					</button>
				)}

				<SortableContext
					items={leads.map((l) => l.id)}
					strategy={verticalListSortingStrategy}
				>
					{leads.map((lead) => (
						<LeadCard
							key={lead.id}
							lead={lead}
							onOpen={onCardOpen ? () => onCardOpen(lead.id) : undefined}
						/>
					))}
				</SortableContext>
			</div>
		</div>
	);
}
