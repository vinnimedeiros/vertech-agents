"use client";

import { useDroppable } from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { cn } from "@ui/lib";
import {
	BuildingIcon,
	Loader2Icon,
	MailIcon,
	PhoneIcon,
	PlusIcon,
	SaveIcon,
	UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
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
	const [email, setEmail] = useState("");
	const [company, setCompany] = useState("");
	const [assignedTo, setAssignedTo] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const nameRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLDivElement>(null);

	const memberMap = new Map((members ?? []).map((m) => [m.userId, m]));

	function resetForm() {
		setCreating(false);
		setName("");
		setPhone("");
		setEmail("");
		setCompany("");
		setAssignedTo(null);
	}

	// Fecha o form ao clicar fora (como clicar em Cancelar)
	useEffect(() => {
		if (!creating) return;
		function onPointerDown(e: PointerEvent) {
			if (!formRef.current) return;
			if (formRef.current.contains(e.target as Node)) return;
			const target = e.target as HTMLElement;
			// Ignora clicks em popovers abertos (assignee picker)
			if (
				target.closest("[data-radix-popper-content-wrapper]") ||
				target.closest("[role=dialog]")
			)
				return;
			resetForm();
		}
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [creating]);

	function openForm() {
		setCreating(true);
		setTimeout(() => nameRef.current?.focus(), 10);
	}

	function handleCreate() {
		if (!name.trim()) {
			toast.error("Informe o nome do contato");
			nameRef.current?.focus();
			return;
		}
		const contactName = name.trim();
		const contactPhone = phone.trim();
		const contactEmail = email.trim();
		const contactCompany = company.trim();
		const leadAssignee = assignedTo;
		startTransition(async () => {
			try {
				const contact = await createContactAction(
					{
						organizationId,
						name: contactName,
						phone: contactPhone || null,
						email: contactEmail || null,
						company: contactCompany || null,
					},
					organizationSlug,
				);
				await createLeadAction(
					{
						organizationId,
						contactId: contact.id,
						pipelineId,
						stageId: stage.id,
						assignedTo: leadAssignee,
					},
					organizationSlug,
				);
				resetForm();
			} catch (err) {
				toast.error("Não foi possível criar o lead", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	const bgColor = alpha(stage.color, 0.1);
	const hoverBgColor = alpha(stage.color, 0.15);

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex w-72 shrink-0 flex-col gap-3 self-start rounded-xl p-3 transition-colors",
			)}
			style={{
				backgroundColor: isOver ? hoverBgColor : bgColor,
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

			{/* Cards */}
			{leads.length > 0 && (
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
			)}

			{/* Adicionar novo lead (sempre abaixo dos cards) */}
			{creating ? (
				<div
					ref={formRef}
					className="overflow-hidden rounded-lg border border-border/60 bg-card p-3 shadow-sm"
					onKeyDown={(e) => {
						if (e.key === "Escape") resetForm();
					}}
				>
					{/* Header: titulo editavel + botao salvar */}
					<div className="mb-3 flex items-center gap-2">
						<input
							ref={nameRef}
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleCreate();
								}
							}}
							placeholder="Novo lead…"
							className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-foreground/40"
							disabled={isPending}
						/>
						<button
							type="button"
							onClick={handleCreate}
							disabled={isPending || !name.trim()}
							className="flex shrink-0 cursor-pointer items-center gap-1 rounded-sm bg-zinc-700 px-2.5 py-1 text-xs text-zinc-100 transition-colors hover:bg-zinc-600 dark:bg-zinc-200 dark:text-zinc-800 dark:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isPending ? (
								<Loader2Icon className="size-3.5 animate-spin" />
							) : (
								<SaveIcon className="size-3.5" />
							)}
							Salvar
						</button>
					</div>

					{/* Campos clean (icone + input sem borda) */}
					<div className="space-y-1.5">
						<CleanField icon={PhoneIcon}>
							<span className="text-[11px] text-foreground/40">+55</span>
							<input
								type="tel"
								value={phone}
								onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleCreate();
									}
								}}
								placeholder="(00) 00000-0000"
								className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-foreground/30"
								disabled={isPending}
							/>
						</CleanField>

						<AssigneeInlinePicker
							members={members}
							value={assignedTo}
							onChange={setAssignedTo}
						/>

						<CleanField icon={BuildingIcon}>
							<input
								type="text"
								value={company}
								onChange={(e) => setCompany(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleCreate();
									}
								}}
								placeholder="Adicionar empresa"
								className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-foreground/30"
								disabled={isPending}
							/>
						</CleanField>

						<CleanField icon={MailIcon}>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleCreate();
									}
								}}
								placeholder="Adicionar email"
								className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-foreground/30"
								disabled={isPending}
							/>
						</CleanField>
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
		</div>
	);
}

// ============================================================
// Helpers do form "Novo lead"
// ============================================================

function CleanField({
	icon: Icon,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/30">
			<Icon className="size-3.5 shrink-0 text-foreground/40" />
			{children}
		</div>
	);
}

function AssigneeInlinePicker({
	members,
	value,
	onChange,
}: {
	members: KanbanMember[];
	value: string | null;
	onChange: (userId: string | null) => void;
}) {
	const [open, setOpen] = useState(false);
	const pickerRef = useRef<HTMLDivElement>(null);
	const current = value ? members.find((m) => m.userId === value) : null;

	useEffect(() => {
		if (!open) return;
		function onDown(e: PointerEvent) {
			if (!pickerRef.current) return;
			if (pickerRef.current.contains(e.target as Node)) return;
			setOpen(false);
		}
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	}, [open]);

	return (
		<div ref={pickerRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex w-full cursor-pointer items-center gap-2 rounded px-1 py-1 text-[11px] transition-colors hover:bg-muted/30"
			>
				<UserIcon className="size-3.5 shrink-0 text-foreground/40" />
				{current ? (
					<span className="flex items-center gap-1.5 text-foreground">
						<Avatar className="size-4">
							{current.image && <AvatarImage src={current.image} />}
							<AvatarFallback className="bg-violet-500 text-[9px] text-white">
								{(current.name ?? current.email ?? "?")
									.slice(0, 1)
									.toUpperCase()}
							</AvatarFallback>
						</Avatar>
						{current.name ?? current.email}
					</span>
				) : (
					<span className="text-foreground/30">Adicionar responsável</span>
				)}
			</button>

			{open && (
				<div className="absolute top-full left-0 z-10 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md">
					{members.length === 0 ? (
						<p className="px-2 py-1.5 text-[11px] text-muted-foreground">
							Nenhum membro
						</p>
					) : (
						<div className="max-h-48 overflow-y-auto">
							{members.map((m) => (
								<button
									key={m.userId}
									type="button"
									onMouseDown={(e) => {
										e.preventDefault();
										onChange(m.userId);
										setOpen(false);
									}}
									className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors hover:bg-muted"
								>
									<Avatar className="size-4">
										{m.image && <AvatarImage src={m.image} />}
										<AvatarFallback className="bg-violet-500 text-[9px] text-white">
											{(m.name ?? m.email ?? "?")
												.slice(0, 1)
												.toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<span className="flex-1 truncate">
										{m.name ?? m.email ?? "Usuário"}
									</span>
								</button>
							))}
							{value && (
								<button
									type="button"
									onMouseDown={(e) => {
										e.preventDefault();
										onChange(null);
										setOpen(false);
									}}
									className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted"
								>
									Remover responsável
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
