import { createId as cuid } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	varchar,
	vector,
} from "drizzle-orm/pg-core";
import { agent } from "./agents";
import { organization } from "./postgres";
// Forward-declared reference (evita ciclo de import com architect-session)
// sessionId referencia agent_creation_session.id — FK adicionada na migration SQL

// =============================================
// JSONB Types
// =============================================

/**
 * Metadata persistida em cada chunk pra facilitar queries sem JOIN.
 * Inclui texto duplicado (para retrieval mostrar sem hit extra na tabela de documento),
 * sessionId (rascunho) ou agentId (pós-publish), e posicao do chunk no doc.
 */
export type KnowledgeChunkMetadata = {
	text: string;
	documentTitle: string;
	position: number;
	totalChunks: number;
	sessionId?: string | null;
	agentId?: string | null;
};

// =============================================
// Enums
// =============================================

export const knowledgeDocumentStatusEnum = pgEnum("KnowledgeDocumentStatus", [
	"PENDING",
	"PROCESSING",
	"READY",
	"ERROR",
]);

export const knowledgeDocumentFileTypeEnum = pgEnum(
	"KnowledgeDocumentFileType",
	["PDF", "DOCX", "CSV", "XLSX", "TXT", "URL"],
);

// =============================================
// Knowledge Document
// =============================================

/**
 * Documento uploadado pelo usuario durante sessao do Arquiteto OU diretamente
 * pelo agente ja publicado. Enquanto sessionId e nao-null, o doc pertence a
 * rascunho. Ao publicar, migracao na transacao atomica seta agentId e limpa
 * sessionId (ver tech-spec § 6 "Transacao atomica de publicacao").
 *
 * Se sessao for abandoned, job cron diario remove docs orfaos (sessionId nao-null
 * + agentId null + sessao > 7d abandoned).
 */
export const knowledgeDocument = pgTable(
	"knowledge_document",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		organizationId: text("organizationId")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),

		// Escopo dual: rascunho (sessionId) OU oficial (agentId). Exclusivo por logica de app.
		// FK de sessionId adicionada manualmente na migration (evita ciclo de import).
		sessionId: text("sessionId"),
		agentId: text("agentId").references(() => agent.id, {
			onDelete: "set null",
		}),

		// Metadata do arquivo
		title: text("title").notNull(),
		fileUrl: text("fileUrl").notNull(),
		fileType: knowledgeDocumentFileTypeEnum("fileType").notNull(),
		fileSize: integer("fileSize").notNull(),

		// Estado do ingest (pipeline assincrono via BullMQ worker)
		status: knowledgeDocumentStatusEnum("status").notNull().default("PENDING"),
		errorMessage: text("errorMessage"),

		// Preenchido apos ingest completo
		chunkCount: integer("chunkCount").notNull().default(0),
		extractedSummary: text("extractedSummary"),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(table) => [
		index("knowledge_document_org_status_idx").on(
			table.organizationId,
			table.status,
		),
		index("knowledge_document_agent_idx").on(table.agentId),
		index("knowledge_document_session_idx").on(table.sessionId),
	],
);

// =============================================
// Knowledge Chunk (RAG, pgvector)
// =============================================

/**
 * Chunk de texto com embedding vetorial, usado pra retrieval semantico.
 * Embeddings sao gerados via OpenAI text-embedding-3-small (1536 dimensoes)
 * durante ingest no worker BullMQ. Retrieval via cosine distance com HNSW index.
 *
 * Parametros HNSW default: m=16, ef_construction=64 (ver tech-spec § 5.1).
 * ef_search runtime via SET LOCAL hnsw.ef_search = 100 na query.
 */
export const knowledgeChunk = pgTable(
	"knowledge_chunk",
	{
		id: varchar("id", { length: 255 })
			.$defaultFn(() => cuid())
			.primaryKey(),
		documentId: text("documentId")
			.notNull()
			.references(() => knowledgeDocument.id, { onDelete: "cascade" }),

		content: text("content").notNull(),

		// Vetor 1536d do embedding. Plugin pgvector habilitado na migration.
		embedding: vector("embedding", { dimensions: 1536 }),

		// Metadata denormalizado pra queries sem JOIN.
		// JSONB (não json) pra suportar jsonb_set() na transação de publish
		// sem cast band-aid (ver ADR-002, fix C4 do verify Smith 2026-04-21).
		metadata: jsonb("metadata").$type<KnowledgeChunkMetadata>().notNull(),

		createdAt: timestamp("createdAt").notNull().defaultNow(),
	},
	(table) => [
		// HNSW com cosine similarity (padrao pra embeddings OpenAI)
		index("knowledge_chunk_embedding_hnsw_idx").using(
			"hnsw",
			table.embedding.op("vector_cosine_ops"),
		),
		index("knowledge_chunk_document_idx").on(table.documentId),
	],
);

// =============================================
// Relations
// =============================================

export const knowledgeDocumentRelations = relations(
	knowledgeDocument,
	({ one, many }) => ({
		organization: one(organization, {
			fields: [knowledgeDocument.organizationId],
			references: [organization.id],
		}),
		agent: one(agent, {
			fields: [knowledgeDocument.agentId],
			references: [agent.id],
		}),
		chunks: many(knowledgeChunk),
	}),
);

export const knowledgeChunkRelations = relations(knowledgeChunk, ({ one }) => ({
	document: one(knowledgeDocument, {
		fields: [knowledgeChunk.documentId],
		references: [knowledgeDocument.id],
	}),
}));
