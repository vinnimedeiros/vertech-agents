"use server";

import { requireOrgAccess } from "@repo/auth";
import {
	and,
	db,
	eq,
	inArray,
	lead,
	pipeline,
	pipelineStage,
	sql,
} from "@repo/database";
import { bus } from "@repo/events";
import { getSession } from "@saas/auth/lib/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================
// Schemas
// ============================================================

const bulkMoveSchema = z.object({
	leadIds: z.array(z.string().min(1)).min(1),
	toStageId: z.string().min(1),
});

const bulkAssignSchema = z.object({
	leadIds: z.array(z.string().min(1)).min(1),
	assigneeId: z.string().min(1).nullable(),
});

const bulkDeleteSchema = z.object({
	leadIds: z.array(z.string().min(1)).min(1),
});

// ============================================================
// Helpers
// ============================================================

async function requireAuthed() {
	const session = await getSession();
	if (!session?.user) throw new Error("UNAUTHENTICATED");
	return session.user;
}

/**
 * Garante que todos os leads pertencem à mesma org e que o user tem acesso.
 * Retorna organizationId + pipelineIds afetados (pra revalidate e stage checks).
 */
async function assertLeadsAccess(userId: string, leadIds: string[]) {
	const rows = await db
		.select({
			id: lead.id,
			orgId: lead.organizationId,
			pipelineId: lead.pipelineId,
			stageId: lead.stageId,
			stageDates: lead.stageDates,
		})
		.from(lead)
		.where(inArray(lead.id, leadIds));

	if (rows.length !== leadIds.length) {
		throw new Error("SOME_LEADS_NOT_FOUND");
	}

	const orgIds = new Set(rows.map((r) => r.orgId));
	if (orgIds.size > 1) {
		throw new Error("LEADS_SPAN_MULTIPLE_ORGS");
	}

	const orgId = rows[0].orgId;
	await requireOrgAccess(userId, orgId);

	return { orgId, leads: rows };
}

// ============================================================
// Actions
// ============================================================

export async function bulkMoveLeadsAction(
	input: z.input<typeof bulkMoveSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { leadIds, toStageId } = bulkMoveSchema.parse(input);
	const { orgId, leads: foundLeads } = await assertLeadsAccess(
		user.id,
		leadIds,
	);

	// Validar stage destino: existe + mesma org via pipeline
	const [targetStage] = await db
		.select({
			id: pipelineStage.id,
			pipelineId: pipelineStage.pipelineId,
			organizationId: pipeline.organizationId,
			category: pipelineStage.category,
		})
		.from(pipelineStage)
		.innerJoin(pipeline, eq(pipelineStage.pipelineId, pipeline.id))
		.where(eq(pipelineStage.id, toStageId))
		.limit(1);

	if (!targetStage) throw new Error("TARGET_STAGE_NOT_FOUND");
	if (targetStage.organizationId !== orgId) {
		throw new Error("TARGET_STAGE_WRONG_ORG");
	}

	const now = new Date();
	const idsToMove = foundLeads
		.filter((l) => l.stageId !== toStageId)
		.map((l) => l.id);

	// Wave 1 G.P0.3 — UPDATE único em vez de loop. Antes: 50 leads = 50 round-trips.
	// Agora: 1 query usando jsonb concat pra mesclar stageDates de cada lead com
	// o novo timestamp do toStageId.
	if (idsToMove.length > 0) {
		const stageDatesPatch = JSON.stringify({ [toStageId]: now.toISOString() });
		await db
			.update(lead)
			.set({
				stageId: toStageId,
				pipelineId: targetStage.pipelineId,
				stageDates: sql`COALESCE(${lead.stageDates}::jsonb, '{}'::jsonb) || ${stageDatesPatch}::jsonb`,
				updatedAt: now,
			})
			.where(inArray(lead.id, idsToMove));
	}

	// Emitir um evento lead.stage.changed por lead (stage diferente)
	for (const l of foundLeads) {
		if (l.stageId === toStageId) continue;
		bus.emitEvent({
			type: "lead.stage.changed",
			payload: {
				leadId: l.id,
				fromStageId: l.stageId,
				toStageId,
				fromCategory: "",
				toCategory: targetStage.category ?? "",
			},
			meta: {
				orgId,
				actorType: "user",
				actorId: user.id,
				timestamp: now,
			},
		});
	}

	revalidateCrm(organizationSlug);
	return { moved: foundLeads.length };
}

export async function bulkAssignLeadsAction(
	input: z.input<typeof bulkAssignSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { leadIds, assigneeId } = bulkAssignSchema.parse(input);
	const { orgId } = await assertLeadsAccess(user.id, leadIds);

	const now = new Date();
	await db
		.update(lead)
		.set({ assignedTo: assigneeId, updatedAt: now })
		.where(and(inArray(lead.id, leadIds), eq(lead.organizationId, orgId)));

	bus.emitEvent({
		type: "lead.updated",
		payload: {
			leadId: leadIds.join(","),
			changes: { assignedTo: assigneeId, bulk: true, count: leadIds.length },
		},
		meta: {
			orgId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
	return { updated: leadIds.length };
}

export async function bulkDeleteLeadsAction(
	input: z.input<typeof bulkDeleteSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { leadIds } = bulkDeleteSchema.parse(input);
	const { orgId } = await assertLeadsAccess(user.id, leadIds);

	const now = new Date();
	await db
		.delete(lead)
		.where(and(inArray(lead.id, leadIds), eq(lead.organizationId, orgId)));

	for (const id of leadIds) {
		bus.emitEvent({
			type: "lead.deleted",
			payload: { leadId: id },
			meta: {
				orgId,
				actorType: "user",
				actorId: user.id,
				timestamp: now,
			},
		});
	}

	revalidateCrm(organizationSlug);
	return { deleted: leadIds.length };
}

function revalidateCrm(organizationSlug?: string | null) {
	if (!organizationSlug) return;
	revalidatePath(`/app/${organizationSlug}/crm/pipeline`, "page");
	revalidatePath(`/app/${organizationSlug}/crm/leads`, "page");
	revalidatePath(`/app/${organizationSlug}/crm/clientes`, "page");
}
