import { createId as cuid } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
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
import { agent } from "./agents";
import { organization } from "./postgres";

/**
 * TIME — pacote de N agentes que opera como unidade comercial.
 *
 * Phase 11 / Visão V3: produto vende TIME (Atendente + Analista + Campanhas
 * + Assistente), não agente solo. Agência customiza preset Vertech default.
 *
 * V3: somente kind=COMMERCIAL. V4+: SUPPORT, RH, COLLECTIONS, CUSTOM.
 */

export type BrandVoice = {
	name?: string; // Nome visível ao lead (Camila, Pedro)
	tone?: "formal" | "semiformal" | "informal";
	formality?: "voce_sem_girias" | "tu" | "vc_girias";
	humor?: "seco" | "leve" | "descontraido" | "sem_humor";
	empathyLevel?: "alta" | "media" | "baixa";
	inviolableRules?: string[];
};

export type TeamMetrics = {
	leadsAttendedToday?: number;
	qualificationRateLast7d?: number;
	humanHandoffsLast7d?: number;
	campaignsActive?: number;
	lastSyncAt?: string; // ISO
};

export const teamKindEnum = pgEnum("TeamKind", ["COMMERCIAL"]);

export const teamStatusEnum = pgEnum("TeamStatus", [
	"DRAFT",
	"ACTIVE",
	"SANDBOX",
	"PAUSED",
	"ARCHIVED",
]);

export const teamMemberRoleEnum = pgEnum("TeamMemberRole", [
	"SUPERVISOR",
	"ANALYST",
	"CAMPAIGNS",
	"ASSISTANT",
]);

export const team = pgTable(
	"team",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),

		name: text("name").notNull(),
		description: text("description"),
		kind: teamKindEnum("kind").notNull().default("COMMERCIAL"),

		brandVoice: json("brandVoice").$type<BrandVoice>().notNull().default({}),

		status: teamStatusEnum("status").notNull().default("DRAFT"),

		whatsappInstanceId: text("whatsappInstanceId"),

		metrics: json("metrics").$type<TeamMetrics>(),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
		publishedAt: timestamp("publishedAt"),
	},
	(table) => [
		index("team_org_status_idx").on(table.organizationId, table.status),
	],
);

export const teamMember = pgTable(
	"team_member",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		teamId: text("teamId")
			.notNull()
			.references(() => team.id, { onDelete: "cascade" }),
		agentId: text("agentId")
			.notNull()
			.references(() => agent.id, { onDelete: "cascade" }),

		role: teamMemberRoleEnum("role").notNull(),

		// Texto curto que o Supervisor vê pra decidir delegação.
		// Vira fragmento do system prompt do Supervisor em runtime.
		delegateInstruction: text("delegateInstruction").notNull().default(""),

		bio: text("bio").notNull().default(""),

		position: integer("position").notNull().default(0),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("team_member_unique").on(table.teamId, table.agentId),
		uniqueIndex("team_supervisor_unique")
			.on(table.teamId)
			.where(sql`role = 'SUPERVISOR'`),
		index("team_member_team_idx").on(table.teamId),
	],
);

export const teamRelations = relations(team, ({ one, many }) => ({
	organization: one(organization, {
		fields: [team.organizationId],
		references: [organization.id],
	}),
	members: many(teamMember),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
	team: one(team, {
		fields: [teamMember.teamId],
		references: [team.id],
	}),
	agent: one(agent, {
		fields: [teamMember.agentId],
		references: [agent.id],
	}),
}));
