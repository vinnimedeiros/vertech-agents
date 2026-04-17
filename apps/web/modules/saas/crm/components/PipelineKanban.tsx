"use client";

import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { moveLeadToStageAction } from "@saas/crm/lib/actions";
import { toast } from "sonner";
import { useMemo, useState, useTransition } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard } from "./LeadCard";

export type KanbanStage = {
	id: string;
	name: string;
	color: string;
	position: number;
	isClosing: boolean;
	isWon: boolean;
};

export type KanbanLead = {
	id: string;
	title: string | null;
	value: string | null;
	currency: string;
	temperature: "COLD" | "WARM" | "HOT";
	priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
	stageId: string;
	contact: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		company: string | null;
		photoUrl: string | null;
	};
};

type PipelineKanbanProps = {
	organizationSlug: string;
	stages: KanbanStage[];
	initialLeads: KanbanLead[];
};

export function PipelineKanban({
	organizationSlug,
	stages,
	initialLeads,
}: PipelineKanbanProps) {
	const [leads, setLeads] = useState<KanbanLead[]>(initialLeads);
	const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
	const [, startTransition] = useTransition();

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
	);

	const leadsByStage = useMemo(() => {
		const map = new Map<string, KanbanLead[]>();
		for (const stage of stages) {
			map.set(stage.id, []);
		}
		for (const lead of leads) {
			const bucket = map.get(lead.stageId);
			if (bucket) bucket.push(lead);
		}
		return map;
	}, [leads, stages]);

	const activeLead = activeLeadId
		? (leads.find((l) => l.id === activeLeadId) ?? null)
		: null;

	function handleDragStart(event: DragStartEvent) {
		setActiveLeadId(String(event.active.id));
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveLeadId(null);

		if (!over) return;

		const leadId = String(active.id);
		const overData = over.data.current;
		const overType = overData?.type;

		let toStageId: string | null = null;
		if (overType === "column") {
			toStageId = String(over.id);
		} else if (overType === "lead") {
			const overLead = leads.find((l) => l.id === String(over.id));
			toStageId = overLead?.stageId ?? null;
		}

		if (!toStageId) return;

		const current = leads.find((l) => l.id === leadId);
		if (!current || current.stageId === toStageId) return;

		// Optimistic update
		const previous = leads;
		setLeads((prev) =>
			prev.map((l) => (l.id === leadId ? { ...l, stageId: toStageId! } : l)),
		);

		startTransition(async () => {
			try {
				await moveLeadToStageAction(
					{ leadId, toStageId: toStageId! },
					organizationSlug,
				);
			} catch (err) {
				setLeads(previous);
				toast.error("Não foi possível mover o lead", {
					description:
						err instanceof Error ? err.message : "Tente novamente.",
				});
			}
		});
	}

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
				{stages.map((stage) => (
					<KanbanColumn
						key={stage.id}
						stage={stage}
						leads={leadsByStage.get(stage.id) ?? []}
					/>
				))}
			</div>

			<DragOverlay>
				{activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
			</DragOverlay>
		</DndContext>
	);
}
