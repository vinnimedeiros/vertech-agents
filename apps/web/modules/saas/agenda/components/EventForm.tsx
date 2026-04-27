"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
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
import { cn } from "@ui/lib";
import { format } from "date-fns";
import {
	CalendarIcon,
	Clock,
	Loader2Icon,
	Plus,
	Search,
	Users,
	VideoIcon,
	X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	createEventAction,
	deleteEventAction,
	updateEventAction,
} from "../lib/actions";
import {
	ScheduledEventCard,
	type ScheduledEventLike,
} from "./ScheduledEventCard";
import {
	type CalendarEventRow,
	type CalendarRow,
	DURATION_OPTIONS,
	EVENT_TYPE_META,
	TIME_SLOTS,
	type EventTypeKey,
} from "../types";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organizationSlug: string;
	organizationId: string;
	calendars: CalendarRow[];
	event?: CalendarEventRow | null;
	defaultDate?: Date;
	/** Pré-seleciona o tipo (event/meet). Default `event`. LeadModal usa `meet`. */
	defaultKind?: "event" | "meet";
	/**
	 * Restringe o salvamento a um tipo único — esconde o botão alternativo.
	 * Útil quando shortcuts (botão Reunião / Evento do LeadModal) já decidiram
	 * o tipo. Sem `restrictKind`, ambos botões aparecem (uso da agenda).
	 */
	restrictKind?: "event" | "meet";
	/** Pré-preenche título (ex: "Reunião com {leadName}"). */
	defaultTitle?: string;
	/** Pré-preenche emails dos convidados (ex: email do lead). */
	defaultEmails?: string[];
	/** Nome do destinatário pra header do bloco "Copiar" Meet. */
	recipientName?: string | null;
	/** Callback após salvar com sucesso. Recebe `{ eventId, meetLink? }`. */
	onSaved?: (result: { eventId: string; meetLink: string | null }) => void;
	/** Vincula evento a lead do CRM (mostra na sidebar do LeadModal). */
	leadId?: string | null;
};

const toTimeString = (date: Date) => format(date, "HH:mm");

export function EventForm({
	open,
	onOpenChange,
	organizationSlug,
	organizationId,
	calendars,
	event,
	defaultDate,
	defaultKind,
	restrictKind,
	defaultTitle,
	defaultEmails,
	recipientName,
	onSaved,
	leadId,
}: Props) {
	const eventTypes = Object.entries(EVENT_TYPE_META) as Array<
		[EventTypeKey, (typeof EVENT_TYPE_META)[EventTypeKey]]
	>;

	const defaultCalendarId =
		calendars.find((c) => c.isDefault)?.id ?? calendars[0]?.id ?? "";

	const initialEmails = (
		(event?.externalAttendees ?? []).map((a) => a.email) as string[]
	).concat(
		// Compatibilidade legado: emails antes ficavam em `attendees` como name
		((event?.attendees ?? []) as Array<{ name: string }>)
			.map((a) => a.name)
			.filter((n) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n)),
	);

	const [title, setTitle] = useState(event?.title ?? defaultTitle ?? "");
	const [calendarId, setCalendarId] = useState(
		event?.calendarId ?? defaultCalendarId,
	);
	const [type, setType] = useState<EventTypeKey>(
		(event?.type as EventTypeKey) ?? "meeting",
	);
	const [date, setDate] = useState<Date>(
		event?.startAt ?? defaultDate ?? new Date(),
	);
	const [timeStr, setTimeStr] = useState(
		event?.startAt ? toTimeString(event.startAt) : "09:00",
	);
	const [duration, setDuration] = useState(event?.duration ?? "30 min");
	const [contactQuery, setContactQuery] = useState("");
	const [emailInput, setEmailInput] = useState("");
	const [emails, setEmails] = useState<string[]>(
		initialEmails.length > 0 ? initialEmails : (defaultEmails ?? []),
	);
	const [description, setDescription] = useState(event?.description ?? "");
	const [isPending, startTransition] = useTransition();
	// Resultado do salvamento Meet — preenchido após push síncrono pro Google.
	// Renderiza ScheduledEventCard (mesmo card da sidebar do LeadModal).
	const [meetResult, setMeetResult] = useState<ScheduledEventLike | null>(
		null,
	);

	// Reset state APENAS na transição closed → open. Sem isso, parents que
	// re-renderizam (ex: LeadModal após refresh) trocam refs de
	// `defaultEmails`/`defaultTitle` e disparariam reset → bloco do meetResult
	// some na hora. Ref controla se já fizemos init nesta abertura.
	const wasOpenRef = useRef(false);
	useEffect(() => {
		if (open && !wasOpenRef.current) {
			wasOpenRef.current = true;
			const seedEmails = (
				(event?.externalAttendees ?? []).map((a) => a.email) as string[]
			).concat(
				((event?.attendees ?? []) as Array<{ name: string }>)
					.map((a) => a.name)
					.filter((n) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n)),
			);
			setTitle(event?.title ?? defaultTitle ?? "");
			setCalendarId(event?.calendarId ?? defaultCalendarId);
			setType((event?.type as EventTypeKey) ?? "meeting");
			setDate(event?.startAt ?? defaultDate ?? new Date());
			setTimeStr(event?.startAt ? toTimeString(event.startAt) : "09:00");
			setDuration(event?.duration ?? "30 min");
			setContactQuery("");
			setEmailInput("");
			setEmails(
				seedEmails.length > 0 ? seedEmails : (defaultEmails ?? []),
			);
			setDescription(event?.description ?? "");
			setMeetResult(null);
		} else if (!open) {
			wasOpenRef.current = false;
		}
	}, [
		open,
		event,
		defaultDate,
		defaultCalendarId,
		defaultTitle,
		defaultEmails,
	]);

	const addEmail = () => {
		const v = emailInput.trim();
		if (!v) return;
		// Validação simples de email
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
			toast.error("Email inválido");
			return;
		}
		if (emails.includes(v)) return;
		setEmails((prev) => [...prev, v]);
		setEmailInput("");
	};

	const removeEmail = (email: string) => {
		setEmails((prev) => prev.filter((e) => e !== email));
	};

	const dateInputValue = format(date, "yyyy-MM-dd");
	const dateDisplayValue = format(date, "dd/MM/yyyy");

	const typeMeta = EVENT_TYPE_META[type];

	const buildPayload = (kind: "event" | "meet") => {
		const [hh, mm] = timeStr.split(":").map((n) => Number.parseInt(n, 10));
		const startAt = new Date(date);
		startAt.setHours(hh, mm, 0, 0);
		return {
			organizationId,
			calendarId,
			title: title.trim(),
			description: description.trim() || null,
			startAt,
			duration,
			allDay: false,
			type,
			color: typeMeta.color,
			location: null,
			// Convidados externos viram attendees Google via mapLocalToGoogle.
			// Não popular `attendees` (campo pra membros internos) — vazio.
			attendees: [],
			externalAttendees: emails.map((email) => ({
				email,
				status: "pending" as const,
			})),
			reminder: true,
			eventKind: kind,
			leadId: leadId ?? null,
		};
	};

	const validate = (): boolean => {
		if (!title.trim()) {
			toast.error("Dê um título pro evento.");
			return false;
		}
		if (!calendarId) {
			toast.error("Nenhum calendário disponível.");
			return false;
		}
		return true;
	};

	const handleSave = (kind: "event" | "meet") => {
		if (!validate()) return;
		const payload = buildPayload(kind);

		startTransition(async () => {
			try {
				if (event) {
					await updateEventAction(
						{ eventId: event.id, ...payload },
						organizationSlug,
					);
					toast.success("Evento atualizado");
					onSaved?.({ eventId: event.id, meetLink: null });
					onOpenChange(false);
					return;
				}

				const result = await createEventAction(payload, organizationSlug);
				if (kind === "meet") {
					if (result.meetError === "GOOGLE_NOT_CONNECTED") {
						toast.error(
							"Conecte o Google Calendar em Integrações pra criar Meet.",
						);
						onOpenChange(false);
						return;
					}
					if (!result.meetLink) {
						toast.error(
							`Evento criado, mas Meet não veio do Google: ${result.meetError ?? "erro desconhecido"}`,
						);
						onOpenChange(false);
						return;
					}
					setMeetResult({
						id: result.eventId,
						title: payload.title,
						startAt: payload.startAt,
						duration: payload.duration,
						eventKind: "meet",
						meetLink: result.meetLink,
						conferenceId: result.conferenceId ?? null,
					});
					toast.success("Reunião criada com Google Meet");
					onSaved?.({
						eventId: result.eventId,
						meetLink: result.meetLink,
					});
					return;
				}
				toast.success("Evento criado");
				onSaved?.({ eventId: result.eventId, meetLink: null });
				onOpenChange(false);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Falha ao salvar");
			}
		});
	};


	const handleDelete = () => {
		if (!event) return;
		startTransition(async () => {
			try {
				await deleteEventAction(
					{ eventId: event.id },
					organizationSlug,
				);
				toast.success("Evento excluído");
				onOpenChange(false);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : "Falha ao excluir");
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2.5 text-lg">
						<div className={cn("size-2.5 rounded-full", typeMeta.color)} />
						{event ? "Editar evento" : "Novo evento"}
					</DialogTitle>
					<DialogDescription>
						Crie um evento e vincule a um contato do CRM
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5 py-2">
					<div className="space-y-2">
						<Label htmlFor="event-title">Título</Label>
						<Input
							id="event-title"
							placeholder="Ex: Reunião com cliente..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							maxLength={200}
							autoFocus
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label>Tipo</Label>
							<Select
								value={type}
								onValueChange={(v) => setType(v as EventTypeKey)}
							>
								<SelectTrigger className="w-full">
									<SelectValue>
										<div className="flex items-center gap-2">
											<div
												className={cn(
													"size-2.5 rounded-full",
													typeMeta.color,
												)}
											/>
											{typeMeta.label}
										</div>
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{eventTypes.map(([key, meta]) => (
										<SelectItem key={key} value={key}>
											<div className="flex items-center gap-2">
												<div
													className={cn(
														"size-2.5 rounded-full",
														meta.color,
													)}
												/>
												{meta.label}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Duração</Label>
							<Select value={duration} onValueChange={setDuration}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DURATION_OPTIONS.map((d) => (
										<SelectItem key={d} value={d}>
											{d}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label
								htmlFor="event-date"
								className="flex items-center gap-1.5"
							>
								<CalendarIcon className="size-3.5" />
								Data
							</Label>
							<Input
								id="event-date"
								type="date"
								value={dateInputValue}
								onChange={(e) => {
									const v = e.target.value;
									if (v) {
										const [y, m, d] = v.split("-").map(Number);
										const next = new Date(date);
										next.setFullYear(y, m - 1, d);
										setDate(next);
									}
								}}
							/>
							{/* fallback display label fica igual ao input nativo */}
							<span className="sr-only">{dateDisplayValue}</span>
						</div>
						<div className="space-y-2">
							<Label className="flex items-center gap-1.5">
								<Clock className="size-3.5" />
								Horário
							</Label>
							<Select value={timeStr} onValueChange={setTimeStr}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TIME_SLOTS.map((slot) => (
										<SelectItem key={slot} value={slot}>
											{slot}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label
							htmlFor="event-contact"
							className="flex items-center gap-1.5"
						>
							<Users className="size-3.5" />
							Contato (Lead) <span className="text-muted-foreground">(opcional)</span>
						</Label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="event-contact"
								placeholder="Buscar contato por nome, email ou empresa..."
								value={contactQuery}
								onChange={(e) => setContactQuery(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label className="flex items-center gap-1.5">
							<svg
								className="size-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								aria-hidden="true"
							>
								<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
								<polyline points="22,6 12,13 2,6" />
							</svg>
							Convidados
						</Label>
						<div className="flex gap-2">
							<Input
								placeholder="Digite um email e pressione Enter..."
								value={emailInput}
								onChange={(e) => setEmailInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addEmail();
									}
								}}
								type="email"
							/>
							<Button
								type="button"
								variant="outline"
								onClick={addEmail}
								className="shrink-0"
								aria-label="Adicionar convidado"
							>
								<Plus className="size-4" />
							</Button>
						</div>
						{emails.length === 0 ? (
							<p className="text-foreground/50 text-xs">
								Sem email cadastrado para este contato. Adicione os emails manualmente.
							</p>
						) : (
							<div className="flex flex-wrap gap-2 pt-1">
								{emails.map((email) => (
									<span
										key={email}
										className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
									>
										{email}
										<button
											type="button"
											onClick={() => removeEmail(email)}
											className="text-muted-foreground hover:text-foreground"
											aria-label={`Remover ${email}`}
										>
											<X className="size-3" />
										</button>
									</span>
								))}
							</div>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="event-desc">Descrição</Label>
						<Textarea
							id="event-desc"
							placeholder="Detalhes do evento..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
							maxLength={5000}
						/>
					</div>

					{calendars.length > 1 && (
						<div className="space-y-2">
							<Label>Calendário</Label>
							<Select value={calendarId} onValueChange={setCalendarId}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{calendars.map((c) => (
										<SelectItem key={c.id} value={c.id}>
											<div className="flex items-center gap-2">
												<div
													className={cn(
														"size-2.5 rounded-full",
														c.color,
													)}
												/>
												{c.name}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{meetResult ? (
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
								<VideoIcon className="size-3.5" />
								Reunião com Google Meet criada
							</div>
							<ScheduledEventCard
								event={meetResult}
								recipientName={recipientName}
							/>
							<div className="flex justify-end">
								<Button
									type="button"
									size="sm"
									onClick={() => onOpenChange(false)}
								>
									Concluído
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-wrap gap-3 pt-2">
							{event ? (
								<Button
									onClick={() => handleSave("event")}
									disabled={isPending}
									className="flex-1"
								>
									{isPending ? (
										<Loader2Icon className="size-4 animate-spin" />
									) : (
										"Atualizar evento"
									)}
								</Button>
							) : restrictKind === "meet" ? (
								<Button
									onClick={() => handleSave("meet")}
									disabled={isPending}
									className="flex-1 gap-1.5"
								>
									{isPending ? (
										<Loader2Icon className="size-4 animate-spin" />
									) : (
										<>
											<VideoIcon className="size-4" />
											Salvar reunião
										</>
									)}
								</Button>
							) : restrictKind === "event" ? (
								<Button
									onClick={() => handleSave("event")}
									disabled={isPending}
									className="flex-1"
								>
									{isPending ? (
										<Loader2Icon className="size-4 animate-spin" />
									) : (
										"Salvar evento"
									)}
								</Button>
							) : (
								<>
									<Button
										onClick={() => handleSave("event")}
										disabled={isPending}
										variant="outline"
										className="flex-1"
									>
										{isPending ? (
											<Loader2Icon className="size-4 animate-spin" />
										) : (
											"Salvar como evento"
										)}
									</Button>
									<Button
										onClick={() => handleSave("meet")}
										disabled={isPending}
										className="flex-1 gap-1.5"
									>
										{isPending ? (
											<Loader2Icon className="size-4 animate-spin" />
										) : (
											<>
												<VideoIcon className="size-4" />
												Salvar como Meet
											</>
										)}
									</Button>
								</>
							)}
							{event && (
								<Button
									variant="error"
									onClick={handleDelete}
									disabled={isPending}
								>
									Excluir
								</Button>
							)}
							<Button
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={isPending}
							>
								Cancelar
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
