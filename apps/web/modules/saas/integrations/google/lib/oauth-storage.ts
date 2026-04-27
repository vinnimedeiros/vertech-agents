import {
	and,
	db,
	decryptToken,
	encryptToken,
	eq,
	oauthToken,
	type OAuthTokenMetadata,
} from "@repo/database";

export type SaveGoogleTokenInput = {
	organizationId: string;
	userId: string;
	providerAccountId: string;
	scope: string;
	accessToken: string;
	refreshToken?: string | null;
	expiresAt: Date | null;
	metadata?: OAuthTokenMetadata;
};

/**
 * Upsert por (org, user, provider="google"). Cifra tokens antes de gravar.
 * Se refreshToken vier vazio, preserva o existente (Google só devolve
 * refresh_token no 1º consent — em refresh subsequente, fica vazio).
 */
export async function saveGoogleToken(
	input: SaveGoogleTokenInput,
): Promise<void> {
	const accessTokenEnc = encryptToken(input.accessToken);
	const refreshTokenEnc = input.refreshToken
		? encryptToken(input.refreshToken)
		: null;
	const now = new Date();

	const existing = await db.query.oauthToken.findFirst({
		where: and(
			eq(oauthToken.organizationId, input.organizationId),
			eq(oauthToken.userId, input.userId),
			eq(oauthToken.provider, "google"),
		),
	});

	if (existing) {
		await db
			.update(oauthToken)
			.set({
				providerAccountId: input.providerAccountId,
				scope: input.scope,
				accessTokenEnc,
				// Preserva refresh anterior se Google não devolveu novo.
				refreshTokenEnc: refreshTokenEnc ?? existing.refreshTokenEnc,
				expiresAt: input.expiresAt,
				metadata: { ...existing.metadata, ...(input.metadata ?? {}) },
				updatedAt: now,
			})
			.where(eq(oauthToken.id, existing.id));
		return;
	}

	await db.insert(oauthToken).values({
		organizationId: input.organizationId,
		userId: input.userId,
		provider: "google",
		providerAccountId: input.providerAccountId,
		scope: input.scope,
		accessTokenEnc,
		refreshTokenEnc,
		expiresAt: input.expiresAt,
		metadata: input.metadata ?? {},
		createdAt: now,
		updatedAt: now,
	});
}

export type GoogleTokenRecord = {
	id: string;
	organizationId: string;
	userId: string;
	providerAccountId: string;
	scope: string;
	accessToken: string;
	refreshToken: string | null;
	expiresAt: Date | null;
	metadata: OAuthTokenMetadata;
};

export async function getGoogleTokenRecord(
	organizationId: string,
	userId: string,
): Promise<GoogleTokenRecord | null> {
	const row = await db.query.oauthToken.findFirst({
		where: and(
			eq(oauthToken.organizationId, organizationId),
			eq(oauthToken.userId, userId),
			eq(oauthToken.provider, "google"),
		),
	});
	if (!row) return null;
	return {
		id: row.id,
		organizationId: row.organizationId,
		userId: row.userId,
		providerAccountId: row.providerAccountId,
		scope: row.scope,
		accessToken: decryptToken(row.accessTokenEnc),
		refreshToken: row.refreshTokenEnc
			? decryptToken(row.refreshTokenEnc)
			: null,
		expiresAt: row.expiresAt,
		metadata: row.metadata,
	};
}

export async function hasGoogleToken(
	organizationId: string,
	userId: string,
): Promise<boolean> {
	const row = await db.query.oauthToken.findFirst({
		where: and(
			eq(oauthToken.organizationId, organizationId),
			eq(oauthToken.userId, userId),
			eq(oauthToken.provider, "google"),
		),
		columns: { id: true },
	});
	return !!row;
}

export async function deleteGoogleToken(
	organizationId: string,
	userId: string,
): Promise<GoogleTokenRecord | null> {
	const existing = await getGoogleTokenRecord(organizationId, userId);
	if (!existing) return null;
	await db.delete(oauthToken).where(eq(oauthToken.id, existing.id));
	return existing;
}
