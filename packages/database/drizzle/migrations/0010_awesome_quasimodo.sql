-- Consolida conversas duplicadas (mesmo contato + canal) antes de criar o
-- novo unique index. Reparenta messages da(s) antiga(s) pra conversa mais
-- antiga e deleta as duplicatas.
DO $$
DECLARE
	_kept_id VARCHAR;
	_dup_id VARCHAR;
BEGIN
	FOR _kept_id, _dup_id IN
		WITH ranked AS (
			SELECT
				id,
				"contactId",
				channel,
				"createdAt",
				ROW_NUMBER() OVER (
					PARTITION BY "contactId", channel
					ORDER BY "createdAt" ASC, id ASC
				) AS rn
			FROM conversation
		),
		keepers AS (
			SELECT id AS kept_id, "contactId", channel FROM ranked WHERE rn = 1
		),
		dups AS (
			SELECT id AS dup_id, "contactId", channel FROM ranked WHERE rn > 1
		)
		SELECT k.kept_id, d.dup_id
		FROM keepers k
		JOIN dups d ON d."contactId" = k."contactId" AND d.channel = k.channel
	LOOP
		UPDATE message SET "conversationId" = _kept_id WHERE "conversationId" = _dup_id;
		DELETE FROM conversation WHERE id = _dup_id;
	END LOOP;
END $$;
--> statement-breakpoint
DROP INDEX "conversation_contact_channel_instance_uniq";--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_contact_channel_uniq" ON "conversation" USING btree ("contactId","channel");
