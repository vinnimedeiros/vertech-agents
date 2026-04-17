import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
	boolean,
	decimal,
	index,
	integer,
	json,
	pgEnum,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { organization, user } from "./postgres";

// =============================================
// Enums
// =============================================

export const temperatureEnum = pgEnum("LeadTemperature", [
	"COLD",
	"WARM",
	"HOT",
]);

export const leadPriorityEnum = pgEnum("LeadPriority", [
	"LOW",
	"NORMAL",
	"HIGH",
	"URGENT",
]);

export const leadActivityTypeEnum = pgEnum("LeadActivityType", [
	"CALL",
	"EMAIL",
	"MEETING",
	"TASK",
	"WHATSAPP",
	"NOTE",
	"STAGE_CHANGE",
	"SYSTEM",
	"AGENT_ACTION",
]);

export const proposalStatusEnum = pgEnum("ProposalStatus", [
	"DRAFT",
	"SENT",
	"ACCEPTED",
	"REJECTED",
]);

// =============================================
// Pipelines
// =============================================

export const pipeline = pgTable(
	"pipeline",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		isDefault: boolean("isDefault").notNull().default(false),
		position: integer("position").notNull().default(0),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [index("pipeline_organization_idx").on(table.organizationId)],
);

export const pipelineStage = pgTable(
	"pipeline_stage",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		pipelineId: text("pipelineId")
			.notNull()
			.references(() => pipeline.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		color: text("color").notNull().default("#94a3b8"),
		position: integer("position").notNull(),
		isClosing: boolean("isClosing").notNull().default(false),
		isWon: boolean("isWon").notNull().default(false),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
	},
	(table) => [index("pipeline_stage_pipeline_idx").on(table.pipelineId)],
);

// =============================================
// Contacts
// =============================================

export const contact = pgTable(
	"contact",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		phone: text("phone"),
		email: text("email"),
		company: text("company"),
		document: text("document"),
		photoUrl: text("photoUrl"),
		tags: text("tags").array().notNull().default([]),
		source: text("source"),
		notes: text("notes"),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("contact_organization_idx").on(table.organizationId),
		index("contact_phone_idx").on(table.phone),
		index("contact_email_idx").on(table.email),
	],
);

// =============================================
// Leads
// =============================================

export const lead = pgTable(
	"lead",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		contactId: text("contactId")
			.notNull()
			.references(() => contact.id, { onDelete: "restrict" }),
		pipelineId: text("pipelineId")
			.notNull()
			.references(() => pipeline.id),
		stageId: text("stageId")
			.notNull()
			.references(() => pipelineStage.id),
		assignedTo: text("assignedTo").references(() => user.id, {
			onDelete: "set null",
		}),
		title: text("title"),
		description: text("description"),
		value: decimal("value", { precision: 12, scale: 2 }),
		currency: text("currency").notNull().default("BRL"),
		temperature: temperatureEnum("temperature").notNull().default("COLD"),
		priority: leadPriorityEnum("priority").notNull().default("NORMAL"),
		origin: text("origin"),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
		closedAt: timestamp("closedAt"),
	},
	(table) => [
		index("lead_organization_idx").on(table.organizationId),
		index("lead_contact_idx").on(table.contactId),
		index("lead_pipeline_idx").on(table.pipelineId),
		index("lead_stage_idx").on(table.stageId),
		index("lead_assigned_idx").on(table.assignedTo),
	],
);

export const leadActivity = pgTable(
	"lead_activity",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		leadId: text("leadId")
			.notNull()
			.references(() => lead.id, { onDelete: "cascade" }),
		type: leadActivityTypeEnum("type").notNull(),
		title: text("title").notNull(),
		content: text("content"),
		metadata: json("metadata").$type<Record<string, unknown>>(),
		createdBy: text("createdBy").references(() => user.id, {
			onDelete: "set null",
		}),
		agentId: text("agentId"),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
	},
	(table) => [
		index("lead_activity_lead_idx").on(table.leadId),
		index("lead_activity_created_idx").on(table.createdAt),
	],
);

// =============================================
// Proposals
// =============================================

export const proposal = pgTable(
	"proposal",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		leadId: text("leadId").references(() => lead.id, {
			onDelete: "set null",
		}),
		title: text("title").notNull(),
		content: json("content").$type<Record<string, unknown>>().notNull(),
		totalValue: decimal("totalValue", { precision: 12, scale: 2 }),
		status: proposalStatusEnum("status").notNull().default("DRAFT"),
		sentAt: timestamp("sentAt"),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("proposal_organization_idx").on(table.organizationId),
		index("proposal_lead_idx").on(table.leadId),
	],
);

// =============================================
// Relations
// =============================================

export const pipelineRelations = relations(pipeline, ({ one, many }) => ({
	organization: one(organization, {
		fields: [pipeline.organizationId],
		references: [organization.id],
	}),
	stages: many(pipelineStage),
	leads: many(lead),
}));

export const pipelineStageRelations = relations(
	pipelineStage,
	({ one, many }) => ({
		pipeline: one(pipeline, {
			fields: [pipelineStage.pipelineId],
			references: [pipeline.id],
		}),
		leads: many(lead),
	}),
);

export const contactRelations = relations(contact, ({ one, many }) => ({
	organization: one(organization, {
		fields: [contact.organizationId],
		references: [organization.id],
	}),
	leads: many(lead),
}));

export const leadRelations = relations(lead, ({ one, many }) => ({
	organization: one(organization, {
		fields: [lead.organizationId],
		references: [organization.id],
	}),
	contact: one(contact, {
		fields: [lead.contactId],
		references: [contact.id],
	}),
	pipeline: one(pipeline, {
		fields: [lead.pipelineId],
		references: [pipeline.id],
	}),
	stage: one(pipelineStage, {
		fields: [lead.stageId],
		references: [pipelineStage.id],
	}),
	assignedUser: one(user, {
		fields: [lead.assignedTo],
		references: [user.id],
	}),
	activities: many(leadActivity),
	proposals: many(proposal),
}));

export const leadActivityRelations = relations(leadActivity, ({ one }) => ({
	lead: one(lead, {
		fields: [leadActivity.leadId],
		references: [lead.id],
	}),
	createdByUser: one(user, {
		fields: [leadActivity.createdBy],
		references: [user.id],
	}),
}));

export const proposalRelations = relations(proposal, ({ one }) => ({
	organization: one(organization, {
		fields: [proposal.organizationId],
		references: [organization.id],
	}),
	lead: one(lead, {
		fields: [proposal.leadId],
		references: [lead.id],
	}),
}));
