"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@ui/components/select";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import {
	ArrowRightIcon,
	BuildingIcon,
	CalendarIcon,
	CheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	DollarSignIcon,
	FlagIcon,
	GlobeIcon,
	Loader2Icon,
	MailIcon,
	MessageCircleIcon,
	PhoneCallIcon,
	PhoneIcon,
	SendIcon,
	SparklesIcon,
	StarIcon,
	ThermometerIcon,
	Trash2Icon,
	UserIcon,
	VideoIcon,
	XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	deleteEventAction,
	getCalendarsForOrgAction,
} from "@saas/agenda/lib/actions";
import { EventForm } from "@saas/agenda/components/EventForm";
import { ScheduledEventCard } from "@saas/agenda/components/ScheduledEventCard";
import type { CalendarRow } from "@saas/agenda/types";
import {
	deleteLeadAction,
	getLeadDetailsAction,
	logActivityAction,
	moveLeadToStageAction,
	updateContactAction,
	updateLeadAction,
} from "../lib/actions";
import type { OrgMemberOption } from "../lib/server";
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
import { CurrencyField } from "./CurrencyField";
import { InterestsPicker } from "./InterestsPicker";
import { OriginPicker } from "./OriginPicker";
import { AssigneePicker } from "./pickers/AssigneePicker";
import {
	PRIORITY_OPTIONS,
	TEMPERATURE_OPTIONS,
	type Priority,
	type Temperature,
} from "./pickers/lead-option-constants";
import { PrioritySelect } from "./pickers/PrioritySelect";
import { TemperatureSelect } from "./pickers/TemperatureSelect";

// ============================================================
// Types
// ============================================================

export type LeadModalStage = {
	id: string;
	name: string;
	color: string;
	isClosing: boolean;
	isWon: boolean;
	position: number;
	category?: string | null;
};


type LoadedLead = {
	id: string;
	organizationId: string;
	title: string | null;
	description: string | null;
	value: string | null;
	currency: string;
	temperature: Temperature;
	priority: Priority;
	origin: string | null;
	assignedTo: string | null;
	stageId: string;
	starred: boolean;
	interests: string[];
	createdAt: Date | string;
	closedAt: Date | string | null;
};

type LoadedContact = {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	company: string | null;
	photoUrl: string | null;
};

type LoadedActivity = {
	id: string;
	type: string;
	title: string;
	content: string | null;
	createdAt: Date | string;
};

type LoadedEvent = {
	id: string;
	title: string;
	startAt: Date | string;
	duration: string;
	eventKind: "event" | "meet";
	meetLink: string | null;
	conferenceId: string | null;
};

type LoadedDetails = {
	lead: LoadedLead;
	contact: LoadedContact;
	activities: LoadedActivity[];
	events: LoadedEvent[];
};

// ============================================================
// Constants
// ============================================================

type ActivityButtonMode = "navigate" | "meet" | "event" | "soon";

type ActivityButtonDef = {
	id: string;
	label: string;
	icon: typeof MessageCircleIcon;
	mode: ActivityButtonMode;
};

const ACTIVITY_BUTTONS: ActivityButtonDef[] = [
	{
		id: "whatsapp",
		label: "WhatsApp",
		icon: MessageCircleIcon,
		mode: "navigate",
	},
	{ id: "meet", label: "Reunião", icon: VideoIcon, mode: "meet" },
	{ id: "event", label: "Evento", icon: CalendarIcon, mode: "event" },
	{ id: "email", label: "E-mail", icon: MailIcon, mode: "soon" },
	{ id: "call", label: "Ligação", icon: PhoneCallIcon, mode: "soon" },
];

// ============================================================
// Helpers
// ============================================================

function formatCreatedAt(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return `Criada em ${d.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
	})}`;
}

function formatActivityDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
	});
}

// ============================================================
// LeadModal
// ============================================================

type LeadModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	leadId: string | null;
	organizationSlug: string;
	stages: LeadModalStage[];
	members: OrgMemberOption[];
	/** Lista ordenada de leadIds visíveis — usada pra navegação prev/next */
	leadIds?: string[];
	onNavigate?: (leadId: string) => void;
	/** Interesses já usados em outros leads da org (autocomplete) */
	allInterests?: string[];
};

export function LeadModal({
	open,
	onOpenChange,
	leadId,
	organizationSlug,
	stages,
	members,
	leadIds,
	onNavigate,
	allInterests = [],
}: LeadModalProps) {
	const router = useRouter();
	const [details, setDetails] = useState<LoadedDetails | null>(null);
	const [loading, setLoading] = useState(false);
	const [isSaving, startSaving] = useTransition();
	const [deleteOpen, setDeleteOpen] = useState(false);

	// Schedule dialog (Reunião / Evento) — abre EventForm com restrictKind
	const [scheduleOpen, setScheduleOpen] = useState(false);
	const [scheduleKind, setScheduleKind] = useState<"event" | "meet">("meet");
	const [calendars, setCalendars] = useState<CalendarRow[]>([]);
	const [calendarsLoading, setCalendarsLoading] = useState(false);

	// Delete event confirmation
	const [eventToDelete, setEventToDelete] = useState<LoadedEvent | null>(null);
	const [isDeletingEvent, startDeleteEvent] = useTransition();

	async function refresh(id: string) {
		const fresh = await getLeadDetailsAction(id);
		setDetails(fresh as LoadedDetails);
	}

	async function ensureCalendars(orgId: string): Promise<CalendarRow[]> {
		if (calendars.length > 0) return calendars;
		setCalendarsLoading(true);
		try {
			const cals = (await getCalendarsForOrgAction(orgId)) as CalendarRow[];
			setCalendars(cals);
			return cals;
		} finally {
			setCalendarsLoading(false);
		}
	}

	async function openScheduleDialog(kind: "event" | "meet") {
		if (!details) return;
		setScheduleKind(kind);
		const cals = await ensureCalendars(details.lead.organizationId);
		if (cals.length === 0) {
			toast.error("Nenhum calendário disponível pra esta organização");
			return;
		}
		setScheduleOpen(true);
	}

	function nextRoundedHour(): Date {
		const d = new Date();
		d.setMinutes(0, 0, 0);
		d.setHours(d.getHours() + 1);
		return d;
	}

	async function handleScheduleSaved(_result: {
		eventId: string;
		meetLink: string | null;
	}) {
		if (!details) return;
		// Refresh recarrega lead.events — card aparece automaticamente na
		// sidebar. Sem log MEETING auxiliar pra evitar duplicação visual
		// (card + entry no histórico). Histórico fica pra calls/emails reais.
		await refresh(details.lead.id);
	}

	function confirmDeleteEvent() {
		if (!eventToDelete || !details) return;
		const targetId = eventToDelete.id;
		const leadId = details.lead.id;
		startDeleteEvent(async () => {
			try {
				await deleteEventAction({ eventId: targetId }, organizationSlug);
				toast.success("Removido");
				setEventToDelete(null);
				await refresh(leadId);
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao excluir",
				);
			}
		});
	}

	useEffect(() => {
		if (!open || !leadId) {
			setDetails(null);
			return;
		}
		let canceled = false;
		setLoading(true);
		getLeadDetailsAction(leadId)
			.then((data) => {
				if (canceled) return;
				setDetails(data as LoadedDetails);
			})
			.catch((err) => {
				if (canceled) return;
				toast.error("Não foi possível carregar o lead", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			})
			.finally(() => {
				if (!canceled) setLoading(false);
			});
		return () => {
			canceled = true;
		};
	}, [open, leadId]);

	const sortedStages = [...stages].sort((a, b) => a.position - b.position);
	const currentStageIdx = details
		? sortedStages.findIndex((s) => s.id === details.lead.stageId)
		: -1;
	const nextNonClosingStage =
		currentStageIdx >= 0
			? sortedStages
					.slice(currentStageIdx + 1)
					.find((s) => !s.isClosing) ?? null
			: null;
	const wonStage = sortedStages.find((s) => s.isWon) ?? null;

	const currentIdx = leadId && leadIds ? leadIds.indexOf(leadId) : -1;
	const canPrev = currentIdx > 0;
	const canNext = currentIdx >= 0 && leadIds && currentIdx < leadIds.length - 1;

	function handleNavigate(direction: -1 | 1) {
		if (!leadIds || currentIdx < 0) return;
		const nextIdx = currentIdx + direction;
		if (nextIdx < 0 || nextIdx >= leadIds.length) return;
		onNavigate?.(leadIds[nextIdx]);
	}

	function patchLead(patch: Partial<LoadedLead>) {
		if (!details) return;
		// Optimistic update - atualiza UI imediatamente
		const previous = details;
		setDetails({
			...details,
			lead: { ...details.lead, ...patch },
		});
		startSaving(async () => {
			try {
				await updateLeadAction(
					{
						id: previous.lead.id,
						...patch,
						value:
							patch.value !== undefined
								? patch.value == null
									? null
									: Number(patch.value)
								: undefined,
					},
					organizationSlug,
				);
				await refresh(previous.lead.id);
			} catch (err) {
				// Reverte em caso de erro
				setDetails(previous);
				toast.error(
					err instanceof Error ? err.message : "Falha ao salvar",
				);
			}
		});
	}

	function patchContact(patch: Partial<LoadedContact>) {
		if (!details) return;
		const previous = details;
		setDetails({
			...details,
			contact: { ...details.contact, ...patch },
		});
		startSaving(async () => {
			try {
				await updateContactAction(
					{ id: previous.contact.id, ...patch },
					organizationSlug,
				);
				await refresh(previous.lead.id);
			} catch (err) {
				setDetails(previous);
				toast.error(
					err instanceof Error ? err.message : "Falha ao salvar",
				);
			}
		});
	}

	function handleStageChange(newStageId: string) {
		if (!details || details.lead.stageId === newStageId) return;
		startSaving(async () => {
			try {
				await moveLeadToStageAction(
					{ leadId: details.lead.id, toStageId: newStageId },
					organizationSlug,
				);
				await refresh(details.lead.id);
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao mover",
				);
			}
		});
	}

	function handleToggleStar() {
		if (!details) return;
		patchLead({ starred: !details.lead.starred });
	}

	async function confirmDelete() {
		if (!details) return;
		try {
			await deleteLeadAction(details.lead.id, organizationSlug);
			toast.success("Lead excluído");
			setDeleteOpen(false);
			onOpenChange(false);
			router.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao excluir");
		}
	}

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-[1200px] flex-col gap-0 overflow-hidden p-0"
					showCloseButton={false}
					onInteractOutside={(e) => {
						// Não fechar se o click foi em um Popover/DropdownMenu portaled (Origem, Interesse, etc)
						const target = e.target as HTMLElement | null;
						if (
							target?.closest(
								"[data-radix-popper-content-wrapper],[role='menu'],[role='listbox'],[role='dialog']:not([role='dialog'] [role='dialog'])",
							)
						) {
							e.preventDefault();
						}
					}}
				>
					<DialogTitle className="sr-only">Detalhes do Lead</DialogTitle>

					{loading || !details ? (
						<div className="flex flex-1 items-center justify-center">
							<Loader2Icon className="size-6 animate-spin text-foreground/40" />
						</div>
					) : (
						<>
							{/* Header topo */}
							<header className="flex items-center justify-between border-b px-4 py-2.5">
								<div className="flex items-center gap-0.5">
									<button
										type="button"
										onClick={() => handleNavigate(-1)}
										disabled={!canPrev}
										className={cn(
											"flex size-8 items-center justify-center rounded text-foreground/60 transition-colors",
											canPrev
												? "hover:bg-muted hover:text-foreground"
												: "opacity-40",
										)}
										aria-label="Lead anterior"
									>
										<ChevronLeftIcon className="size-4" />
									</button>
									<button
										type="button"
										onClick={() => handleNavigate(1)}
										disabled={!canNext}
										className={cn(
											"flex size-8 items-center justify-center rounded text-foreground/60 transition-colors",
											canNext
												? "hover:bg-muted hover:text-foreground"
												: "opacity-40",
										)}
										aria-label="Próximo lead"
									>
										<ChevronRightIcon className="size-4" />
									</button>
								</div>

								<div className="flex items-center gap-1 text-xs text-foreground/60">
									<span>{formatCreatedAt(details.lead.createdAt)}</span>
									<button
										type="button"
										onClick={() => setDeleteOpen(true)}
										disabled={isSaving}
										className="ml-2 flex size-8 items-center justify-center rounded text-foreground/50 hover:bg-muted hover:text-destructive"
										aria-label="Excluir lead"
									>
										<Trash2Icon className="size-4" />
									</button>
									<button
										type="button"
										onClick={handleToggleStar}
										disabled={isSaving}
										className="flex size-8 items-center justify-center rounded hover:bg-muted"
										aria-label="Favoritar"
									>
										<StarIcon
											className={cn(
												"size-4",
												details.lead.starred
													? "fill-amber-400 text-amber-400"
													: "text-foreground/50",
											)}
										/>
									</button>
									<button
										type="button"
										onClick={() => onOpenChange(false)}
										className="flex size-8 items-center justify-center rounded text-foreground/50 hover:bg-muted hover:text-foreground"
										aria-label="Fechar"
									>
										<XIcon className="size-4" />
									</button>
								</div>
							</header>

							{/* Corpo: 2 colunas */}
							<div className="flex min-h-0 flex-1">
								{/* Coluna principal */}
								<main className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
									{/* Nome editável */}
									<InlineTextField
										value={details.contact.name}
										onSave={(v) => patchContact({ name: v })}
										placeholder="Sem nome"
										className="text-2xl font-bold text-foreground"
										editClassName="h-9 text-2xl font-bold"
									/>

									{/* Grid de campos */}
									<section className="mt-6 grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
										{/* Esquerda */}
										<FieldRow icon={CalendarIcon} label="Etapa no funil">
											<div className="flex items-center gap-1.5">
												<Select
													value={details.lead.stageId}
													onValueChange={handleStageChange}
													disabled={isSaving}
												>
													<SelectTrigger
														className="h-auto w-auto gap-1.5 rounded border-0 px-2 py-0.5 font-semibold text-[11px] uppercase tracking-wider text-white hover:opacity-90 [&>svg]:opacity-70"
														style={{
															backgroundColor:
																stages.find(
																	(s) => s.id === details.lead.stageId,
																)?.color ?? "var(--color-muted)",
														}}
													>
														<span className="whitespace-nowrap">
															{stages.find(
																(s) => s.id === details.lead.stageId,
															)?.name ?? "—"}
														</span>
													</SelectTrigger>
													<SelectContent withPortal={false}>
														{sortedStages.map((s) => (
															<SelectItem key={s.id} value={s.id}>
																<span className="flex items-center gap-1.5">
																	<span
																		className="size-2 rounded-full"
																		style={{ backgroundColor: s.color }}
																	/>
																	{s.name}
																</span>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												{nextNonClosingStage && (
													<button
														type="button"
														onClick={() =>
															handleStageChange(nextNonClosingStage.id)
														}
														disabled={isSaving}
														className="flex size-7 shrink-0 items-center justify-center rounded bg-sky-500/20 text-sky-500 hover:bg-sky-500/30"
														aria-label={`Mover para ${nextNonClosingStage.name}`}
														title={`Próxima: ${nextNonClosingStage.name}`}
													>
														<ArrowRightIcon className="size-3.5" />
													</button>
												)}
												{wonStage && (
													<button
														type="button"
														onClick={() => handleStageChange(wonStage.id)}
														disabled={isSaving}
														className="flex size-7 shrink-0 items-center justify-center rounded bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
														aria-label="Marcar como ganho"
														title="Marcar como ganho"
													>
														<CheckIcon className="size-3.5" />
													</button>
												)}
											</div>
										</FieldRow>

										<FieldRow icon={UserIcon} label="Responsável">
											<AssigneePicker
												members={members}
												value={details.lead.assignedTo}
												onChange={(userId) =>
													patchLead({ assignedTo: userId })
												}
											/>
										</FieldRow>

										<FieldRow icon={PhoneIcon} label="Telefone">
											<InlineTextField
												value={details.contact.phone ?? ""}
												onSave={(v) =>
													patchContact({ phone: v || null })
												}
												placeholder="—"
												className="text-sm"
											/>
										</FieldRow>

										<FieldRow icon={FlagIcon} label="Prioridade">
											<PrioritySelect
												value={details.lead.priority}
												onChange={(p) => patchLead({ priority: p })}
											/>
										</FieldRow>

										<FieldRow icon={BuildingIcon} label="Empresa">
											<InlineTextField
												value={details.contact.company ?? ""}
												onSave={(v) =>
													patchContact({ company: v || null })
												}
												placeholder="—"
												className="text-sm"
											/>
										</FieldRow>

										<FieldRow icon={ThermometerIcon} label="Temperatura">
											<TemperatureSelect
												value={details.lead.temperature}
												onChange={(t) =>
													patchLead({ temperature: t })
												}
											/>
										</FieldRow>

										<FieldRow icon={MailIcon} label="E-mail">
											<InlineTextField
												value={details.contact.email ?? ""}
												onSave={(v) =>
													patchContact({ email: v || null })
												}
												placeholder="—"
												className="text-sm"
												type="email"
											/>
										</FieldRow>

										<FieldRow icon={GlobeIcon} label="Origem">
											<OriginPicker
												value={details.lead.origin}
												onChange={(slug) =>
													patchLead({ origin: slug })
												}
											/>
										</FieldRow>

										<FieldRow icon={DollarSignIcon} label="Valor">
											<CurrencyField
												value={details.lead.value}
												onSave={(n) =>
													patchLead({
														value: n as unknown as string | null,
													})
												}
											/>
										</FieldRow>

										<FieldRow icon={SparklesIcon} label="Interesse">
											<InterestsPicker
												value={details.lead.interests ?? []}
												onChange={(next) =>
													patchLead({ interests: next })
												}
												suggestions={allInterests}
											/>
										</FieldRow>
									</section>

									{/* Descrição */}
									<section className="mt-8">
										<h3 className="mb-2 text-sm font-semibold text-foreground">
											Descrição
										</h3>
										<Textarea
											defaultValue={details.lead.description ?? ""}
											placeholder="Adicione uma descrição para este lead…"
											rows={4}
											className="resize-none"
											onBlur={(e) => {
												const v = e.target.value.trim() || null;
												if (v !== (details.lead.description ?? null)) {
													patchLead({ description: v });
												}
											}}
										/>
									</section>

									{/* Nova atividade */}
									<section className="mt-8">
										<h3 className="mb-2 text-sm font-semibold text-foreground">
											Nova Atividade
										</h3>
										<ActivityLogger
											contactId={details.contact.id}
											contactPhone={details.contact.phone}
											organizationSlug={organizationSlug}
											onMeetClick={() => openScheduleDialog("meet")}
											onEventClick={() => openScheduleDialog("event")}
										/>
									</section>

									{/* Reuniões e eventos agendados deste lead */}
									<section className="mt-8">
										<h3 className="mb-3 text-sm font-semibold text-foreground">
											Reuniões e Eventos
										</h3>
										{details.events.length === 0 ? (
											<p className="text-xs text-muted-foreground">
												Nenhuma reunião ou evento agendado. Use os botões acima
												pra marcar.
											</p>
										) : (
											<div className="flex flex-col gap-3">
												{details.events.map((ev) => (
													<ScheduledEventCard
														key={ev.id}
														event={ev}
														recipientName={details.contact.name}
														onDelete={() => setEventToDelete(ev)}
														deleting={
															isDeletingEvent &&
															eventToDelete?.id === ev.id
														}
													/>
												))}
											</div>
										)}
									</section>
								</main>

								{/* Activity sidebar */}
								<ActivitySidebar
									activities={details.activities}
									leadId={details.lead.id}
									organizationSlug={organizationSlug}
									onLogged={() => refresh(details.lead.id)}
								/>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir lead?</AlertDialogTitle>
						<AlertDialogDescription>
							Essa ação é permanente e remove todas as atividades associadas.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								confirmDelete();
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Confirm exclusão de evento agendado */}
			<AlertDialog
				open={!!eventToDelete}
				onOpenChange={(o) => !o && setEventToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Excluir{" "}
							{eventToDelete?.eventKind === "meet"
								? "reunião"
								: "evento"}
							?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{eventToDelete?.eventKind === "meet"
								? "A videochamada Google Meet será removida do Google Calendar e da agenda. Convidados receberão notificação de cancelamento."
								: "O evento será removido da agenda e do Google Calendar (se sincronizado)."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeletingEvent}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								confirmDeleteEvent();
							}}
							disabled={isDeletingEvent}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeletingEvent ? "Excluindo..." : "Excluir"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Reunião / Evento — EventForm renderizado em paralelo ao LeadModal */}
			{details && calendars.length > 0 ? (
				<EventForm
					open={scheduleOpen}
					onOpenChange={setScheduleOpen}
					organizationSlug={organizationSlug}
					organizationId={details.lead.organizationId}
					calendars={calendars}
					leadId={details.lead.id}
					defaultDate={nextRoundedHour()}
					defaultKind={scheduleKind}
					restrictKind={scheduleKind}
					defaultTitle={
						scheduleKind === "meet"
							? `Reunião com ${details.contact.name}`
							: `Evento com ${details.contact.name}`
					}
					defaultEmails={
						details.contact.email ? [details.contact.email] : []
					}
					recipientName={details.contact.name}
					onSaved={handleScheduleSaved}
				/>
			) : null}
		</>
	);
}

// ============================================================
// Field row (icon + label à esquerda, value à direita)
// ============================================================

function FieldRow({
	icon: Icon,
	label,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-3">
			<div className="flex min-w-[140px] items-center gap-2 text-foreground/60">
				<Icon className="size-3.5" />
				<span className="text-xs">{label}</span>
			</div>
			<div className="flex-1">{children}</div>
		</div>
	);
}

// ============================================================
// Inline text field (click-to-edit)
// ============================================================

function InlineTextField({
	value,
	onSave,
	placeholder,
	className,
	editClassName,
	type = "text",
}: {
	value: string;
	onSave: (v: string) => void;
	placeholder?: string;
	className?: string;
	editClassName?: string;
	type?: "text" | "email" | "number";
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	function commit() {
		if (draft !== value) onSave(draft);
		setEditing(false);
	}

	if (editing) {
		return (
			<Input
				type={type}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						commit();
					}
					if (e.key === "Escape") {
						setDraft(value);
						setEditing(false);
					}
				}}
				autoFocus
				className={cn("h-7", editClassName)}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setEditing(true)}
			className={cn(
				"w-full rounded px-1.5 py-0.5 text-left transition-colors hover:bg-muted",
				!value && "text-foreground/40",
				className,
			)}
		>
			{value || placeholder || "—"}
		</button>
	);
}

// ============================================================
// Activity logger (6 botões + input)
// ============================================================

function ActivityLogger({
	contactId,
	contactPhone,
	organizationSlug,
	onMeetClick,
	onEventClick,
}: {
	contactId: string;
	contactPhone: string | null;
	organizationSlug: string;
	onMeetClick: () => void;
	onEventClick: () => void;
}) {
	const router = useRouter();

	const handleClick = (def: ActivityButtonDef) => {
		switch (def.mode) {
			case "navigate":
				if (!contactPhone) {
					toast.error("Lead sem telefone — adicione um número primeiro");
					return;
				}
				router.push(
					`/app/${organizationSlug}/crm/chat/new/${contactId}`,
				);
				return;
			case "meet":
				onMeetClick();
				return;
			case "event":
				onEventClick();
				return;
			case "soon":
				toast.info(`${def.label} em breve`);
				return;
		}
	};

	return (
		<div className="grid grid-cols-5 gap-2">
			{ACTIVITY_BUTTONS.map((b) => {
				const disabled = b.mode === "soon";
				return (
					<button
						key={b.id}
						type="button"
						onClick={() => handleClick(b)}
						disabled={disabled}
						title={disabled ? "Em breve" : b.label}
						className={cn(
							"relative flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-card py-3 text-xs transition-colors",
							disabled
								? "cursor-not-allowed opacity-50"
								: "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
						)}
					>
						<b.icon className="size-4" />
						<span>{b.label}</span>
						{disabled ? (
							<span className="absolute right-1.5 top-1.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] text-foreground/60">
								Em breve
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

// ============================================================
// Activity sidebar (direita)
// ============================================================

function ActivitySidebar({
	activities,
	leadId,
	organizationSlug,
	onLogged,
}: {
	activities: LoadedActivity[];
	leadId: string;
	organizationSlug: string;
	onLogged: () => void;
}) {
	const [comment, setComment] = useState("");
	const [isPending, startPending] = useTransition();

	function submit() {
		if (!comment.trim()) return;
		const text = comment.trim();
		startPending(async () => {
			try {
				await logActivityAction(
					{ leadId, type: "NOTE", title: text },
					organizationSlug,
				);
				setComment("");
				onLogged();
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Falhou");
			}
		});
	}

	return (
		<aside className="flex w-[360px] shrink-0 flex-col border-l bg-muted/20">
			<header className="border-b px-4 py-3">
				<h3 className="text-sm font-semibold">Atividades</h3>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
				{activities.length === 0 ? (
					<p className="py-8 text-center text-xs text-muted-foreground">
						Nenhuma atividade registrada ainda.
					</p>
				) : (
					<ul className="space-y-3">
						{activities.map((a) => (
							<li key={a.id} className="flex gap-2.5">
								<span
									className={cn(
										"mt-1 size-2 shrink-0 rounded-full",
										ACTIVITY_TYPE_COLOR[a.type] ?? "bg-foreground/30",
									)}
								/>
								<div className="min-w-0 flex-1">
									<p className="text-sm text-foreground">
										<span className="font-medium">
											{ACTIVITY_TYPE_VERB[a.type] ?? "Registrou"}
										</span>{" "}
										<span className="text-foreground/80">{a.title}</span>
									</p>
									{a.content && (
										<p className="mt-0.5 text-xs text-muted-foreground">
											{a.content}
										</p>
									)}
								</div>
								<span className="shrink-0 text-xs text-muted-foreground">
									{formatActivityDate(a.createdAt)}
								</span>
							</li>
						))}
					</ul>
				)}
			</div>

			<footer className="border-t bg-background/50 p-3">
				<div className="relative">
					<Textarea
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						placeholder="Escreva um comentário…"
						rows={2}
						className="resize-none pr-12 text-sm"
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
								e.preventDefault();
								submit();
							}
						}}
					/>
					<button
						type="button"
						onClick={submit}
						disabled={isPending || !comment.trim()}
						className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
						aria-label="Enviar comentário"
					>
						<SendIcon className="size-3.5" />
					</button>
				</div>
				<p className="mt-1 text-[10px] text-muted-foreground">
					Ctrl/Cmd + Enter pra enviar
				</p>
			</footer>
		</aside>
	);
}

const ACTIVITY_TYPE_COLOR: Record<string, string> = {
	CALL: "bg-blue-500",
	EMAIL: "bg-sky-500",
	MEETING: "bg-violet-500",
	TASK: "bg-amber-500",
	WHATSAPP: "bg-green-500",
	NOTE: "bg-foreground/50",
	STAGE_CHANGE: "bg-primary",
	SYSTEM: "bg-foreground/30",
	AGENT_ACTION: "bg-purple-500",
};

const ACTIVITY_TYPE_VERB: Record<string, string> = {
	CALL: "Ligação",
	EMAIL: "E-mail",
	MEETING: "Reunião",
	TASK: "Tarefa",
	WHATSAPP: "WhatsApp",
	NOTE: "Comentou",
	STAGE_CHANGE: "Moveu",
	SYSTEM: "Sistema",
	AGENT_ACTION: "Agente",
};
