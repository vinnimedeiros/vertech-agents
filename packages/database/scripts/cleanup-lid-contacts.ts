import { db, sql } from "../drizzle";

/**
 * Cleanup contatos fantasmas com phone = LID (WhatsApp Anonymous mode).
 *
 * LIDs são identificadores anônimos do WhatsApp 2024+ que chegavam no
 * remoteJid antes do guard `@lid` em message-handler.ts. Quando o
 * handler extraía LID como phone, criava contato + conversa fantasmas
 * que ficavam órfãos (LID não roteia mensagens).
 *
 * Heurística: phones BR têm 10-13 dígitos com prefixo 55. LIDs são
 * tipicamente 14+ dígitos sem prefixo 55. Contatos com lead vinculado
 * NÃO são removidos (segurança extra — FK lead.contactId é restrict).
 *
 * Uso:
 *   pnpm --filter @repo/database tsx scripts/cleanup-lid-contacts.ts
 */
async function main() {
	const candidates = await db.execute(sql`
		SELECT count(*)::int AS total
		FROM contact
		WHERE phone IS NOT NULL
			AND length(phone) >= 14
			AND phone NOT LIKE '55%'
	`);
	console.log("Contatos LID candidatos:", candidates);

	const removed = await db.execute(sql`
		WITH lid_contacts AS (
			SELECT id
			FROM contact
			WHERE phone IS NOT NULL
				AND length(phone) >= 14
				AND phone NOT LIKE '55%'
				AND NOT EXISTS (
					SELECT 1 FROM lead WHERE lead."contactId" = contact.id
				)
		)
		DELETE FROM contact
		WHERE id IN (SELECT id FROM lid_contacts)
		RETURNING id, phone, name
	`);
	console.log("Contatos LID removidos:", removed);

	const skipped = await db.execute(sql`
		SELECT id, phone, name
		FROM contact
		WHERE phone IS NOT NULL
			AND length(phone) >= 14
			AND phone NOT LIKE '55%'
			AND EXISTS (
				SELECT 1 FROM lead WHERE lead."contactId" = contact.id
			)
	`);
	console.log(
		"Contatos LID com lead vinculado (NÃO removidos — verificar manual):",
		skipped,
	);

	process.exit(0);
}

main().catch((err) => {
	console.error("[cleanup-lid-contacts] falhou:", err);
	process.exit(1);
});
