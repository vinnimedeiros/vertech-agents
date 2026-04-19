import "server-only";
import { db, eq, member, organization } from "@repo/database";
import { getSession } from "./server";

/**
 * Verifica se o user logado e membro de uma organizacao do tipo SUPERADMIN.
 *
 * Superadmin no Vertech e um tipo de organizacao (nao um role user-level).
 * Um user e superadmin se tem `member` em pelo menos uma `organization`
 * com `organizationType = 'SUPERADMIN'`.
 *
 * @returns userId se superadmin; null caso contrario
 */
export async function getSuperadminUserId(): Promise<string | null> {
	const session = await getSession();
	if (!session?.user) return null;

	const [row] = await db
		.select({ orgId: organization.id })
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(member.userId, session.user.id))
		.limit(50);

	if (!row) return null;

	// Query de novo filtrando por type — mais simples do que fazer em memory
	const [superadminOrg] = await db
		.select({ id: organization.id })
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(organization.organizationType, "SUPERADMIN"))
		.limit(1);

	return superadminOrg ? session.user.id : null;
}

/**
 * Atalho pra endpoints de API: retorna 401/403 Response OU null se passou.
 *
 * Uso:
 * ```ts
 * const denied = await requireSuperadmin();
 * if (denied) return denied;
 * // ...user e superadmin, prosseguir
 * ```
 */
export async function requireSuperadmin(): Promise<Response | null> {
	const session = await getSession();
	if (!session?.user) {
		return new Response(JSON.stringify({ error: "unauthenticated" }), {
			status: 401,
			headers: { "content-type": "application/json" },
		});
	}

	const [superadminOrg] = await db
		.select({ id: organization.id })
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(organization.organizationType, "SUPERADMIN"))
		.limit(1);

	if (!superadminOrg) {
		return new Response(JSON.stringify({ error: "forbidden" }), {
			status: 403,
			headers: { "content-type": "application/json" },
		});
	}

	// Validar que o user atual e membro dessa superadmin org
	const [userMembership] = await db
		.select({ id: member.id })
		.from(member)
		.where(eq(member.userId, session.user.id))
		.limit(100);

	if (!userMembership) {
		return new Response(JSON.stringify({ error: "forbidden" }), {
			status: 403,
			headers: { "content-type": "application/json" },
		});
	}

	return null; // passou
}
