-- Phase 08-alpha: RAG infrastructure pra Phase 09 Arquiteto Construtor
-- Habilita pgvector (requerido por knowledge_chunk.embedding)
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."KnowledgeDocumentFileType" AS ENUM('PDF', 'DOCX', 'CSV', 'XLSX', 'TXT', 'URL');--> statement-breakpoint
CREATE TYPE "public"."KnowledgeDocumentStatus" AS ENUM('PENDING', 'PROCESSING', 'READY', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."AgentArtifactStatus" AS ENUM('GENERATED', 'REGENERATED', 'APPROVED');--> statement-breakpoint
CREATE TYPE "public"."AgentArtifactType" AS ENUM('BUSINESS_PROFILE', 'AGENT_BLUEPRINT', 'KNOWLEDGE_BASE', 'FINAL_SUMMARY');--> statement-breakpoint
CREATE TYPE "public"."AgentCreationSessionStatus" AS ENUM('DRAFT', 'PUBLISHED', 'ABANDONED');--> statement-breakpoint
CREATE TABLE "knowledge_chunk" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_document" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"sessionId" text,
	"agentId" text,
	"title" text NOT NULL,
	"fileUrl" text NOT NULL,
	"fileType" "KnowledgeDocumentFileType" NOT NULL,
	"fileSize" integer NOT NULL,
	"status" "KnowledgeDocumentStatus" DEFAULT 'PENDING' NOT NULL,
	"errorMessage" text,
	"chunkCount" integer DEFAULT 0 NOT NULL,
	"extractedSummary" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_artifact" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"type" "AgentArtifactType" NOT NULL,
	"content" json NOT NULL,
	"status" "AgentArtifactStatus" DEFAULT 'GENERATED' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"approvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_creation_session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"templateId" text NOT NULL,
	"status" "AgentCreationSessionStatus" DEFAULT 'DRAFT' NOT NULL,
	"mastraThreadId" text NOT NULL,
	"mastraResourceId" text NOT NULL,
	"draftSnapshot" json,
	"publishedAgentId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"abandonedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "emojiConfig" json;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "voice" json;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "salesTechniques" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "antiPatterns" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "conversationExamples" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_documentId_knowledge_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."knowledge_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document" ADD CONSTRAINT "knowledge_document_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_document" ADD CONSTRAINT "knowledge_document_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_artifact" ADD CONSTRAINT "agent_artifact_sessionId_agent_creation_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."agent_creation_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_creation_session" ADD CONSTRAINT "agent_creation_session_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_creation_session" ADD CONSTRAINT "agent_creation_session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_creation_session" ADD CONSTRAINT "agent_creation_session_publishedAgentId_agent_id_fk" FOREIGN KEY ("publishedAgentId") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_chunk_embedding_hnsw_idx" ON "knowledge_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "knowledge_chunk_document_idx" ON "knowledge_chunk" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "knowledge_document_org_status_idx" ON "knowledge_document" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "knowledge_document_agent_idx" ON "knowledge_document" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX "knowledge_document_session_idx" ON "knowledge_document" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "agent_artifact_session_type_idx" ON "agent_artifact" USING btree ("sessionId","type");--> statement-breakpoint
CREATE INDEX "agent_artifact_session_status_idx" ON "agent_artifact" USING btree ("sessionId","status");--> statement-breakpoint
CREATE INDEX "agent_creation_session_org_status_idx" ON "agent_creation_session" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "agent_creation_session_user_status_idx" ON "agent_creation_session" USING btree ("userId","status");