CREATE TYPE "public"."CalendarEventKind" AS ENUM('event', 'meet');--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "eventKind" "CalendarEventKind" DEFAULT 'event' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "meetLink" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "conferenceId" text;