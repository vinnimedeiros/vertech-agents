import { createId as cuid } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	json,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { organization, user } from "./postgres";

// =============================================
// JSONB Types (tipados via .$type<>())
// =============================================

/**
 * Persona do agente — tom, formalidade, humor, empatia.
 * Consumido por buildInstructions() em packages/ai/src/mastra/instructions/builder.ts
 */
export type AgentPersonality = {
	tone?: "formal" | "semiformal" | "informal" | "descontraido";
	formality?: "voce_sem_girias" | "tu" | "vc_girias" | "formal";
	humor?: "seco" | "leve" | "descontraido" | "sem_humor";
	empathyLevel?: "alta" | "media" | "baixa";
};

/**
 * Contexto de negocio do agente — setor, produtos, politica de precos.
 * inviolableRules sao hardcoded no prompt como "NUNCA fazer X".
 */
export type AgentBusinessContext = {
	industry?: string;
	products?: string;
	pricing?: string;
	policies?: string;
	inviolableRules?: string[];
};

/**
 * Estilo de conversa — saudacao, qualificacao, objecoes, handoff.
 */
export type AgentConversationStyle = {
	greeting?: string;
	qualificationQuestions?: string[];
	objectionHandling?: string;
	handoffTriggers?: string[];
};

/**
 * Snapshot imutavel gravado em agent_version.snapshot na publicacao.
 * Permite rollback pro estado exato de qualquer versao anterior.
 */
export type AgentSnapshot = {
	name: string;
	role?: string | null;
	avatarUrl?: string | null;
	gender?: string | null;
	description?: string | null;
	model: string;
	temperature: number;
	maxSteps: number;
	personality: AgentPersonality;
	businessContext: AgentBusinessContext;
	conversationStyle: AgentConversationStyle;
	instructions?: string | null;
	enabledTools: string[];
	knowledgeDocIds: string[];
	whatsappInstanceId?: string | null;
	version: number;
	publishedAt: string; // ISO
};

// =============================================
// Enums
// =============================================

export const agentStatusEnum = pgEnum("AgentStatus", [
	"DRAFT",
	"ACTIVE",
	"PAUSED",
	"ARCHIVED",
]);

// =============================================
// Agent
// =============================================

export const agent = pgTable(
	"agent",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),

		// Identidade
		name: text("name").notNull(),
		role: text("role"),
		avatarUrl: text("avatarUrl"),
		// FEMININE | MASCULINE | NEUTRAL (sem enum — futuro pode ter mais valores)
		gender: varchar("gender", { length: 16 }),
		description: text("description"),

		// Configuracao do modelo (Vercel AI SDK — formato provider/model-id)
		// Default confirmado em Phase 07A.1 dependencies-confirmed.md
		model: text("model").notNull().default("openai/gpt-4.1-mini"),
		temperature: real("temperature").notNull().default(0.7),
		maxSteps: integer("maxSteps").notNull().default(10),

		// Persona (JSONB tipado) — renderizado em buildInstructions()
		personality: json("personality")
			.$type<AgentPersonality>()
			.notNull()
			.default({}),
		businessContext: json("businessContext")
			.$type<AgentBusinessContext>()
			.notNull()
			.default({}),
		conversationStyle: json("conversationStyle")
			.$type<AgentConversationStyle>()
			.notNull()
			.default({}),

		// Override manual das instructions — se preenchido, ignora template
		instructions: text("instructions"),

		// Keys de tools habilitadas (populadas a partir de registries em packages/ai)
		// Phase 07A: registry commercialTools e stub vazio; populado em Phase 08
		enabledTools: text("enabledTools")
			.array()
			.notNull()
			.default(sql`'{}'`),

		// IDs de documentos RAG habilitados — populado em Phase 08
		knowledgeDocIds: text("knowledgeDocIds")
			.array()
			.notNull()
			.default(sql`'{}'`),

		// Status operacional
		status: agentStatusEnum("status").notNull().default("DRAFT"),
		// Versao atual — incrementada a cada publicacao via agent_version
		version: integer("version").notNull().default(1),

		// Vinculo com instancia WhatsApp (Phase 06) — sem FK porque whatsapp.instance
		// esta em outro schema file e o vinculo e logico (uma instancia pode nao existir
		// mais quando o agente for pausado). Validacao a nivel de aplicacao.
		whatsappInstanceId: text("whatsappInstanceId"),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
		publishedAt: timestamp("publishedAt"),
	},
	(table) => [
		index("agent_org_status_idx").on(table.organizationId, table.status),
		index("agent_whatsapp_instance_idx").on(table.whatsappInstanceId),
	],
);

// =============================================
// Agent Version (snapshot imutavel)
// =============================================

export const agentVersion = pgTable(
	"agent_version",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		agentId: text("agentId")
			.notNull()
			.references(() => agent.id, { onDelete: "cascade" }),
		version: integer("version").notNull(),
		snapshot: json("snapshot").$type<AgentSnapshot>().notNull(),
		// null = system/auto (ex: criacao inicial). Quem fez a mudanca quando humano.
		createdByUserId: text("createdByUserId").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("agent_version_unique").on(table.agentId, table.version),
		index("agent_version_agent_created_idx").on(
			table.agentId,
			table.createdAt,
		),
	],
);

// =============================================
// Relations
// =============================================

export const agentRelations = relations(agent, ({ one, many }) => ({
	organization: one(organization, {
		fields: [agent.organizationId],
		references: [organization.id],
	}),
	versions: many(agentVersion),
}));

export const agentVersionRelations = relations(agentVersion, ({ one }) => ({
	agent: one(agent, {
		fields: [agentVersion.agentId],
		references: [agent.id],
	}),
	creator: one(user, {
		fields: [agentVersion.createdByUserId],
		references: [user.id],
	}),
}));
