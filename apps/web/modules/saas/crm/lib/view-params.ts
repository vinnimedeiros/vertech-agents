import {
	EMPTY_FILTERS,
	PRIORITIES,
	type SortKey,
	SORT_KEYS,
	TEMPERATURES,
	type ViewFiltersState,
	type ViewMode,
	VIEW_MODES,
	type ViewState,
} from "./view-filters";

/**
 * Nomes curtos dos search params (pra manter URL limpa).
 * Todos opcionais — ausência = default.
 */
export const PARAM = {
	viewId: "viewId",
	view: "view", // kanban | list | dashboard (quando não há viewId ativa)
	search: "q",
	priorities: "pr",
	temperatures: "tp",
	assignees: "as",
	valueMin: "vn",
	valueMax: "vx",
	onlyStagnant: "stg",
	includeClosed: "cls",
	sortBy: "sb",
} as const;

type ReadableParams = {
	get(name: string): string | null;
};

function csvToArr(v: string | null): string[] | undefined {
	if (!v) return undefined;
	const arr = v
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	return arr.length ? arr : undefined;
}

function parseNum(v: string | null): number | undefined {
	if (v == null || v === "") return undefined;
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
}

export function parseFiltersFromParams(sp: ReadableParams): ViewFiltersState {
	const priorities = csvToArr(sp.get(PARAM.priorities))?.filter(
		(p): p is (typeof PRIORITIES)[number] =>
			(PRIORITIES as readonly string[]).includes(p),
	);
	const temperatures = csvToArr(sp.get(PARAM.temperatures))?.filter(
		(t): t is (typeof TEMPERATURES)[number] =>
			(TEMPERATURES as readonly string[]).includes(t),
	);

	const filters: ViewFiltersState = {};
	const q = sp.get(PARAM.search)?.trim();
	if (q) filters.searchQuery = q;
	const assignees = csvToArr(sp.get(PARAM.assignees));
	if (assignees) filters.assigneeIds = assignees;
	if (priorities?.length) filters.priorities = priorities;
	if (temperatures?.length) filters.temperatures = temperatures;
	const vn = parseNum(sp.get(PARAM.valueMin));
	if (vn != null) filters.valueMin = vn;
	const vx = parseNum(sp.get(PARAM.valueMax));
	if (vx != null) filters.valueMax = vx;
	if (sp.get(PARAM.onlyStagnant) === "1") filters.onlyStagnant = true;
	if (sp.get(PARAM.includeClosed) === "1") filters.includeClosed = true;

	return filters;
}

export function parseSortFromParams(sp: ReadableParams): SortKey {
	const v = sp.get(PARAM.sortBy);
	if (v && (SORT_KEYS as readonly string[]).includes(v)) return v as SortKey;
	return "none";
}

export function parseViewModeFromParams(sp: ReadableParams): ViewMode {
	const v = sp.get(PARAM.view);
	if (v && (VIEW_MODES as readonly string[]).includes(v)) return v as ViewMode;
	return "kanban";
}

/**
 * Constrói o currentState lido da URL. Se houver baseState (da view ativa),
 * os params da URL sobrescrevem apenas os campos presentes; caso contrário,
 * começa do EMPTY_FILTERS + "kanban" + "none".
 */
export function readCurrentStateFromParams(
	sp: ReadableParams,
	baseState?: ViewState,
): ViewState {
	const urlFilters = parseFiltersFromParams(sp);
	const urlSort = sp.get(PARAM.sortBy) ? parseSortFromParams(sp) : undefined;
	const urlMode = sp.get(PARAM.view)
		? parseViewModeFromParams(sp)
		: undefined;

	return {
		filters: { ...(baseState?.filters ?? EMPTY_FILTERS), ...urlFilters },
		sortBy: urlSort ?? baseState?.sortBy ?? "none",
		viewMode: urlMode ?? baseState?.viewMode ?? "kanban",
	};
}

/**
 * Escreve um ViewState novo em URLSearchParams mantendo params não-relacionados
 * (ex: pipelineId, viewId) intactos. Limpa params que ficaram com valor default.
 */
export function writeStateToParams(
	existing: URLSearchParams,
	state: ViewState,
): URLSearchParams {
	const p = new URLSearchParams(existing.toString());

	const setOrDelete = (key: string, value: string | undefined | null) => {
		if (value == null || value === "") p.delete(key);
		else p.set(key, value);
	};

	const f = state.filters;
	setOrDelete(PARAM.search, f.searchQuery?.trim() || undefined);
	setOrDelete(PARAM.priorities, f.priorities?.join(",") || undefined);
	setOrDelete(PARAM.temperatures, f.temperatures?.join(",") || undefined);
	setOrDelete(PARAM.assignees, f.assigneeIds?.join(",") || undefined);
	setOrDelete(
		PARAM.valueMin,
		f.valueMin != null ? String(f.valueMin) : undefined,
	);
	setOrDelete(
		PARAM.valueMax,
		f.valueMax != null ? String(f.valueMax) : undefined,
	);
	setOrDelete(PARAM.onlyStagnant, f.onlyStagnant ? "1" : undefined);
	setOrDelete(PARAM.includeClosed, f.includeClosed ? "1" : undefined);
	setOrDelete(
		PARAM.sortBy,
		state.sortBy !== "none" ? state.sortBy : undefined,
	);
	setOrDelete(
		PARAM.view,
		state.viewMode !== "kanban" ? state.viewMode : undefined,
	);

	return p;
}

/**
 * Adapter: Record<string, string | string[] | undefined> (Next.js server) → ReadableParams.
 */
export function paramsFromRecord(
	record: Record<string, string | string[] | undefined>,
): ReadableParams {
	return {
		get(name: string) {
			const v = record[name];
			if (Array.isArray(v)) return v[0] ?? null;
			return v ?? null;
		},
	};
}
