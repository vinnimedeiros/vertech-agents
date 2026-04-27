"use client";

import { Button } from "@ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { cn } from "@ui/lib";
import { FilterIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useViewState } from "../lib/use-view-state";
import type {
	OrgMemberOption,
	PipelineViewRow,
	StatusTemplateRow,
} from "../lib/server";
import {
	activeFilterCount,
	type ViewState,
} from "../lib/view-filters";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { FiltersPopover } from "./FiltersPopover";
import {
	type PipelineOption,
	PipelineSelector,
} from "./PipelineSelector";
import { PipelinePeriodFilter } from "./PipelinePeriodFilter";
import { PipelineViewSwitcher } from "./PipelineViewSwitcher";
import {
	type EditableStage,
	StageEditorModal,
} from "./StageEditorModal";

type PipelineShellProps = {
	organizationId: string;
	organizationSlug: string;
	pipelineId: string;
	pipelineName: string;
	pipelines: PipelineOption[];
	stages: EditableStage[];
	leadCountByStage: Record<string, number>;
	basePath: string;
	views: PipelineViewRow[];
	activeViewId: string | null;
	currentState: ViewState;
	baseState: ViewState | null;
	members: OrgMemberOption[];
	templates: StatusTemplateRow[];
	totalLeads: number;
	visibleLeads: number;
	children: React.ReactNode;
};

const HEADER_BUTTON =
	"h-7 gap-1.5 px-2.5 text-[11.5px] font-medium bg-card text-foreground shadow-sm ring-1 ring-foreground/10 hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10 active:shadow-none border-transparent";

export function PipelineShell({
	organizationId,
	organizationSlug,
	pipelineId,
	pipelineName,
	pipelines,
	stages,
	leadCountByStage,
	basePath,
	views: _views,
	activeViewId: _activeViewId,
	currentState,
	baseState,
	members,
	totalLeads,
	visibleLeads,
	templates,
	children,
}: PipelineShellProps) {
	const [stageEditorOpen, setStageEditorOpen] = useState(false);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const {
		currentState: liveState,
		applyState,
		resetToBase,
	} = useViewState(basePath, baseState);

	const effectiveState = liveState ?? currentState;
	const activeCount =
		activeFilterCount(effectiveState.filters) +
		(effectiveState.sortBy !== "none" ? 1 : 0);

	return (
		<>
			<div className="flex shrink-0 flex-col gap-2.5">
				<div className="flex flex-wrap items-center gap-2">
					<PipelineSelector
						organizationId={organizationId}
						organizationSlug={organizationSlug}
						activePipelineId={pipelineId}
						pipelines={pipelines}
						templates={templates}
					/>

					<PipelineViewSwitcher
						basePath={basePath}
						activeMode={effectiveState.viewMode}
					/>

					<div className="ml-auto flex shrink-0 items-center gap-2">
						<PipelinePeriodFilter
							currentState={effectiveState}
							onChange={applyState}
						/>

						<Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="sm"
									aria-pressed={filtersOpen}
									className={cn(
										HEADER_BUTTON,
										filtersOpen && "bg-foreground/10 ring-foreground/20",
									)}
								>
									<FilterIcon className="size-3.5" />
									Filtros
									{activeCount > 0 ? (
										<span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/15 px-1 text-[10px] font-semibold text-foreground">
											{activeCount}
										</span>
									) : null}
								</Button>
							</PopoverTrigger>
							<PopoverContent
								align="end"
								sideOffset={6}
								className="w-auto p-0"
							>
								<FiltersPopover
									currentState={effectiveState}
									members={members}
									totalLeads={totalLeads}
									visibleLeads={visibleLeads}
									onApply={(next) => applyState(next)}
									onReset={resetToBase}
									onClose={() => setFiltersOpen(false)}
								/>
							</PopoverContent>
						</Popover>

						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setStageEditorOpen(true)}
							className={HEADER_BUTTON}
						>
							<SettingsIcon className="size-3.5" />
							Estágios
						</Button>
					</div>
				</div>

				{activeCount > 0 ? (
					<ActiveFilterChips
						currentState={effectiveState}
						members={members}
						onChange={applyState}
					/>
				) : null}
			</div>

			<div className="mt-3 flex min-h-0 flex-1 items-stretch gap-3 overflow-hidden">
				<div className="min-w-0 flex-1 overflow-y-auto pr-1">{children}</div>
			</div>

			<StageEditorModal
				open={stageEditorOpen}
				onOpenChange={setStageEditorOpen}
				pipelineId={pipelineId}
				pipelineName={pipelineName}
				organizationSlug={organizationSlug}
				stages={stages}
				leadCountByStage={leadCountByStage}
			/>
		</>
	);
}
