import { db, orchestratorAuditLog } from "@repo/database";
import { bus } from "./bus";
import type { DomainEvent } from "./types";

/**
 * Mapping of event type → audit resource + action.
 * Apenas eventos "materiais" (que mudam estado persistido) geram audit log.
 * Eventos apenas informativos (ex: .sent, .requested) podem ser ignorados.
 */
const EVENT_TO_AUDIT: Partial<
	Record<DomainEvent["type"], { resource: string; action: string }>
> = {
	"pipeline.created": { resource: "pipeline", action: "create" },
	"pipeline.deleted": { resource: "pipeline", action: "delete" },
	"pipeline.stage.created": { resource: "pipeline_stage", action: "create" },
	"pipeline.stage.updated": { resource: "pipeline_stage", action: "update" },
	"pipeline.stage.deleted": { resource: "pipeline_stage", action: "delete" },
	"pipeline.stage.reordered": {
		resource: "pipeline_stage",
		action: "reorder",
	},
	"lead.created": { resource: "lead", action: "create" },
	"lead.updated": { resource: "lead", action: "update" },
	"lead.stage.changed": { resource: "lead", action: "stage_change" },
	"lead.deleted": { resource: "lead", action: "delete" },
	"proposal.sent": { resource: "proposal", action: "send" },
	"proposal.status.changed": {
		resource: "proposal",
		action: "status_change",
	},
};

function resourceIdFromEvent(event: DomainEvent): string {
	switch (event.type) {
		case "pipeline.created":
		case "pipeline.deleted":
			return event.payload.pipelineId;
		case "pipeline.stage.created":
		case "pipeline.stage.deleted":
		case "pipeline.stage.reordered":
			return event.payload.pipelineId;
		case "pipeline.stage.updated":
			return event.payload.stageId;
		case "lead.created":
		case "lead.updated":
		case "lead.stage.changed":
		case "lead.deleted":
			return event.payload.leadId;
		case "proposal.sent":
		case "proposal.status.changed":
			return event.payload.proposalId;
		default:
			return "";
	}
}

/**
 * Persists every relevant domain event into orchestrator_audit_log.
 * Runs asynchronously — failures are logged but do NOT break the emitter.
 *
 * Call `startAuditMiddleware()` ONCE per Node process (e.g., in a lazy init).
 */
let installed = false;

export function startAuditMiddleware(): void {
	if (installed) return;
	installed = true;

	bus.onAll(async (event) => {
		const mapping = EVENT_TO_AUDIT[event.type];
		if (!mapping) return;

		const resourceId = resourceIdFromEvent(event);
		if (!resourceId) return;

		try {
			await db.insert(orchestratorAuditLog).values({
				organizationId: event.meta.orgId,
				userId:
					event.meta.actorType === "user" ? event.meta.actorId : null,
				actorType: event.meta.actorType,
				actorId: event.meta.actorId,
				resource: mapping.resource,
				resourceId,
				action: mapping.action,
				// before/after are opt-in — callers that want undo support must emit
				// through a higher-level helper that captures the snapshot.
				before: null,
				after:
					(event.payload as unknown as Record<string, unknown>) ??
					null,
				createdAt: event.meta.timestamp,
			});
		} catch (err) {
			// Audit failures NÃO devem quebrar operações de produto.
			// Logar e seguir — reconciliação manual se precisar.
			console.error("[audit-middleware] Failed to persist event", {
				type: event.type,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	});
}

/**
 * Test helper: reset middleware state between suites.
 */
export function __resetAuditMiddleware(): void {
	installed = false;
}
