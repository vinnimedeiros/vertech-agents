"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib";
import {
	BuildingIcon,
	CalendarIcon,
	FileEditIcon,
	FlameIcon,
	Loader2Icon,
	MailIcon,
	MessageCircleIcon,
	PhoneCallIcon,
	PhoneIcon,
	SendIcon,
	SnowflakeIcon,
	StickyNoteIcon,
	ThermometerIcon,
	UserIcon,
	UsersIcon,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	getLeadDetailsAction,
	logActivityAction,
	moveLeadToStageAction,
	updateLeadAction,
} from "../lib/actions";

type Stage = {
	id: string;
	name: string;
	color: string;
	isClosing: boolean;
	isWon: boolean;
};

type LeadDetailSheetProps = {
	open: boolean;
	onOpenChange: (next: boolean) => void;
	leadId: string | null;
	organizationSlug: string;
	stages: Stage[];
};

type LoadedLead = {
	id: string;
	title: string | null;
	description: string | null;
	value: string | null;
	currency: string;
	temperature: "COLD" | "WARM" | "HOT";
	priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
	origin: string | null;
	assignedTo: string | null;
	stageId: string;
	createdAt: Date;
	updatedAt: Date;
	closedAt: Date | null;
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
	createdAt: Date;
};

type LoadedDetails = {
	lead: LoadedLead;
	contact: LoadedContact;
	activities: LoadedActivity[];
};

const TEMPERATURES = [
	{
		value: "COLD",
		label: "Frio",
		icon: SnowflakeIcon,
		color: "text-blue-500",
	},
	{
		value: "WARM",
		label: "Morno",
		icon: ThermometerIcon,
		color: "text-amber-500",
	},
	{ value: "HOT", label: "Quente", icon: FlameIcon, color: "text-red-500" },
] as const;

const PRIORITIES = [
	{ value: "LOW", label: "Baixa" },
	{ value: "NORMAL", label: "Normal" },
	{ value: "HIGH", label: "Alta" },
	{ value: "URGENT", label: "Urgente" },
] as const;

const ACTIVITY_BUTTONS = [
	{ type: "CALL" as const, label: "Ligação", icon: PhoneCallIcon },
	{ type: "EMAIL" as const, label: "Email", icon: MailIcon },
	{ type: "MEETING" as const, label: "Reunião", icon: UsersIcon },
	{ type: "TASK" as const, label: "Tarefa", icon: FileEditIcon },
	{ type: "WHATSAPP" as const, label: "WhatsApp", icon: MessageCircleIcon },
	{ type: "NOTE" as const, label: "Nota", icon: StickyNoteIcon },
];

function formatDateTime(date: Date | string) {
	const d = date instanceof Date ? date : new Date(date);
	return d.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatCurrency(value: string | null, currency: string): string {
	if (!value) return "—";
	const num = Number(value);
	if (Number.isNaN(num)) return "—";
	try {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency,
		}).format(num);
	} catch {
		return `${currency} ${num}`;
	}
}

export function LeadDetailSheet({
	open,
	onOpenChange,
	leadId,
	organizationSlug,
	stages,
}: LeadDetailSheetProps) {
	const [details, setDetails] = useState<LoadedDetails | null>(null);
	const [loading, setLoading] = useState(false);
	const [isSaving, startSaving] = useTransition();

	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editValue, setEditValue] = useState("");
	const [editTemperature, setEditTemperature] = useState<
		"COLD" | "WARM" | "HOT"
	>("COLD");
	const [editPriority, setEditPriority] = useState<
		"LOW" | "NORMAL" | "HIGH" | "URGENT"
	>("NORMAL");
	const [editOrigin, setEditOrigin] = useState("");

	const [activityTitle, setActivityTitle] = useState("");
	const [activityType, setActivityType] =
		useState<(typeof ACTIVITY_BUTTONS)[number]["type"]>("NOTE");

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
				setEditTitle(data.lead.title ?? "");
				setEditDescription(data.lead.description ?? "");
				setEditValue(data.lead.value ?? "");
				setEditTemperature(data.lead.temperature);
				setEditPriority(data.lead.priority);
				setEditOrigin(data.lead.origin ?? "");
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

	function handleSave() {
		if (!details) return;

		const numericValue = editValue.trim() === "" ? null : Number(editValue);
		if (numericValue !== null && Number.isNaN(numericValue)) {
			toast.error("Valor inválido");
			return;
		}

		startSaving(async () => {
			try {
				await updateLeadAction(
					{
						id: details.lead.id,
						title: editTitle.trim() || null,
						description: editDescription.trim() || null,
						value: numericValue,
						temperature: editTemperature,
						priority: editPriority,
						origin: editOrigin.trim() || null,
					},
					organizationSlug,
				);
				const fresh = await getLeadDetailsAction(details.lead.id);
				setDetails(fresh as LoadedDetails);
				toast.success("Lead atualizado");
			} catch (err) {
				toast.error("Não foi possível salvar", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	function handleStageChange(newStageId: string) {
		if (!details || details.lead.stageId === newStageId) return;
		const prev = details;
		setDetails({
			...details,
			lead: { ...details.lead, stageId: newStageId },
		});
		startSaving(async () => {
			try {
				await moveLeadToStageAction(
					{ leadId: details.lead.id, toStageId: newStageId },
					organizationSlug,
				);
				const fresh = await getLeadDetailsAction(details.lead.id);
				setDetails(fresh as LoadedDetails);
			} catch (err) {
				setDetails(prev);
				toast.error("Não foi possível mover o lead", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	function handleLogActivity() {
		if (!details) return;
		if (!activityTitle.trim()) {
			toast.error("Descreva a atividade");
			return;
		}
		const title = activityTitle.trim();
		startSaving(async () => {
			try {
				await logActivityAction(
					{
						leadId: details.lead.id,
						type: activityType,
						title,
					},
					organizationSlug,
				);
				const fresh = await getLeadDetailsAction(details.lead.id);
				setDetails(fresh as LoadedDetails);
				setActivityTitle("");
				toast.success("Atividade registrada");
			} catch (err) {
				toast.error("Não foi possível registrar", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	const tempCfg = details
		? TEMPERATURES.find((t) => t.value === details.lead.temperature)
		: null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full overflow-y-auto p-0 sm:max-w-xl"
			>
				{loading || !details ? (
					<div className="flex h-full items-center justify-center p-8">
						<Loader2Icon className="size-5 animate-spin text-foreground/40" />
					</div>
				) : (
					<div className="flex flex-col">
						<SheetHeader className="gap-1 border-b p-6 pb-4">
							<div className="flex items-center gap-3">
								<div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
									<UserIcon className="size-5" />
								</div>
								<div className="flex-1">
									<SheetTitle className="text-left">
										{details.contact.name}
									</SheetTitle>
									<SheetDescription className="text-left">
										{details.lead.title ??
											"Lead sem título"}
									</SheetDescription>
								</div>
							</div>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								<Select
									value={details.lead.stageId}
									onValueChange={handleStageChange}
								>
									<SelectTrigger className="h-8 w-auto gap-2">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{stages.map((s) => (
											<SelectItem key={s.id} value={s.id}>
												{s.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{tempCfg ? (
									<Badge
										status="info"
										className="flex items-center gap-1"
									>
										<tempCfg.icon
											className={cn(
												"size-3",
												tempCfg.color,
											)}
										/>
										{tempCfg.label}
									</Badge>
								) : null}
								<Badge
									status={
										details.lead.priority === "URGENT"
											? "error"
											: details.lead.priority === "HIGH"
												? "warning"
												: "info"
									}
								>
									{
										PRIORITIES.find(
											(p) =>
												p.value ===
												details.lead.priority,
										)?.label
									}
								</Badge>
								{details.lead.closedAt ? (
									<Badge status="success">Fechado</Badge>
								) : null}
							</div>
						</SheetHeader>

						<div className="space-y-6 p-6">
							<section className="grid grid-cols-2 gap-4 text-sm">
								<Field
									label="Telefone"
									icon={PhoneIcon}
									value={details.contact.phone}
								/>
								<Field
									label="Email"
									icon={MailIcon}
									value={details.contact.email}
								/>
								<Field
									label="Empresa"
									icon={BuildingIcon}
									value={details.contact.company}
								/>
								<Field
									label="Valor"
									icon={SendIcon}
									value={formatCurrency(
										details.lead.value,
										details.lead.currency,
									)}
								/>
								<Field
									label="Criado em"
									icon={CalendarIcon}
									value={formatDateTime(
										details.lead.createdAt,
									)}
								/>
								<Field
									label="Origem"
									icon={FileEditIcon}
									value={details.lead.origin}
								/>
							</section>

							<section className="space-y-3">
								<h3 className="text-foreground/60 text-xs uppercase tracking-wide">
									Editar
								</h3>
								<div className="space-y-2">
									<Label htmlFor="lead-title">Título</Label>
									<Input
										id="lead-title"
										value={editTitle}
										onChange={(e) =>
											setEditTitle(e.target.value)
										}
									/>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-2">
										<Label htmlFor="lead-value">
											Valor (R$)
										</Label>
										<Input
											id="lead-value"
											type="number"
											min="0"
											step="0.01"
											value={editValue}
											onChange={(e) =>
												setEditValue(e.target.value)
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="lead-origin">
											Origem
										</Label>
										<Input
											id="lead-origin"
											value={editOrigin}
											onChange={(e) =>
												setEditOrigin(e.target.value)
											}
										/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-2">
										<Label htmlFor="lead-temp">
											Temperatura
										</Label>
										<Select
											value={editTemperature}
											onValueChange={(v) =>
												setEditTemperature(
													v as typeof editTemperature,
												)
											}
										>
											<SelectTrigger id="lead-temp">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{TEMPERATURES.map((t) => (
													<SelectItem
														key={t.value}
														value={t.value}
													>
														{t.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label htmlFor="lead-priority">
											Prioridade
										</Label>
										<Select
											value={editPriority}
											onValueChange={(v) =>
												setEditPriority(
													v as typeof editPriority,
												)
											}
										>
											<SelectTrigger id="lead-priority">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{PRIORITIES.map((p) => (
													<SelectItem
														key={p.value}
														value={p.value}
													>
														{p.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="lead-description">
										Descrição
									</Label>
									<Textarea
										id="lead-description"
										value={editDescription}
										onChange={(e) =>
											setEditDescription(e.target.value)
										}
										rows={3}
									/>
								</div>
								<Button
									type="button"
									size="sm"
									onClick={handleSave}
									disabled={isSaving}
								>
									{isSaving ? (
										<Loader2Icon className="size-4 animate-spin" />
									) : null}
									Salvar alterações
								</Button>
							</section>

							<section className="space-y-3">
								<h3 className="text-foreground/60 text-xs uppercase tracking-wide">
									Nova atividade
								</h3>
								<div className="flex flex-wrap gap-2">
									{ACTIVITY_BUTTONS.map((b) => (
										<Button
											key={b.type}
											type="button"
											variant={
												activityType === b.type
													? "primary"
													: "outline"
											}
											size="sm"
											onClick={() =>
												setActivityType(b.type)
											}
										>
											<b.icon className="size-3.5" />
											{b.label}
										</Button>
									))}
								</div>
								<div className="flex gap-2">
									<Input
										value={activityTitle}
										onChange={(e) =>
											setActivityTitle(e.target.value)
										}
										placeholder="Descreva a atividade…"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleLogActivity();
											}
										}}
									/>
									<Button
										type="button"
										size="sm"
										onClick={handleLogActivity}
										disabled={isSaving}
									>
										Registrar
									</Button>
								</div>
							</section>

							<section className="space-y-3">
								<h3 className="text-foreground/60 text-xs uppercase tracking-wide">
									Timeline
								</h3>
								{details.activities.length === 0 ? (
									<p className="text-foreground/40 text-sm">
										Nenhuma atividade ainda.
									</p>
								) : (
									<ul className="space-y-3">
										{details.activities.map((a) => (
											<li
												key={a.id}
												className="rounded-md border border-border bg-muted/30 p-3"
											>
												<div className="flex items-center justify-between gap-2">
													<span className="font-medium text-foreground text-sm">
														{a.title}
													</span>
													<span className="text-foreground/40 text-xs">
														{formatDateTime(
															a.createdAt,
														)}
													</span>
												</div>
												<div className="mt-1 flex items-center gap-2">
													<Badge status="info">
														{a.type}
													</Badge>
												</div>
												{a.content ? (
													<p className="mt-2 text-foreground/70 text-sm">
														{a.content}
													</p>
												) : null}
											</li>
										))}
									</ul>
								)}
							</section>
						</div>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}

function Field({
	label,
	icon: Icon,
	value,
}: {
	label: string;
	icon: typeof PhoneIcon;
	value: string | null;
}) {
	return (
		<div>
			<span className="flex items-center gap-1 text-foreground/50 text-xs">
				<Icon className="size-3" />
				{label}
			</span>
			<p className="mt-0.5 text-foreground text-sm">{value ?? "—"}</p>
		</div>
	);
}
