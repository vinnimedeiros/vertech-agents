import {
	GOOGLE_OAUTH_AUTH_URL,
	GOOGLE_OAUTH_REVOKE_URL,
	GOOGLE_OAUTH_SCOPES,
	GOOGLE_OAUTH_TOKEN_URL,
	type GoogleOAuthEnv,
} from "./oauth-config";

export type GoogleTokenResponse = {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	scope: string;
	token_type: "Bearer";
	id_token?: string;
};

export type GoogleIdTokenClaims = {
	sub: string;
	email?: string;
	email_verified?: boolean;
	name?: string;
	picture?: string;
	aud: string;
	iss: string;
	exp: number;
	iat: number;
};

export function buildAuthorizationUrl(
	env: GoogleOAuthEnv,
	state: string,
	options: { loginHint?: string } = {},
): string {
	const params = new URLSearchParams({
		client_id: env.clientId,
		redirect_uri: env.redirectUri,
		response_type: "code",
		scope: GOOGLE_OAUTH_SCOPES.join(" "),
		access_type: "offline",
		// Força consent screen pra garantir refresh_token (Google só
		// devolve refresh_token na 1ª autorização ou com prompt=consent).
		prompt: "consent",
		include_granted_scopes: "true",
		state,
	});
	if (options.loginHint) params.set("login_hint", options.loginHint);
	return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
	env: GoogleOAuthEnv,
	code: string,
): Promise<GoogleTokenResponse> {
	const body = new URLSearchParams({
		code,
		client_id: env.clientId,
		client_secret: env.clientSecret,
		redirect_uri: env.redirectUri,
		grant_type: "authorization_code",
	});
	const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
		cache: "no-store",
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`[google-oauth] Token exchange falhou (${res.status}): ${text.slice(0, 300)}`,
		);
	}
	return (await res.json()) as GoogleTokenResponse;
}

export async function refreshAccessToken(
	env: GoogleOAuthEnv,
	refreshToken: string,
): Promise<GoogleTokenResponse> {
	const body = new URLSearchParams({
		client_id: env.clientId,
		client_secret: env.clientSecret,
		refresh_token: refreshToken,
		grant_type: "refresh_token",
	});
	const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
		cache: "no-store",
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`[google-oauth] Refresh falhou (${res.status}): ${text.slice(0, 300)}`,
		);
	}
	return (await res.json()) as GoogleTokenResponse;
}

export async function revokeToken(token: string): Promise<void> {
	const body = new URLSearchParams({ token });
	await fetch(GOOGLE_OAUTH_REVOKE_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
		cache: "no-store",
	}).catch(() => {
		// Best-effort. Falha de revoke remoto não impede deletar local.
	});
}

/**
 * Decodifica payload de id_token sem verificar assinatura.
 * Uso só pra extrair email/name (não confiar pra autenticação — a
 * autenticação já foi feita pelo Google na troca code→token).
 */
export function decodeIdTokenClaims(idToken: string): GoogleIdTokenClaims {
	const parts = idToken.split(".");
	if (parts.length !== 3) {
		throw new Error("[google-oauth] id_token inválido");
	}
	const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
	const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
	const json = Buffer.from(padded, "base64").toString("utf8");
	return JSON.parse(json) as GoogleIdTokenClaims;
}
