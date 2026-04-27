-- Baileys v7: contact.lid nativo (Linked Identifier).
-- Idempotente — DDL já aplicado via MCP em 2026-04-26 antes desta migration
-- entrar no journal. NOT VALID protege rows existentes sem phone+lid.

ALTER TABLE "contact" ADD COLUMN IF NOT EXISTS "lid" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_org_lid_idx" ON "contact" USING btree ("organizationId","lid") WHERE "contact"."lid" IS NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contact_lid_or_phone_check'
      AND conrelid = '"contact"'::regclass
  ) THEN
    ALTER TABLE "contact" ADD CONSTRAINT "contact_lid_or_phone_check"
      CHECK ("contact"."lid" IS NOT NULL OR "contact"."phone" IS NOT NULL) NOT VALID;
  END IF;
END $$;