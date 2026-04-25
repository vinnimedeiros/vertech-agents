import { createId as cuid } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
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
	uniqueIndex,
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

export const stageCategoryEnum = pgEnum("StageCategory", [
	"NOT_STARTED",
	"ACTIVE",
	"SCHEDULED",
	"WON",
	"LOST",
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
		// Phase 04E: categoria funcional com semantica cross-module
		category: stageCategoryEnum("category").notNull().default("ACTIVE"),
		// Phase 04E: probabilidade de conversao 0-100, usada em weighted pipeline value
		probability: integer("probability").notNull().default(50),
		// Phase 04E: SLA em dias no stage, usado pra stagnation detection
		maxDays: integer("maxDays"),
		// Phase 04E: slug estavel pra integracoes
		slug: varchar("slug", { length: 120 }),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
	},
	(table) => [
		index("pipeline_stage_pipeline_idx").on(table.pipelineId),
		index("pipeline_stage_category_idx").on(table.category),
		index("pipeline_stage_slug_idx").on(table.slug),
	],
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
		// Dados enriquecidos via WhatsApp quando aplicável
		isBusiness: boolean("isBusiness").notNull().default(false),
		businessCategory: text("businessCategory"),
		businessHours: text("businessHours"),
		businessWebsite: text("businessWebsite"),
		businessDescription: text("businessDescription"),
		// Sincronização da lista de contatos do celular conectado via Baileys.
		// Contato com `lastSyncedAt` preenchido foi sincronizado do WhatsApp
		// ao menos uma vez (pode ter sido criado por outros meios depois).
		lastSyncedAt: timestamp("lastSyncedAt"),
		promotedToLeadAt: timestamp("promotedToLeadAt"),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("contact_organization_idx").on(table.organizationId),
		index("contact_phone_idx").on(table.phone),
		index("contact_email_idx").on(table.email),
		// Upsert por telefone dentro da org (só quando há phone — múltiplos
		// contatos sem phone continuam permitidos)
		uniqueIndex("contact_org_phone_uniq")
			.on(table.organizationId, table.phone)
			.where(sql`${table.phone} IS NOT NULL`),
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
		// Phase 04E: historico de entrada em cada stage { stageId: ISODate }
		interests: text("interests").array().default([]).notNull(),
		stageDates: json("stageDates")
			.$type<Record<string, string>>()
			.notNull()
			.default({}),
		// Phase 04E: tags livres multi-valor
		tags: text("tags").array().notNull().default([]),
		// Phase 04E: progress bar no card
		subtaskCount: integer("subtaskCount").notNull().default(0),
		subtaskDone: integer("subtaskDone").notNull().default(0),
		// Phase 04E: data limite opcional
		dueDate: timestamp("dueDate"),
		// Phase 04E: favoritado pelo user
		starred: boolean("starred").notNull().default(false),
		// M2-02 Sandbox: isola dados de teste do Atendente sem nova tabela
		isSandbox: boolean("isSandbox").notNull().default(false),
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
		// M2-02 Sandbox flag (herdado do lead pai)
		isSandbox: boolean("isSandbox").notNull().default(false),
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

// =============================================
// Phase 04E: Saved Views
// =============================================

export const pipelineViewModeEnum = pgEnum("PipelineViewMode", [
	"kanban",
	"list",
	"dashboard",
]);

export const pipelineViewSortEnum = pgEnum("PipelineViewSort", [
	"none",
	"priority",
	"date",
	"name",
	"value",
	"daysInStage",
]);

export const pipelineView = pgTable(
	"pipeline_view",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		pipelineId: text("pipelineId")
			.notNull()
			.references(() => pipeline.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		filters: json("filters")
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		viewMode: pipelineViewModeEnum("viewMode").notNull().default("kanban"),
		sortBy: pipelineViewSortEnum("sortBy").notNull().default("none"),
		isDefault: boolean("isDefault").notNull().default(false),
		isShared: boolean("isShared").notNull().default(false),
		position: integer("position").notNull().default(0),
		createdBy: text("createdBy").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("pipeline_view_pipeline_idx").on(table.pipelineId),
		index("pipeline_view_organization_idx").on(table.organizationId),
	],
);

export const pipelineViewRelations = relations(pipelineView, ({ one }) => ({
	organization: one(organization, {
		fields: [pipelineView.organizationId],
		references: [organization.id],
	}),
	pipeline: one(pipeline, {
		fields: [pipelineView.pipelineId],
		references: [pipeline.id],
	}),
	creator: one(user, {
		fields: [pipelineView.createdBy],
		references: [user.id],
	}),
}));

// =============================================
// Phase 04E: Status Templates
// =============================================

export const statusTemplate = pgTable(
	"status_template",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		// null = template built-in (do produto), nao pertence a nenhuma org
		organizationId: text("organizationId").references(
			() => organization.id,
			{ onDelete: "cascade" },
		),
		name: text("name").notNull(),
		description: text("description"),
		vertical: varchar("vertical", { length: 80 }),
		// array de { name, color, category, probability, maxDays, position }
		stages: json("stages")
			.$type<
				Array<{
					name: string;
					color: string;
					category:
						| "NOT_STARTED"
						| "ACTIVE"
						| "SCHEDULED"
						| "WON"
						| "LOST";
					probability: number;
					maxDays: number | null;
					position: number;
				}>
			>()
			.notNull(),
		// Extras opcionais: iconKey (lucide icon name), persona sugerida pro agente comercial (Phase 09), ferramentas
		metadata: json("metadata")
			.$type<{
				iconKey?: string;
				suggestedAgent?: {
					persona: string;
					tone: string;
					openingMessage: string;
					tools: string[];
				};
			}>(),
		isBuiltIn: boolean("isBuiltIn").notNull().default(false),
		isPublic: boolean("isPublic").notNull().default(false),
		usageCount: integer("usageCount").notNull().default(0),
		createdBy: text("createdBy").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("status_template_organization_idx").on(table.organizationId),
		index("status_template_vertical_idx").on(table.vertical),
		index("status_template_builtin_idx").on(table.isBuiltIn),
	],
);

export const statusTemplateRelations = relations(statusTemplate, ({ one }) => ({
	organization: one(organization, {
		fields: [statusTemplate.organizationId],
		references: [organization.id],
	}),
	creator: one(user, {
		fields: [statusTemplate.createdBy],
		references: [user.id],
	}),
}));

// =============================================
// Phase 04E: Orchestrator Audit Log
// =============================================

export const actorTypeEnum = pgEnum("ActorType", [
	"user",
	"orchestrator",
	"architect",
	"commercial_agent",
	"system",
]);

export const orchestratorAuditLog = pgTable(
	"orchestrator_audit_log",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("userId").references(() => user.id, {
			onDelete: "set null",
		}),
		actorType: actorTypeEnum("actorType").notNull(),
		actorId: varchar("actorId", { length: 255 }).notNull(),
		resource: varchar("resource", { length: 80 }).notNull(),
		resourceId: varchar("resourceId", { length: 255 }).notNull(),
		action: varchar("action", { length: 80 }).notNull(),
		before: json("before").$type<Record<string, unknown> | null>(),
		after: json("after").$type<Record<string, unknown> | null>(),
		// self-reference para marcar quem desfez (nullable)
		undoneBy: varchar("undoneBy", { length: 255 }),
		undoneAt: timestamp("undoneAt"),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
	},
	(table) => [
		index("audit_org_created_idx").on(table.organizationId, table.createdAt),
		index("audit_resource_idx").on(table.resource, table.resourceId),
		index("audit_actor_idx").on(table.actorType, table.actorId),
	],
);

export const orchestratorAuditLogRelations = relations(
	orchestratorAuditLog,
	({ one }) => ({
		organization: one(organization, {
			fields: [orchestratorAuditLog.organizationId],
			references: [organization.id],
		}),
		user: one(user, {
			fields: [orchestratorAuditLog.userId],
			references: [user.id],
		}),
	}),
);
