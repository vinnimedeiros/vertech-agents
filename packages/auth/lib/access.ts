import { and, db, eq, member, organization, sql } from "@repo/database";

/**
 * Hierarchy depth limit.
 * Superadmin (0) → Master (1) → Agency (2) → Client (3).
 * Any depth > 3 indicates a cycle or corrupted state.
 */
const MAX_HIERARCHY_DEPTH = 4;

export type OrganizationType = "SUPERADMIN" | "MASTER" | "AGENCY" | "CLIENT";

export type OrgAccess = {
	organizationId: string;
	role: string;
	organizationType: OrganizationType;
};

/**
 * Direct membership check. Returns org + role if user is a member, null otherwise.
 */
export async function getOrgAccess(
	userId: string,
	organizationId: string,
): Promise<OrgAccess | null> {
	const result = await db
		.select({
			organizationId: member.organizationId,
			role: member.role,
			organizationType: organization.organizationType,
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(
			and(
				eq(member.userId, userId),
				eq(member.organizationId, organizationId),
			),
		)
		.limit(1);

	return (result[0] as OrgAccess) ?? null;
}

/**
 * Returns all organization IDs accessible to a user:
 * direct memberships + descendants of those memberships (via CTE).
 *
 * Guarded by MAX_HIERARCHY_DEPTH to prevent runaway recursion on cycles.
 */
export async function getAccessibleOrganizationIds(
	userId: string,
): Promise<string[]> {
	const rows = await db.execute<{ id: string }>(sql`
		WITH RECURSIVE
		user_orgs AS (
			SELECT m."organizationId" AS id, 0 AS depth
			FROM "member" m
			WHERE m."userId" = ${userId}
		),
		descendants AS (
			SELECT uo.id, uo.depth
			FROM user_orgs uo

			UNION ALL

			SELECT o.id, d.depth + 1
			FROM "organization" o
			INNER JOIN descendants d ON o."parentOrganizationId" = d.id
			WHERE d.depth < ${MAX_HIERARCHY_DEPTH}
		)
		SELECT DISTINCT id FROM descendants;
	`);

	return rows.rows.map((r) => r.id);
}

/**
 * Returns true if user can access the target organization,
 * either directly or through ancestral membership.
 */
export async function canAccessOrganization(
	userId: string,
	targetOrganizationId: string,
): Promise<boolean> {
	const ids = await getAccessibleOrganizationIds(userId);
	return ids.includes(targetOrganizationId);
}

/**
 * Throws if user is not authenticated or lacks access.
 * Use in Server Actions / API handlers as a guard.
 */
export async function requireOrgAccess(
	userId: string | undefined,
	organizationId: string,
): Promise<void> {
	if (!userId) {
		throw new Error("UNAUTHENTICATED");
	}
	const ok = await canAccessOrganization(userId, organizationId);
	if (!ok) {
		throw new Error("FORBIDDEN");
	}
}
