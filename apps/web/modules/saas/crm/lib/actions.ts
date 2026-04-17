"use server";

import { requireOrgAccess } from "@repo/auth";
import {
	contact,
	db,
	desc,
	eq,
	lead,
	leadActivity,
	pipeline,
	pipelineStage,
	proposal,
} from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================
// Schemas
// ============================================================

const createContactSchema = z.object({
	organizationId: z.string().min(1),
	name: z.string().trim().min(1, "Nome é obrigatório"),
	phone: z.string().trim().optional().nullable(),
	email: z.string().email("Email inválido").optional().nullable(),
	company: z.string().trim().optional().nullable(),
	document: z.string().trim().optional().nullable(),
	source: z.string().trim().optional().nullable(),
});

const updateContactSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1).optional(),
	phone: z.string().trim().nullable().optional(),
	email: z.string().email().nullable().optional(),
	company: z.string().trim().nullable().optional(),
	document: z.string().trim().nullable().optional(),
	notes: z.string().trim().nullable().optional(),
	tags: z.array(z.string()).optional(),
});

const createLeadSchema = z.object({
	organizationId: z.string().min(1),
	contactId: z.string().min(1),
	pipelineId: z.string().min(1),
	stageId: z.string().min(1),
	title: z.string().trim().optional().nullable(),
	description: z.string().trim().optional().nullable(),
	value: z.number().nonnegative().optional().nullable(),
	currency: z.string().default("BRL"),
	temperature: z.enum(["COLD", "WARM", "HOT"]).default("COLD"),
	priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
	origin: z.string().trim().optional().nullable(),
	assignedTo: z.string().optional().nullable(),
});

const updateLeadSchema = z.object({
	id: z.string().min(1),
	title: z.string().trim().nullable().optional(),
	description: z.string().trim().nullable().optional(),
	value: z.number().nonnegative().nullable().optional(),
	currency: z.string().optional(),
	temperature: z.enum(["COLD", "WARM", "HOT"]).optional(),
	priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
	origin: z.string().trim().nullable().optional(),
	assignedTo: z.string().nullable().optional(),
});

const moveLeadSchema = z.object({
	leadId: z.string().min(1),
	toStageId: z.string().min(1),
});

const createProposalSchema = z.object({
	organizationId: z.string().min(1),
	leadId: z.string().optional().nullable(),
	title: z.string().trim().min(1, "Título é obrigatório"),
	text: z.string().trim().optional().nullable(),
	totalValue: z.number().nonnegative().optional().nullable(),
	status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]).default("DRAFT"),
});

const updateProposalSchema = z.object({
	id: z.string().min(1),
	title: z.string().trim().min(1).optional(),
	text: z.string().trim().nullable().optional(),
	totalValue: z.number().nonnegative().nullable().optional(),
	status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]).optional(),
	leadId: z.string().nullable().optional(),
});

const logActivitySchema = z.object({
	leadId: z.string().min(1),
	type: z.enum([
		"CALL",
		"EMAIL",
		"MEETING",
		"TASK",
		"WHATSAPP",
		"NOTE",
		"STAGE_CHANGE",
		"SYSTEM",
		"AGENT_ACTION",
	]),
	title: z.string().trim().min(1),
	content: z.string().trim().optional().nullable(),
	metadata: z.record(z.string(), z.unknown()).optional(),
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

async function assertLeadAccess(userId: string, leadId: string) {
	const [row] = await db
		.select({ organizationId: lead.organizationId })
		.from(lead)
		.where(eq(lead.id, leadId))
		.limit(1);

	if (!row) {
		throw new Error("LEAD_NOT_FOUND");
	}
	await requireOrgAccess(userId, row.organizationId);
	return row.organizationId;
}

function revalidateCrm(organizationSlug?: string | null) {
	// Revalida as rotas de CRM da org ativa.
	if (organizationSlug) {
		revalidatePath(`/app/${organizationSlug}/crm/pipeline`, "page");
		revalidatePath(`/app/${organizationSlug}/crm/leads`, "page");
		revalidatePath(`/app/${organizationSlug}/crm/clientes`, "page");
		revalidatePath(`/app/${organizationSlug}/crm/propostas`, "page");
	}
}

// ============================================================
// Contacts
// ============================================================

export async function createContactAction(
	input: z.input<typeof createContactSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = createContactSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	const now = new Date();
	const [created] = await db
		.insert(contact)
		.values({
			organizationId: data.organizationId,
			name: data.name,
			phone: data.phone ?? null,
			email: data.email ?? null,
			company: data.company ?? null,
			document: data.document ?? null,
			source: data.source ?? null,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	revalidateCrm(organizationSlug);
	return created;
}

export async function updateContactAction(
	input: z.input<typeof updateContactSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = updateContactSchema.parse(input);

	const [target] = await db
		.select({ organizationId: contact.organizationId })
		.from(contact)
		.where(eq(contact.id, data.id))
		.limit(1);

	if (!target) {
		throw new Error("CONTACT_NOT_FOUND");
	}

	await requireOrgAccess(user.id, target.organizationId);

	const { id, ...fields } = data;
	await db
		.update(contact)
		.set({ ...fields, updatedAt: new Date() })
		.where(eq(contact.id, id));

	revalidateCrm(organizationSlug);
}

export async function deleteContactAction(
	contactId: string,
	organizationSlug?: string,
) {
	const user = await requireAuthed();

	const [target] = await db
		.select({ organizationId: contact.organizationId })
		.from(contact)
		.where(eq(contact.id, contactId))
		.limit(1);

	if (!target) {
		throw new Error("CONTACT_NOT_FOUND");
	}

	await requireOrgAccess(user.id, target.organizationId);
	await db.delete(contact).where(eq(contact.id, contactId));
	revalidateCrm(organizationSlug);
}

// ============================================================
// Leads
// ============================================================

export async function createLeadAction(
	input: z.input<typeof createLeadSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = createLeadSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	// Validar que pipeline/stage pertencem à org.
	const [pipe] = await db
		.select({ id: pipeline.id, organizationId: pipeline.organizationId })
		.from(pipeline)
		.where(eq(pipeline.id, data.pipelineId))
		.limit(1);
	if (!pipe || pipe.organizationId !== data.organizationId) {
		throw new Error("PIPELINE_INVALID");
	}

	const [stage] = await db
		.select({ pipelineId: pipelineStage.pipelineId })
		.from(pipelineStage)
		.where(eq(pipelineStage.id, data.stageId))
		.limit(1);
	if (!stage || stage.pipelineId !== data.pipelineId) {
		throw new Error("STAGE_INVALID");
	}

	const now = new Date();
	const [created] = await db
		.insert(lead)
		.values({
			organizationId: data.organizationId,
			contactId: data.contactId,
			pipelineId: data.pipelineId,
			stageId: data.stageId,
			title: data.title ?? null,
			description: data.description ?? null,
			value: data.value != null ? String(data.value) : null,
			currency: data.currency,
			temperature: data.temperature,
			priority: data.priority,
			origin: data.origin ?? null,
			assignedTo: data.assignedTo ?? null,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	await db.insert(leadActivity).values({
		leadId: created.id,
		type: "SYSTEM",
		title: "Lead criado",
		createdBy: user.id,
		createdAt: now,
	});

	revalidateCrm(organizationSlug);
	return created;
}

export async function updateLeadAction(
	input: z.input<typeof updateLeadSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = updateLeadSchema.parse(input);
	await assertLeadAccess(user.id, data.id);

	const { id, value, ...rest } = data;
	await db
		.update(lead)
		.set({
			...rest,
			value: value != null ? String(value) : undefined,
			updatedAt: new Date(),
		})
		.where(eq(lead.id, id));

	revalidateCrm(organizationSlug);
}

export async function moveLeadToStageAction(
	input: z.input<typeof moveLeadSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const { leadId, toStageId } = moveLeadSchema.parse(input);

	const [current] = await db
		.select({
			id: lead.id,
			organizationId: lead.organizationId,
			pipelineId: lead.pipelineId,
			stageId: lead.stageId,
		})
		.from(lead)
		.where(eq(lead.id, leadId))
		.limit(1);

	if (!current) {
		throw new Error("LEAD_NOT_FOUND");
	}

	await requireOrgAccess(user.id, current.organizationId);

	const [toStage] = await db
		.select()
		.from(pipelineStage)
		.where(eq(pipelineStage.id, toStageId))
		.limit(1);

	if (!toStage || toStage.pipelineId !== current.pipelineId) {
		throw new Error("STAGE_INVALID");
	}

	if (current.stageId === toStageId) {
		return; // no-op
	}

	const [fromStage] = await db
		.select({ name: pipelineStage.name })
		.from(pipelineStage)
		.where(eq(pipelineStage.id, current.stageId))
		.limit(1);

	const now = new Date();
	await db
		.update(lead)
		.set({
			stageId: toStageId,
			closedAt: toStage.isClosing ? now : null,
			updatedAt: now,
		})
		.where(eq(lead.id, leadId));

	await db.insert(leadActivity).values({
		leadId,
		type: "STAGE_CHANGE",
		title: `Estágio: ${fromStage?.name ?? "?"} → ${toStage.name}`,
		createdBy: user.id,
		createdAt: now,
	});

	revalidateCrm(organizationSlug);
}

export async function deleteLeadAction(
	leadId: string,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	await assertLeadAccess(user.id, leadId);
	await db.delete(lead).where(eq(lead.id, leadId));
	revalidateCrm(organizationSlug);
}

// ============================================================
// Lead details (for drawer)
// ============================================================

export async function getLeadDetailsAction(leadId: string) {
	const user = await requireAuthed();
	await assertLeadAccess(user.id, leadId);

	const [row] = await db
		.select()
		.from(lead)
		.innerJoin(contact, eq(lead.contactId, contact.id))
		.where(eq(lead.id, leadId))
		.limit(1);

	if (!row) {
		throw new Error("LEAD_NOT_FOUND");
	}

	const activities = await db
		.select()
		.from(leadActivity)
		.where(eq(leadActivity.leadId, leadId))
		.orderBy(desc(leadActivity.createdAt));

	return {
		lead: row.lead,
		contact: row.contact,
		activities,
	};
}

// ============================================================
// Activities
// ============================================================

export async function logActivityAction(
	input: z.input<typeof logActivitySchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = logActivitySchema.parse(input);
	await assertLeadAccess(user.id, data.leadId);

	const [created] = await db
		.insert(leadActivity)
		.values({
			leadId: data.leadId,
			type: data.type,
			title: data.title,
			content: data.content ?? null,
			metadata: data.metadata,
			createdBy: user.id,
			createdAt: new Date(),
		})
		.returning();

	revalidateCrm(organizationSlug);
	return created;
}

// ============================================================
// Proposals
// ============================================================

export async function createProposalAction(
	input: z.input<typeof createProposalSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = createProposalSchema.parse(input);
	await requireOrgAccess(user.id, data.organizationId);

	if (data.leadId) {
		const [leadRow] = await db
			.select({ organizationId: lead.organizationId })
			.from(lead)
			.where(eq(lead.id, data.leadId))
			.limit(1);
		if (!leadRow || leadRow.organizationId !== data.organizationId) {
			throw new Error("LEAD_INVALID");
		}
	}

	const now = new Date();
	const [created] = await db
		.insert(proposal)
		.values({
			organizationId: data.organizationId,
			leadId: data.leadId ?? null,
			title: data.title,
			content: { text: data.text ?? "" },
			totalValue:
				data.totalValue != null ? String(data.totalValue) : null,
			status: data.status,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	revalidateCrm(organizationSlug);
	return created;
}

async function assertProposalAccess(userId: string, proposalId: string) {
	const [row] = await db
		.select({ organizationId: proposal.organizationId })
		.from(proposal)
		.where(eq(proposal.id, proposalId))
		.limit(1);

	if (!row) {
		throw new Error("PROPOSAL_NOT_FOUND");
	}
	await requireOrgAccess(userId, row.organizationId);
	return row.organizationId;
}

export async function updateProposalAction(
	input: z.input<typeof updateProposalSchema>,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	const data = updateProposalSchema.parse(input);
	await assertProposalAccess(user.id, data.id);

	const { id, text, totalValue, ...rest } = data;
	const updateSet: Record<string, unknown> = {
		...rest,
		updatedAt: new Date(),
	};
	if (text !== undefined) updateSet.content = { text: text ?? "" };
	if (totalValue !== undefined) {
		updateSet.totalValue = totalValue != null ? String(totalValue) : null;
	}
	if (rest.status === "SENT") updateSet.sentAt = new Date();

	await db.update(proposal).set(updateSet).where(eq(proposal.id, id));
	revalidateCrm(organizationSlug);
}

export async function deleteProposalAction(
	proposalId: string,
	organizationSlug?: string,
) {
	const user = await requireAuthed();
	await assertProposalAccess(user.id, proposalId);
	await db.delete(proposal).where(eq(proposal.id, proposalId));
	revalidateCrm(organizationSlug);
}
