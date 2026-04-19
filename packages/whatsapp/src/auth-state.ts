import { db, eq, whatsappInstance } from "@repo/database";
import {
	BufferJSON,
	initAuthCreds,
	proto,
	type AuthenticationCreds,
	type AuthenticationState,
	type SignalDataTypeMap,
} from "@whiskeysockets/baileys";

type KeyStore = Record<string, Record<string, unknown>>;

type PersistedAuthState = {
	creds: AuthenticationCreds;
	keys: KeyStore;
};

/**
 * Substituto de `useMultiFileAuthState` do Baileys que persiste credenciais +
 * signal keys na tabela `whatsapp_instance.authState` (Postgres) via Drizzle.
 *
 * Em ambiente multi-tenant na cloud (ex: Coolify com containers efêmeros), o
 * filesystem NÃO é confiável. Guardar no DB garante que a sessão sobrevive a
 * redeploys.
 */
export async function useDatabaseAuthState(instanceId: string): Promise<{
	state: AuthenticationState;
	saveCreds: () => Promise<void>;
}> {
	async function loadState(): Promise<PersistedAuthState | null> {
		const [row] = await db
			.select({ authState: whatsappInstance.authState })
			.from(whatsappInstance)
			.where(eq(whatsappInstance.id, instanceId))
			.limit(1);

		if (!row?.authState) return null;

		// Baileys usa Buffer encoded em JSON — precisamos do reviver
		const parsed = JSON.parse(
			JSON.stringify(row.authState),
			BufferJSON.reviver,
		) as PersistedAuthState;

		return parsed;
	}

	async function persistState(state: PersistedAuthState): Promise<void> {
		const serialized = JSON.parse(
			JSON.stringify(state, BufferJSON.replacer),
		);
		await db
			.update(whatsappInstance)
			.set({
				authState: serialized,
				updatedAt: new Date(),
			})
			.where(eq(whatsappInstance.id, instanceId));
	}

	const loaded = await loadState();
	const creds: AuthenticationCreds = loaded?.creds ?? initAuthCreds();
	const keys: KeyStore = loaded?.keys ?? {};

	const state: AuthenticationState = {
		creds,
		keys: {
			get: (async (type: keyof SignalDataTypeMap, ids: string[]) => {
				const bucket = keys[type] ?? {};
				const result: Record<string, unknown> = {};
				for (const id of ids) {
					let value = bucket[id];
					if (type === "app-state-sync-key" && value) {
						value = proto.Message.AppStateSyncKeyData.fromObject(
							value as Record<string, unknown>,
						);
					}
					result[id] = value;
				}
				return result;
			}) as AuthenticationState["keys"]["get"],
			set: async (data) => {
				for (const type in data) {
					const typeKey = type as keyof SignalDataTypeMap;
					keys[typeKey] = keys[typeKey] ?? {};
					const entries = (data as Record<string, Record<string, unknown>>)[type];
					if (!entries) continue;
					for (const id in entries) {
						const value = entries[id];
						if (value === null || value === undefined) {
							delete keys[typeKey][id];
						} else {
							keys[typeKey][id] = value;
						}
					}
				}
				await persistState({ creds, keys });
			},
		},
	};

	return {
		state,
		saveCreds: async () => {
			await persistState({ creds, keys });
		},
	};
}
