import { config } from "@repo/config";

/**
 * Resolve o valor persistido em `agent.avatarUrl` pra uma URL renderizavel.
 *
 * - null/undefined → retorna null (o consumidor mostra fallback)
 * - URL absoluta (http/https) → usa direto
 * - path relativo ao bucket → prefixa `/image-proxy/{bucket}/{path}` pro
 *   Next proxy servir a imagem do Supabase Storage
 */
export function resolveAgentAvatarUrl(
	avatarUrl: string | null | undefined,
): string | null {
	if (!avatarUrl) return null;
	if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
		return avatarUrl;
	}
	return `/image-proxy/${config.storage.bucketNames.avatars}/${avatarUrl}`;
}

/**
 * Gera iniciais a partir do nome (max 2 letras).
 * Ex: "Atendente Comercial Vertech" → "AC"
 */
export function getAgentInitials(name: string): string {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase() ?? "")
			.join("") || "AG"
	);
}
