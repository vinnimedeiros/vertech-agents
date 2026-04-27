CREATE TYPE "public"."CalendarEventType" AS ENUM('meeting', 'event', 'personal', 'task', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."CalendarType" AS ENUM('personal', 'work', 'shared');--> statement-breakpoint
CREATE TABLE "calendar" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"color" varchar(64) DEFAULT 'bg-blue-500' NOT NULL,
	"type" "CalendarType" DEFAULT 'personal' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_event" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"calendarId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"startAt" timestamp NOT NULL,
	"duration" varchar(64) DEFAULT '1 hora' NOT NULL,
	"allDay" boolean DEFAULT false NOT NULL,
	"type" "CalendarEventType" DEFAULT 'meeting' NOT NULL,
	"color" varchar(64),
	"location" text,
	"attendees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reminder" boolean DEFAULT true NOT NULL,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "agent_artifact_session_type_idx";--> statement-breakpoint
ALTER TABLE "calendar" ADD CONSTRAINT "calendar_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar" ADD CONSTRAINT "calendar_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_calendarId_calendar_id_fk" FOREIGN KEY ("calendarId") REFERENCES "public"."calendar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_organization_idx" ON "calendar" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "calendar_org_default_idx" ON "calendar" USING btree ("organizationId","isDefault");--> statement-breakpoint
CREATE INDEX "calendar_event_org_start_idx" ON "calendar_event" USING btree ("organizationId","startAt");--> statement-breakpoint
CREATE INDEX "calendar_event_calendar_idx" ON "calendar_event" USING btree ("calendarId");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_artifact_session_type_unique" ON "agent_artifact" USING btree ("sessionId","type");