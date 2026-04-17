"use client";

import { useDroppable } from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@ui/lib";
import { LeadCard } from "./LeadCard";
import type { KanbanLead, KanbanStage } from "./PipelineKanban";

type KanbanColumnProps = {
	stage: KanbanStage;
	leads: KanbanLead[];
};

export function KanbanColumn({ stage, leads }: KanbanColumnProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: stage.id,
		data: { type: "column", stageId: stage.id },
	});

	return (
		<div className="flex w-72 shrink-0 flex-col gap-3">
			<div className="flex items-center justify-between px-1">
				<div className="flex items-center gap-2">
					<span
						className="size-2 rounded-full"
						style={{ backgroundColor: stage.color }}
					/>
					<h3 className="font-semibold text-foreground/80 text-sm uppercase tracking-wide">
						{stage.name}
					</h3>
				</div>
				<span className="rounded-full bg-muted px-2 py-0.5 text-foreground/60 text-xs tabular-nums">
					{leads.length}
				</span>
			</div>

			<div
				ref={setNodeRef}
				className={cn(
					"flex min-h-[400px] flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
					isOver
						? "border-primary/50 bg-primary/5"
						: "border-transparent bg-muted/30",
				)}
			>
				<SortableContext
					items={leads.map((l) => l.id)}
					strategy={verticalListSortingStrategy}
				>
					{leads.map((lead) => (
						<LeadCard key={lead.id} lead={lead} />
					))}
				</SortableContext>

				{leads.length === 0 ? (
					<p className="mx-auto mt-4 text-center text-foreground/30 text-xs">
						Nenhum lead aqui
					</p>
				) : null}
			</div>
		</div>
	);
}
