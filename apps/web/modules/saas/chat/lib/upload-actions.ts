"use server";

import { requireOrgAccess } from "@repo/auth";
import { conversation, db, eq } from "@repo/database";
import { getSession } from "@saas/auth/lib/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "chat-media";
const MAX_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = {
	IMAGE: [/^image\//],
	AUDIO: [/^audio\//],
	VIDEO: [/^video\//],
	DOCUMENT: [
		/^application\/pdf$/,
		/^application\/msword$/,
		/^application\/vnd\.openxmlformats-officedocument\./,
		/^application\/vnd\.ms-/,
		/^text\//,
		/^application\/zip$/,
		/^application\/json$/,
	],
} as const;

export type ChatMediaKind = keyof typeof ALLOWED_TYPES;

export type UploadedMedia = {
	url: string;
	mimeType: string;
	size: number;
	fileName: string;
	kind: ChatMediaKind;
};

function detectKind(mime: string): ChatMediaKind | null {
	for (const [kind, patterns] of Object.entries(ALLOWED_TYPES)) {
		if (patterns.some((p) => p.test(mime))) {
			return kind as ChatMediaKind;
		}
	}
	return null;
}

function requireAdminClient() {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error("Supabase não configurado (SUPABASE_URL / SERVICE_ROLE_KEY).");
	}
	return createClient(url, key, {
		auth: { persistSession: false },
	});
}

/**
 * Upload de mídia pro bucket `chat-media`. Server action usa service_role
 * porque o projeto usa better-auth (não Supabase Auth), então RLS não
 * reconhece o usuário. O acesso é validado aqui antes.
 *
 * Retorna a URL pública do arquivo — pra ser enviada em seguida via
 * `sendMediaMessageAction`.
 */
export async function uploadChatMediaAction(
	formData: FormData,
): Promise<UploadedMedia> {
	const session = await getSession();
	if (!session?.user) throw new Error("UNAUTHENTICATED");

	const conversationId = formData.get("conversationId");
	const file = formData.get("file");

	if (typeof conversationId !== "string" || !conversationId) {
		throw new Error("conversationId inválido");
	}
	if (!(file instanceof File)) {
		throw new Error("Arquivo inválido");
	}
	if (file.size === 0) {
		throw new Error("Arquivo vazio");
	}
	if (file.size > MAX_BYTES) {
		throw new Error(
			`Arquivo grande demais (máx ${Math.floor(MAX_BYTES / 1024 / 1024)}MB).`,
		);
	}

	const kind = detectKind(file.type);
	if (!kind) {
		throw new Error(`Tipo de arquivo não suportado: ${file.type || "desconhecido"}`);
	}

	// Validar acesso à conversa
	const [conv] = await db
		.select({
			id: conversation.id,
			organizationId: conversation.organizationId,
		})
		.from(conversation)
		.where(eq(conversation.id, conversationId))
		.limit(1);

	if (!conv) throw new Error("CONVERSATION_NOT_FOUND");
	await requireOrgAccess(session.user.id, conv.organizationId);

	// Nome do arquivo no storage: {orgId}/{convId}/{timestamp}-{random}.{ext}
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
	const safeExt = ext.replace(/[^a-z0-9]/g, "") || "bin";
	const key = `${conv.organizationId}/${conversationId}/${Date.now()}-${crypto
		.randomUUID()
		.slice(0, 8)}.${safeExt}`;

	const supabase = requireAdminClient();
	const buffer = await file.arrayBuffer();
	const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
		contentType: file.type || "application/octet-stream",
		upsert: false,
	});

	if (error) {
		console.error("[uploadChatMedia] storage error", error);
		throw new Error(`Falha no upload: ${error.message}`);
	}

	const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(key);

	return {
		url: publicData.publicUrl,
		mimeType: file.type || "application/octet-stream",
		size: file.size,
		fileName: file.name,
		kind,
	};
}
