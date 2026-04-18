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
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { moveLeadToStageAction } from "../lib/actions";
import { usePanToScroll } from "../lib/use-pan-to-scroll";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard } from "./LeadCard";
import { LeadModal } from "./LeadModal";

export type KanbanStage = {
	id: string;
	name: string;
	color: string;
	position: number;
	isClosing: boolean;
	isWon: boolean;
	maxDays?: number | null;
};

export type KanbanLead = {
	id: string;
	title: string | null;
	value: string | null;
	currency: string;
	temperature: "COLD" | "WARM" | "HOT";
	priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
	origin: string | null;
	stageId: string;
	assignedTo: string | null;
	createdAt: Date | string;
	stageDates: Record<string, string> | null;
	contact: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		company: string | null;
		photoUrl: string | null;
	};
};

export type KanbanMember = {
	userId: string;
	name: string | null;
	email: string | null;
	image: string | null;
};

type PipelineKanbanProps = {
	organizationId: string;
	organizationSlug: string;
	pipelineId: string;
	stages: KanbanStage[];
	initialLeads: KanbanLead[];
	members: KanbanMember[];
	allInterests?: string[];
};

export function PipelineKanban({
	organizationId,
	organizationSlug,
	pipelineId,
	stages,
	initialLeads,
	members,
	allInterests = [],
}: PipelineKanbanProps) {
	const [leads, setLeads] = useState<KanbanLead[]>(initialLeads);
	const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
	const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [, startTransition] = useTransition();

	// Sincroniza leads com os dados do server quando router.refresh() muda initialLeads
	useEffect(() => {
		setLeads(initialLeads);
	}, [initialLeads]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
	);

	const scrollRef = usePanToScroll<HTMLDivElement>();

	const leadsByStage = useMemo(() => {
		const map = new Map<string, KanbanLead[]>();
		for (const stage of stages) {
			map.set(stage.id, []);
		}
		for (const lead of leads) {
			const bucket = map.get(lead.stageId);
			if (bucket) bucket.push(lead);
		}
		// Ordena cada coluna por data de criacao ASC (mais antigo em cima, novos entram no fim)
		map.forEach((bucket) => {
			bucket.sort(
				(a: KanbanLead, b: KanbanLead) =>
					+new Date(a.createdAt) - +new Date(b.createdAt),
			);
		});
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
		const targetStageId = toStageId;

		const current = leads.find((l) => l.id === leadId);
		if (!current || current.stageId === targetStageId) return;

		// Optimistic update
		const previous = leads;
		setLeads((prev) =>
			prev.map((l) =>
				l.id === leadId ? { ...l, stageId: targetStageId } : l,
			),
		);

		startTransition(async () => {
			try {
				await moveLeadToStageAction(
					{ leadId, toStageId: targetStageId },
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

	function handleCardOpen(leadId: string) {
		setSelectedLeadId(leadId);
		setSheetOpen(true);
	}

	return (
		<>
			<DndContext
				sensors={sensors}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div
					ref={scrollRef}
					className="kanban-scroll -mx-4 flex min-h-[calc(100vh-18rem)] items-start gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0"
				>
					{stages.map((stage) => (
						<KanbanColumn
							key={stage.id}
							stage={stage}
							leads={leadsByStage.get(stage.id) ?? []}
							onCardOpen={handleCardOpen}
							organizationId={organizationId}
							organizationSlug={organizationSlug}
							pipelineId={pipelineId}
							members={members}
						/>
					))}
				</div>

				<DragOverlay>
					{activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
				</DragOverlay>
			</DndContext>

			<LeadModal
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				leadId={selectedLeadId}
				organizationSlug={organizationSlug}
				stages={stages.map((s) => ({
					id: s.id,
					name: s.name,
					color: s.color,
					isClosing: s.isClosing,
					isWon: s.isWon,
					position: s.position,
				}))}
				members={members}
				leadIds={leads.map((l) => l.id)}
				onNavigate={(id) => setSelectedLeadId(id)}
				allInterests={allInterests}
			/>
		</>
	);
}
