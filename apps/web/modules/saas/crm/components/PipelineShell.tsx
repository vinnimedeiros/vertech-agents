"use client";

import { Button } from "@ui/components/button";
import { FilterIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useViewState } from "../lib/use-view-state";
import type { OrgMemberOption, PipelineViewRow } from "../lib/server";
import {
	activeFilterCount,
	type ViewState,
} from "../lib/view-filters";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { FiltersSidePanel } from "./FiltersSidePanel";
import {
	type PipelineOption,
	PipelineSelector,
} from "./PipelineSelector";
import { PipelineViewSwitcher } from "./PipelineViewSwitcher";
import { SavedViewTabs } from "./SavedViewTabs";
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
	totalLeads: number;
	visibleLeads: number;
	children: React.ReactNode;
};

export function PipelineShell({
	organizationId,
	organizationSlug,
	pipelineId,
	pipelineName,
	pipelines,
	stages,
	leadCountByStage,
	basePath,
	views,
	activeViewId,
	currentState,
	baseState,
	members,
	totalLeads,
	visibleLeads,
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
			<div className="space-y-3">
				{/* Linha principal: tudo em linha única */}
				<div className="flex items-center gap-2">
					<PipelineSelector
						organizationId={organizationId}
						organizationSlug={organizationSlug}
						activePipelineId={pipelineId}
						pipelines={pipelines}
					/>

					<div className="h-5 w-px bg-border/60" />

					<PipelineViewSwitcher
						basePath={basePath}
						activeMode={effectiveState.viewMode}
					/>

					<div className="h-5 w-px bg-border/60" />

					<div className="flex min-w-0 flex-1 items-center overflow-x-auto">
						<SavedViewTabs
							pipelineId={pipelineId}
							organizationSlug={organizationSlug}
							views={views}
							activeViewId={activeViewId}
							currentState={effectiveState}
							basePath={basePath}
						/>
					</div>

					<div className="ml-auto flex shrink-0 items-center gap-2">
						<Button
							type="button"
							variant={filtersOpen ? "primary" : "outline"}
							size="sm"
							onClick={() => setFiltersOpen((o) => !o)}
							className="gap-1.5"
							aria-pressed={filtersOpen}
						>
							<FilterIcon className="size-3.5" />
							Filtros
							{activeCount > 0 && (
								<span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/30 px-1 text-[10px] font-semibold">
									{activeCount}
								</span>
							)}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setStageEditorOpen(true)}
						>
							<SettingsIcon className="size-3.5" />
							Estágios
						</Button>
					</div>
				</div>

				{/* Chips de filtros ativos (aparece só quando há algo) */}
				{activeCount > 0 && (
					<ActiveFilterChips
						currentState={effectiveState}
						members={members}
						onChange={applyState}
					/>
				)}

				<div className="-mx-4 md:-mx-6 h-0.5 bg-border/80" />
			</div>

			{/* Layout inline: painel à esquerda + conteúdo à direita */}
			<div className="flex items-stretch gap-4">
				{filtersOpen && (
					<FiltersSidePanel
						currentState={effectiveState}
						members={members}
						totalLeads={totalLeads}
						visibleLeads={visibleLeads}
						onApply={(next) => {
							applyState(next);
						}}
						onReset={resetToBase}
						onClose={() => setFiltersOpen(false)}
					/>
				)}
				<div className="min-w-0 flex-1">{children}</div>
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
