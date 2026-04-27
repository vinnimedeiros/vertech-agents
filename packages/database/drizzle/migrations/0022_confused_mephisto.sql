DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CalendarEventKind') THEN
    CREATE TYPE "public"."CalendarEventKind" AS ENUM('event', 'meet');
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "eventKind" "CalendarEventKind" DEFAULT 'event' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "meetLink" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "conferenceId" text;