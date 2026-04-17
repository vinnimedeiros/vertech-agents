import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Only include Vitest unit tests (.test.ts).
		// Playwright e2e tests use .spec.ts and are excluded.
		include: ["packages/**/*.test.{ts,tsx}", "apps/**/*.test.{ts,tsx}"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"**/.turbo/**",
			"**/tests/**",
			"**/e2e/**",
			"**/playwright/**",
			"**/*.spec.{ts,tsx}",
		],
		environment: "node",
		globals: true,
	},
});
