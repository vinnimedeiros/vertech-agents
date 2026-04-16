import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/postgres";

// Check the drizzle documentation for more information on how to connect to your preferred database provider
// https://orm.drizzle.team/docs/get-started-postgresql

const globalForDb = globalThis as unknown as {
	pool: Pool | undefined;
};

function getPool(): Pool {
	if (globalForDb.pool) {
		return globalForDb.pool;
	}

	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not set");
	}

	const pool = new Pool({ connectionString: databaseUrl });

	if (process.env.NODE_ENV !== "production") {
		globalForDb.pool = pool;
	}

	return pool;
}

export const db = drizzle({
	client: new Proxy({} as Pool, {
		get(_target, prop) {
			const pool = getPool();
			const value = Reflect.get(pool, prop);
			return typeof value === "function" ? value.bind(pool) : value;
		},
	}),
	schema,
});
