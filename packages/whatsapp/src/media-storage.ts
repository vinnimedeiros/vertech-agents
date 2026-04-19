import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
	downloadMediaMessage,
	type WAMessage,
} from "@whiskeysockets/baileys";

const BUCKET =
	process.env.NEXT_PUBLIC_WHATSAPP_MEDIA_BUCKET_NAME ?? "whatsapp-media";

let cached: SupabaseClient | null = null;

function adminClient(): SupabaseClient {
	if (cached) return cached;
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error(
			"SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configuradas",
		);
	}
	cached = createClient(url, key, {
		auth: { persistSession: false },
	});
	return cached;
}

function mimeOfMessage(msg: WAMessage): string {
	const m = msg.message;
	if (!m) return "application/octet-stream";
	return (
		m.imageMessage?.mimetype ??
		m.audioMessage?.mimetype ??
		m.videoMessage?.mimetype ??
		m.documentMessage?.mimetype ??
		m.stickerMessage?.mimetype ??
		"application/octet-stream"
	);
}

function fileNameOfMessage(msg: WAMessage, fallbackExt: string): string {
	const explicit = msg.message?.documentMessage?.fileName;
	if (explicit) return explicit;
	return `${msg.key.id ?? Date.now()}.${fallbackExt}`;
}

function extensionFromMime(mime: string): string {
	const parts = mime.split("/");
	const sub = parts[1] ?? "bin";
	// Remove parâmetros tipo "codecs=opus"
	return sub.split(";")[0]?.split("+")[0]?.trim() || "bin";
}

export type StoredMedia = {
	url: string;
	mimeType: string;
	fileName: string;
	size: number;
};

/**
 * Baixa uma mídia recebida via Baileys e sobe pro bucket `whatsapp-media` do
 * Supabase Storage. Retorna URL pública pra gravar em `message.mediaUrl`.
 */
export async function downloadAndStoreMedia(
	msg: WAMessage,
	organizationId: string,
	kind: "image" | "audio" | "video" | "document" | "sticker",
): Promise<StoredMedia> {
	const buffer = (await downloadMediaMessage(msg, "buffer", {})) as Buffer;
	const mimeType = mimeOfMessage(msg);
	const ext = extensionFromMime(mimeType);
	const fileName = fileNameOfMessage(msg, ext);
	const path = `${organizationId}/inbound/${kind}/${msg.key.id}.${ext}`;

	const supabase = adminClient();
	const { error } = await supabase.storage
		.from(BUCKET)
		.upload(path, buffer, {
			contentType: mimeType,
			upsert: true,
		});

	if (error) {
		throw new Error(`Falha ao subir mídia pro Storage: ${error.message}`);
	}

	const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

	return {
		url: data.publicUrl,
		mimeType,
		fileName,
		size: buffer.length,
	};
}

/**
 * Sobe um Buffer arbitrário pro bucket `whatsapp-media` e retorna URL pública.
 * Usado pra outbound: ex. converter áudio pra OGG antes de mandar.
 */
export async function uploadBufferToStorage(
	buffer: Buffer,
	organizationId: string,
	subpath: string,
	mimeType: string,
): Promise<StoredMedia> {
	const path = `${organizationId}/outbound/${subpath}`;
	const supabase = adminClient();
	const { error } = await supabase.storage
		.from(BUCKET)
		.upload(path, buffer, { contentType: mimeType, upsert: true });
	if (error) {
		throw new Error(`Falha no upload pra Storage: ${error.message}`);
	}
	const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
	return {
		url: data.publicUrl,
		mimeType,
		fileName: subpath.split("/").pop() ?? "file",
		size: buffer.length,
	};
}
