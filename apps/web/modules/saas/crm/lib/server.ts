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
	member,
	or,
	pipeline,
	pipelineStage,
	pipelineView,
	proposal,
	sql,
	statusTemplate,
	user,
} from "@repo/database";
import { cache } from "react";
import type {
	TemplateMetadata,
	TemplateStage,
} from "./status-templates-data";
import type { SortKey, ViewFiltersState, ViewMode } from "./view-filters";

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

/**
 * Pipelines da org enriquecidos com contagem de leads + valor total.
 * Usado pelo PipelineSelector no header do Kanban.
 */
export const listPipelinesWithStats = cache(async (organizationId: string) => {
	const pipelines = await db
		.select()
		.from(pipeline)
		.where(eq(pipeline.organizationId, organizationId))
		.orderBy(asc(pipeline.position), asc(pipeline.name));

	if (pipelines.length === 0) return [];

	const leadsAgg = await db
		.select({
			pipelineId: lead.pipelineId,
			count: sql<number>`count(*)::int`,
			totalValue: sql<string>`coalesce(sum(${lead.value}), 0)::text`,
		})
		.from(lead)
		.where(eq(lead.organizationId, organizationId))
		.groupBy(lead.pipelineId);

	const statsByPipeline = new Map(
		leadsAgg.map((row) => [
			row.pipelineId,
			{ count: row.count, totalValue: row.totalValue },
		]),
	);

	return pipelines.map((p) => ({
		...p,
		leadCount: statsByPipeline.get(p.id)?.count ?? 0,
		totalValue: statsByPipeline.get(p.id)?.totalValue ?? "0",
	}));
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

export const listLeadsForOrg = cache(async (organizationId: string) => {
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
			assignedTo: lead.assignedTo,
			stageId: lead.stageId,
			pipelineId: lead.pipelineId,
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
			stage: {
				id: pipelineStage.id,
				name: pipelineStage.name,
				color: pipelineStage.color,
				isClosing: pipelineStage.isClosing,
				isWon: pipelineStage.isWon,
			},
		})
		.from(lead)
		.innerJoin(contact, eq(lead.contactId, contact.id))
		.innerJoin(pipelineStage, eq(lead.stageId, pipelineStage.id))
		.where(eq(lead.organizationId, organizationId))
		.orderBy(desc(lead.updatedAt));
});

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
			stageDates: lead.stageDates,
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

// ============================================================
// Proposals
// ============================================================

export const listProposalsByOrg = cache(async (organizationId: string) => {
	return db
		.select({
			id: proposal.id,
			title: proposal.title,
			totalValue: proposal.totalValue,
			status: proposal.status,
			leadId: proposal.leadId,
			sentAt: proposal.sentAt,
			createdAt: proposal.createdAt,
			updatedAt: proposal.updatedAt,
			lead: {
				id: lead.id,
				title: lead.title,
			},
			contact: {
				id: contact.id,
				name: contact.name,
			},
		})
		.from(proposal)
		.leftJoin(lead, eq(proposal.leadId, lead.id))
		.leftJoin(contact, eq(lead.contactId, contact.id))
		.where(eq(proposal.organizationId, organizationId))
		.orderBy(desc(proposal.updatedAt));
});

export const listActivitiesByLead = cache(async (leadId: string) => {
	return db
		.select()
		.from(leadActivity)
		.where(eq(leadActivity.leadId, leadId))
		.orderBy(desc(leadActivity.createdAt));
});

// ============================================================
// Status Templates (Phase 04F)
// ============================================================

export type StatusTemplateRow = {
	id: string;
	organizationId: string | null;
	name: string;
	description: string | null;
	vertical: string | null;
	stages: TemplateStage[];
	metadata: TemplateMetadata | null;
	isBuiltIn: boolean;
	isPublic: boolean;
	usageCount: number;
	createdBy: string | null;
};

/**
 * Lista templates disponíveis pra org:
 * - built-in (organizationId = null) SEMPRE
 * - templates custom da própria org
 * Ordem: built-in primeiro (por name), depois custom (mais usados primeiro).
 */
export const listStatusTemplatesForOrg = cache(
	async (organizationId: string): Promise<StatusTemplateRow[]> => {
		const rows = await db
			.select()
			.from(statusTemplate)
			.where(
				or(
					eq(statusTemplate.isBuiltIn, true),
					eq(statusTemplate.organizationId, organizationId),
				),
			)
			.orderBy(desc(statusTemplate.isBuiltIn), desc(statusTemplate.usageCount), asc(statusTemplate.name));

		return rows.map((r) => ({
			id: r.id,
			organizationId: r.organizationId,
			name: r.name,
			description: r.description,
			vertical: r.vertical,
			stages: (r.stages ?? []) as TemplateStage[],
			metadata: (r.metadata ?? null) as TemplateMetadata | null,
			isBuiltIn: r.isBuiltIn,
			isPublic: r.isPublic,
			usageCount: r.usageCount,
			createdBy: r.createdBy,
		}));
	},
);

// ============================================================
// Interesses da org (pra autocomplete no InterestsPicker)
// ============================================================

export const listAllInterestsForOrg = cache(
	async (organizationId: string): Promise<string[]> => {
		const rows = await db
			.select({ interests: lead.interests })
			.from(lead)
			.where(eq(lead.organizationId, organizationId));
		const set = new Set<string>();
		for (const r of rows) {
			const arr = r.interests as string[] | null;
			if (arr) for (const i of arr) set.add(i);
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
	},
);

// ============================================================
// Org Members (pra filtro de assignee na Phase 04E.3+04E.4)
// ============================================================

export type OrgMemberOption = {
	userId: string;
	name: string | null;
	email: string | null;
	image: string | null;
};

export const listOrgMembers = cache(
	async (organizationId: string): Promise<OrgMemberOption[]> => {
		const rows = await db
			.select({
				userId: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
			})
			.from(member)
			.innerJoin(user, eq(member.userId, user.id))
			.where(eq(member.organizationId, organizationId))
			.orderBy(asc(user.name));
		return rows;
	},
);

// ============================================================
// Pipeline Views (Phase 04E.3)
// ============================================================

export type PipelineViewRow = {
	id: string;
	pipelineId: string;
	name: string;
	filters: ViewFiltersState;
	viewMode: ViewMode;
	sortBy: SortKey;
	isDefault: boolean;
	isShared: boolean;
	position: number;
	createdBy: string | null;
	isMine: boolean;
};

/**
 * Lista visões do pipeline visíveis pro usuário: as dele + as compartilhadas.
 * Ordena por position asc, depois createdAt asc.
 */
export const listPipelineViewsForUser = cache(
	async (pipelineId: string, userId: string): Promise<PipelineViewRow[]> => {
		const rows = await db
			.select()
			.from(pipelineView)
			.where(
				and(
					eq(pipelineView.pipelineId, pipelineId),
					or(
						eq(pipelineView.createdBy, userId),
						eq(pipelineView.isShared, true),
					),
				),
			)
			.orderBy(asc(pipelineView.position), asc(pipelineView.createdAt));

		return rows.map((r) => ({
			id: r.id,
			pipelineId: r.pipelineId,
			name: r.name,
			filters: (r.filters ?? {}) as ViewFiltersState,
			viewMode: r.viewMode,
			sortBy: r.sortBy,
			isDefault: r.isDefault,
			isShared: r.isShared,
			position: r.position,
			createdBy: r.createdBy,
			isMine: r.createdBy === userId,
		}));
	},
);
