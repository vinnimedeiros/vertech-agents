import { z } from "zod";

// ============================================================
// Tipos compartilhados de filtros/visões do pipeline (Phase 04E.3+04E.4)
// ============================================================

export const VIEW_MODES = ["kanban", "list", "dashboard"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const SORT_KEYS = [
	"none",
	"priority",
	"date",
	"name",
	"value",
	"daysInStage",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const TEMPERATURES = ["COLD", "WARM", "HOT"] as const;

export const viewFiltersStateSchema = z.object({
	searchQuery: z.string().optional(),
	assigneeIds: z.array(z.string()).optional(),
	priorities: z.array(z.enum(PRIORITIES)).optional(),
	temperatures: z.array(z.enum(TEMPERATURES)).optional(),
	valueMin: z.number().nonnegative().nullable().optional(),
	valueMax: z.number().nonnegative().nullable().optional(),
	onlyStagnant: z.boolean().optional(),
	includeClosed: z.boolean().optional(),
});

export type ViewFiltersState = z.infer<typeof viewFiltersStateSchema>;

export const EMPTY_FILTERS: ViewFiltersState = {};

export const viewModeSchema = z.enum(VIEW_MODES);
export const sortKeySchema = z.enum(SORT_KEYS);

/** Config completa de uma visão (o que a tab carrega ao ser clicada). */
export const viewStateSchema = z.object({
	filters: viewFiltersStateSchema.default({}),
	viewMode: viewModeSchema.default("kanban"),
	sortBy: sortKeySchema.default("none"),
});
export type ViewState = z.infer<typeof viewStateSchema>;

// ============================================================
// Helpers
// ============================================================

export function isFiltersEmpty(f: ViewFiltersState | null | undefined): boolean {
	if (!f) return true;
	if (f.searchQuery?.trim()) return false;
	if (f.assigneeIds?.length) return false;
	if (f.priorities?.length) return false;
	if (f.temperatures?.length) return false;
	if (f.valueMin != null) return false;
	if (f.valueMax != null) return false;
	if (f.onlyStagnant) return false;
	if (f.includeClosed) return false;
	return true;
}

export function activeFilterCount(f: ViewFiltersState | null | undefined): number {
	if (!f) return 0;
	let n = 0;
	if (f.searchQuery?.trim()) n++;
	if (f.assigneeIds?.length) n++;
	if (f.priorities?.length) n++;
	if (f.temperatures?.length) n++;
	if (f.valueMin != null || f.valueMax != null) n++;
	if (f.onlyStagnant) n++;
	if (f.includeClosed) n++;
	return n;
}

export function viewStateEquals(a: ViewState, b: ViewState): boolean {
	if (a.viewMode !== b.viewMode) return false;
	if (a.sortBy !== b.sortBy) return false;
	return filtersEquals(a.filters, b.filters);
}

function filtersEquals(a: ViewFiltersState, b: ViewFiltersState): boolean {
	if ((a.searchQuery ?? "") !== (b.searchQuery ?? "")) return false;
	if (!arrEquals(a.assigneeIds, b.assigneeIds)) return false;
	if (!arrEquals(a.priorities, b.priorities)) return false;
	if (!arrEquals(a.temperatures, b.temperatures)) return false;
	if ((a.valueMin ?? null) !== (b.valueMin ?? null)) return false;
	if ((a.valueMax ?? null) !== (b.valueMax ?? null)) return false;
	if (!!a.onlyStagnant !== !!b.onlyStagnant) return false;
	if (!!a.includeClosed !== !!b.includeClosed) return false;
	return true;
}

function arrEquals(a?: string[] | null, b?: string[] | null): boolean {
	const xa = a ?? [];
	const xb = b ?? [];
	if (xa.length !== xb.length) return false;
	const sa = [...xa].sort();
	const sb = [...xb].sort();
	return sa.every((v, i) => v === sb[i]);
}
