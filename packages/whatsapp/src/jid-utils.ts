/**
 * Utilidades pra normalizar JIDs do WhatsApp/Baileys de forma consistente.
 *
 * Formato JID típico v7:
 * - Phone: `5511999999999:0@s.whatsapp.net` ou `5511999999999@s.whatsapp.net`
 * - LID:   `12345678:0@lid` ou `12345678@lid`
 *
 * O sufixo `:N` é o deviceId — 0 pra celular primário, 1+ pra outros
 * dispositivos do mesmo número (WhatsApp Web, Desktop, iPad). Não faz parte
 * do telefone real.
 *
 * IMPORTANTE: NUNCA usar `replace(/\D/g, "")` direto num JID — remove o `:`
 * e cola o deviceId no fim do número (ex: `5511945130236:0` vira
 * `55119451302360`, criando telefone inválido com 14 dígitos).
 */

/**
 * Extrai apenas a parte de identificador (antes do `:deviceId`) de um JID
 * ou phone bruto. Aceita várias formas:
 *
 * - `5511999999999:0@s.whatsapp.net` → `5511999999999`
 * - `5511999999999@s.whatsapp.net`   → `5511999999999`
 * - `5511999999999:0`                → `5511999999999`
 * - `5511999999999`                  → `5511999999999`
 * - `+55 (11) 99999-9999`            → `5511999999999`
 * - `12345678@lid`                   → `12345678`
 *
 * Retorna apenas dígitos. Vazio se input não tiver dígitos válidos.
 */
export function normalizePhoneFromJid(input: string | null | undefined): string {
	if (!input) return "";
	// Strip domínio (@s.whatsapp.net, @lid, @c.us, etc)
	const beforeAt = input.split("@")[0] ?? "";
	// Strip deviceId (:0, :1, etc)
	const beforeColon = beforeAt.split(":")[0] ?? "";
	// Mantém apenas dígitos (remove +, espaços, parênteses, hifens)
	return beforeColon.replace(/\D/g, "");
}

/**
 * Extrai LID puro de um JID. Mesmas regras de stripping.
 *
 * - `12345678:0@lid` → `12345678`
 * - `12345678@lid`   → `12345678`
 * - `12345678`       → `12345678`
 */
export function normalizeLidFromJid(input: string | null | undefined): string {
	if (!input) return "";
	const beforeAt = input.split("@")[0] ?? "";
	const beforeColon = beforeAt.split(":")[0] ?? "";
	// LIDs são numéricos mas mantemos só dígitos por segurança
	return beforeColon.replace(/\D/g, "");
}

/**
 * Detecta o "kind" de um JID baseado no domínio:
 * - `@s.whatsapp.net` ou `@c.us` → phone
 * - `@lid` → lid
 * - `@g.us` → group
 * - `status@broadcast` → broadcast
 * - resto → unknown
 */
export type JidKind = "phone" | "lid" | "group" | "broadcast" | "unknown";

export function detectJidKind(jid: string | null | undefined): JidKind {
	if (!jid) return "unknown";
	if (jid === "status@broadcast") return "broadcast";
	if (jid.endsWith("@g.us")) return "group";
	const domain = jid.split("@")[1] ?? "";
	if (domain === "lid") return "lid";
	if (domain === "s.whatsapp.net" || domain === "c.us") return "phone";
	return "unknown";
}
