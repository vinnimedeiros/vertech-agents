ALTER TABLE "calendar_event" ADD COLUMN "leadId" varchar(255);--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_leadId_lead_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_event_lead_idx" ON "calendar_event" USING btree ("leadId");