"use client";

import { formatPhoneBR } from "@saas/chat/lib/phone";
import {
	openConversationWithContactAction,
	promoteContactsToLeadsAction,
	syncWhatsAppContactsNowAction,
} from "@saas/whatsapp-contacts/lib/actions";
import type {
	WhatsAppContactRow,
	WhatsAppContactStatus,
} from "@saas/whatsapp-contacts/lib/server";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import {
	CircleDashedIcon,
	CircleDotIcon,
	Loader2Icon,
	MessageCircleIcon,
	PlusIcon,
	RefreshCwIcon,
	SearchIcon,
	UserCheckIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type Props = {
	organizationId: string;
	organizationSlug: string;
	initialContacts: WhatsAppContactRow[];
	stats: {
		total: number;
		neverTalked: number;
		inConversation: number;
		isLead: number;
	};
};

const FILTERS: { key: WhatsAppContactStatus; label: string }[] = [
	{ key: "ALL", label: "Todos" },
	{ key: "NEVER_TALKED", label: "Sem conversa" },
	{ key: "IN_CONVERSATION", label: "Em conversa" },
	{ key: "IS_LEAD", label: "Viraram lead" },
];

function initialsOf(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
}

function timeAgo(d: Date | null): string {
	if (!d) return "—";
	const date = new Date(d);
	const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
	if (diffMin < 1) return "agora";
	if (diffMin < 60) return `${diffMin}m`;
	const h = Math.floor(diffMin / 60);
	if (h < 24) return `${h}h`;
	const dd = Math.floor(h / 24);
	if (dd < 30) return `${dd}d`;
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
	});
}

export function WhatsAppContactsTable({
	organizationId,
	organizationSlug,
	initialContacts,
	stats,
}: Props) {
	const [filter, setFilter] = useState<WhatsAppContactStatus>("ALL");
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [pending, startTransition] = useTransition();
	const router = useRouter();

	const filtered = useMemo(() => {
		const term = search.trim().toLowerCase();
		return initialContacts.filter((c) => {
			// Filtro por status
			if (filter === "NEVER_TALKED" && (c.hasConversation || c.hasActiveLead))
				return false;
			if (filter === "IN_CONVERSATION" && (!c.hasConversation || c.hasActiveLead))
				return false;
			if (filter === "IS_LEAD" && !c.hasActiveLead) return false;

			// Filtro por busca
			if (term.length > 0) {
				const hay = [
					c.name,
					c.phone ?? "",
					c.businessCategory ?? "",
				]
					.join(" ")
					.toLowerCase();
				if (!hay.includes(term)) return false;
			}
			return true;
		});
	}, [initialContacts, filter, search]);

	function toggleSelect(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleSelectAll() {
		if (selected.size === filtered.length && filtered.length > 0) {
			setSelected(new Set());
		} else {
			setSelected(new Set(filtered.map((c) => c.id)));
		}
	}

	function openConversation(contactId: string) {
		startTransition(async () => {
			try {
				const { conversationId } = await openConversationWithContactAction(
					contactId,
					organizationSlug,
				);
				router.push(
					`/app/${organizationSlug}/crm/chat/${conversationId}`,
				);
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao abrir conversa",
				);
			}
		});
	}

	function promoteSelected() {
		if (selected.size === 0) return;
		const ids = Array.from(selected);
		startTransition(async () => {
			try {
				const { createdLeads, skipped } = await promoteContactsToLeadsAction(
					{ contactIds: ids },
					organizationSlug,
				);
				const msg = [
					createdLeads > 0 ? `${createdLeads} lead(s) criado(s)` : null,
					skipped > 0 ? `${skipped} já era(m) lead` : null,
				]
					.filter(Boolean)
					.join(" · ");
				toast.success(msg || "Nada a fazer");
				setSelected(new Set());
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao promover",
				);
			}
		});
	}

	function syncNow() {
		startTransition(async () => {
			try {
				const { inserted, updated } = await syncWhatsAppContactsNowAction(
					organizationId,
					organizationSlug,
				);
				const msg = [
					inserted > 0 ? `${inserted} novo(s)` : null,
					updated > 0 ? `${updated} atualizado(s)` : null,
				]
					.filter(Boolean)
					.join(" · ");
				toast.success(msg || "Agenda já está sincronizada");
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao sincronizar",
				);
			}
		});
	}

	function promoteOne(contactId: string) {
		startTransition(async () => {
			try {
				const { createdLeads } = await promoteContactsToLeadsAction(
					{ contactIds: [contactId] },
					organizationSlug,
				);
				if (createdLeads > 0) toast.success("Lead criado no pipeline");
				else toast("Já era um lead ativo");
				router.refresh();
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Falha ao promover",
				);
			}
		});
	}

	const allSelected =
		selected.size > 0 && selected.size === filtered.length;

	return (
		<div className="flex flex-col gap-4">
			{/* Resumo + ações */}
			<div className="flex flex-wrap items-center gap-3">
				<StatPill label="Total" value={stats.total} tone="neutral" />
				<StatPill
					label="Sem conversa"
					value={stats.neverTalked}
					tone="neutral"
				/>
				<StatPill
					label="Em conversa"
					value={stats.inConversation}
					tone="info"
				/>
				<StatPill label="Viraram lead" value={stats.isLead} tone="success" />
				<Button
					size="sm"
					variant="outline"
					onClick={syncNow}
					disabled={pending}
					className="ml-auto gap-1.5"
				>
					{pending ? (
						<Loader2Icon className="size-3.5 animate-spin" />
					) : (
						<RefreshCwIcon className="size-3.5" />
					)}
					Sincronizar agenda
				</Button>
			</div>

			{/* Filtros + busca */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-1">
					{FILTERS.map((f) => (
						<button
							key={f.key}
							type="button"
							onClick={() => setFilter(f.key)}
							className={cn(
								"rounded-full px-3 py-1 text-xs transition-colors",
								filter === f.key
									? "bg-primary/15 font-medium text-foreground"
									: "text-foreground/65 hover:bg-foreground/5",
							)}
						>
							{f.label}
						</button>
					))}
				</div>
				<div className="relative ml-auto w-full max-w-xs">
					<SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-foreground/50" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar por nome ou telefone..."
						className="h-9 pl-8 text-sm"
					/>
				</div>
			</div>

			{/* Bulk actions */}
			{selected.size > 0 ? (
				<div className="flex items-center gap-3 rounded-md border border-border/60 bg-primary/5 px-3 py-2 text-sm">
					<span className="font-medium">
						{selected.size} selecionado{selected.size > 1 ? "s" : ""}
					</span>
					<Button
						size="sm"
						onClick={promoteSelected}
						disabled={pending}
						className="gap-1.5"
					>
						{pending ? (
							<Loader2Icon className="size-3.5 animate-spin" />
						) : (
							<PlusIcon className="size-3.5" />
						)}
						Adicionar ao CRM como lead
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => setSelected(new Set())}
					>
						Limpar seleção
					</Button>
				</div>
			) : null}

			{/* Tabela — rola internamente pra não empurrar o topbar do CRM */}
			<div className="max-h-[calc(100vh-22rem)] overflow-y-auto rounded-lg border border-border/60 bg-card/30">
				<table className="w-full text-sm">
					<thead className="sticky top-0 z-10 border-b border-border/60 bg-card/95 text-[11px] uppercase tracking-wider text-foreground/55 backdrop-blur">
						<tr>
							<th className="w-10 py-2.5 pl-4">
								<Checkbox
									checked={allSelected}
									onCheckedChange={() => toggleSelectAll()}
									aria-label="Selecionar todos"
								/>
							</th>
							<th className="py-2.5 pl-2 text-left font-medium">Contato</th>
							<th className="py-2.5 text-left font-medium">Telefone</th>
							<th className="py-2.5 text-left font-medium">Status</th>
							<th className="py-2.5 text-left font-medium">Última</th>
							<th className="w-32 py-2.5 pr-4 text-right font-medium">
								Ações
							</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="px-4 py-10 text-center text-xs text-foreground/55"
								>
									Nenhum contato encontrado.
								</td>
							</tr>
						) : (
							filtered.map((c) => {
								const checked = selected.has(c.id);
								return (
									<tr
										key={c.id}
										className={cn(
											"border-b border-border/50 transition-colors hover:bg-foreground/5",
											checked && "bg-primary/5",
										)}
									>
										<td className="w-10 py-2 pl-4">
											<Checkbox
												checked={checked}
												onCheckedChange={() => toggleSelect(c.id)}
												aria-label={`Selecionar ${c.name}`}
											/>
										</td>
										<td className="py-2 pl-2">
											<div className="flex items-center gap-2.5">
												<Avatar className="size-8 rounded-full">
													{c.photoUrl ? (
														<AvatarImage
															src={c.photoUrl}
															alt={c.name}
															className="rounded-full"
														/>
													) : null}
													<AvatarFallback className="rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-[10px]">
														{initialsOf(c.name) || "?"}
													</AvatarFallback>
												</Avatar>
												<div className="flex min-w-0 flex-col">
													<span className="truncate font-medium text-foreground">
														{c.name}
													</span>
													{c.businessCategory ? (
														<span className="truncate text-[11px] text-foreground/55">
															{c.businessCategory}
														</span>
													) : null}
												</div>
											</div>
										</td>
										<td className="py-2 text-foreground/80">
											{c.phone ? formatPhoneBR(c.phone) : "—"}
										</td>
										<td className="py-2">
											<ContactStatusBadge contact={c} />
										</td>
										<td className="py-2 text-[11px] text-foreground/55">
											{timeAgo(c.lastMessageAt ?? c.lastSyncedAt)}
										</td>
										<td className="py-2 pr-4 text-right">
											<div className="flex items-center justify-end gap-1">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => openConversation(c.id)}
													disabled={pending}
													className="gap-1 text-foreground/70"
													title="Iniciar conversa"
												>
													<MessageCircleIcon className="size-3.5" />
												</Button>
												{c.hasActiveLead ? null : (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => promoteOne(c.id)}
														disabled={pending}
														className="gap-1 text-foreground/70"
														title="Adicionar como lead"
													>
														<PlusIcon className="size-3.5" />
													</Button>
												)}
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function StatPill({
	label,
	value,
	tone,
}: {
	label: string;
	value: number;
	tone: "neutral" | "info" | "success";
}) {
	const dotClass =
		tone === "success"
			? "bg-emerald-500"
			: tone === "info"
				? "bg-sky-500"
				: "bg-foreground/40";
	return (
		<div className="flex items-center gap-2 rounded-full border border-border/50 bg-card/30 px-3 py-1 text-xs">
			<span className={cn("size-1.5 rounded-full", dotClass)} />
			<span className="text-foreground/55">{label}</span>
			<span className="font-semibold tabular-nums text-foreground">
				{value}
			</span>
		</div>
	);
}

function ContactStatusBadge({ contact: c }: { contact: WhatsAppContactRow }) {
	if (c.hasActiveLead) {
		return (
			<span
				className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
				style={{ backgroundColor: c.lastStageColor ?? "#6b7280" }}
			>
				<UserCheckIcon className="size-3" />
				{c.lastStageName ?? "Lead"}
			</span>
		);
	}
	if (c.hasConversation) {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400">
				<CircleDotIcon className="size-3" />
				Em conversa
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-2 py-0.5 text-[11px] font-medium text-foreground/55">
			<CircleDashedIcon className="size-3" />
			Sem conversa
		</span>
	);
}
