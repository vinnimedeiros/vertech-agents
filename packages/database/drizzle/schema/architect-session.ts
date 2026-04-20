import { createId as cuid } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
	index,
	integer,
	json,
	pgEnum,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { agent } from "./agents";
import { organization, user } from "./postgres";

// =============================================
// JSONB Types
// =============================================

/**
 * Snapshot do working memory do Arquiteto. Cache denormalizado pra queries rapidas
 * (listar rascunhos em andamento na tela de boas-vindas). Fonte de verdade e o
 * working memory gerenciado pelo @mastra/memory em tabelas mastra_*.
 *
 * Estrutura completa documentada em packages/ai/src/mastra/types/architect-working-memory.ts
 * (tech-spec § 3.1).
 */
export type ArchitectDraftSnapshot = {
	currentStage?: "ideation" | "planning" | "knowledge" | "creation";
	businessName?: string | null;
	agentName?: string | null;
	templateLabel?: string;
	progressPercent?: number;
	lastActivity?: string;
};

/**
 * Conteudo estruturado do artefato, varia por tipo.
 * Sao os outputs que o usuario ve como cards inline no chat do Arquiteto.
 */
export type BusinessProfileContent = {
	businessName: string;
	summary: string;
	offering: string[];
	targetAudience: string;
	goalForAgent: string;
	differentiator?: string;
};

export type AgentBlueprintContent = {
	persona: {
		name: string;
		gender: "FEMININE" | "MASCULINE";
		tone: number;
		formality: number;
		humor: number;
		empathy: number;
		antiPatterns: string[];
	};
	salesTechniques: Array<{
		presetId: string;
		intensity: "soft" | "balanced" | "aggressive";
	}>;
	emojiConfig: {
		mode: "none" | "curated" | "free";
		curatedList?: string[];
		allowed?: string[];
		forbidden?: string[];
	};
	voiceConfig: {
		enabled: boolean;
		provider?: string;
		voiceId?: string;
		mode: "always_text" | "always_audio" | "triggered";
		triggers?: string[];
	};
	capabilities: string[];
};

export type KnowledgeBaseContent = {
	documents: Array<{
		id: string;
		title: string;
		status: string;
		chunkCount?: number;
	}>;
	additionalNotes?: string;
	domainAnswers?: Record<string, string>;
};

export type FinalSummaryContent = {
	agentName: string;
	role: string;
	businessSummary: string;
	personaSummary: string;
	techniquesSummary: string;
	capabilitiesSummary: string[];
	knowledgeDocCount: number;
};

export type ArtifactContent =
	| BusinessProfileContent
	| AgentBlueprintContent
	| KnowledgeBaseContent
	| FinalSummaryContent;

// =============================================
// Enums
// =============================================

export const agentCreationSessionStatusEnum = pgEnum(
	"AgentCreationSessionStatus",
	["DRAFT", "PUBLISHED", "ABANDONED"],
);

export const agentArtifactTypeEnum = pgEnum("AgentArtifactType", [
	"BUSINESS_PROFILE",
	"AGENT_BLUEPRINT",
	"KNOWLEDGE_BASE",
	"FINAL_SUMMARY",
]);

export const agentArtifactStatusEnum = pgEnum("AgentArtifactStatus", [
	"GENERATED",
	"REGENERATED",
	"APPROVED",
]);

// =============================================
// Agent Creation Session
// =============================================

/**
 * Sessao de construcao de agente pelo Arquiteto (Phase 09).
 *
 * - DRAFT: em andamento, usuario pode retomar via /agents/new?session=xxx
 * - PUBLISHED: agente criado com sucesso, publishedAgentId preenchido
 * - ABANDONED: cleanup cron marca sessoes draft > 7d sem atualizacao
 *
 * Fonte de verdade do working memory esta nas tabelas mastra_* gerenciadas pelo
 * @mastra/memory. O campo draftSnapshot aqui e um cache denormalizado leve pra
 * listar rascunhos sem hit em Mastra internals.
 *
 * templateId nao e enum pra facilitar adicao de novos templates sem migration.
 * Valores esperados: clinical | ecommerce | real_estate | info_product | saas
 *                  | local_services | custom
 */
export const agentCreationSession = pgTable(
	"agent_creation_session",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("userId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		templateId: text("templateId").notNull(),

		status: agentCreationSessionStatusEnum("status")
			.notNull()
			.default("DRAFT"),

		// Ponteiros pro Mastra memory (thread = sessionId, resource = userId)
		// Ver @mastra/memory docs pra detalhes.
		mastraThreadId: text("mastraThreadId").notNull(),
		mastraResourceId: text("mastraResourceId").notNull(),

		// Cache denormalizado pro card de rascunho na tela de boas-vindas
		draftSnapshot: json("draftSnapshot").$type<ArchitectDraftSnapshot>(),

		// Preenchido quando publica
		publishedAgentId: text("publishedAgentId").references(() => agent.id, {
			onDelete: "set null",
		}),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
		abandonedAt: timestamp("abandonedAt"),
	},
	(table) => [
		index("agent_creation_session_org_status_idx").on(
			table.organizationId,
			table.status,
		),
		index("agent_creation_session_user_status_idx").on(
			table.userId,
			table.status,
		),
	],
);

// =============================================
// Agent Artifact (cards refinaveis inline no chat)
// =============================================

/**
 * Artefato estruturado gerado pelo Arquiteto em cada uma das 4 etapas.
 *
 * Ciclo de vida:
 * - GENERATED: acabou de ser criado via generateArtifact tool
 * - REGENERATED: usuario pediu alteracao no chat, Arquiteto chamou refineArtifact
 * - APPROVED: usuario clicou "Aprovar", trava edicao, avanca etapa
 *
 * O campo version existe pra optimistic locking quando user aprova enquanto
 * Arquiteto esta regenerando (race condition). Update conditional WHERE version = ?
 *
 * content e jsonb tipado com union ArtifactContent (varia por tipo).
 */
export const agentArtifact = pgTable(
	"agent_artifact",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		sessionId: text("sessionId")
			.notNull()
			.references(() => agentCreationSession.id, { onDelete: "cascade" }),

		type: agentArtifactTypeEnum("type").notNull(),
		content: json("content").$type<ArtifactContent>().notNull(),

		status: agentArtifactStatusEnum("status").notNull().default("GENERATED"),

		// Optimistic locking pra evitar race user approve vs Arquiteto regenera
		version: integer("version").notNull().default(1),

		approvedAt: timestamp("approvedAt"),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("agent_artifact_session_type_idx").on(table.sessionId, table.type),
		index("agent_artifact_session_status_idx").on(
			table.sessionId,
			table.status,
		),
	],
);

// =============================================
// Relations
// =============================================

export const agentCreationSessionRelations = relations(
	agentCreationSession,
	({ one, many }) => ({
		organization: one(organization, {
			fields: [agentCreationSession.organizationId],
			references: [organization.id],
		}),
		user: one(user, {
			fields: [agentCreationSession.userId],
			references: [user.id],
		}),
		publishedAgent: one(agent, {
			fields: [agentCreationSession.publishedAgentId],
			references: [agent.id],
		}),
		artifacts: many(agentArtifact),
	}),
);

export const agentArtifactRelations = relations(agentArtifact, ({ one }) => ({
	session: one(agentCreationSession, {
		fields: [agentArtifact.sessionId],
		references: [agentCreationSession.id],
	}),
}));
