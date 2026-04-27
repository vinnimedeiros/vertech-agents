ALTER TABLE "lead" ADD COLUMN "isSandbox" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_activity" ADD COLUMN "isSandbox" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "isSandbox" boolean DEFAULT false NOT NULL;