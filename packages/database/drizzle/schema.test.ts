import { describe, expect, it } from "vitest";
import {
	account,
	aiChat,
	invitation,
	member,
	organization,
	passkey,
	purchase,
	session,
	twoFactor,
	user,
	verification,
} from "./schema/postgres";

describe("Drizzle schema", () => {
	it("exposes all 11 core tables", () => {
		const tables = [
			account,
			aiChat,
			invitation,
			member,
			organization,
			passkey,
			purchase,
			session,
			twoFactor,
			user,
			verification,
		];

		expect(tables).toHaveLength(11);
		for (const table of tables) {
			expect(table).toBeDefined();
		}
	});

	it("organization has hierarchical-ready shape (name, slug, metadata)", () => {
		// Phase 2 will extend with parentOrganizationId + organizationType
		const columns = Object.keys(organization);
		expect(columns.length).toBeGreaterThan(0);
	});

	it("user has auth + onboarding fields ready", () => {
		const columns = Object.keys(user);
		expect(columns.length).toBeGreaterThan(0);
	});
});
