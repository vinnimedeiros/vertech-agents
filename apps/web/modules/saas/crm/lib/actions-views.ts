"use server";

import { requireOrgAccess } from "@repo/auth";
import { and, db, eq, pipeline, pipelineView } from "@repo/database";
import { bus } from "@repo/events";
import { getSession } from "@saas/auth/lib/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
	sortKeySchema,
	viewFiltersStateSchema,
	viewModeSchema,
} from "./view-filters";

// ============================================================
// Schemas
// ============================================================

const createViewSchema = z.object({
	pipelineId: z.string().min(1),
	name: z.string().trim().min(1, "Nome é obrigatório").max(80),
	filters: viewFiltersStateSchema.default({}),
	viewMode: viewModeSchema.default("kanban"),
	sortBy: sortKeySchema.default("none"),
	isShared: z.boolean().default(false),
	isDefault: z.boolean().default(false),
});

const updateViewSchema = z.object({
	viewId: z.string().min(1),
	name: z.string().trim().min(1).max(80).optional(),
	filters: viewFiltersStateSchema.optional(),
	viewMode: viewModeSchema.optional(),
	sortBy: sortKeySchema.optional(),
	isShared: z.boolean().optional(),
});

const deleteViewSchema = z.object({
	viewId: z.string().min(1),
});

const setDefaultViewSchema = z.object({
	viewId: z.string().min(1),
});

// ============================================================
// Helpers
// ============================================================

async function requireAuthed() {
	const session = await getSession();
	if (!session?.user) {
		throw new Error("UNAUTHENTICATED");
	}
	return session.user;
}

async function assertPipelineAccess(userId: string, pipelineId: string) {
	const [row] = await db
		.select({ organizationId: pipeline.organizationId })
		.from(pipeline)
		.where(eq(pipeline.id, pipelineId))
		.limit(1);

	if (!row) throw new Error("PIPELINE_NOT_FOUND");
	await requireOrgAccess(userId, row.organizationId);
	return row.organizationId;
}

/**
 * Acesso a visão: só quem criou OU (se for compartilhada) qualquer membro da org.
 * Edição/exclusão de visão compartilhada: apenas o dono (createdBy).
 * Definir como padrão: qualquer um (padrão é por usuário na prática — mas schema guarda 1 default por pipeline; ver nota).
 *
 * NOTA: `isDefault` hoje é global por pipeline. Se quiser padrão por usuário, evoluir em futura fase.
 */
async function assertViewOwnership(userId: string, viewId: string, opts?: { allowSharedRead?: boolean }) {
	const [row] = await db
		.select({
			id: pipelineView.id,
			pipelineId: pipelineView.pipelineId,
			createdBy: pipelineView.createdBy,
			isShared: pipelineView.isShared,
			organizationId: pipelineView.organizationId,
		})
		.from(pipelineView)
		.where(eq(pipelineView.id, viewId))
		.limit(1);

	if (!row) throw new Error("VIEW_NOT_FOUND");
	await requireOrgAccess(userId, row.organizationId);

	const isOwner = row.createdBy === userId;
	if (!isOwner && !opts?.allowSharedRead) {
		throw new Error("VIEW_FORBIDDEN");
	}
	if (!isOwner && opts?.allowSharedRead && !row.isShared) {
		throw new Error("VIEW_FORBIDDEN");
	}

	return row;
}

function revalidateCrm(organizationSlug?: string | null) {
	if (!organizationSlug) return;
	revalidatePath(`/app/${organizationSlug}/crm/pipeline`, "page");
}

// ============================================================
// Actions
// ============================================================

export async function createPipelineViewAction(
	input: z.input<typeof createViewSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = createViewSchema.parse(input);
	const orgId = await assertPipelineAccess(user.id, data.pipelineId);

	const now = new Date();

	const created = await db.transaction(async (tx) => {
		// Calcular próximo position
		const existing = await tx
			.select({ position: pipelineView.position })
			.from(pipelineView)
			.where(eq(pipelineView.pipelineId, data.pipelineId));
		const maxPosition = existing.reduce(
			(m, r) => Math.max(m, r.position),
			-1,
		);

		if (data.isDefault) {
			await tx
				.update(pipelineView)
				.set({ isDefault: false, updatedAt: now })
				.where(
					and(
						eq(pipelineView.pipelineId, data.pipelineId),
						eq(pipelineView.isDefault, true),
					),
				);
		}

		const [row] = await tx
			.insert(pipelineView)
			.values({
				organizationId: orgId,
				pipelineId: data.pipelineId,
				name: data.name,
				filters: data.filters,
				viewMode: data.viewMode,
				sortBy: data.sortBy,
				isShared: data.isShared,
				isDefault: data.isDefault,
				position: maxPosition + 1,
				createdBy: user.id,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		return row;
	});

	bus.emitEvent({
		type: "pipeline.view.created",
		payload: { viewId: created.id, pipelineId: data.pipelineId, name: created.name },
		meta: {
			orgId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
	return created;
}

export async function updatePipelineViewAction(
	input: z.input<typeof updateViewSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = updateViewSchema.parse(input);
	const row = await assertViewOwnership(user.id, data.viewId);

	const now = new Date();
	const { viewId, ...rest } = data;

	await db
		.update(pipelineView)
		.set({ ...rest, updatedAt: now })
		.where(eq(pipelineView.id, viewId));

	bus.emitEvent({
		type: "pipeline.view.updated",
		payload: { viewId, changes: rest },
		meta: {
			orgId: row.organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
}

export async function deletePipelineViewAction(
	input: z.input<typeof deleteViewSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { viewId } = deleteViewSchema.parse(input);
	const row = await assertViewOwnership(user.id, viewId);

	const now = new Date();
	await db.delete(pipelineView).where(eq(pipelineView.id, viewId));

	bus.emitEvent({
		type: "pipeline.view.deleted",
		payload: { viewId, pipelineId: row.pipelineId },
		meta: {
			orgId: row.organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
}

export async function setDefaultPipelineViewAction(
	input: z.input<typeof setDefaultViewSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { viewId } = setDefaultViewSchema.parse(input);
	// Qualquer user pode marcar como default (comportamento global por pipeline).
	// Mas só owner ou shared visível pode ler — validamos com allowSharedRead.
	const row = await assertViewOwnership(user.id, viewId, {
		allowSharedRead: true,
	});

	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.update(pipelineView)
			.set({ isDefault: false, updatedAt: now })
			.where(eq(pipelineView.pipelineId, row.pipelineId));
		await tx
			.update(pipelineView)
			.set({ isDefault: true, updatedAt: now })
			.where(eq(pipelineView.id, viewId));
	});

	bus.emitEvent({
		type: "pipeline.view.default_changed",
		payload: { viewId, pipelineId: row.pipelineId },
		meta: {
			orgId: row.organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
}
