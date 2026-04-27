"use client";

import { FloatingPanel } from "@saas/shared/floating";
import { Badge } from "@ui/components/badge";
import { Input } from "@ui/components/input";
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
import { cn } from "@ui/lib";
import {
	FlameIcon,
	SearchIcon,
	SnowflakeIcon,
	ThermometerIcon,
	UsersRoundIcon,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { LeadModal } from "./LeadModal";
import type { OrgMemberOption } from "../lib/server";

export type LeadRow = {
	id: string;
	title: string | null;
	value: string | null;
	currency: string;
	temperature: "COLD" | "WARM" | "HOT";
	priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
	stageId: string;
	updatedAt: Date;
	createdAt: Date;
	closedAt: Date | null;
	contact: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		company: string | null;
	};
	stage: {
		id: string;
		name: string;
		color: string;
		isClosing: boolean;
		isWon: boolean;
	};
};

type SheetStage = {
	id: string;
	name: string;
	color: string;
	isClosing: boolean;
	isWon: boolean;
	position: number;
};

type LeadsTableProps = {
	organizationSlug: string;
	leads: LeadRow[];
	stages: SheetStage[];
	members?: OrgMemberOption[];
	emptyMessage?: string;
	hideStageFilter?: boolean;
	/** Slot opcional renderizado à direita da barra de filtros (ex: Novo lead). */
	headerActions?: ReactNode;
};

const TEMPERATURE_CONFIG = {
	COLD: { icon: SnowflakeIcon, label: "Frio", color: "text-blue-500" },
	WARM: { icon: ThermometerIcon, label: "Morno", color: "text-amber-500" },
	HOT: { icon: FlameIcon, label: "Quente", color: "text-red-500" },
} as const;

const PRIORITY_LABELS: Record<LeadRow["priority"], string> = {
	LOW: "Baixa",
	NORMAL: "Normal",
	HIGH: "Alta",
	URGENT: "Urgente",
};

function formatCurrency(value: string | null, currency: string): string {
	if (!value) return "—";
	const num = Number(value);
	if (Number.isNaN(num)) return "—";
	try {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency,
			maximumFractionDigits: 0,
		}).format(num);
	} catch {
		return `${currency} ${num}`;
	}
}

function formatDate(date: Date | string) {
	const d = date instanceof Date ? date : new Date(date);
	return d.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
	});
}

export function LeadsTable({
	organizationSlug,
	leads,
	stages,
	members = [],
	emptyMessage = "Nenhum lead encontrado.",
	hideStageFilter = false,
	headerActions,
}: LeadsTableProps) {
	const [search, setSearch] = useState("");
	const [stageFilter, setStageFilter] = useState<string>("ALL");
	const [tempFilter, setTempFilter] = useState<string>("ALL");
	const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return leads.filter((l) => {
			if (stageFilter !== "ALL" && l.stageId !== stageFilter)
				return false;
			if (tempFilter !== "ALL" && l.temperature !== tempFilter)
				return false;
			if (q) {
				const haystack = [
					l.contact.name,
					l.title ?? "",
					l.contact.phone ?? "",
					l.contact.email ?? "",
					l.contact.company ?? "",
				]
					.join(" ")
					.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});
	}, [leads, search, stageFilter, tempFilter]);

	function openLead(id: string) {
		setSelectedLeadId(id);
		setSheetOpen(true);
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
			{/* Filtros + ações inline (sem header textual — Vinni 2026-04-26 noite) */}
			<div className="flex shrink-0 flex-wrap items-center gap-2 rounded-md border border-border/50 bg-card/95 p-2 shadow-sm backdrop-blur">
				<div className="relative min-w-[200px] flex-1">
					<SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground/40" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar por nome, email, telefone…"
						className="h-8 border-transparent bg-transparent pl-8 text-[12.5px] shadow-none focus-visible:bg-foreground/5"
					/>
				</div>
				{!hideStageFilter ? (
					<Select value={stageFilter} onValueChange={setStageFilter}>
						<SelectTrigger className="h-8 w-44 text-[12.5px]">
							<SelectValue placeholder="Estágio" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">Todos os estágios</SelectItem>
							{stages.map((s) => (
								<SelectItem key={s.id} value={s.id}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
				<Select value={tempFilter} onValueChange={setTempFilter}>
					<SelectTrigger className="h-8 w-36 text-[12.5px]">
						<SelectValue placeholder="Temperatura" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todas</SelectItem>
						<SelectItem value="COLD">Frio</SelectItem>
						<SelectItem value="WARM">Morno</SelectItem>
						<SelectItem value="HOT">Quente</SelectItem>
					</SelectContent>
				</Select>
				<span className="ml-auto text-[11px] tabular-nums text-foreground/55">
					{filtered.length} / {leads.length}
				</span>
				{headerActions}
			</div>

			{/* Tabela em FloatingPanel com scroll explícito */}
			<FloatingPanel className="flex min-h-0 flex-1 flex-col">
				<div className="flex-1 overflow-y-auto pr-1">
					<Table>
						<TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
							<TableRow className="border-border/40">
								<TableHead className="text-[11px] uppercase tracking-wide text-foreground/55">
									Contato
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-foreground/55">
									Título
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-foreground/55">
									Estágio
								</TableHead>
								<TableHead className="text-right text-[11px] uppercase tracking-wide text-foreground/55">
									Valor
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-foreground/55">
									Temperatura
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-foreground/55">
									Prioridade
								</TableHead>
								<TableHead className="text-[11px] uppercase tracking-wide text-foreground/55">
									Atualizado
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="py-16 text-center"
									>
										<div className="flex flex-col items-center gap-2">
											<div className="flex size-12 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-foreground/10">
												<UsersRoundIcon className="size-5 text-foreground/40" />
											</div>
											<p className="text-sm font-medium text-foreground/70">
												{emptyMessage}
											</p>
											<p className="max-w-xs text-xs text-foreground/50">
												Ajuste os filtros ou cadastre o primeiro lead pelo
												botão acima.
											</p>
										</div>
									</TableCell>
								</TableRow>
							) : (
								filtered.map((l) => {
									const temp = TEMPERATURE_CONFIG[l.temperature];
									return (
										<TableRow
											key={l.id}
											className="cursor-pointer border-border/30 transition-colors hover:bg-foreground/[0.04]"
											onClick={() => openLead(l.id)}
										>
											<TableCell>
												<div className="font-medium text-[13px] text-foreground">
													{l.contact.name}
												</div>
												<div className="text-[11px] text-foreground/50">
													{l.contact.email ??
														l.contact.phone ??
														"—"}
												</div>
											</TableCell>
											<TableCell className="text-[12.5px] text-foreground/80">
												{l.title ?? "—"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1.5 text-[12.5px]">
													<span
														className="size-2 rounded-full"
														style={{
															backgroundColor: l.stage.color,
														}}
													/>
													{l.stage.name}
												</div>
											</TableCell>
											<TableCell className="text-right font-medium text-[12.5px] tabular-nums">
												{formatCurrency(l.value, l.currency)}
											</TableCell>
											<TableCell>
												<span
													className={cn(
														"flex items-center gap-1 text-[12.5px]",
														temp.color,
													)}
												>
													<temp.icon className="size-3.5" />
													{temp.label}
												</span>
											</TableCell>
											<TableCell>
												<Badge
													status={
														l.priority === "URGENT"
															? "error"
															: l.priority === "HIGH"
																? "warning"
																: "info"
													}
												>
													{PRIORITY_LABELS[l.priority]}
												</Badge>
											</TableCell>
											<TableCell className="text-[11px] text-foreground/55">
												{formatDate(l.updatedAt)}
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</FloatingPanel>

			<LeadModal
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				leadId={selectedLeadId}
				organizationSlug={organizationSlug}
				stages={stages}
				members={members}
				leadIds={filtered.map((l) => l.id)}
				onNavigate={(id) => setSelectedLeadId(id)}
			/>
		</div>
	);
}
