"use client";

import { DateRangePickerButton } from "@saas/shared/components/DateRangePickerButton";
import { SegmentedToggle } from "@saas/shared/components/SegmentedToggle";
import type { ViewFiltersState, ViewState } from "../lib/view-filters";

type Props = {
	currentState: ViewState;
	onChange: (next: ViewState) => void;
};

const ISO_DATE = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Filtro período do pipeline — toggle preset + botão calendar shadcn pra
 * range custom. Aplica em quadro E painel (mesma data, views diferentes).
 */
export function PipelinePeriodFilter({ currentState, onChange }: Props) {
	const f = currentState.filters;
	const preset = f.periodPreset ?? "all";
	const customRange =
		preset === "custom" && f.periodFrom && f.periodTo
			? {
					from: new Date(f.periodFrom),
					to: new Date(f.periodTo),
				}
			: undefined;

	function setPreset(key: string) {
		const k = key as ViewFiltersState["periodPreset"];
		onChange({
			...currentState,
			filters: {
				...f,
				periodPreset: k === "all" ? undefined : k,
				periodFrom: undefined,
				periodTo: undefined,
			},
		});
	}

	function setCustomRange(
		range: { from?: Date; to?: Date } | undefined,
	) {
		if (!range?.from || !range?.to) {
			onChange({
				...currentState,
				filters: {
					...f,
					periodPreset: undefined,
					periodFrom: undefined,
					periodTo: undefined,
				},
			});
			return;
		}
		onChange({
			...currentState,
			filters: {
				...f,
				periodPreset: "custom",
				periodFrom: ISO_DATE(range.from),
				periodTo: ISO_DATE(range.to),
			},
		});
	}

	return (
		<div className="inline-flex items-center gap-1.5">
			<SegmentedToggle
				items={[
					{ key: "all", label: "Tudo" },
					{ key: "today", label: "Hoje" },
					{ key: "7d", label: "7d" },
					{ key: "30d", label: "30d" },
					{ key: "month", label: "Mês" },
				]}
				current={preset === "custom" ? "all" : preset}
				onChange={setPreset}
			/>
			<DateRangePickerButton
				value={customRange}
				onChange={setCustomRange}
			/>
		</div>
	);
}
