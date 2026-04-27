import { baileysManager } from "./manager";
import { convertToOggOpus } from "./ffmpeg";

async function getSock(instanceId: string) {
	const inst = await baileysManager.ensureReady(instanceId);
	return inst.getSock();
}

function jidOf(phoneOrJid: string): string {
	// Se já é JID completo (contém @), usar direto. Preserva @lid
	// (Anonymous mode) ou @s.whatsapp.net entregues pelo Baileys.
	if (phoneOrJid.includes("@")) return phoneOrJid;
	// Senão, normaliza phone bruto: "5511999999999" ou "+55 11 99999-9999"
	const digits = phoneOrJid.replace(/\D/g, "");
	return `${digits}@s.whatsapp.net`;
}

export async function sendText(
	instanceId: string,
	toPhone: string,
	text: string,
) {
	const sock = await getSock(instanceId);
	return sock.sendMessage(jidOf(toPhone), { text });
}

export async function sendImage(
	instanceId: string,
	toPhone: string,
	url: string,
	caption?: string,
) {
	const sock = await getSock(instanceId);
	return sock.sendMessage(jidOf(toPhone), {
		image: { url },
		caption,
	});
}

export async function sendVideo(
	instanceId: string,
	toPhone: string,
	url: string,
	caption?: string,
) {
	const sock = await getSock(instanceId);
	return sock.sendMessage(jidOf(toPhone), {
		video: { url },
		caption,
	});
}

/**
 * Envia como voice note (bolinha). A conversão pra OGG Opus é crítica —
 * sem ela o WhatsApp trata como arquivo.
 */
export async function sendVoiceNote(
	instanceId: string,
	toPhone: string,
	audioUrl: string,
) {
	const sock = await getSock(instanceId);
	const oggBuffer = await convertToOggOpus(audioUrl);
	return sock.sendMessage(jidOf(toPhone), {
		audio: oggBuffer,
		ptt: true,
		mimetype: "audio/ogg; codecs=opus",
	});
}

export async function sendAudioFile(
	instanceId: string,
	toPhone: string,
	url: string,
) {
	const sock = await getSock(instanceId);
	return sock.sendMessage(jidOf(toPhone), {
		audio: { url },
		mimetype: "audio/mp4",
	});
}

export async function sendDocument(
	instanceId: string,
	toPhone: string,
	url: string,
	fileName: string,
	mimeType: string,
) {
	const sock = await getSock(instanceId);
	return sock.sendMessage(jidOf(toPhone), {
		document: { url },
		fileName,
		mimetype: mimeType,
	});
}

export async function sendReaction(
	instanceId: string,
	toPhone: string,
	targetMessageId: string,
	emoji: string,
) {
	const sock = await getSock(instanceId);
	return sock.sendMessage(jidOf(toPhone), {
		react: {
			text: emoji,
			key: {
				remoteJid: jidOf(toPhone),
				id: targetMessageId,
				fromMe: false,
			},
		},
	});
}
