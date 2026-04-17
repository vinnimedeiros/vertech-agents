import { describe, expect, it } from "vitest";
import { isValidChildType } from "./organizations-hierarchy";

describe("isValidChildType — hierarchy invariants", () => {
	describe("SUPERADMIN parent", () => {
		it("accepts MASTER child", () => {
			expect(isValidChildType("SUPERADMIN", "MASTER")).toBe(true);
		});
		it("accepts AGENCY child (direct sale)", () => {
			expect(isValidChildType("SUPERADMIN", "AGENCY")).toBe(true);
		});
		it("accepts CLIENT child (direct sale)", () => {
			expect(isValidChildType("SUPERADMIN", "CLIENT")).toBe(true);
		});
		it("rejects SUPERADMIN child (single superadmin invariant)", () => {
			expect(isValidChildType("SUPERADMIN", "SUPERADMIN")).toBe(false);
		});
	});

	describe("MASTER parent", () => {
		it("accepts AGENCY child", () => {
			expect(isValidChildType("MASTER", "AGENCY")).toBe(true);
		});
		it("accepts CLIENT child", () => {
			expect(isValidChildType("MASTER", "CLIENT")).toBe(true);
		});
		it("rejects MASTER child (no nested masters)", () => {
			expect(isValidChildType("MASTER", "MASTER")).toBe(false);
		});
		it("rejects SUPERADMIN child", () => {
			expect(isValidChildType("MASTER", "SUPERADMIN")).toBe(false);
		});
	});

	describe("AGENCY parent", () => {
		it("accepts CLIENT child", () => {
			expect(isValidChildType("AGENCY", "CLIENT")).toBe(true);
		});
		it("rejects AGENCY child (no nested agencies)", () => {
			expect(isValidChildType("AGENCY", "AGENCY")).toBe(false);
		});
		it("rejects MASTER child (upward hierarchy)", () => {
			expect(isValidChildType("AGENCY", "MASTER")).toBe(false);
		});
		it("rejects SUPERADMIN child", () => {
			expect(isValidChildType("AGENCY", "SUPERADMIN")).toBe(false);
		});
	});

	describe("CLIENT parent (leaf)", () => {
		it("rejects ALL child types (client has no descendants)", () => {
			expect(isValidChildType("CLIENT", "CLIENT")).toBe(false);
			expect(isValidChildType("CLIENT", "AGENCY")).toBe(false);
			expect(isValidChildType("CLIENT", "MASTER")).toBe(false);
			expect(isValidChildType("CLIENT", "SUPERADMIN")).toBe(false);
		});
	});
});
