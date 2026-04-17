import { db, eq, member, organization } from "@repo/database";
import type { OrganizationType } from "./access";
import { requireOrgAccess } from "./access";
import { ensureDefaultPipeline } from "./pipeline-defaults";

/**
 * Invariantes da hierarquia:
 * - SUPERADMIN → pode ter MASTER, AGENCY ou CLIENT como filhos
 * - MASTER → pode ter AGENCY ou CLIENT como filhos
 * - AGENCY → só pode ter CLIENT como filho
 * - CLIENT → NÃO pode ter filhos
 */
export function isValidChildType(
	parentType: OrganizationType,
	childType: OrganizationType,
): boolean {
	switch (parentType) {
		case "SUPERADMIN":
			return (
				childType === "MASTER" ||
				childType === "AGENCY" ||
				childType === "CLIENT"
			);
		case "MASTER":
			return childType === "AGENCY" || childType === "CLIENT";
		case "AGENCY":
			return childType === "CLIENT";
		case "CLIENT":
			return false;
	}
}

export type CreateChildOrganizationParams = {
	creatorUserId: string;
	parentOrganizationId: string;
	childType: OrganizationType;
	name: string;
	slug: string;
};

/**
 * Cria uma organização filha respeitando:
 * 1. Creator precisa ter acesso ao parent
 * 2. Combinação parent.type → child.type precisa ser válida
 * 3. Creator vira "owner" do member na nova org
 */
export async function createChildOrganization(
	params: CreateChildOrganizationParams,
) {
	const { creatorUserId, parentOrganizationId, childType, name, slug } =
		params;

	await requireOrgAccess(creatorUserId, parentOrganizationId);

	const parent = await db
		.select({ organizationType: organization.organizationType })
		.from(organization)
		.where(eq(organization.id, parentOrganizationId))
		.limit(1);

	if (!parent[0]) {
		throw new Error("PARENT_NOT_FOUND");
	}

	if (!isValidChildType(parent[0].organizationType, childType)) {
		throw new Error(
			`INVALID_HIERARCHY: ${parent[0].organizationType} cannot have ${childType} as child`,
		);
	}

	const now = new Date();

	const [newOrg] = await db
		.insert(organization)
		.values({
			name,
			slug,
			organizationType: childType,
			parentOrganizationId,
			createdAt: now,
		})
		.returning();

	await db.insert(member).values({
		organizationId: newOrg.id,
		userId: creatorUserId,
		role: "owner",
		createdAt: now,
	});

	// CLIENT workspaces get a default sales pipeline automatically.
	if (childType === "CLIENT") {
		await ensureDefaultPipeline(newOrg.id);
	}

	return newOrg;
}
