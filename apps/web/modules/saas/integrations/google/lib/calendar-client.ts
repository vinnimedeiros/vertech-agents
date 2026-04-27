import "server-only";

import { calendar as googleCalendar, auth as googleAuth } from "@googleapis/calendar";
import { logger } from "@repo/logs";
import {
	getGoogleTokenRecord,
	saveGoogleToken,
} from "./oauth-storage";
import { requireGoogleOAuthEnv } from "./oauth-config";

export type GoogleCalendarClient = ReturnType<typeof googleCalendar>;

/**
 * Constrói cliente Google Calendar autenticado pra (org, user).
 * - Carrega token cifrado do banco
 * - Configura OAuth2 client com auto-refresh
 * - Listener `tokens` salva access_token novo automaticamente após refresh
 *
 * Lança se org/user não tem token conectado. UI/caller deve verificar
 * `hasGoogleToken` antes ou tratar erro.
 */
export async function getGoogleCalendarClient(
	organizationId: string,
	userId: string,
): Promise<GoogleCalendarClient> {
	const env = requireGoogleOAuthEnv();
	const record = await getGoogleTokenRecord(organizationId, userId);
	if (!record) {
		throw new Error(
			`[google-calendar] Sem oauth_token pra org=${organizationId} user=${userId}`,
		);
	}

	const oauth2 = new googleAuth.OAuth2({
		clientId: env.clientId,
		clientSecret: env.clientSecret,
		redirectUri: env.redirectUri,
	});

	oauth2.setCredentials({
		access_token: record.accessToken,
		refresh_token: record.refreshToken ?? undefined,
		expiry_date: record.expiresAt ? record.expiresAt.getTime() : undefined,
		scope: record.scope,
		token_type: "Bearer",
	});

	// Auto-save novo access_token quando googleapis fizer refresh transparente.
	oauth2.on("tokens", (tokens) => {
		// `tokens.access_token` sempre vem após refresh. `refresh_token` raramente
		// (Google só devolve no 1º consent). `saveGoogleToken` preserva refresh
		// existente quando novo é null.
		const expiresAt = tokens.expiry_date
			? new Date(tokens.expiry_date)
			: null;
		void saveGoogleToken({
			organizationId: record.organizationId,
			userId: record.userId,
			providerAccountId: record.providerAccountId,
			scope: record.scope,
			accessToken: tokens.access_token ?? record.accessToken,
			refreshToken: tokens.refresh_token ?? null,
			expiresAt,
			metadata: record.metadata,
		}).catch((err) => {
			logger.error(
				{ err: err instanceof Error ? err.message : err },
				"[google-calendar] Falha ao persistir token refreshed",
			);
		});
	});

	return googleCalendar({ version: "v3", auth: oauth2 });
}
