"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Separator } from "@ui/components/separator";
import { Switch } from "@ui/components/switch";
import { cn } from "@ui/lib";
import {
	AlertTriangleIcon,
	ArchiveIcon,
	DollarSignIcon,
	FilterIcon,
	FlagIcon,
	SearchIcon,
	ThermometerIcon,
	UserIcon,
	XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { OrgMemberOption } from "../lib/server";
import {
	type SortKey,
	type ViewFiltersState,
	type ViewState,
	activeFilterCount,
	PRIORITIES,
	TEMPERATURES,
} from "../lib/view-filters";

const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
	LOW: "Baixa",
	NORMAL: "Normal",
	HIGH: "Alta",
	URGENT: "Urgente",
};

const TEMPERATURE_LABELS: Record<(typeof TEMPERATURES)[number], string> = {
	COLD: "Frio",
	WARM: "Morno",
	HOT: "Quente",
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
	{ value: "none", label: "Padrão" },
	{ value: "priority", label: "Prioridade" },
	{ value: "date", label: "Data de criação" },
	{ value: "name", label: "Nome" },
	{ value: "value", label: "Valor" },
	{ value: "daysInStage", label: "Dias na etapa" },
];

type FiltersSidePanelProps = {
	currentState: ViewState;
	members: OrgMemberOption[];
	totalLeads: number;
	visibleLeads: number;
	onApply: (next: ViewState) => void;
	onReset: () => void;
	onClose: () => void;
};

/**
 * Painel de filtros INLINE — faz parte do layout (não é Sheet flutuante).
 * Renderizado ao lado do Kanban/Lista; empurra o conteúdo principal pra direita.
 */
export function FiltersSidePanel({
	currentState,
	members,
	totalLeads,
	visibleLeads,
	onApply,
	onReset,
	onClose,
}: FiltersSidePanelProps) {
	const [draft, setDraft] = useState<ViewState>(currentState);

	useEffect(() => {
		setDraft(currentState);
	}, [currentState]);

	const f = draft.filters;
	const patch = (p: Partial<ViewFiltersState>) =>
		setDraft((d) => ({ ...d, filters: { ...d.filters, ...p } }));

	function toggleArr(
		key: "priorities" | "temperatures" | "assigneeIds",
		value: string,
	) {
		const cur = (f[key] as string[] | undefined) ?? [];
		const next = cur.includes(value)
			? cur.filter((x) => x !== value)
			: [...cur, value];
		patch({
			[key]: next.length ? next : undefined,
		} as Partial<ViewFiltersState>);
	}

	const activeCount =
		activeFilterCount(currentState.filters) +
		(currentState.sortBy !== "none" ? 1 : 0);

	return (
		<aside
			className="flex w-72 shrink-0 flex-col self-stretch rounded-lg border bg-card"
			aria-label="Filtros do pipeline"
		>
			<header className="flex items-center justify-between border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<FilterIcon className="size-4 text-muted-foreground" />
					<span className="text-sm font-semibold">Filtros</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
					aria-label="Fechar filtros"
				>
					<XIcon className="size-4" />
				</button>
			</header>

			<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
				<div className="text-xs text-muted-foreground">
					Mostrando{" "}
					<span className="font-medium text-foreground">{visibleLeads}</span>{" "}
					de {totalLeads} leads
				</div>

				<Section icon={SearchIcon} title="Buscar">
					<Input
						placeholder="Nome, título, empresa…"
						value={f.searchQuery ?? ""}
						onChange={(e) =>
							patch({ searchQuery: e.target.value || undefined })
						}
						className="h-8 text-sm"
					/>
				</Section>

				<Section icon={UserIcon} title="Responsável">
					{members.length === 0 ? (
						<p className="text-xs text-muted-foreground">Nenhum membro</p>
					) : (
						<div className="max-h-40 space-y-0.5 overflow-y-auto">
							{members.map((m) => {
								const active = f.assigneeIds?.includes(m.userId) ?? false;
								return (
									<button
										key={m.userId}
										type="button"
										onClick={() => toggleArr("assigneeIds", m.userId)}
										className={cn(
											"flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors",
											active ? "bg-primary/10" : "hover:bg-muted",
										)}
									>
										<Checkbox checked={active} tabIndex={-1} />
										<Avatar className="size-5">
											{m.image && <AvatarImage src={m.image} />}
											<AvatarFallback className="text-[10px]">
												{(m.name ?? m.email ?? "?")
													.slice(0, 2)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<span className="flex-1 truncate">
											{m.name ?? m.email ?? "Usuário"}
										</span>
									</button>
								);
							})}
						</div>
					)}
				</Section>

				<Section icon={FlagIcon} title="Prioridade">
					<div className="space-y-1">
						{PRIORITIES.map((p) => {
							const active = f.priorities?.includes(p) ?? false;
							return (
								<CheckRow
									key={p}
									checked={active}
									onToggle={() => toggleArr("priorities", p)}
									label={PRIORITY_LABELS[p]}
								/>
							);
						})}
					</div>
				</Section>

				<Section icon={ThermometerIcon} title="Temperatura">
					<div className="space-y-1">
						{TEMPERATURES.map((t) => {
							const active = f.temperatures?.includes(t) ?? false;
							return (
								<CheckRow
									key={t}
									checked={active}
									onToggle={() => toggleArr("temperatures", t)}
									label={TEMPERATURE_LABELS[t]}
								/>
							);
						})}
					</div>
				</Section>

				<Section icon={DollarSignIcon} title="Valor do negócio">
					<div className="flex items-center gap-2">
						<Input
							type="number"
							min={0}
							placeholder="Mín"
							value={f.valueMin ?? ""}
							onChange={(e) => {
								const v = e.target.value;
								patch({ valueMin: v === "" ? undefined : Number(v) });
							}}
							className="h-8 text-sm"
						/>
						<Input
							type="number"
							min={0}
							placeholder="Máx"
							value={f.valueMax ?? ""}
							onChange={(e) => {
								const v = e.target.value;
								patch({ valueMax: v === "" ? undefined : Number(v) });
							}}
							className="h-8 text-sm"
						/>
					</div>
				</Section>

				<Separator />

				<div className="space-y-3">
					<ToggleRow
						icon={AlertTriangleIcon}
						label="Só estagnados"
						checked={!!f.onlyStagnant}
						onCheckedChange={(v) => patch({ onlyStagnant: v || undefined })}
					/>
					<ToggleRow
						icon={ArchiveIcon}
						label="Mostrar perdido/fechado"
						checked={!!f.includeClosed}
						onCheckedChange={(v) => patch({ includeClosed: v || undefined })}
					/>
				</div>

				<Separator />

				<Section title="Ordenar por">
					<div className="space-y-1">
						{SORT_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => setDraft((d) => ({ ...d, sortBy: opt.value }))}
								className={cn(
									"flex w-full items-center rounded px-2 py-1 text-left text-sm transition-colors",
									draft.sortBy === opt.value
										? "bg-primary/10 text-primary"
										: "hover:bg-muted",
								)}
							>
								<div
									className={cn(
										"mr-2 size-3 rounded-full border-2",
										draft.sortBy === opt.value
											? "border-primary bg-primary"
											: "border-muted-foreground/40",
									)}
								/>
								{opt.label}
							</button>
						))}
					</div>
				</Section>
			</div>

			<footer className="flex items-center gap-2 border-t px-4 py-3">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => {
						onReset();
					}}
					disabled={activeCount === 0}
					className="text-xs"
				>
					Limpar
				</Button>
				<Button
					type="button"
					size="sm"
					className="ml-auto"
					onClick={() => onApply(draft)}
				>
					Aplicar
				</Button>
			</footer>
		</aside>
	);
}

// ============================================================
// Sub-components
// ============================================================

function Section({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon?: React.ComponentType<{ className?: string }>;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-1.5">
			<Label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{Icon && <Icon className="size-3" />}
				{title}
			</Label>
			{children}
		</div>
	);
}

function CheckRow({
	checked,
	onToggle,
	label,
}: {
	checked: boolean;
	onToggle: () => void;
	label: string;
}) {
	return (
		<button
			type="button"
			onClick={onToggle}
			className={cn(
				"flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition-colors",
				checked ? "bg-primary/10" : "hover:bg-muted",
			)}
		>
			<Checkbox checked={checked} tabIndex={-1} />
			<span>{label}</span>
		</button>
	);
}

function ToggleRow({
	icon: Icon,
	label,
	checked,
	onCheckedChange,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	checked: boolean;
	onCheckedChange: (v: boolean) => void;
}) {
	return (
		<div className="flex items-center gap-2.5">
			<Icon className="size-3.5 text-muted-foreground" />
			<Label className="flex-1 cursor-pointer text-sm">{label}</Label>
			<Switch checked={checked} onCheckedChange={onCheckedChange} />
		</div>
	);
}
