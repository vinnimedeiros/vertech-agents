import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "./drizzle/schema/index.ts",
	out: "./drizzle/migrations",
	dbCredentials: {
		// Use direct connection for migrations (pooler has issues with DDL)
		url: (process.env.DIRECT_URL || process.env.DATABASE_URL) as string,
	},
	verbose: true,
	strict: true,
});
