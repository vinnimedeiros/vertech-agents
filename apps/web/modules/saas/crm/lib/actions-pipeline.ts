"use server";

import { requireOrgAccess } from "@repo/auth";
import {
	and,
	asc,
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
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================
// Schemas
// ============================================================

const stageCategoryZ = z.enum([
	"NOT_STARTED",
	"ACTIVE",
	"SCHEDULED",
	"WON",
	"LOST",
]);

const createPipelineSchema = z.object({
	organizationId: z.string().min(1),
	name: z.string().trim().min(1, "Nome é obrigatório").max(80),
	isDefault: z.boolean().optional(),
	/**
	 * Stages a criar junto. Se omitido, cria apenas uma stage "Entrada" default.
	 * Se presente, substitui o default (útil para aplicar templates).
	 */
	stages: z
		.array(
			z.object({
				name: z.string().trim().min(1),
				color: z.string().default("#94a3b8"),
				category: stageCategoryZ.default("ACTIVE"),
				probability: z.number().int().min(0).max(100).default(50),
				maxDays: z.number().int().positive().nullable().optional(),
				position: z.number().int().nonnegative(),
			}),
		)
		.optional(),
});

const updatePipelineSchema = z.object({
	pipelineId: z.string().min(1),
	name: z.string().trim().min(1).max(80).optional(),
	isDefault: z.boolean().optional(),
});

const deletePipelineSchema = z.object({
	pipelineId: z.string().min(1),
	moveLeadsToPipelineId: z.string().min(1).optional(),
});

const createStageSchema = z.object({
	pipelineId: z.string().min(1),
	name: z.string().trim().min(1).max(80),
	color: z.string().default("#94a3b8"),
	category: stageCategoryZ.default("ACTIVE"),
	probability: z.number().int().min(0).max(100).default(50),
	maxDays: z.number().int().positive().nullable().optional(),
	position: z.number().int().nonnegative().optional(),
});

const updateStageSchema = z.object({
	stageId: z.string().min(1),
	name: z.string().trim().min(1).max(80).optional(),
	color: z.string().optional(),
	category: stageCategoryZ.optional(),
	probability: z.number().int().min(0).max(100).optional(),
	maxDays: z.number().int().positive().nullable().optional(),
});

const deleteStageSchema = z.object({
	stageId: z.string().min(1),
	migrateToStageId: z.string().min(1),
});

const reorderStagesSchema = z.object({
	pipelineId: z.string().min(1),
	orderedStageIds: z.array(z.string().min(1)).min(1),
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

	if (!row) {
		throw new Error("PIPELINE_NOT_FOUND");
	}
	await requireOrgAccess(userId, row.organizationId);
	return row.organizationId;
}

async function assertStageAccess(userId: string, stageId: string) {
	const [row] = await db
		.select({
			pipelineId: pipelineStage.pipelineId,
			organizationId: pipeline.organizationId,
		})
		.from(pipelineStage)
		.innerJoin(pipeline, eq(pipelineStage.pipelineId, pipeline.id))
		.where(eq(pipelineStage.id, stageId))
		.limit(1);

	if (!row) {
		throw new Error("STAGE_NOT_FOUND");
	}
	await requireOrgAccess(userId, row.organizationId);
	return row;
}

function revalidateCrm(organizationSlug?: string | null) {
	if (!organizationSlug) return;
	revalidatePath(`/app/${organizationSlug}/crm/pipeline`, "page");
	revalidatePath(`/app/${organizationSlug}/crm/leads`, "page");
	revalidatePath(`/app/${organizationSlug}/crm/clientes`, "page");
}

// ============================================================
// Pipelines
// ============================================================

export async function createPipelineAction(
	input: z.input<typeof createPipelineSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = createPipelineSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	const now = new Date();

	const created = await db.transaction(async (tx) => {
		// Se setando como default, desmarca outros defaults da org
		if (data.isDefault) {
			await tx
				.update(pipeline)
				.set({ isDefault: false, updatedAt: now })
				.where(
					and(
						eq(pipeline.organizationId, data.organizationId),
						eq(pipeline.isDefault, true),
					),
				);
		}

		const [row] = await tx
			.insert(pipeline)
			.values({
				organizationId: data.organizationId,
				name: data.name,
				isDefault: data.isDefault ?? false,
				position: 0,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		const stagesToInsert =
			data.stages && data.stages.length > 0
				? data.stages
				: [
						{
							name: "Entrada",
							color: "#94a3b8",
							category: "NOT_STARTED" as const,
							probability: 10,
							maxDays: null,
							position: 0,
						},
					];

		await tx.insert(pipelineStage).values(
			stagesToInsert.map((s) => ({
				pipelineId: row.id,
				name: s.name,
				color: s.color,
				position: s.position,
				category: s.category,
				probability: s.probability,
				maxDays: s.maxDays ?? null,
				slug: slugify(s.name),
				isClosing: s.category === "WON" || s.category === "LOST",
				isWon: s.category === "WON",
				createdAt: now,
			})),
		);

		return row;
	});

	bus.emitEvent({
		type: "pipeline.created",
		payload: { pipelineId: created.id, name: created.name },
		meta: {
			orgId: data.organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
	return created;
}

export async function updatePipelineAction(
	input: z.input<typeof updatePipelineSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = updatePipelineSchema.parse(input);
	const orgId = await assertPipelineAccess(user.id, data.pipelineId);

	const now = new Date();
	await db.transaction(async (tx) => {
		if (data.isDefault === true) {
			await tx
				.update(pipeline)
				.set({ isDefault: false, updatedAt: now })
				.where(
					and(
						eq(pipeline.organizationId, orgId),
						eq(pipeline.isDefault, true),
					),
				);
		}

		const { pipelineId, ...rest } = data;
		await tx
			.update(pipeline)
			.set({ ...rest, updatedAt: now })
			.where(eq(pipeline.id, pipelineId));
	});

	revalidateCrm(organizationSlug);
}

export async function deletePipelineAction(
	input: z.input<typeof deletePipelineSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { pipelineId, moveLeadsToPipelineId } =
		deletePipelineSchema.parse(input);
	const orgId = await assertPipelineAccess(user.id, pipelineId);

	// Contar leads ativos neste pipeline
	const leadCount = await db
		.select({ count: lead.id })
		.from(lead)
		.where(eq(lead.pipelineId, pipelineId));

	if (leadCount.length > 0 && !moveLeadsToPipelineId) {
		throw new Error("PIPELINE_HAS_LEADS_MUST_MIGRATE");
	}

	const now = new Date();
	await db.transaction(async (tx) => {
		if (moveLeadsToPipelineId) {
			await assertPipelineAccess(user.id, moveLeadsToPipelineId);
			// Move leads pro primeiro stage do pipeline destino
			const [firstStage] = await tx
				.select({ id: pipelineStage.id })
				.from(pipelineStage)
				.where(eq(pipelineStage.pipelineId, moveLeadsToPipelineId))
				.orderBy(asc(pipelineStage.position))
				.limit(1);

			if (!firstStage) {
				throw new Error("TARGET_PIPELINE_HAS_NO_STAGES");
			}

			await tx
				.update(lead)
				.set({
					pipelineId: moveLeadsToPipelineId,
					stageId: firstStage.id,
					updatedAt: now,
				})
				.where(eq(lead.pipelineId, pipelineId));
		}

		await tx.delete(pipeline).where(eq(pipeline.id, pipelineId));
	});

	bus.emitEvent({
		type: "pipeline.deleted",
		payload: { pipelineId, movedLeadsToPipelineId: moveLeadsToPipelineId },
		meta: {
			orgId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
}

export async function setDefaultPipelineAction(
	pipelineId: string,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const orgId = await assertPipelineAccess(user.id, pipelineId);
	const now = new Date();

	await db.transaction(async (tx) => {
		await tx
			.update(pipeline)
			.set({ isDefault: false, updatedAt: now })
			.where(eq(pipeline.organizationId, orgId));
		await tx
			.update(pipeline)
			.set({ isDefault: true, updatedAt: now })
			.where(eq(pipeline.id, pipelineId));
	});

	revalidateCrm(organizationSlug);
}

// ============================================================
// Stages
// ============================================================

export async function createStageAction(
	input: z.input<typeof createStageSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = createStageSchema.parse(input);
	const orgId = await assertPipelineAccess(user.id, data.pipelineId);

	const now = new Date();

	// Se position não informada, coloca no fim do pipeline
	let position = data.position;
	if (position == null) {
		const [maxRow] = await db
			.select({ position: pipelineStage.position })
			.from(pipelineStage)
			.where(eq(pipelineStage.pipelineId, data.pipelineId))
			.orderBy((t) => [t.position])
			.limit(1);
		position = (maxRow?.position ?? -1) + 1;
	}

	const [created] = await db
		.insert(pipelineStage)
		.values({
			pipelineId: data.pipelineId,
			name: data.name,
			color: data.color,
			position,
			category: data.category,
			probability: data.probability,
			maxDays: data.maxDays ?? null,
			slug: slugify(data.name),
			isClosing: data.category === "WON" || data.category === "LOST",
			isWon: data.category === "WON",
			createdAt: now,
		})
		.returning();

	bus.emitEvent({
		type: "pipeline.stage.created",
		payload: {
			pipelineId: data.pipelineId,
			stageId: created.id,
			name: created.name,
			category: created.category,
		},
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

export async function updateStageAction(
	input: z.input<typeof updateStageSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = updateStageSchema.parse(input);
	const { organizationId: orgId } = await assertStageAccess(
		user.id,
		data.stageId,
	);

	const now = new Date();
	const { stageId, name, category, ...rest } = data;

	const patch: Record<string, unknown> = { ...rest };
	if (name !== undefined) {
		patch.name = name;
		patch.slug = slugify(name);
	}
	if (category !== undefined) {
		patch.category = category;
		patch.isClosing = category === "WON" || category === "LOST";
		patch.isWon = category === "WON";
	}

	await db
		.update(pipelineStage)
		.set(patch)
		.where(eq(pipelineStage.id, stageId));

	bus.emitEvent({
		type: "pipeline.stage.updated",
		payload: { stageId, changes: patch },
		meta: {
			orgId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
}

export async function deleteStageAction(
	input: z.input<typeof deleteStageSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { stageId, migrateToStageId } = deleteStageSchema.parse(input);
	const { organizationId: orgId, pipelineId } = await assertStageAccess(
		user.id,
		stageId,
	);

	// Garantir que o migrate target é do mesmo pipeline
	const [target] = await db
		.select({ pipelineId: pipelineStage.pipelineId })
		.from(pipelineStage)
		.where(eq(pipelineStage.id, migrateToStageId))
		.limit(1);

	if (!target || target.pipelineId !== pipelineId) {
		throw new Error("MIGRATE_TARGET_INVALID");
	}

	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.update(lead)
			.set({ stageId: migrateToStageId, updatedAt: now })
			.where(eq(lead.stageId, stageId));

		await tx.delete(pipelineStage).where(eq(pipelineStage.id, stageId));
	});

	bus.emitEvent({
		type: "pipeline.stage.deleted",
		payload: {
			pipelineId,
			stageId,
			migratedToStageId: migrateToStageId,
		},
		meta: {
			orgId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
}

export async function reorderStagesAction(
	input: z.input<typeof reorderStagesSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { pipelineId, orderedStageIds } = reorderStagesSchema.parse(input);
	const orgId = await assertPipelineAccess(user.id, pipelineId);

	// Validar que todas as stages pertencem ao pipeline
	const existing = await db
		.select({ id: pipelineStage.id })
		.from(pipelineStage)
		.where(
			and(
				eq(pipelineStage.pipelineId, pipelineId),
				inArray(pipelineStage.id, orderedStageIds),
			),
		);

	if (existing.length !== orderedStageIds.length) {
		throw new Error("REORDER_INVALID_STAGES");
	}

	const now = new Date();
	// Wave 1 G.P0.3 — UPDATE único com CASE WHEN em vez de loop.
	// Antes: N stages = N round-trips. Agora: 1 query.
	// Reduce em vez de sql.join (API interna do Drizzle, instável entre versões).
	if (orderedStageIds.length > 0) {
		const cases = orderedStageIds
			.map(
				(stageId, i) =>
					sql`WHEN ${pipelineStage.id} = ${stageId} THEN ${i}::int`,
			)
			.reduce((acc, frag) => sql`${acc} ${frag}`, sql``);

		await db
			.update(pipelineStage)
			.set({
				position: sql`CASE ${cases} ELSE ${pipelineStage.position} END`,
			})
			.where(inArray(pipelineStage.id, orderedStageIds));
	}

	bus.emitEvent({
		type: "pipeline.stage.reordered",
		payload: { pipelineId, orderedStageIds },
		meta: {
			orgId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
}
