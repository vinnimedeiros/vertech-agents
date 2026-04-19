export { baileysManager } from "./src/manager";
export { WhatsAppInstance } from "./src/instance";
export type { WAMessage, WAMessageKey, WAMessageUpdate, WASocket } from "@whiskeysockets/baileys";
export {
	sendText,
	sendImage,
	sendVideo,
	sendVoiceNote,
	sendAudioFile,
	sendDocument,
	sendReaction,
} from "./src/media-sender";
export {
	convertToOggOpus,
	isFfmpegAvailable,
} from "./src/ffmpeg";
export { enrichContactFromWhatsApp } from "./src/contact-enricher";
export type { ParsedMessage, WhatsAppInstanceStatus } from "./src/types";
