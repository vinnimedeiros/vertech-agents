"use client";

import { ContactMediaFullPanel } from "@saas/chat/components/ContactMediaFullPanel";
import { ContactMediaGallery } from "@saas/chat/components/ContactMediaGallery";
import { useConversationMessagesContext } from "@saas/chat/components/ConversationMessagesContext";
import { translateBusinessCategory } from "@saas/chat/lib/business-category";
import { formatPhoneBR } from "@saas/chat/lib/phone";
import type { ConversationDetail } from "@saas/chat/lib/server";
import { CurrencyField } from "@saas/crm/components/CurrencyField";
import { OriginPicker } from "@saas/crm/components/OriginPicker";
import { AssigneePicker } from "@saas/crm/components/pickers/AssigneePicker";
import type {
	Priority,
	Temperature,
} from "@saas/crm/components/pickers/lead-option-constants";
import { PrioritySelect } from "@saas/crm/components/pickers/PrioritySelect";
import { TemperatureSelect } from "@saas/crm/components/pickers/TemperatureSelect";
import {
	createLeadAction,
	moveLeadToStageAction,
	updateContactAction,
	updateLeadAction,
} from "@saas/crm/lib/actions";
import type { OrgMemberOption } from "@saas/crm/lib/server";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { cn } from "@ui/lib";
import {
	BuildingIcon,
	CircleDotIcon,
	DollarSignIcon,
	FlagIcon,
	Loader2Icon,
	MailIcon,
	PhoneIcon,
	PlusIcon,
	ThermometerIcon,
	UserIcon,
	UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
	useEffect,
	useRef,
	useState,
	useTransition,
	type ReactNode,
} from "react";

export type DetailsContact = {
	id: string;
	name: string;
	phone: string | null;
	email: string | null;
	company: string | null;
	photoUrl: string | null;
	isBusiness: boolean;
	businessCategory: string | null;
	businessHours: string | null;
	businessWebsite: string | null;
	businessDescription: string | null;
};

export type DetailsLead = {
	id: string;
	title: string | null;
	pipelineId: string;
	stageId: string;
	stageName: string;
	stageColor: string;
	value: string | null;
	currency: string;
	temperature: Temperature;
	priority: Priority;
	origin: string | null;
	assignedTo: string | null;
};

export type StageOption = {
	id: string;
	name: string;
	color: string;
};

export type DetailsDefaults = {
	pipelineId: string;
	firstStageId: string;
} | null;

type Props = {
	conversation: ConversationDetail;
	contact: DetailsContact;
	lead: DetailsLead | null;
	stages: StageOption[];
	members: OrgMemberOption[];
	organizationId: string;
	organizationSlug: string;
	defaults: DetailsDefaults;
};

function initialsOf(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
}

// ============================================================
// Inline text field (click to edit)
// ============================================================

function InlineText({
	value,
	placeholder,
	onSave,
	type = "text",
	centered = false,
}: {
	value: string | null;
	placeholder?: string;
	onSave: (next: string | null) => void | Promise<void>;
	type?: "text" | "email" | "tel";
	centered?: boolean;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value ?? "");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setDraft(value ?? "");
	}, [value]);

	useEffect(() => {
		if (editing) inputRef.current?.focus();
	}, [editing]);

	function commit() {
		const cleaned = draft.trim();
		setEditing(false);
		const nextValue = cleaned.length === 0 ? null : cleaned;
		if (nextValue === value) return;
		void onSave(nextValue);
	}

	function cancel() {
		setDraft(value ?? "");
		setEditing(false);
	}

	if (editing) {
		return (
			<Input
				ref={inputRef}
				type={type}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						commit();
					} else if (e.key === "Escape") {
						e.preventDefault();
						cancel();
					}
				}}
				className={cn(
					"h-7 w-full rounded px-1.5 text-sm",
					centered && "text-center",
				)}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setEditing(true)}
			className={cn(
				"w-full rounded px-1.5 py-0.5 text-sm transition-colors hover:bg-muted",
				centered ? "text-center" : "text-left",
				!value && "text-foreground/40",
			)}
		>
			{value?.trim() || placeholder || "—"}
		</button>
	);
}

// ============================================================
// Stage picker (popover)
// ============================================================

function StagePicker({
	currentId,
	stages,
	onChange,
}: {
	currentId: string;
	stages: StageOption[];
	onChange: (stageId: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const current = stages.find((s) => s.id === currentId);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white hover:opacity-90"
					style={{ backgroundColor: current?.color ?? "#6b7280" }}
				>
					{current?.name ?? "Sem etapa"}
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-56 p-1" withPortal={false}>
				<div className="max-h-60 space-y-0.5 overflow-y-auto">
					{stages.map((s) => (
						<button
							key={s.id}
							type="button"
							onMouseDown={(e) => {
								e.preventDefault();
								if (s.id !== currentId) onChange(s.id);
								setOpen(false);
							}}
							className={cn(
								"flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
								s.id === currentId && "bg-primary/10",
							)}
						>
							<span
								className="size-2 shrink-0 rounded-full"
								style={{ backgroundColor: s.color }}
							/>
							<span className="truncate">{s.name}</span>
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

// ============================================================
// Row layout
// ============================================================

function FieldRow({
	icon: Icon,
	label,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-2 py-1.5">
			<Icon className="size-3.5 shrink-0 text-foreground/50" />
			<span className="w-20 shrink-0 text-[11px] text-foreground/55">
				{label}
			</span>
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}

// ============================================================
// Main panel
// ============================================================

type DetailsView = "main" | "media";

export function ContactDetailsPanel({
	contact: initialContact,
	lead: initialLead,
	stages,
	members,
	organizationId,
	organizationSlug,
	defaults,
}: Props) {
	const [contact, setContact] = useState<DetailsContact>(initialContact);
	const [lead, setLead] = useState<DetailsLead | null>(initialLead);
	const [view, setView] = useState<DetailsView>("main");
	const [isCreating, startCreating] = useTransition();
	const [, startSave] = useTransition();
	const router = useRouter();

	useEffect(() => {
		setContact(initialContact);
	}, [initialContact]);

	useEffect(() => {
		setLead(initialLead);
	}, [initialLead]);

	const displayName = contact.name?.trim() || contact.phone || "Sem nome";

	function patchContact<K extends keyof DetailsContact>(
		field: K,
		next: DetailsContact[K],
	) {
		const snapshot = contact;
		setContact({ ...contact, [field]: next });
		startSave(async () => {
			try {
				await updateContactAction(
					{ id: contact.id, [field]: next } as any,
					organizationSlug,
				);
				router.refresh();
			} catch (err) {
				console.error("[ContactDetailsPanel] updateContact error", err);
				setContact(snapshot);
			}
		});
	}

	function patchLead<K extends keyof DetailsLead>(
		field: K,
		next: DetailsLead[K],
	) {
		if (!lead) return;
		const snapshot = lead;
		setLead({ ...lead, [field]: next });
		startSave(async () => {
			try {
				const payload: any = { id: lead.id };
				if (field === "value") {
					payload.value =
						typeof next === "string" ? Number(next) : (next ?? null);
				} else {
					payload[field as string] = next;
				}
				await updateLeadAction(payload, organizationSlug);
				router.refresh();
			} catch (err) {
				console.error("[ContactDetailsPanel] updateLead error", err);
				setLead(snapshot);
			}
		});
	}

	function changeStage(stageId: string) {
		if (!lead) return;
		const nextStage = stages.find((s) => s.id === stageId);
		if (!nextStage) return;
		const snapshot = lead;
		setLead({
			...lead,
			stageId,
			stageName: nextStage.name,
			stageColor: nextStage.color,
		});
		startSave(async () => {
			try {
				await moveLeadToStageAction(
					{ leadId: lead.id, toStageId: stageId },
					organizationSlug,
				);
				router.refresh();
			} catch (err) {
				console.error("[ContactDetailsPanel] moveLead error", err);
				setLead(snapshot);
			}
		});
	}

	function handleCreateLead() {
		if (!defaults) return;
		startCreating(async () => {
			try {
				await createLeadAction(
					{
						organizationId,
						contactId: contact.id,
						pipelineId: defaults.pipelineId,
						stageId: defaults.firstStageId,
						title: contact.name || null,
					},
					organizationSlug,
				);
				router.refresh();
			} catch (err) {
				console.error("[ContactDetailsPanel] createLead error", err);
			}
		});
	}

	if (view === "media") {
		return <MediaExpandedView onBack={() => setView("main")} />;
	}

	return (
		<div className="flex h-full flex-col overflow-y-auto">
			{/* Cabeçalho estilo WhatsApp Web: avatar grande, nome, telefone,
			    e se for Business: categoria + horário */}
			<div className="flex flex-col items-center gap-2 px-4 pt-10 pb-5">
				<Avatar className="size-24 rounded-full">
					{contact.photoUrl ? (
						<AvatarImage
							src={contact.photoUrl}
							alt={displayName}
							className="rounded-full"
						/>
					) : null}
					<AvatarFallback className="rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-2xl">
						{initialsOf(displayName) || "?"}
					</AvatarFallback>
				</Avatar>
				<div className="mt-2 flex w-full max-w-[240px] flex-col items-center gap-0.5 text-center">
					<div className="w-full">
						<InlineText
							value={contact.name}
							placeholder="Sem nome"
							centered
							onSave={(v) => patchContact("name", v ?? "")}
						/>
					</div>
					{contact.phone ? (
						<span className="text-xs text-foreground/70">
							{formatPhoneBR(contact.phone)}
						</span>
					) : null}
					{contact.isBusiness && contact.businessCategory ? (
						<span className="mt-1 text-[11px] text-foreground/55">
							{translateBusinessCategory(contact.businessCategory)}
						</span>
					) : null}
					{contact.isBusiness && contact.businessHours ? (
						<span className="text-[11px] text-emerald-500/80">
							{contact.businessHours}
						</span>
					) : null}
				</div>
			</div>

			{/* Mídias e documentos — preview clicável que abre tela cheia */}
			<MediaGallerySection onExpand={() => setView("media")} />

			{/* Contato (só email + empresa; telefone e nome ficam no header) */}
			<section className="px-4 py-3">
				<h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
					Contato
				</h4>
				<FieldRow icon={MailIcon} label="E-mail">
					<InlineText
						value={contact.email}
						placeholder="Adicionar e-mail"
						type="email"
						onSave={(v) => patchContact("email", v)}
					/>
				</FieldRow>
				<FieldRow icon={BuildingIcon} label="Empresa">
					<InlineText
						value={contact.company}
						placeholder="Adicionar empresa"
						onSave={(v) => patchContact("company", v)}
					/>
				</FieldRow>
			</section>

			{/* Dados do Lead OU botão de criar */}
			{lead ? (
				<section className="flex-1 px-4 py-3">
					<h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground/50">
						Dados do Lead
					</h4>

					<FieldRow icon={CircleDotIcon} label="Etapa">
						{stages.length > 0 ? (
							<StagePicker
								currentId={lead.stageId}
								stages={stages}
								onChange={changeStage}
							/>
						) : (
							<span
								className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
								style={{ backgroundColor: lead.stageColor }}
							>
								{lead.stageName}
							</span>
						)}
					</FieldRow>

					<FieldRow icon={DollarSignIcon} label="Valor">
						<CurrencyField
							value={lead.value}
							onSave={(v) => patchLead("value", v != null ? String(v) : null)}
							placeholder="Sem valor"
						/>
					</FieldRow>

					<FieldRow icon={ThermometerIcon} label="Temperatura">
						<TemperatureSelect
							value={lead.temperature}
							onChange={(v) => patchLead("temperature", v)}
						/>
					</FieldRow>

					<FieldRow icon={FlagIcon} label="Prioridade">
						<PrioritySelect
							value={lead.priority}
							onChange={(v) => patchLead("priority", v)}
						/>
					</FieldRow>

					<FieldRow icon={UsersIcon} label="Origem">
						<OriginPicker
							value={lead.origin}
							onChange={(v) => patchLead("origin", v)}
						/>
					</FieldRow>

					<FieldRow icon={UserIcon} label="Responsável">
						<AssigneePicker
							members={members}
							value={lead.assignedTo}
							onChange={(v) => patchLead("assignedTo", v)}
						/>
					</FieldRow>
				</section>
			) : (
				<section className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center">
					<div className="text-xs text-foreground/55">
						Esse contato ainda não tem lead ativo no CRM.
					</div>
					{defaults ? (
						<Button
							type="button"
							onClick={handleCreateLead}
							disabled={isCreating}
							className="gap-1.5"
						>
							{isCreating ? (
								<Loader2Icon className="size-3.5 animate-spin" />
							) : (
								<PlusIcon className="size-3.5" />
							)}
							Criar Lead no CRM
						</Button>
					) : (
						<p className="text-[11px] text-foreground/45">
							Crie um pipeline antes pra começar a registrar leads.
						</p>
					)}
				</section>
			)}
		</div>
	);
}

ContactDetailsPanel.displayName = "ContactDetailsPanel";

function MediaGallerySection({ onExpand }: { onExpand: () => void }) {
	const { messages } = useConversationMessagesContext();
	return <ContactMediaGallery messages={messages} onExpand={onExpand} />;
}

function MediaExpandedView({ onBack }: { onBack: () => void }) {
	const { messages } = useConversationMessagesContext();
	return <ContactMediaFullPanel messages={messages} onBack={onBack} />;
}
