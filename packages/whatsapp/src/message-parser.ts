import type { WAMessage, proto } from "@whiskeysockets/baileys";
import { downloadAndStoreMedia } from "./media-storage";
import type { ParsedMessage } from "./types";

/**
 * Tipos de wrapper do Baileys que escondem o conteúdo real da mensagem.
 * v7 usa esses extensivamente — em particular `deviceSentMessage` quando
 * a mensagem é enviada do próprio dispositivo do usuário (self-chat,
 * desktop replicando o celular). Sem desempacotar caem como UNSUPPORTED.
 */
function unwrapMessage(
	m: proto.IMessage | null | undefined,
): proto.IMessage | null {
	if (!m) return null;
	// Mensagens efêmeras / view-once vêm com wrapper duplo.
	if (m.ephemeralMessage?.message) {
		return unwrapMessage(m.ephemeralMessage.message);
	}
	if (m.viewOnceMessage?.message) {
		return unwrapMessage(m.viewOnceMessage.message);
	}
	if (m.viewOnceMessageV2?.message) {
		return unwrapMessage(m.viewOnceMessageV2.message);
	}
	if (m.viewOnceMessageV2Extension?.message) {
		return unwrapMessage(m.viewOnceMessageV2Extension.message);
	}
	// Sent from a linked device (Desktop/Web) ou mensagem pra si mesmo.
	if (m.deviceSentMessage?.message) {
		return unwrapMessage(m.deviceSentMessage.message);
	}
	// Mensagem editada — preferimos mostrar o conteúdo novo.
	if (m.editedMessage?.message?.protocolMessage?.editedMessage) {
		return unwrapMessage(
			m.editedMessage.message.protocolMessage.editedMessage,
		);
	}
	if (m.documentWithCaptionMessage?.message) {
		return unwrapMessage(m.documentWithCaptionMessage.message);
	}
	return m;
}

/**
 * Mensagens que NÃO devem virar uma message no chat (reações, sinais
 * internos do protocolo, ack de leitura, etc). Caller pula o insert.
 */
function isControlMessage(m: proto.IMessage): boolean {
	if (m.protocolMessage) return true;
	if (m.reactionMessage) return true;
	if (m.senderKeyDistributionMessage && Object.keys(m).length === 1) {
		return true;
	}
	return false;
}

/**
 * Extrai conteúdo da WAMessage do Baileys num formato plano pra persistir no
 * DB. Para mídia, faz download + upload pro Supabase Storage antes de retornar.
 *
 * Retorna `null` quando a mensagem é de controle (reaction, protocolMessage)
 * e não deve aparecer no chat — handler descarta o insert nesse caso.
 */
export async function parseMessageContent(
	msg: WAMessage,
	organizationId: string,
): Promise<ParsedMessage | null> {
	const raw = msg.message;
	if (!raw) return { type: "UNSUPPORTED", text: "[mensagem vazia]" };

	const m = unwrapMessage(raw);
	if (!m) return { type: "UNSUPPORTED", text: "[mensagem vazia]" };
	if (isControlMessage(m)) return null;

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

	// Loga shape desconhecido pra investigar caso a caso (sem flood — só keys)
	const keys = Object.keys(m).filter((k) => m[k as keyof proto.IMessage]);
	console.warn("[parseMessageContent] tipo desconhecido:", keys.join(", "));

	return { type: "UNSUPPORTED", text: "[mensagem não suportada]" };
}
