"use client";

import { cn } from "@ui/lib";
import { XIcon } from "lucide-react";
import type { OrgMemberOption } from "../lib/server";
import type {
	SortKey,
	ViewFiltersState,
	ViewState,
} from "../lib/view-filters";

const PRIORITY_LABELS: Record<string, string> = {
	LOW: "Baixa",
	NORMAL: "Normal",
	HIGH: "Alta",
	URGENT: "Urgente",
};

const TEMPERATURE_LABELS: Record<string, string> = {
	COLD: "Frio",
	WARM: "Morno",
	HOT: "Quente",
};

const SORT_LABELS: Record<SortKey, string> = {
	none: "",
	priority: "Prioridade",
	date: "Data",
	name: "Nome",
	value: "Valor",
	daysInStage: "Dias na etapa",
};

type ActiveFilterChipsProps = {
	currentState: ViewState;
	members: OrgMemberOption[];
	onChange: (next: ViewState) => void;
};

export function ActiveFilterChips({
	currentState,
	members,
	onChange,
}: ActiveFilterChipsProps) {
	const { filters, sortBy } = currentState;
	const chips: { key: string; label: string; onRemove: () => void }[] = [];

	if (filters.searchQuery?.trim()) {
		chips.push({
			key: "search",
			label: `"${filters.searchQuery.trim()}"`,
			onRemove: () =>
				onChange({
					...currentState,
					filters: { ...filters, searchQuery: undefined },
				}),
		});
	}

	if (filters.assigneeIds?.length) {
		const names = filters.assigneeIds
			.map((id) => {
				const m = members.find((x) => x.userId === id);
				return m?.name ?? m?.email ?? id.slice(0, 6);
			})
			.join(", ");
		chips.push({
			key: "assignees",
			label: names,
			onRemove: () =>
				onChange({
					...currentState,
					filters: { ...filters, assigneeIds: undefined },
				}),
		});
	}

	if (filters.priorities?.length) {
		const labels = filters.priorities
			.map((p) => PRIORITY_LABELS[p] ?? p)
			.join(", ");
		chips.push({
			key: "priorities",
			label: `Prioridade: ${labels}`,
			onRemove: () =>
				onChange({
					...currentState,
					filters: { ...filters, priorities: undefined },
				}),
		});
	}

	if (filters.temperatures?.length) {
		const labels = filters.temperatures
			.map((t) => TEMPERATURE_LABELS[t] ?? t)
			.join(", ");
		chips.push({
			key: "temperatures",
			label: `Temperatura: ${labels}`,
			onRemove: () =>
				onChange({
					...currentState,
					filters: { ...filters, temperatures: undefined },
				}),
		});
	}

	if (filters.valueMin != null || filters.valueMax != null) {
		const min =
			filters.valueMin != null
				? `R$ ${formatBRL(filters.valueMin)}`
				: "—";
		const max =
			filters.valueMax != null
				? `R$ ${formatBRL(filters.valueMax)}`
				: "—";
		chips.push({
			key: "value",
			label: `Valor: ${min} até ${max}`,
			onRemove: () =>
				onChange({
					...currentState,
					filters: {
						...filters,
						valueMin: undefined,
						valueMax: undefined,
					},
				}),
		});
	}

	if (filters.onlyStagnant) {
		chips.push({
			key: "stagnant",
			label: "Só estagnados",
			onRemove: () =>
				onChange({
					...currentState,
					filters: { ...filters, onlyStagnant: undefined },
				}),
		});
	}

	if (filters.includeClosed) {
		chips.push({
			key: "closed",
			label: "Com fechados",
			onRemove: () =>
				onChange({
					...currentState,
					filters: { ...filters, includeClosed: undefined },
				}),
		});
	}

	if (sortBy !== "none") {
		chips.push({
			key: "sort",
			label: `Ordenar: ${SORT_LABELS[sortBy]}`,
			onRemove: () => onChange({ ...currentState, sortBy: "none" }),
		});
	}

	if (chips.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{chips.map((chip) => (
				<FilterChip
					key={chip.key}
					label={chip.label}
					onRemove={chip.onRemove}
				/>
			))}
		</div>
	);
}

function FilterChip({
	label,
	onRemove,
}: {
	label: string;
	onRemove: () => void;
}) {
	return (
		<div
			className={cn(
				"inline-flex items-center gap-1 rounded-full border bg-muted/50 pl-2.5 pr-1 text-xs",
			)}
		>
			<span className="max-w-[160px] truncate py-1">{label}</span>
			<button
				type="button"
				onClick={onRemove}
				className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
				aria-label={`Remover filtro ${label}`}
			>
				<XIcon className="size-3" />
			</button>
		</div>
	);
}

function formatBRL(n: number): string {
	return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
