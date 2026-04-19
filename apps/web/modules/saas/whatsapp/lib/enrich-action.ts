"use server";

import { requireOrgAccess } from "@repo/auth";
import { contact, db, eq } from "@repo/database";
import {
	baileysManager,
	enrichContactFromWhatsApp,
	type WhatsAppInstance,
} from "@repo/whatsapp";
import { getSession } from "@saas/auth/lib/server";

/**
 * Força o enrichment do contato via WhatsApp — puxa foto de perfil, categoria
 * de business, horário etc. Útil pra contatos antigos que foram criados antes
 * desse campo existir. Fire-and-forget: não bloqueia a UI.
 */
export async function refreshContactWhatsAppProfileAction(
	contactId: string,
	instanceId: string,
): Promise<void> {
	const session = await getSession();
	if (!session?.user) return;

	const [row] = await db
		.select({
			id: contact.id,
			phone: contact.phone,
			organizationId: contact.organizationId,
		})
		.from(contact)
		.where(eq(contact.id, contactId))
		.limit(1);
	if (!row || !row.phone) return;
	await requireOrgAccess(session.user.id, row.organizationId);

	let inst: WhatsAppInstance;
	try {
		inst = await baileysManager.ensureReady(instanceId, 5000);
	} catch {
		return;
	}
	const sock = inst.getSock();
	const digits = row.phone.replace(/\D/g, "");
	const jid = `${digits}@s.whatsapp.net`;
	await enrichContactFromWhatsApp(sock, contactId, jid);
}
