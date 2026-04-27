ALTER TABLE "contact" ADD COLUMN "whatsappJid" text;--> statement-breakpoint
CREATE INDEX "contact_whatsapp_jid_idx" ON "contact" USING btree ("whatsappJid");