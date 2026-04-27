CREATE TYPE "public"."OAuthProvider" AS ENUM('google', 'microsoft', 'meta', 'slack');--> statement-breakpoint
CREATE TABLE "oauth_token" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"provider" "OAuthProvider" NOT NULL,
	"providerAccountId" text NOT NULL,
	"scope" text NOT NULL,
	"accessTokenEnc" text NOT NULL,
	"refreshTokenEnc" text,
	"expiresAt" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "externalAttendees" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "recurrenceRule" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "recurrenceParentId" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "externalProvider" varchar(32);--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "externalEventId" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "externalEtag" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "externalSyncedAt" timestamp;--> statement-breakpoint
ALTER TABLE "oauth_token" ADD CONSTRAINT "oauth_token_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_token" ADD CONSTRAINT "oauth_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_token_org_user_provider_idx" ON "oauth_token" USING btree ("organizationId","userId","provider");--> statement-breakpoint
CREATE INDEX "oauth_token_org_provider_idx" ON "oauth_token" USING btree ("organizationId","provider");--> statement-breakpoint
CREATE INDEX "lead_org_created_idx" ON "lead" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX "lead_org_closed_idx" ON "lead" USING btree ("organizationId","closedAt");--> statement-breakpoint
CREATE INDEX "lead_org_origin_idx" ON "lead" USING btree ("organizationId","origin");--> statement-breakpoint
CREATE INDEX "lead_org_temperature_idx" ON "lead" USING btree ("organizationId","temperature");--> statement-breakpoint
CREATE INDEX "lead_org_sandbox_created_idx" ON "lead" USING btree ("organizationId","isSandbox","createdAt");--> statement-breakpoint
CREATE INDEX "calendar_event_external_idx" ON "calendar_event" USING btree ("externalProvider","externalEventId");--> statement-breakpoint
CREATE INDEX "calendar_event_recurrence_parent_idx" ON "calendar_event" USING btree ("recurrenceParentId");