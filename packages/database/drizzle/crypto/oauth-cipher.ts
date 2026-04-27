import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const FORMAT_VERSION = "v1";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
	if (cachedKey) return cachedKey;
	const raw = process.env.OAUTH_ENCRYPTION_KEY;
	if (!raw) {
		throw new Error(
			"[oauth-cipher] OAUTH_ENCRYPTION_KEY não configurado. Gerar com: openssl rand -base64 32",
		);
	}
	const decoded = Buffer.from(raw, "base64");
	if (decoded.length === 32) {
		cachedKey = decoded;
		return cachedKey;
	}
	// Fallback scrypt com salt fixo aceita strings arbitrárias mas é frágil
	// (salt determinístico = vulnerável a rainbow tables se key vazar). Só
	// permitido em dev pra facilitar setup local. Prod EXIGE base64 32B.
	if (process.env.NODE_ENV === "production") {
		throw new Error(
			"[oauth-cipher] OAUTH_ENCRYPTION_KEY deve ser base64 32-byte em production. " +
				`Recebido ${decoded.length} bytes. Gerar com: openssl rand -base64 32`,
		);
	}
	cachedKey = scryptSync(raw, "vertech-oauth-salt", 32);
	return cachedKey;
}

export function encryptToken(plaintext: string): string {
	if (!plaintext) {
		throw new Error("[oauth-cipher] encryptToken: plaintext vazio");
	}
	const key = getKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `${FORMAT_VERSION}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(ciphertext: string): string {
	if (!ciphertext) {
		throw new Error("[oauth-cipher] decryptToken: ciphertext vazio");
	}
	const parts = ciphertext.split(":");
	if (parts.length !== 4) {
		throw new Error(
			`[oauth-cipher] Formato inválido. Esperado v1:iv:tag:cipher, recebido ${parts.length} partes`,
		);
	}
	const [version, ivB64, tagB64, cipherB64] = parts;
	if (version !== FORMAT_VERSION) {
		throw new Error(
			`[oauth-cipher] Versão não suportada: ${version}. Esperado ${FORMAT_VERSION}`,
		);
	}
	const key = getKey();
	const iv = Buffer.from(ivB64, "base64");
	const tag = Buffer.from(tagB64, "base64");
	const encrypted = Buffer.from(cipherB64, "base64");
	if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
		throw new Error("[oauth-cipher] IV ou auth tag com tamanho inválido");
	}
	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);
	const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
	return decrypted.toString("utf8");
}

export function isTokenEncrypted(value: string): boolean {
	return typeof value === "string" && value.startsWith(`${FORMAT_VERSION}:`);
}
