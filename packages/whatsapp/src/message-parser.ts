import type { WAMessage } from "@whiskeysockets/baileys";
import { downloadAndStoreMedia } from "./media-storage";
import type { ParsedMessage } from "./types";

/**
 * Extrai conteúdo da WAMessage do Baileys num formato plano pra persistir no
 * DB. Para mídia, faz download + upload pro Supabase Storage antes de retornar
 * (a URL pública já vem pronta).
 */
export async function parseMessageContent(
	msg: WAMessage,
	organizationId: string,
): Promise<ParsedMessage> {
	const m = msg.message;
	if (!m) return { type: "UNSUPPORTED", text: "[mensagem vazia]" };

	if (m.conversation) {
		return { type: "TEXT", text: m.conversation };
	}
	if (m.extendedTextMessage?.text) {
		return { type: "TEXT", text: m.extendedTextMessage.text };
	}

	if (m.imageMessage) {
		const stored = await downloadAndStoreMedia(msg, organizationId, "image");
		return {
			type: "IMAGE",
			mediaUrl: stored.url,
			mediaMimeType: stored.mimeType,
			mediaFileName: stored.fileName,
			mediaSize: stored.size,
			caption: m.imageMessage.caption ?? null,
		};
	}

	if (m.audioMessage) {
		const stored = await downloadAndStoreMedia(msg, organizationId, "audio");
		return {
			type: "AUDIO",
			mediaUrl: stored.url,
			mediaMimeType: stored.mimeType,
			mediaFileName: stored.fileName,
			mediaSize: stored.size,
			durationSeconds: m.audioMessage.seconds ?? 0,
		};
	}

	if (m.videoMessage) {
		const stored = await downloadAndStoreMedia(msg, organizationId, "video");
		return {
			type: "VIDEO",
			mediaUrl: stored.url,
			mediaMimeType: stored.mimeType,
			mediaFileName: stored.fileName,
			mediaSize: stored.size,
			durationSeconds: m.videoMessage.seconds ?? 0,
			caption: m.videoMessage.caption ?? null,
		};
	}

	if (m.documentMessage) {
		const stored = await downloadAndStoreMedia(
			msg,
			organizationId,
			"document",
		);
		return {
			type: "DOCUMENT",
			mediaUrl: stored.url,
			mediaMimeType: stored.mimeType,
			mediaFileName: m.documentMessage.fileName ?? stored.fileName,
			mediaSize: stored.size,
		};
	}

	if (m.stickerMessage) {
		const stored = await downloadAndStoreMedia(msg, organizationId, "sticker");
		return {
			type: "STICKER",
			mediaUrl: stored.url,
			mediaMimeType: stored.mimeType,
			mediaFileName: stored.fileName,
			mediaSize: stored.size,
		};
	}

	if (m.locationMessage) {
		return {
			type: "LOCATION",
			text: m.locationMessage.name ?? "Localização compartilhada",
			metadata: {
				latitude: m.locationMessage.degreesLatitude,
				longitude: m.locationMessage.degreesLongitude,
				name: m.locationMessage.name,
				address: m.locationMessage.address,
			},
		};
	}

	return { type: "UNSUPPORTED", text: "[mensagem não suportada]" };
}
