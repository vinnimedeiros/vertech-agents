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
import type {
	KanbanLead,
	KanbanMember,
	KanbanStage,
} from "./PipelineKanban";

type KanbanColumnProps = {
	stage: KanbanStage;
	leads: KanbanLead[];
	onCardOpen?: (leadId: string) => void;
	organizationId: string;
	organizationSlug: string;
	pipelineId: string;
	members: KanbanMember[];
};

function formatPhoneBR(value: string): string {
	const digits = value.replace(/\D/g, "").slice(0, 11);
	if (digits.length <= 2) return digits;
	if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
	if (digits.length <= 10)
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
	return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Aplica opacity hex a uma cor. Funciona com #RRGGBB; qualquer outro formato retorna como está.
 * @param opacity 0 a 1
 */
function alpha(color: string, opacity: number): string {
	if (!color.startsWith("#") || color.length !== 7) return color;
	const a = Math.round(opacity * 255)
		.toString(16)
		.padStart(2, "0");
	return `${color}${a}`;
}

function computeDaysInStage(
	lead: KanbanLead,
	stageId: string,
): number {
	const stageDate = lead.stageDates?.[stageId];
	const entered = stageDate ? new Date(stageDate) : new Date(lead.createdAt);
	return Math.max(
		0,
		Math.floor((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24)),
	);
}

export function KanbanColumn({
	stage,
	leads,
	onCardOpen,
	organizationId,
	organizationSlug,
	pipelineId,
	members,
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

	const memberMap = new Map(members.map((m) => [m.userId, m]));

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
				nameRef.current?.focus();
			} catch (err) {
				toast.error("Não foi possível criar o lead", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	const bgColor = alpha(stage.color, 0.1);
	const borderColor = alpha(stage.color, 0.25);
	const hoverBgColor = alpha(stage.color, 0.15);

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex w-72 shrink-0 flex-col gap-3 rounded-xl border p-3 transition-colors",
			)}
			style={{
				backgroundColor: isOver ? hoverBgColor : bgColor,
				borderColor: borderColor,
			}}
		>
			{/* Header: bolinha + badge + count */}
			<header className="flex items-center gap-2">
				<span
					className="size-2.5 shrink-0 rounded-full"
					style={{ backgroundColor: stage.color }}
				/>
				<span
					className="rounded px-2 py-0.5 font-semibold text-[11px] uppercase tracking-wider text-white"
					style={{ backgroundColor: stage.color }}
				>
					{stage.name}
				</span>
				<span className="text-foreground/50 text-sm tabular-nums">
					{leads.length}
				</span>
			</header>

			{/* Adicionar novo lead (link com cor da etapa) */}
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
					className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-background/40"
					style={{ color: stage.color }}
				>
					<PlusIcon className="size-4" />
					Adicionar novo lead
				</button>
			)}

			{/* Cards */}
			<SortableContext
				items={leads.map((l) => l.id)}
				strategy={verticalListSortingStrategy}
			>
				<div className="flex flex-col gap-2">
					{leads.map((lead) => {
						const days = computeDaysInStage(lead, stage.id);
						const isStagnant =
							stage.maxDays != null &&
							stage.maxDays > 0 &&
							days > stage.maxDays;
						const responsible = lead.assignedTo
							? memberMap.get(lead.assignedTo)
							: null;
						return (
							<LeadCard
								key={lead.id}
								lead={lead}
								stageColor={stage.color}
								onOpen={onCardOpen ? () => onCardOpen(lead.id) : undefined}
								daysInStage={days}
								isStagnant={isStagnant}
								responsibleName={
									responsible?.name ?? responsible?.email ?? null
								}
								responsibleImage={responsible?.image ?? null}
							/>
						);
					})}
				</div>
			</SortableContext>
		</div>
	);
}
