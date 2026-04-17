"use client";

import { Button } from "@ui/components/button";
import { SettingsIcon } from "lucide-react";
import { useState } from "react";
import { NewLeadDialog } from "./NewLeadDialog";
import { type PipelineOption, PipelineSelector } from "./PipelineSelector";
import { PipelineViewSwitcher } from "./PipelineViewSwitcher";
import { type EditableStage, StageEditorModal } from "./StageEditorModal";

type PipelineToolbarProps = {
	organizationId: string;
	organizationSlug: string;
	pipelineId: string;
	pipelineName: string;
	pipelines: PipelineOption[];
	stages: EditableStage[];
	leadCountByStage: Record<string, number>;
	basePath: string;
};

export function PipelineToolbar({
	organizationId,
	organizationSlug,
	pipelineId,
	pipelineName,
	pipelines,
	stages,
	leadCountByStage,
	basePath,
}: PipelineToolbarProps) {
	const [stageEditorOpen, setStageEditorOpen] = useState(false);

	const stageOptions = stages
		.filter((s) => s.category !== "WON" && s.category !== "LOST")
		.sort((a, b) => a.position - b.position)
		.map((s) => ({
			id: s.id,
			name: s.name,
			isClosing: s.category === "WON" || s.category === "LOST",
			position: s.position,
		}));

	return (
		<>
			<div className="flex flex-wrap items-center gap-2">
				<PipelineSelector
					organizationId={organizationId}
					organizationSlug={organizationSlug}
					activePipelineId={pipelineId}
					pipelines={pipelines}
				/>

				<div className="h-5 w-px bg-border/60" />

				<PipelineViewSwitcher basePath={basePath} />

				<div className="h-5 w-px bg-border/60" />

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setStageEditorOpen(true)}
				>
					<SettingsIcon className="size-3.5" />
					Estágios
				</Button>

				<NewLeadDialog
					organizationId={organizationId}
					organizationSlug={organizationSlug}
					pipelineId={pipelineId}
					stages={stageOptions}
				/>
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
