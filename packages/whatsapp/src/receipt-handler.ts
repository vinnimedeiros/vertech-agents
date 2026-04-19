import { db, eq, message } from "@repo/database";
import type { WAMessageKey, WAMessageUpdate } from "@whiskeysockets/baileys";

/**
 * Mapeia o MessageStatus do proto Baileys pro nosso enum MessageStatus.
 * Os status do Baileys:
 *   0=ERROR, 1=PENDING, 2=SERVER_ACK (enviado ao servidor),
 *   3=DELIVERY_ACK (entregue ao destinatário), 4=READ (lido),
 *   5=PLAYED (áudio reproduzido)
 */
function mapReceiptStatus(
	status: number | null | undefined,
): "SENT" | "DELIVERED" | "READ" | "FAILED" | null {
	if (status == null) return null;
	if (status === 0) return "FAILED";
	if (status === 1) return null; // PENDING — não sobrescreve
	if (status === 2) return "SENT";
	if (status === 3) return "DELIVERED";
	if (status === 4 || status === 5) return "READ";
	return null;
}

/**
 * Atualiza o status da mensagem outbound conforme recibos do WhatsApp chegam.
 * `externalId` foi salvo no insert inicial (key.id) — usamos pra localizar.
 */
export async function handleMessageUpdate(update: WAMessageUpdate) {
	const key: WAMessageKey = update.key;
	if (!key.fromMe) return; // só rastreamos mensagens que NÓS enviamos
	const externalId = key.id;
	if (!externalId) return;

	const status = update.update?.status;
	const next = mapReceiptStatus(status as number | null | undefined);
	if (!next) return;

	await db
		.update(message)
		.set({ status: next })
		.where(eq(message.externalId, externalId));
}
