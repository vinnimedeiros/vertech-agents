import "server-only";

import {
	getGoogleTokenRecord,
	hasGoogleToken,
} from "./oauth-storage";

export type GoogleConnectionStatus = {
	connected: boolean;
	email: string | null;
	scope: string | null;
	expiresAt: string | null;
	lastSyncAt: string | null;
};

export async function getGoogleConnectionStatus(
	organizationId: string,
	userId: string,
): Promise<GoogleConnectionStatus> {
	const record = await getGoogleTokenRecord(organizationId, userId);
	if (!record) {
		return {
			connected: false,
			email: null,
			scope: null,
			expiresAt: null,
			lastSyncAt: null,
		};
	}
	const email =
		(record.metadata.email as string | undefined) ??
		record.providerAccountId ??
		null;
	const lastSyncAt =
		(record.metadata.lastSyncAt as string | undefined) ?? null;
	return {
		connected: true,
		email,
		scope: record.scope,
		expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
		lastSyncAt,
	};
}

export { hasGoogleToken };
