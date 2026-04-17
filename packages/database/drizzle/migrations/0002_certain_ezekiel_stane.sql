CREATE TYPE "public"."LeadActivityType" AS ENUM('CALL', 'EMAIL', 'MEETING', 'TASK', 'WHATSAPP', 'NOTE', 'STAGE_CHANGE', 'SYSTEM', 'AGENT_ACTION');--> statement-breakpoint
CREATE TYPE "public"."LeadPriority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."ProposalStatus" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."LeadTemperature" AS ENUM('COLD', 'WARM', 'HOT');--> statement-breakpoint
CREATE TABLE "contact" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"company" text,
	"document" text,
	"photoUrl" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"source" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"contactId" text NOT NULL,
	"pipelineId" text NOT NULL,
	"stageId" text NOT NULL,
	"assignedTo" text,
	"title" text,
	"description" text,
	"value" numeric(12, 2),
	"currency" text DEFAULT 'BRL' NOT NULL,
	"temperature" "LeadTemperature" DEFAULT 'COLD' NOT NULL,
	"priority" "LeadPriority" DEFAULT 'NORMAL' NOT NULL,
	"origin" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "lead_activity" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"leadId" text NOT NULL,
	"type" "LeadActivityType" NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"metadata" json,
	"createdBy" text,
	"agentId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stage" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"pipelineId" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#94a3b8' NOT NULL,
	"position" integer NOT NULL,
	"isClosing" boolean DEFAULT false NOT NULL,
	"isWon" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"leadId" text,
	"title" text NOT NULL,
	"content" json NOT NULL,
	"totalValue" numeric(12, 2),
	"status" "ProposalStatus" DEFAULT 'DRAFT' NOT NULL,
	"sentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_contactId_contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."contact"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_pipelineId_pipeline_id_fk" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipeline"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_stageId_pipeline_stage_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."pipeline_stage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_assignedTo_user_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_leadId_lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline" ADD CONSTRAINT "pipeline_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage" ADD CONSTRAINT "pipeline_stage_pipelineId_pipeline_id_fk" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_leadId_lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_organization_idx" ON "contact" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "contact_phone_idx" ON "contact" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "contact_email_idx" ON "contact" USING btree ("email");--> statement-breakpoint
CREATE INDEX "lead_organization_idx" ON "lead" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "lead_contact_idx" ON "lead" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "lead_pipeline_idx" ON "lead" USING btree ("pipelineId");--> statement-breakpoint
CREATE INDEX "lead_stage_idx" ON "lead" USING btree ("stageId");--> statement-breakpoint
CREATE INDEX "lead_assigned_idx" ON "lead" USING btree ("assignedTo");--> statement-breakpoint
CREATE INDEX "lead_activity_lead_idx" ON "lead_activity" USING btree ("leadId");--> statement-breakpoint
CREATE INDEX "lead_activity_created_idx" ON "lead_activity" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "pipeline_organization_idx" ON "pipeline" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "pipeline_stage_pipeline_idx" ON "pipeline_stage" USING btree ("pipelineId");--> statement-breakpoint
CREATE INDEX "proposal_organization_idx" ON "proposal" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "proposal_lead_idx" ON "proposal" USING btree ("leadId");