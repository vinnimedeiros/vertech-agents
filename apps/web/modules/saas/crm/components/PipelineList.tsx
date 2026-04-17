"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Checkbox } from "@ui/components/checkbox";
import { BulkActionsBar } from "./BulkActionsBar";
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
	ArrowDownIcon,
	ArrowUpIcon,
	ArrowUpDownIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useViewState } from "../lib/use-view-state";
import type { OrgMemberOption } from "../lib/server";
import type { SortKey, ViewState } from "../lib/view-filters";

export type PipelineListLead = {
	id: string;
	title: string | null;
	value: string | null;
	currency: string | null;
	priority: string | null;
	temperature: string | null;
	stageId: string;
	assignedTo: string | null;
	createdAt: Date | string;
	stageDates: Record<string, string> | null;
	contact: {
		id: string;
		name: string | null;
		phone: string | null;
		email: string | null;
	} | null;
};

export type PipelineListStage = {
	id: string;
	name: string;
	color: string;
	maxDays: number | null;
};

type PipelineListProps = {
	leads: PipelineListLead[];
	stages: PipelineListStage[];
	members: OrgMemberOption[];
	baseState: ViewState | null;
	basePath: string;
	organizationSlug: string;
};

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
	urgent: { label: "Urgente", className: "bg-red-100 text-red-800 border-red-200" },
	high: { label: "Alta", className: "bg-orange-100 text-orange-800 border-orange-200" },
	medium: { label: "Média", className: "bg-amber-100 text-amber-800 border-amber-200" },
	low: { label: "Baixa", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

export function PipelineList({
	leads,
	stages,
	members,
	baseState,
	basePath,
	organizationSlug,
}: PipelineListProps) {
	const { currentState, setSortBy } = useViewState(basePath, baseState);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const stageMap = useMemo(
		() => new Map(stages.map((s) => [s.id, s])),
		[stages],
	);
	const memberMap = useMemo(
		() => new Map(members.map((m) => [m.userId, m])),
		[members],
	);

	const allVisible = leads.length > 0 && leads.every((l) => selected.has(l.id));
	const someSelected = selected.size > 0 && !allVisible;

	function toggleAll() {
		setSelected((prev) => {
			if (allVisible) return new Set();
			const next = new Set(prev);
			for (const l of leads) next.add(l.id);
			return next;
		});
	}

	function toggleRow(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleSort(key: SortKey) {
		if (key === "none") return;
		setSortBy(currentState.sortBy === key ? "none" : key);
	}

	return (
		<>
		<div className="rounded-lg border bg-card">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-10">
							<Checkbox
								checked={allVisible ? true : someSelected ? "indeterminate" : false}
								onCheckedChange={toggleAll}
							/>
						</TableHead>
						<SortableHeader
							sortKey="name"
							label="Nome / Contato"
							activeSort={currentState.sortBy}
							onToggle={toggleSort}
						/>
						<TableHead>Telefone</TableHead>
						<TableHead>E-mail</TableHead>
						<TableHead>Etapa</TableHead>
						<SortableHeader
							sortKey="value"
							label="Valor"
							activeSort={currentState.sortBy}
							onToggle={toggleSort}
							align="right"
						/>
						<SortableHeader
							sortKey="priority"
							label="Prioridade"
							activeSort={currentState.sortBy}
							onToggle={toggleSort}
						/>
						<TableHead>Responsável</TableHead>
						<SortableHeader
							sortKey="daysInStage"
							label="Dias na etapa"
							activeSort={currentState.sortBy}
							onToggle={toggleSort}
							align="right"
						/>
						<SortableHeader
							sortKey="date"
							label="Criado em"
							activeSort={currentState.sortBy}
							onToggle={toggleSort}
						/>
					</TableRow>
				</TableHeader>

				<TableBody>
					{leads.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={10}
								className="py-10 text-center text-sm text-muted-foreground"
							>
								Nenhum lead corresponde aos filtros atuais.
							</TableCell>
						</TableRow>
					) : (
						leads.map((lead) => {
							const stage = stageMap.get(lead.stageId);
							const assignee = lead.assignedTo
								? memberMap.get(lead.assignedTo)
								: null;
							const days = computeDaysInStage(lead);
							const stagnant =
								stage?.maxDays && stage.maxDays > 0 && days > stage.maxDays;
							const priority = lead.priority
								? PRIORITY_LABELS[lead.priority]
								: null;
							const isSelected = selected.has(lead.id);
							return (
								<TableRow
									key={lead.id}
									data-state={isSelected ? "selected" : undefined}
									className="group"
								>
									<TableCell>
										<Checkbox
											checked={isSelected}
											onCheckedChange={() => toggleRow(lead.id)}
										/>
									</TableCell>
									<TableCell className="font-medium">
										<div className="flex flex-col">
											<span className="truncate">
												{lead.title ?? lead.contact?.name ?? "(sem título)"}
											</span>
											{lead.contact?.name &&
												lead.title &&
												lead.contact.name !== lead.title && (
													<span className="text-xs text-muted-foreground">
														{lead.contact.name}
													</span>
												)}
										</div>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{lead.contact?.phone ?? "—"}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{lead.contact?.email ?? "—"}
									</TableCell>
									<TableCell>
										{stage && (
											<div className="flex items-center gap-1.5">
												<span
													className="size-2 rounded-full"
													style={{ backgroundColor: stage.color }}
												/>
												<span className="text-sm">{stage.name}</span>
											</div>
										)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(lead.value, lead.currency)}
									</TableCell>
									<TableCell>
										{priority ? (
											<span
												className={cn(
													"inline-block rounded-full border px-2 py-0.5 text-xs",
													priority.className,
												)}
											>
												{priority.label}
											</span>
										) : (
											<span className="text-sm text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell>
										{assignee ? (
											<div className="flex items-center gap-1.5">
												<Avatar className="size-5">
													{assignee.image && <AvatarImage src={assignee.image} />}
													<AvatarFallback className="text-[10px]">
														{(assignee.name ?? assignee.email ?? "?")
															.slice(0, 2)
															.toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<span className="truncate text-sm">
													{assignee.name ?? assignee.email ?? "—"}
												</span>
											</div>
										) : (
											<span className="text-sm text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										<span
											className={cn(
												"text-sm",
												stagnant && "font-medium text-destructive",
											)}
										>
											{days}
										</span>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{formatDate(lead.createdAt)}
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>

		<BulkActionsBar
			selectedIds={Array.from(selected)}
			onClear={() => setSelected(new Set())}
			stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
			members={members}
			organizationSlug={organizationSlug}
		/>
		</>
	);
}

// ============================================================
// Helpers
// ============================================================

function SortableHeader({
	sortKey,
	label,
	activeSort,
	onToggle,
	align,
}: {
	sortKey: SortKey;
	label: string;
	activeSort: SortKey;
	onToggle: (k: SortKey) => void;
	align?: "right";
}) {
	const active = activeSort === sortKey;
	return (
		<TableHead className={align === "right" ? "text-right" : undefined}>
			<button
				type="button"
				onClick={() => onToggle(sortKey)}
				className={cn(
					"inline-flex items-center gap-1 text-sm transition-colors",
					active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
				)}
			>
				{label}
				{active ? (
					<ArrowDownIcon className="size-3" />
				) : (
					<ArrowUpDownIcon className="size-3 opacity-50" />
				)}
			</button>
		</TableHead>
	);
}

function computeDaysInStage(lead: PipelineListLead): number {
	const stageDate = lead.stageDates?.[lead.stageId];
	const entered = stageDate ? new Date(stageDate) : new Date(lead.createdAt);
	return Math.max(
		0,
		Math.floor((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24)),
	);
}

function formatCurrency(value: string | null, currency: string | null): string {
	if (!value) return "—";
	const num = Number(value);
	if (!Number.isFinite(num)) return "—";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: currency ?? "BRL",
	}).format(num);
}

function formatDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
	});
}
