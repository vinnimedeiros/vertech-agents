"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { SortKey, ViewFiltersState, ViewMode, ViewState } from "./view-filters";
import {
	PARAM,
	readCurrentStateFromParams,
	writeStateToParams,
} from "./view-params";

/**
 * Hook client-side que lê e escreve o currentState via URL search params.
 * baseState = estado da visão ativa (ou null); os params da URL sobrescrevem em cima.
 */
export function useViewState(basePath: string, baseState: ViewState | null) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const currentState = useMemo<ViewState>(
		() =>
			readCurrentStateFromParams(
				searchParams
					? { get: (k) => searchParams.get(k) }
					: { get: () => null },
				baseState ?? undefined,
			),
		[searchParams, baseState],
	);

	const navigate = useCallback(
		(newParams: URLSearchParams) => {
			const qs = newParams.toString();
			router.push(qs ? `${basePath}?${qs}` : basePath);
		},
		[router, basePath],
	);

	const applyState = useCallback(
		(next: ViewState) => {
			const p = new URLSearchParams(searchParams?.toString() ?? "");
			const merged = writeStateToParams(p, next);
			navigate(merged);
		},
		[searchParams, navigate],
	);

	const patchState = useCallback(
		(patch: Partial<ViewState>) => {
			applyState({ ...currentState, ...patch });
		},
		[applyState, currentState],
	);

	const setFilters = useCallback(
		(next: ViewFiltersState) => patchState({ filters: next }),
		[patchState],
	);

	const setSortBy = useCallback(
		(sortBy: SortKey) => patchState({ sortBy }),
		[patchState],
	);

	const setViewMode = useCallback(
		(viewMode: ViewMode) => patchState({ viewMode }),
		[patchState],
	);

	const resetToBase = useCallback(() => {
		// Remove todos os params de filtro, mantém viewId, view (de base), pipelineId
		const p = new URLSearchParams(searchParams?.toString() ?? "");
		p.delete(PARAM.search);
		p.delete(PARAM.priorities);
		p.delete(PARAM.temperatures);
		p.delete(PARAM.assignees);
		p.delete(PARAM.valueMin);
		p.delete(PARAM.valueMax);
		p.delete(PARAM.onlyStagnant);
		p.delete(PARAM.includeClosed);
		p.delete(PARAM.periodPreset);
		p.delete(PARAM.periodFrom);
		p.delete(PARAM.periodTo);
		p.delete(PARAM.sortBy);
		if (!baseState || baseState.viewMode === "kanban") p.delete(PARAM.view);
		navigate(p);
	}, [searchParams, navigate, baseState]);

	return {
		currentState,
		applyState,
		setFilters,
		setSortBy,
		setViewMode,
		resetToBase,
	};
}
