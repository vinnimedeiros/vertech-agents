import { PostgresStore } from "@mastra/pg";

/**
 * Storage singleton do Mastra apontando pro Supabase Postgres.
 *
 * Mastra cria tabelas proprias (`mastra_messages`, `mastra_threads`, etc)
 * no primeiro boot. Nao conflita com schema da aplicacao porque usa namespace
 * distinto.
 *
 * Lazy init — permite importar em contextos sem DATABASE_URL (testes).
 */
let storageInstance: PostgresStore | null = null;

export function getMastraStorage(): PostgresStore {
	if (!storageInstance) {
		const url = process.env.DATABASE_URL;
		if (!url) {
			throw new Error(
				"DATABASE_URL nao configurada — Mastra storage requer Postgres",
			);
		}
		storageInstance = new PostgresStore({
			id: "vertech-agents-mastra",
			connectionString: url,
		});
	}
	return storageInstance;
}
