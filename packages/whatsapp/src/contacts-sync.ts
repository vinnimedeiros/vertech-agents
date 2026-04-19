import { and, contact, db, eq, sql } from "@repo/database";

type BaileysContact = {
	id: string; // JID — "5511999999999@s.whatsapp.net"
	name?: string;
	notify?: string;
	verifiedName?: string;
};

/**
 * Sincroniza contatos recebidos do Baileys (eventos `contacts.upsert` /
 * `contacts.update`) com a tabela `contact` da org.
 *
 * - Ignora JIDs de grupo (@g.us) e status broadcast
 * - Upsert por (orgId, phone): se já existe, só completa name/lastSyncedAt
 * - Se não tem nome, usa phone como placeholder
 * - NÃO apaga contatos que não vieram — nossa lista só cresce (source é safe)
 */
export async function syncContactsFromWhatsApp(
	organizationId: string,
	contacts: BaileysContact[],
): Promise<{ inserted: number; updated: number }> {
	let inserted = 0;
	let updated = 0;
	const now = new Date();

	for (const c of contacts) {
		if (!c.id || c.id.endsWith("@g.us") || c.id === "status@broadcast") {
			continue;
		}
		const phone = c.id.split("@")[0];
		if (!phone || !/^\d+$/.test(phone)) continue;

		const displayName =
			c.name?.trim() ||
			c.verifiedName?.trim() ||
			c.notify?.trim() ||
			phone;

		const [existing] = await db
			.select({
				id: contact.id,
				name: contact.name,
				source: contact.source,
			})
			.from(contact)
			.where(
				and(
					eq(contact.organizationId, organizationId),
					eq(contact.phone, phone),
				),
			)
			.limit(1);

		if (existing) {
			// Só atualiza nome se o atual é placeholder/genérico
			const shouldUpdateName =
				(!existing.name ||
					existing.name === "Desconhecido" ||
					existing.name === phone) &&
				displayName !== phone;
			await db
				.update(contact)
				.set({
					lastSyncedAt: now,
					updatedAt: now,
					...(shouldUpdateName ? { name: displayName } : {}),
				})
				.where(eq(contact.id, existing.id));
			updated++;
		} else {
			await db.insert(contact).values({
				organizationId,
				name: displayName,
				phone,
				source: "whatsapp-contacts",
				lastSyncedAt: now,
				createdAt: now,
				updatedAt: now,
			});
			inserted++;
		}
	}

	return { inserted, updated };
}

/**
 * Marca `lastSyncedAt` de todos os contatos vindos via WhatsApp da org
 * (útil quando o Baileys envia evento de "full sync completo").
 */
export async function markContactsSyncedForOrg(
	organizationId: string,
): Promise<void> {
	await db
		.update(contact)
		.set({ lastSyncedAt: new Date() })
		.where(
			and(
				eq(contact.organizationId, organizationId),
				eq(contact.source, "whatsapp-contacts"),
				sql`${contact.lastSyncedAt} IS NULL`,
			),
		);
}
