"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Switch } from "@ui/components/switch";
import { cn } from "@ui/lib";
import {
	AlertTriangleIcon,
	ArchiveIcon,
	DollarSignIcon,
	FlagIcon,
	SearchIcon,
	ThermometerIcon,
	UserIcon,
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

type Props = {
	currentState: ViewState;
	members: OrgMemberOption[];
	totalLeads: number;
	visibleLeads: number;
	onApply: (next: ViewState) => void;
	onReset: () => void;
	onClose: () => void;
};

/**
 * Popover de filtros — 2 colunas com separador vertical. Substitui
 * `FiltersSidePanel` antigo (side panel sem rolagem). Largura confortável
 * (480px), max-height com overflow interno.
 *
 * Renderizado dentro de `<Popover>` no PipelineShell, ancorado no botão
 * Filtros com align="end".
 */
export function FiltersPopover({
	currentState,
	members,
	totalLeads,
	visibleLeads,
	onApply,
	onReset,
	onClose,
}: Props) {
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
		<div className="flex w-[480px] flex-col">
			<header className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
				<div>
					<h3 className="text-[13px] font-semibold text-foreground">Filtros</h3>
					<p className="text-[10.5px] text-foreground/55">
						Mostrando{" "}
						<span className="font-medium text-foreground">
							{visibleLeads}
						</span>{" "}
						de {totalLeads} leads
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => {
						onReset();
					}}
					disabled={activeCount === 0}
					className="h-7 px-2 text-[11.5px] text-foreground/60"
				>
					Limpar
				</Button>
			</header>

			<div className="grid max-h-[480px] grid-cols-[1fr_auto_1fr] gap-0 overflow-hidden">
				<div className="flex flex-col gap-3.5 overflow-y-auto px-4 py-3.5">
					<Section icon={SearchIcon} title="Buscar">
						<Input
							placeholder="Nome, telefone, empresa…"
							value={f.searchQuery ?? ""}
							onChange={(e) =>
								patch({ searchQuery: e.target.value || undefined })
							}
							className="h-7 text-[12px]"
						/>
					</Section>

					<Section icon={UserIcon} title="Responsável">
						{members.length === 0 ? (
							<p className="text-[11px] text-foreground/55">Nenhum membro</p>
						) : (
							<div className="max-h-32 space-y-0.5 overflow-y-auto">
								{members.map((m) => {
									const active = f.assigneeIds?.includes(m.userId) ?? false;
									return (
										<button
											key={m.userId}
											type="button"
											onClick={() => toggleArr("assigneeIds", m.userId)}
											className={cn(
												"flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[12px] transition-colors",
												active
													? "bg-foreground/10"
													: "hover:bg-foreground/5",
											)}
										>
											<Checkbox
												checked={active}
												tabIndex={-1}
												className="size-3.5"
											/>
											<Avatar className="size-5">
												{m.image ? <AvatarImage src={m.image} /> : null}
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
						<div className="space-y-0.5">
							{PRIORITIES.map((p) => (
								<CheckRow
									key={p}
									checked={f.priorities?.includes(p) ?? false}
									onToggle={() => toggleArr("priorities", p)}
									label={PRIORITY_LABELS[p]}
								/>
							))}
						</div>
					</Section>

					<Section icon={ThermometerIcon} title="Temperatura">
						<div className="space-y-0.5">
							{TEMPERATURES.map((t) => (
								<CheckRow
									key={t}
									checked={f.temperatures?.includes(t) ?? false}
									onToggle={() => toggleArr("temperatures", t)}
									label={TEMPERATURE_LABELS[t]}
								/>
							))}
						</div>
					</Section>
				</div>

				<div className="w-px bg-border/40" />

				<div className="flex flex-col gap-3.5 overflow-y-auto px-4 py-3.5">
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
								className="h-7 text-[12px]"
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
								className="h-7 text-[12px]"
							/>
						</div>
					</Section>

					<Section title="Avançado">
						<div className="space-y-2">
							<ToggleRow
								icon={AlertTriangleIcon}
								label="Só estagnados"
								checked={!!f.onlyStagnant}
								onCheckedChange={(v) =>
									patch({ onlyStagnant: v || undefined })
								}
							/>
							<ToggleRow
								icon={ArchiveIcon}
								label="Mostrar perdidos/fechados"
								checked={!!f.includeClosed}
								onCheckedChange={(v) =>
									patch({ includeClosed: v || undefined })
								}
							/>
						</div>
					</Section>

					<Section title="Ordenar por">
						<div className="space-y-0.5">
							{SORT_OPTIONS.map((opt) => (
								<button
									key={opt.value}
									type="button"
									onClick={() =>
										setDraft((d) => ({ ...d, sortBy: opt.value }))
									}
									className={cn(
										"flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[12px] transition-colors",
										draft.sortBy === opt.value
											? "bg-foreground/10 text-foreground"
											: "hover:bg-foreground/5 text-foreground/70",
									)}
								>
									<span
										className={cn(
											"size-2.5 rounded-full border",
											draft.sortBy === opt.value
												? "border-foreground bg-foreground"
												: "border-foreground/30",
										)}
									/>
									{opt.label}
								</button>
							))}
						</div>
					</Section>
				</div>
			</div>

			<footer className="flex items-center justify-end gap-1.5 border-t border-border/40 px-4 py-2.5">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onClose}
					className="h-7 px-2.5 text-[11.5px]"
				>
					Cancelar
				</Button>
				<Button
					type="button"
					size="sm"
					onClick={() => {
						onApply(draft);
						onClose();
					}}
					className="h-7 px-3 text-[11.5px]"
				>
					Aplicar
				</Button>
			</footer>
		</div>
	);
}

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
		<div className="flex flex-col gap-1.5">
			<Label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/55">
				{Icon ? <Icon className="size-3" /> : null}
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
				"flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[12px] transition-colors",
				checked ? "bg-foreground/10" : "hover:bg-foreground/5",
			)}
		>
			<Checkbox checked={checked} tabIndex={-1} className="size-3.5" />
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
		<div className="flex items-center gap-2">
			<Icon className="size-3 text-foreground/55" />
			<Label className="flex-1 cursor-pointer text-[12px] text-foreground/85">
				{label}
			</Label>
			<Switch
				checked={checked}
				onCheckedChange={onCheckedChange}
				className="scale-75"
			/>
		</div>
	);
}
