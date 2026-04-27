-- Idempotente: usa IF NOT EXISTS / DO blocks pra rerun-safety quando DDL
-- já foi aplicado fora-do-flow drizzle-kit (ex: via MCP em sessão de dev).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OAuthProvider') THEN
    CREATE TYPE "public"."OAuthProvider" AS ENUM('google', 'microsoft', 'meta', 'slack');
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_token" (
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
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "externalAttendees" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "recurrenceRule" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "recurrenceParentId" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "externalProvider" varchar(32);--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "externalEventId" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "externalEtag" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "externalSyncedAt" timestamp;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_token_organizationId_organization_id_fk') THEN
    ALTER TABLE "oauth_token" ADD CONSTRAINT "oauth_token_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_token_userId_user_id_fk') THEN
    ALTER TABLE "oauth_token" ADD CONSTRAINT "oauth_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_token_org_user_provider_idx" ON "oauth_token" USING btree ("organizationId","userId","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauth_token_org_provider_idx" ON "oauth_token" USING btree ("organizationId","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_org_created_idx" ON "lead" USING btree ("organizationId","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_org_closed_idx" ON "lead" USING btree ("organizationId","closedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_org_origin_idx" ON "lead" USING btree ("organizationId","origin");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_org_temperature_idx" ON "lead" USING btree ("organizationId","temperature");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_org_sandbox_created_idx" ON "lead" USING btree ("organizationId","isSandbox","createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_event_external_idx" ON "calendar_event" USING btree ("externalProvider","externalEventId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_event_recurrence_parent_idx" ON "calendar_event" USING btree ("recurrenceParentId");