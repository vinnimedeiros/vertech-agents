"use client";

import { Button } from "@ui/components/button";
import { SettingsIcon } from "lucide-react";
import { useState } from "react";
import {
	type PipelineOption,
	PipelineSelector,
} from "./PipelineSelector";
import { PipelineViewSwitcher } from "./PipelineViewSwitcher";
import {
	type EditableStage,
	StageEditorModal,
} from "./StageEditorModal";

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

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<PipelineSelector
						organizationId={organizationId}
						organizationSlug={organizationSlug}
						activePipelineId={pipelineId}
						pipelines={pipelines}
					/>
					<div className="h-5 w-px bg-border/60" />
					<PipelineViewSwitcher basePath={basePath} />
				</div>

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

			<div className="h-px w-full bg-border/60" />

			<StageEditorModal
				open={stageEditorOpen}
				onOpenChange={setStageEditorOpen}
				pipelineId={pipelineId}
				pipelineName={pipelineName}
				organizationSlug={organizationSlug}
				stages={stages}
				leadCountByStage={leadCountByStage}
			/>
		</div>
	);
}
