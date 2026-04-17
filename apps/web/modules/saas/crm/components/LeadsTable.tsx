"use client";

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
} from "lucide-react";
import { useMemo, useState } from "react";
import { LeadDetailSheet } from "./LeadDetailSheet";

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
};

type LeadsTableProps = {
	organizationSlug: string;
	leads: LeadRow[];
	stages: SheetStage[];
	emptyMessage?: string;
	hideStageFilter?: boolean;
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
	emptyMessage = "Nenhum lead encontrado.",
	hideStageFilter = false,
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
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative flex-1 min-w-[200px]">
					<SearchIcon className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-foreground/40" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar por nome, email, telefone…"
						className="pl-8"
					/>
				</div>
				{!hideStageFilter ? (
					<Select value={stageFilter} onValueChange={setStageFilter}>
						<SelectTrigger className="w-44">
							<SelectValue placeholder="Estágio" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">
								Todos os estágios
							</SelectItem>
							{stages.map((s) => (
								<SelectItem key={s.id} value={s.id}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : null}
				<Select value={tempFilter} onValueChange={setTempFilter}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="Temperatura" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todas</SelectItem>
						<SelectItem value="COLD">Frio</SelectItem>
						<SelectItem value="WARM">Morno</SelectItem>
						<SelectItem value="HOT">Quente</SelectItem>
					</SelectContent>
				</Select>
				<span className="text-foreground/50 text-xs tabular-nums">
					{filtered.length} / {leads.length}
				</span>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Contato</TableHead>
							<TableHead>Título</TableHead>
							<TableHead>Estágio</TableHead>
							<TableHead className="text-right">Valor</TableHead>
							<TableHead>Temperatura</TableHead>
							<TableHead>Prioridade</TableHead>
							<TableHead>Atualizado</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="text-center text-foreground/40 text-sm"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						) : (
							filtered.map((l) => {
								const temp = TEMPERATURE_CONFIG[l.temperature];
								return (
									<TableRow
										key={l.id}
										className="cursor-pointer"
										onClick={() => openLead(l.id)}
									>
										<TableCell>
											<div className="font-medium text-foreground">
												{l.contact.name}
											</div>
											<div className="text-foreground/50 text-xs">
												{l.contact.email ??
													l.contact.phone ??
													"—"}
											</div>
										</TableCell>
										<TableCell className="text-foreground/80">
											{l.title ?? "—"}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1.5 text-sm">
												<span
													className="size-2 rounded-full"
													style={{
														backgroundColor:
															l.stage.color,
													}}
												/>
												{l.stage.name}
											</div>
										</TableCell>
										<TableCell className="text-right font-medium tabular-nums">
											{formatCurrency(
												l.value,
												l.currency,
											)}
										</TableCell>
										<TableCell>
											<span
												className={cn(
													"flex items-center gap-1 text-sm",
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
										<TableCell className="text-foreground/60 text-xs">
											{formatDate(l.updatedAt)}
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</div>

			<LeadDetailSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				leadId={selectedLeadId}
				organizationSlug={organizationSlug}
				stages={stages}
			/>
		</div>
	);
}
