"use server";

import { requireOrgAccess } from "@repo/auth";
import { getSession } from "@saas/auth/lib/server";
import { revalidatePath } from "next/cache";
import { runFullSync, type SyncResult } from "./calendar-sync";
import { revokeToken } from "./oauth-client";
import { deleteGoogleToken } from "./oauth-storage";

export type DisconnectGoogleResult =
	| { ok: true }
	| { ok: false; error: string };

export type SyncGoogleCalendarResult =
	| { ok: true; pulled: number; pushed: number; deleted: number; mode: "delta" | "full" }
	| { ok: false; error: string };

export async function syncGoogleCalendarAction(input: {
	organizationId: string;
	organizationSlug: string;
	force?: boolean;
}): Promise<SyncGoogleCalendarResult> {
	try {
		const session = await getSession();
		if (!session?.user) return { ok: false, error: "UNAUTHENTICATED" };
		await requireOrgAccess(session.user.id, input.organizationId);

		const result: SyncResult = await runFullSync(
			input.organizationId,
			session.user.id,
			{ force: input.force },
		);
		if (!result.ok) {
			return { ok: false, error: result.error ?? "SYNC_FAILED" };
		}

		revalidatePath(`/app/${input.organizationSlug}/crm/integracoes`, "page");
		revalidatePath(`/app/${input.organizationSlug}/crm/agenda`, "page");
		return {
			ok: true,
			pulled: result.pulled,
			pushed: result.pushed,
			deleted: result.deleted,
			mode: result.mode,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
		return { ok: false, error: message };
	}
}

export async function disconnectGoogleAction(input: {
	organizationId: string;
	organizationSlug: string;
}): Promise<DisconnectGoogleResult> {
	try {
		const session = await getSession();
		if (!session?.user) return { ok: false, error: "UNAUTHENTICATED" };
		await requireOrgAccess(session.user.id, input.organizationId);

		const record = await deleteGoogleToken(
			input.organizationId,
			session.user.id,
		);
		// Best-effort: tenta revogar no Google (nem sempre necessário, mas evita
		// token zumbi caso user reconecte sem ter passado consent recente).
		if (record?.refreshToken) {
			await revokeToken(record.refreshToken);
		} else if (record?.accessToken) {
			await revokeToken(record.accessToken);
		}

		revalidatePath(`/app/${input.organizationSlug}/crm/integracoes`, "page");
		return { ok: true };
	} catch (err) {
		const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
		return { ok: false, error: message };
	}
}
