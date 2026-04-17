import "server-only";
import {
	and,
	asc,
	contact,
	db,
	desc,
	eq,
	lead,
	leadActivity,
	pipeline,
	pipelineStage,
} from "@repo/database";
import { cache } from "react";

// ============================================================
// Pipelines
// ============================================================

export const listPipelinesByOrg = cache(async (organizationId: string) => {
	return db
		.select()
		.from(pipeline)
		.where(eq(pipeline.organizationId, organizationId))
		.orderBy(asc(pipeline.position), asc(pipeline.name));
});

export const getDefaultPipelineWithStages = cache(
	async (organizationId: string) => {
		const [defaultPipeline] = await db
			.select()
			.from(pipeline)
			.where(
				and(
					eq(pipeline.organizationId, organizationId),
					eq(pipeline.isDefault, true),
				),
			)
			.limit(1);

		if (!defaultPipeline) {
			return null;
		}

		const stages = await db
			.select()
			.from(pipelineStage)
			.where(eq(pipelineStage.pipelineId, defaultPipeline.id))
			.orderBy(asc(pipelineStage.position));

		return { ...defaultPipeline, stages };
	},
);

export const getPipelineWithStages = cache(async (pipelineId: string) => {
	const [found] = await db
		.select()
		.from(pipeline)
		.where(eq(pipeline.id, pipelineId))
		.limit(1);

	if (!found) {
		return null;
	}

	const stages = await db
		.select()
		.from(pipelineStage)
		.where(eq(pipelineStage.pipelineId, pipelineId))
		.orderBy(asc(pipelineStage.position));

	return { ...found, stages };
});

// ============================================================
// Leads
// ============================================================

export const listLeadsByPipeline = cache(async (pipelineId: string) => {
	return db
		.select({
			id: lead.id,
			title: lead.title,
			description: lead.description,
			value: lead.value,
			currency: lead.currency,
			temperature: lead.temperature,
			priority: lead.priority,
			origin: lead.origin,
			stageId: lead.stageId,
			assignedTo: lead.assignedTo,
			createdAt: lead.createdAt,
			updatedAt: lead.updatedAt,
			closedAt: lead.closedAt,
			contact: {
				id: contact.id,
				name: contact.name,
				phone: contact.phone,
				email: contact.email,
				company: contact.company,
				photoUrl: contact.photoUrl,
			},
		})
		.from(lead)
		.innerJoin(contact, eq(lead.contactId, contact.id))
		.where(eq(lead.pipelineId, pipelineId))
		.orderBy(desc(lead.updatedAt));
});

export const getLeadById = cache(async (leadId: string) => {
	const [row] = await db
		.select()
		.from(lead)
		.innerJoin(contact, eq(lead.contactId, contact.id))
		.where(eq(lead.id, leadId))
		.limit(1);

	return row ?? null;
});

// ============================================================
// Contacts
// ============================================================

export const listContactsByOrg = cache(async (organizationId: string) => {
	return db
		.select()
		.from(contact)
		.where(eq(contact.organizationId, organizationId))
		.orderBy(desc(contact.updatedAt));
});

// ============================================================
// Activities
// ============================================================

export const listActivitiesByLead = cache(async (leadId: string) => {
	return db
		.select()
		.from(leadActivity)
		.where(eq(leadActivity.leadId, leadId))
		.orderBy(desc(leadActivity.createdAt));
});
