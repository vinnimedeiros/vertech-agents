CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE TYPE "public"."ActorType" AS ENUM('user', 'orchestrator', 'architect', 'commercial_agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."PipelineViewMode" AS ENUM('kanban', 'list', 'dashboard');--> statement-breakpoint
CREATE TYPE "public"."PipelineViewSort" AS ENUM('none', 'priority', 'date', 'name', 'value');--> statement-breakpoint
CREATE TYPE "public"."StageCategory" AS ENUM('NOT_STARTED', 'ACTIVE', 'SCHEDULED', 'WON', 'LOST');--> statement-breakpoint
CREATE TABLE "orchestrator_audit_log" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text,
	"actorType" "ActorType" NOT NULL,
	"actorId" varchar(255) NOT NULL,
	"resource" varchar(80) NOT NULL,
	"resourceId" varchar(255) NOT NULL,
	"action" varchar(80) NOT NULL,
	"before" json,
	"after" json,
	"undoneBy" varchar(255),
	"undoneAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_view" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"pipelineId" text NOT NULL,
	"name" text NOT NULL,
	"filters" json DEFAULT '{}'::json NOT NULL,
	"viewMode" "PipelineViewMode" DEFAULT 'kanban' NOT NULL,
	"sortBy" "PipelineViewSort" DEFAULT 'none' NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_template" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text,
	"name" text NOT NULL,
	"description" text,
	"vertical" varchar(80),
	"stages" json NOT NULL,
	"isBuiltIn" boolean DEFAULT false NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"usageCount" integer DEFAULT 0 NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "stageDates" json DEFAULT '{}'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "subtaskCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "subtaskDone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "dueDate" timestamp;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pipeline_stage" ADD COLUMN "category" "StageCategory" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "pipeline_stage" ADD COLUMN "probability" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "pipeline_stage" ADD COLUMN "maxDays" integer;--> statement-breakpoint
ALTER TABLE "pipeline_stage" ADD COLUMN "slug" varchar(120);--> statement-breakpoint
ALTER TABLE "orchestrator_audit_log" ADD CONSTRAINT "orchestrator_audit_log_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestrator_audit_log" ADD CONSTRAINT "orchestrator_audit_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_view" ADD CONSTRAINT "pipeline_view_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_view" ADD CONSTRAINT "pipeline_view_pipelineId_pipeline_id_fk" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_view" ADD CONSTRAINT "pipeline_view_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_template" ADD CONSTRAINT "status_template_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_template" ADD CONSTRAINT "status_template_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_org_created_idx" ON "orchestrator_audit_log" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "orchestrator_audit_log" USING btree ("resource","resourceId");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "orchestrator_audit_log" USING btree ("actorType","actorId");--> statement-breakpoint
CREATE INDEX "pipeline_view_pipeline_idx" ON "pipeline_view" USING btree ("pipelineId");--> statement-breakpoint
CREATE INDEX "pipeline_view_organization_idx" ON "pipeline_view" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "status_template_organization_idx" ON "status_template" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "status_template_vertical_idx" ON "status_template" USING btree ("vertical");--> statement-breakpoint
CREATE INDEX "status_template_builtin_idx" ON "status_template" USING btree ("isBuiltIn");--> statement-breakpoint
CREATE INDEX "pipeline_stage_category_idx" ON "pipeline_stage" USING btree ("category");--> statement-breakpoint
CREATE INDEX "pipeline_stage_slug_idx" ON "pipeline_stage" USING btree ("slug");--> statement-breakpoint

-- Phase 04E.1 backfill: pipeline_stage.category baseado em isWon / isClosing / position
UPDATE "pipeline_stage" SET "category" = 'WON' WHERE "isWon" = true;--> statement-breakpoint
UPDATE "pipeline_stage" SET "category" = 'LOST' WHERE "isClosing" = true AND "isWon" = false;--> statement-breakpoint
-- primeiro stage de cada pipeline (menor position) vira NOT_STARTED
UPDATE "pipeline_stage" s
SET "category" = 'NOT_STARTED'
FROM (
	SELECT DISTINCT ON ("pipelineId") id
	FROM "pipeline_stage"
	WHERE "isClosing" = false
	ORDER BY "pipelineId", "position" ASC
) first_stage
WHERE s.id = first_stage.id;--> statement-breakpoint

-- Phase 04E.1 backfill: probability
UPDATE "pipeline_stage" SET "probability" = 100 WHERE "category" = 'WON';--> statement-breakpoint
UPDATE "pipeline_stage" SET "probability" = 0 WHERE "category" = 'LOST';--> statement-breakpoint
UPDATE "pipeline_stage" SET "probability" = 10 WHERE "category" = 'NOT_STARTED';--> statement-breakpoint

-- Phase 04E.1 backfill: slug (slugify simples do name)
UPDATE "pipeline_stage"
SET "slug" = lower(regexp_replace(regexp_replace(unaccent("name"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
WHERE "slug" IS NULL;--> statement-breakpoint

-- Phase 04E.1 backfill: lead.stageDates = { [currentStageId]: updatedAt }
UPDATE "lead"
SET "stageDates" = json_build_object("stageId", to_char("updatedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
WHERE "stageDates"::text = '{}' OR "stageDates" IS NULL;