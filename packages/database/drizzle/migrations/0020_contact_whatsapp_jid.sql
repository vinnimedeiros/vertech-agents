-- Wave 1+ Comercial 100% — suporte a LID (WhatsApp Anonymous mode).
-- Preserva remoteJid completo do Baileys ("@lid" ou "@s.whatsapp.net")
-- pra rotear envio no formato correto. Aplicada via MCP Supabase.

ALTER TABLE "contact" ADD COLUMN IF NOT EXISTS "whatsappJid" text;
CREATE INDEX IF NOT EXISTS "contact_whatsapp_jid_idx" ON "contact" ("whatsappJid");
