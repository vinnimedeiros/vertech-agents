import { and, contact, db, eq, sql } from "@repo/database";
import {
	detectJidKind,
	normalizeLidFromJid,
	normalizePhoneFromJid,
} from "./jid-utils";

/**
 * Shape do Contact v7 do Baileys: id (lid OU jid format) + lid + phoneNumber
 * separados. Em v6 só havia `id` (JID puro). Aceitamos ambos pra evitar
 * regressão em consumers antigos.
 */
type BaileysContact = {
	id: string;
	lid?: string;
	phoneNumber?: string;
	name?: string;
	notify?: string;
	verifiedName?: string;
};

type ResolvedIdentity = {
	phone: string | null;
	lid: string | null;
};

/**
 * Extrai phone e/ou lid de um Baileys Contact v7-compat.
 *
 * v7 traz `lid` e `phoneNumber` separados (em formato JID com `:deviceId`).
 * Sempre normalizamos via helpers que strippam domínio e device antes de
 * pegar dígitos — caso contrário `5511945130236:0` vira `55119451302360`.
 */
function resolveIdentity(c: BaileysContact): ResolvedIdentity {
	let phone: string | null = c.phoneNumber
		? normalizePhoneFromJid(c.phoneNumber) || null
		: null;
	let lid: string | null = c.lid ? normalizeLidFromJid(c.lid) || null : null;

	if (!phone && !lid && c.id) {
		const kind = detectJidKind(c.id);
		if (kind === "lid") {
			const v = normalizeLidFromJid(c.id);
			if (v) lid = v;
		} else if (kind === "phone") {
			const v = normalizePhoneFromJid(c.id);
			if (v) phone = v;
		}
	}

	return { phone, lid };
}

/**
 * Sincroniza contatos recebidos do Baileys (eventos `contacts.upsert` /
 * `contacts.update` / payload de `messaging-history.set`) com a tabela
 * `contact` da org.
 *
 * v7: distingue lid de phone explicitamente. NÃO apaga contatos que não
 * vieram — nossa lista só cresce.
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

		const { phone, lid } = resolveIdentity(c);
		if (!phone && !lid) continue;

		const displayName =
			c.name?.trim() ||
			c.verifiedName?.trim() ||
			c.notify?.trim() ||
			phone ||
			lid ||
			"Desconhecido";

		const lookupColumn = phone ? contact.phone : contact.lid;
		const lookupValue = phone ?? lid;
		if (!lookupValue) continue;

		const [existing] = await db
			.select({
				id: contact.id,
				name: contact.name,
				phone: contact.phone,
				lid: contact.lid,
				source: contact.source,
			})
			.from(contact)
			.where(
				and(
					eq(contact.organizationId, organizationId),
					eq(lookupColumn, lookupValue),
				),
			)
			.limit(1);

		if (existing) {
			const shouldUpdateName =
				(!existing.name ||
					existing.name === "Desconhecido" ||
					existing.name === phone ||
					existing.name === lid) &&
				displayName !== phone &&
				displayName !== lid;
			const shouldFillLid = lid && !existing.lid;
			const shouldFillPhone = phone && !existing.phone;

			await db
				.update(contact)
				.set({
					lastSyncedAt: now,
					updatedAt: now,
					...(shouldUpdateName ? { name: displayName } : {}),
					...(shouldFillLid ? { lid } : {}),
					...(shouldFillPhone ? { phone } : {}),
				})
				.where(eq(contact.id, existing.id));
			updated++;
		} else {
			await db.insert(contact).values({
				organizationId,
				name: displayName,
				phone,
				lid,
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
