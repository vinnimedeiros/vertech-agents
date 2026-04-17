/**
 * Bootstrap Superadmin Organization.
 *
 * Pré-requisito: usuário com email `SUPERADMIN_EMAIL` já precisa existir no banco
 * (criar via signup normal na UI antes de rodar).
 *
 * Uso:
 *   SUPERADMIN_EMAIL=vinni@vertech-agents.com pnpm -F @repo/database bootstrap
 *
 * O que faz:
 * 1. Verifica se já existe Superadmin (idempotente)
 * 2. Busca o user pelo email
 * 3. Cria a organização Superadmin
 * 4. Cria o member como owner
 */

import { db, eq, member, organization, user } from "@repo/database";

async function main() {
	const email = process.env.SUPERADMIN_EMAIL;
	if (!email) {
		console.error("❌ SUPERADMIN_EMAIL env var is required");
		process.exit(1);
	}

	const existing = await db
		.select()
		.from(organization)
		.where(eq(organization.organizationType, "SUPERADMIN"))
		.limit(1);

	if (existing[0]) {
		console.log(
			`ℹ️  Superadmin organization already exists (id: ${existing[0].id}). Skipping.`,
		);
		return;
	}

	const [targetUser] = await db
		.select()
		.from(user)
		.where(eq(user.email, email))
		.limit(1);

	if (!targetUser) {
		console.error(
			`❌ User with email "${email}" not found. Signup first via UI.`,
		);
		process.exit(1);
	}

	const now = new Date();

	const [superadminOrg] = await db
		.insert(organization)
		.values({
			name: "Vertech Agents (Platform)",
			slug: "platform",
			organizationType: "SUPERADMIN",
			parentOrganizationId: null,
			createdAt: now,
		})
		.returning();

	await db.insert(member).values({
		organizationId: superadminOrg.id,
		userId: targetUser.id,
		role: "owner",
		createdAt: now,
	});

	console.log("✅ Superadmin organization created:");
	console.log(`   Org ID: ${superadminOrg.id}`);
	console.log(`   Owner:  ${targetUser.email} (${targetUser.id})`);
}

main()
	.catch((err) => {
		console.error("❌ Bootstrap failed:", err);
		process.exit(1);
	})
	.finally(() => process.exit(0));
