import type { SortKey, ViewFiltersState } from "./view-filters";

// ============================================================
// Shape mínimo que aceitamos pra filtrar/ordenar. Campos extras ignorados.
// ============================================================

export type FilterableLead = {
	id: string;
	title: string | null;
	value: string | null;
	stageId: string;
	priority: string | null;
	temperature: string | null;
	assignedTo: string | null;
	createdAt: Date | string;
	stageDates?: Record<string, string> | null;
	contact?: {
		name?: string | null;
		email?: string | null;
		phone?: string | null;
		company?: string | null;
	} | null;
};

export type FilterableStage = {
	id: string;
	isClosing?: boolean;
	maxDays?: number | null;
};

function matchesText(lead: FilterableLead, q: string): boolean {
	const needle = q.toLowerCase();
	if (lead.title?.toLowerCase().includes(needle)) return true;
	const c = lead.contact;
	if (c?.name?.toLowerCase().includes(needle)) return true;
	if (c?.email?.toLowerCase().includes(needle)) return true;
	if (c?.phone?.toLowerCase().includes(needle)) return true;
	if (c?.company?.toLowerCase().includes(needle)) return true;
	return false;
}

function daysSince(isoLike: string | Date): number {
	const d = typeof isoLike === "string" ? new Date(isoLike) : isoLike;
	const ms = Date.now() - d.getTime();
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function daysInStageFor(
	lead: FilterableLead,
	fallbackDate: string | Date,
): number {
	const entered = lead.stageDates?.[lead.stageId];
	return daysSince(entered ?? fallbackDate);
}

export function isStagnant(
	lead: FilterableLead,
	stage: FilterableStage | undefined,
): boolean {
	if (!stage?.maxDays || stage.maxDays <= 0) return false;
	return daysInStageFor(lead, lead.createdAt) > stage.maxDays;
}

export function filterLeads<T extends FilterableLead>(
	leads: T[],
	filters: ViewFiltersState,
	stagesById: Record<string, FilterableStage>,
): T[] {
	let result = leads;

	if (!filters.includeClosed) {
		result = result.filter((l) => !stagesById[l.stageId]?.isClosing);
	}

	if (filters.searchQuery?.trim()) {
		const q = filters.searchQuery.trim();
		result = result.filter((l) => matchesText(l, q));
	}

	if (filters.priorities?.length) {
		const set = new Set<string>(filters.priorities);
		result = result.filter((l) => (l.priority ? set.has(l.priority) : false));
	}

	if (filters.temperatures?.length) {
		const set = new Set<string>(filters.temperatures);
		result = result.filter((l) =>
			l.temperature ? set.has(l.temperature) : false,
		);
	}

	if (filters.assigneeIds?.length) {
		const set = new Set(filters.assigneeIds);
		result = result.filter((l) => (l.assignedTo ? set.has(l.assignedTo) : false));
	}

	if (filters.valueMin != null) {
		const min = filters.valueMin;
		result = result.filter((l) => {
			const v = l.value ? Number(l.value) : 0;
			return v >= min;
		});
	}
	if (filters.valueMax != null) {
		const max = filters.valueMax;
		result = result.filter((l) => {
			const v = l.value ? Number(l.value) : 0;
			return v <= max;
		});
	}

	if (filters.onlyStagnant) {
		result = result.filter((l) => isStagnant(l, stagesById[l.stageId]));
	}

	return result;
}

const PRIORITY_ORDER: Record<string, number> = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3,
};

export function sortLeads<T extends FilterableLead>(
	leads: T[],
	sortBy: SortKey,
): T[] {
	if (sortBy === "none") return leads;
	const copy = [...leads];
	switch (sortBy) {
		case "priority":
			copy.sort(
				(a, b) =>
					(PRIORITY_ORDER[a.priority ?? ""] ?? 99) -
					(PRIORITY_ORDER[b.priority ?? ""] ?? 99),
			);
			break;
		case "date":
			copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
			break;
		case "name":
			copy.sort((a, b) =>
				(a.title ?? a.contact?.name ?? "").localeCompare(
					b.title ?? b.contact?.name ?? "",
					"pt-BR",
				),
			);
			break;
		case "value":
			copy.sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0));
			break;
		case "daysInStage":
			copy.sort(
				(a, b) =>
					daysInStageFor(b, b.createdAt) - daysInStageFor(a, a.createdAt),
			);
			break;
	}
	return copy;
}
