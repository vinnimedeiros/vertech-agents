"use server";

import { requireOrgAccess } from "@repo/auth";
import {
	and,
	asc,
	db,
	desc,
	eq,
	inArray,
	isNull,
	lead,
	or,
	pipeline,
	pipelineStage,
	sql,
	statusTemplate,
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

const templateStageSchema = z.object({
	name: z.string().trim().min(1).max(80),
	color: z.string().min(1),
	category: stageCategoryZ,
	probability: z.number().int().min(0).max(100),
	maxDays: z.number().int().positive().nullable(),
	position: z.number().int().nonnegative(),
});

const applyTemplateSchema = z.object({
	templateId: z.string().min(1),
	organizationId: z.string().min(1),
	pipelineName: z.string().trim().min(1, "Nome é obrigatório").max(80),
	isDefault: z.boolean().optional(),
	customizedStages: z.array(templateStageSchema).optional(),
});

const saveAsTemplateSchema = z.object({
	pipelineId: z.string().min(1),
	name: z.string().trim().min(1).max(80),
	description: z.string().trim().max(500).optional().nullable(),
	vertical: z.string().trim().min(1).max(80),
	isPublic: z.boolean().default(false),
});

const deleteTemplateSchema = z.object({
	templateId: z.string().min(1),
});

// ============================================================
// Helpers
// ============================================================

async function requireAuthed() {
	const session = await getSession();
	if (!session?.user) throw new Error("UNAUTHENTICATED");
	return session.user;
}

function revalidateCrm(organizationSlug?: string | null) {
	if (!organizationSlug) return;
	revalidatePath(`/app/${organizationSlug}/crm/pipeline`, "page");
}

// ============================================================
// Actions
// ============================================================

/**
 * Aplica um template criando um novo pipeline na org com todas as stages.
 * Opcionalmente aceita customizations nas stages.
 */
export async function applyStatusTemplateAction(
	input: z.input<typeof applyTemplateSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = applyTemplateSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	// Busca o template: deve ser built-in OU da própria org
	const [template] = await db
		.select()
		.from(statusTemplate)
		.where(
			and(
				eq(statusTemplate.id, data.templateId),
				or(
					eq(statusTemplate.isBuiltIn, true),
					eq(statusTemplate.organizationId, data.organizationId),
				),
			),
		)
		.limit(1);

	if (!template) throw new Error("TEMPLATE_NOT_FOUND");

	const stages =
		data.customizedStages && data.customizedStages.length > 0
			? data.customizedStages
			: (template.stages as z.infer<typeof templateStageSchema>[]);

	const now = new Date();

	const created = await db.transaction(async (tx) => {
		// Se setando como default, desmarca outros
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

		const [newPipeline] = await tx
			.insert(pipeline)
			.values({
				organizationId: data.organizationId,
				name: data.pipelineName,
				isDefault: data.isDefault ?? false,
				position: 0,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		await tx.insert(pipelineStage).values(
			stages.map((s) => ({
				pipelineId: newPipeline.id,
				name: s.name,
				color: s.color,
				position: s.position,
				category: s.category,
				probability: s.probability,
				maxDays: s.maxDays,
				slug: slugify(s.name),
				isClosing: s.category === "WON" || s.category === "LOST",
				isWon: s.category === "WON",
				createdAt: now,
			})),
		);

		// Incrementa usageCount
		await tx
			.update(statusTemplate)
			.set({
				usageCount: sql`${statusTemplate.usageCount} + 1`,
				updatedAt: now,
			})
			.where(eq(statusTemplate.id, template.id));

		return newPipeline;
	});

	bus.emitEvent({
		type: "pipeline.created",
		payload: {
			pipelineId: created.id,
			name: created.name,
			fromTemplateId: template.id,
		},
		meta: {
			orgId: data.organizationId,
			actorType: "user",
			actorId: user.id,
			timestamp: now,
		},
	});

	revalidateCrm(organizationSlug);
	return { pipelineId: created.id, pipelineName: created.name };
}

/**
 * Salva um pipeline existente como template privado da org (ou público).
 * Copia os stages atuais (sem os leads).
 */
export async function saveAsTemplateAction(
	input: z.input<typeof saveAsTemplateSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = saveAsTemplateSchema.parse(input);

	// Validar acesso ao pipeline
	const [pipelineRow] = await db
		.select({
			id: pipeline.id,
			organizationId: pipeline.organizationId,
		})
		.from(pipeline)
		.where(eq(pipeline.id, data.pipelineId))
		.limit(1);

	if (!pipelineRow) throw new Error("PIPELINE_NOT_FOUND");
	await requireOrgAccess(user.id, pipelineRow.organizationId);

	// Pega as stages do pipeline
	const stages = await db
		.select()
		.from(pipelineStage)
		.where(eq(pipelineStage.pipelineId, data.pipelineId))
		.orderBy(asc(pipelineStage.position));

	if (stages.length === 0) throw new Error("PIPELINE_HAS_NO_STAGES");

	const templateStages = stages.map((s) => ({
		name: s.name,
		color: s.color,
		category: s.category as z.infer<typeof stageCategoryZ>,
		probability: s.probability,
		maxDays: s.maxDays,
		position: s.position,
	}));

	const now = new Date();
	const [created] = await db
		.insert(statusTemplate)
		.values({
			organizationId: pipelineRow.organizationId,
			name: data.name,
			description: data.description ?? null,
			vertical: data.vertical,
			stages: templateStages,
			metadata: null,
			isBuiltIn: false,
			isPublic: data.isPublic,
			usageCount: 0,
			createdBy: user.id,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	revalidateCrm(organizationSlug);
	return created;
}

/**
 * Remove um template customizado da org. Built-ins não podem ser removidos.
 */
export async function deleteStatusTemplateAction(
	input: z.input<typeof deleteTemplateSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { templateId } = deleteTemplateSchema.parse(input);

	const [template] = await db
		.select({
			id: statusTemplate.id,
			organizationId: statusTemplate.organizationId,
			isBuiltIn: statusTemplate.isBuiltIn,
		})
		.from(statusTemplate)
		.where(eq(statusTemplate.id, templateId))
		.limit(1);

	if (!template) throw new Error("TEMPLATE_NOT_FOUND");
	if (template.isBuiltIn)
		throw new Error("CANNOT_DELETE_BUILTIN_TEMPLATE");
	if (!template.organizationId)
		throw new Error("TEMPLATE_HAS_NO_ORG");
	await requireOrgAccess(user.id, template.organizationId);

	await db.delete(statusTemplate).where(eq(statusTemplate.id, templateId));

	revalidateCrm(organizationSlug);
}
