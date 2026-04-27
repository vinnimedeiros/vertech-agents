ALTER TABLE "calendar_event" ADD COLUMN IF NOT EXISTS "leadId" varchar(255);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_event_leadId_lead_id_fk') THEN
    ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_leadId_lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_event_lead_idx" ON "calendar_event" USING btree ("leadId");