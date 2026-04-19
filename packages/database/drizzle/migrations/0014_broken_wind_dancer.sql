CREATE TYPE "public"."AgentStatus" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
ALTER TYPE "public"."MessageStatus" ADD VALUE 'QUEUED' BEFORE 'SENT';--> statement-breakpoint
ALTER TYPE "public"."MessageStatus" ADD VALUE 'PROCESSING' BEFORE 'SENT';--> statement-breakpoint
CREATE TABLE "agent" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"avatarUrl" text,
	"gender" varchar(16),
	"description" text,
	"model" text DEFAULT 'openai/gpt-4.1-mini' NOT NULL,
	"temperature" real DEFAULT 0.7 NOT NULL,
	"maxSteps" integer DEFAULT 10 NOT NULL,
	"personality" json DEFAULT '{}'::json NOT NULL,
	"businessContext" json DEFAULT '{}'::json NOT NULL,
	"conversationStyle" json DEFAULT '{}'::json NOT NULL,
	"instructions" text,
	"enabledTools" text[] DEFAULT '{}' NOT NULL,
	"knowledgeDocIds" text[] DEFAULT '{}' NOT NULL,
	"status" "AgentStatus" DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"whatsappInstanceId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"publishedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_version" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"agentId" text NOT NULL,
	"version" integer NOT NULL,
	"snapshot" json NOT NULL,
	"createdByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_version" ADD CONSTRAINT "agent_version_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_version" ADD CONSTRAINT "agent_version_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_org_status_idx" ON "agent" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "agent_whatsapp_instance_idx" ON "agent" USING btree ("whatsappInstanceId");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_version_unique" ON "agent_version" USING btree ("agentId","version");--> statement-breakpoint
CREATE INDEX "agent_version_agent_created_idx" ON "agent_version" USING btree ("agentId","createdAt");--> statement-breakpoint
-- Phase 07A safety: zerar valores antigos em conversation.assignedAgentId
-- (antes da FK, pra evitar falha se tiver IDs ficticios apontando pra nada).
-- Em dev tipicamente e no-op (sem agentes criados ainda).
UPDATE "conversation" SET "assignedAgentId" = NULL WHERE "assignedAgentId" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_assignedAgentId_agent_id_fk" FOREIGN KEY ("assignedAgentId") REFERENCES "public"."agent"("id") ON DELETE set null ON UPDATE no action;