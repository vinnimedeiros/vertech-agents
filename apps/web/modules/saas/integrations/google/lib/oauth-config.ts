/**
 * Config Google OAuth Calendar — escopo `calendar.events` (manage events do
 * calendário escolhido). NÃO usar `calendar` full (read/write all calendars)
 * por princípio de menor privilégio. Identificação via `openid email profile`
 * pra preencher providerAccountId/metadata.
 *
 * Cliente OAuth dedicado (separado do Better Auth Google sign-in).
 * Vars: GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI.
 */

export const GOOGLE_OAUTH_SCOPES = [
	"https://www.googleapis.com/auth/calendar.events",
	"openid",
	"email",
	"profile",
];

export const GOOGLE_OAUTH_AUTH_URL =
	"https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_OAUTH_REVOKE_URL =
	"https://oauth2.googleapis.com/revoke";

export type GoogleOAuthEnv = {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
};

export function readGoogleOAuthEnv(): GoogleOAuthEnv | null {
	const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
	const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
	if (!clientId || !clientSecret || !redirectUri) return null;
	return { clientId, clientSecret, redirectUri };
}

export function requireGoogleOAuthEnv(): GoogleOAuthEnv {
	const env = readGoogleOAuthEnv();
	if (!env) {
		throw new Error(
			"[google-oauth] Credenciais ausentes. Setar GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI no .env.local",
		);
	}
	return env;
}

export const GOOGLE_OAUTH_STATE_COOKIE = "g_oauth_state";
export const GOOGLE_OAUTH_RETURN_COOKIE = "g_oauth_return";
export const GOOGLE_OAUTH_ORG_COOKIE = "g_oauth_org";
export const GOOGLE_OAUTH_COOKIE_MAX_AGE = 10 * 60; // 10 min
