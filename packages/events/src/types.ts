/**
 * Domain event types shared across the product.
 *
 * Convention: <domain>.<entity>.<action> — dotted notation, past-tense verb.
 * Always include `orgId` + `actor` in meta for auditing and permission scoping.
 */

export type ActorType =
	| "user"
	| "orchestrator"
	| "architect"
	| "commercial_agent"
	| "system";

export type EventMeta = {
	orgId: string;
	actorType: ActorType;
	actorId: string; // userId | agentId | "orchestrator" | "system"
	timestamp: Date;
};

// ============================================================
// Pipeline events
// ============================================================

export type PipelineCreatedEvent = {
	type: "pipeline.created";
	payload: { pipelineId: string; name: string; fromTemplateId?: string };
	meta: EventMeta;
};

export type PipelineDeletedEvent = {
	type: "pipeline.deleted";
	payload: { pipelineId: string; movedLeadsToPipelineId?: string };
	meta: EventMeta;
};

export type PipelineStageCreatedEvent = {
	type: "pipeline.stage.created";
	payload: {
		pipelineId: string;
		stageId: string;
		name: string;
		category: string;
	};
	meta: EventMeta;
};

export type PipelineStageUpdatedEvent = {
	type: "pipeline.stage.updated";
	payload: {
		stageId: string;
		changes: Record<string, unknown>;
	};
	meta: EventMeta;
};

export type PipelineStageDeletedEvent = {
	type: "pipeline.stage.deleted";
	payload: {
		pipelineId: string;
		stageId: string;
		migratedToStageId?: string;
	};
	meta: EventMeta;
};

export type PipelineStageReorderedEvent = {
	type: "pipeline.stage.reordered";
	payload: { pipelineId: string; orderedStageIds: string[] };
	meta: EventMeta;
};

// ============================================================
// Pipeline View events (Phase 04E.3)
// ============================================================

export type PipelineViewCreatedEvent = {
	type: "pipeline.view.created";
	payload: { viewId: string; pipelineId: string; name: string };
	meta: EventMeta;
};

export type PipelineViewUpdatedEvent = {
	type: "pipeline.view.updated";
	payload: { viewId: string; changes: Record<string, unknown> };
	meta: EventMeta;
};

export type PipelineViewDeletedEvent = {
	type: "pipeline.view.deleted";
	payload: { viewId: string; pipelineId: string };
	meta: EventMeta;
};

export type PipelineViewDefaultChangedEvent = {
	type: "pipeline.view.default_changed";
	payload: { viewId: string; pipelineId: string };
	meta: EventMeta;
};

// ============================================================
// Lead events
// ============================================================

export type LeadCreatedEvent = {
	type: "lead.created";
	payload: { leadId: string; pipelineId: string; stageId: string };
	meta: EventMeta;
};

export type LeadUpdatedEvent = {
	type: "lead.updated";
	payload: { leadId: string; changes: Record<string, unknown> };
	meta: EventMeta;
};

export type LeadStageChangedEvent = {
	type: "lead.stage.changed";
	payload: {
		leadId: string;
		fromStageId: string;
		toStageId: string;
		fromCategory: string;
		toCategory: string;
	};
	meta: EventMeta;
};

export type LeadDeletedEvent = {
	type: "lead.deleted";
	payload: { leadId: string };
	meta: EventMeta;
};

// ============================================================
// Proposal events
// ============================================================

export type ProposalSentEvent = {
	type: "proposal.sent";
	payload: { proposalId: string; leadId: string | null };
	meta: EventMeta;
};

export type ProposalStatusChangedEvent = {
	type: "proposal.status.changed";
	payload: { proposalId: string; from: string; to: string };
	meta: EventMeta;
};

// ============================================================
// Calendar events (Phase 11 placeholder - emitido desde ja via SCHEDULED)
// ============================================================

export type CalendarMeetingRequestedEvent = {
	type: "calendar.meeting.requested";
	payload: {
		leadId: string;
		stageId: string;
		suggestedDuration?: number;
	};
	meta: EventMeta;
};

// ============================================================
// Followup events (Phase 08 placeholder)
// ============================================================

export type FollowupSentEvent = {
	type: "followup.sent";
	payload: { leadId: string; attempt: number };
	meta: EventMeta;
};

export type FollowupScheduledEvent = {
	type: "followup.scheduled";
	payload: { leadId: string; scheduledFor: Date };
	meta: EventMeta;
};

// ============================================================
// Union
// ============================================================

export type DomainEvent =
	| PipelineCreatedEvent
	| PipelineDeletedEvent
	| PipelineStageCreatedEvent
	| PipelineStageUpdatedEvent
	| PipelineStageDeletedEvent
	| PipelineStageReorderedEvent
	| PipelineViewCreatedEvent
	| PipelineViewUpdatedEvent
	| PipelineViewDeletedEvent
	| PipelineViewDefaultChangedEvent
	| LeadCreatedEvent
	| LeadUpdatedEvent
	| LeadStageChangedEvent
	| LeadDeletedEvent
	| ProposalSentEvent
	| ProposalStatusChangedEvent
	| CalendarMeetingRequestedEvent
	| FollowupSentEvent
	| FollowupScheduledEvent;

export type DomainEventType = DomainEvent["type"];

/**
 * Map of event type → concrete event shape.
 * Used by typed subscribers: `bus.on("lead.stage.changed", (e) => ...)`.
 */
export type DomainEventMap = {
	[E in DomainEvent as E["type"]]: E;
};
