/**
 * Seed de desenvolvimento — cria Master + Agency + Client demo
 * abaixo do Superadmin existente.
 *
 * Pré-requisito: bootstrap-superadmin.ts já precisa ter rodado.
 *
 * Uso:
 *   pnpm -F @repo/database seed
 */

import { db, eq, member, organization } from "@repo/database";
import { createChildOrganization } from "@repo/auth";

async function main() {
	const [superadmin] = await db
		.select()
		.from(organization)
		.where(eq(organization.organizationType, "SUPERADMIN"))
		.limit(1);

	if (!superadmin) {
		console.error(
			"❌ Superadmin organization not found. Run bootstrap first.",
		);
		process.exit(1);
	}

	const [owner] = await db
		.select()
		.from(member)
		.where(eq(member.organizationId, superadmin.id))
		.limit(1);

	if (!owner) {
		console.error("❌ No owner found for Superadmin org.");
		process.exit(1);
	}

	console.log(`🌱 Seeding hierarchy under Superadmin ${superadmin.id}...`);

	const master = await createChildOrganization({
		creatorUserId: owner.userId,
		parentOrganizationId: superadmin.id,
		childType: "MASTER",
		name: "Demo Master Partner",
		slug: "demo-master",
	});
	console.log(`  ✅ Master created: ${master.id}`);

	const agency = await createChildOrganization({
		creatorUserId: owner.userId,
		parentOrganizationId: master.id,
		childType: "AGENCY",
		name: "Demo Agency",
		slug: "demo-agency",
	});
	console.log(`  ✅ Agency created: ${agency.id}`);

	const client = await createChildOrganization({
		creatorUserId: owner.userId,
		parentOrganizationId: agency.id,
		childType: "CLIENT",
		name: "Demo Client Inc",
		slug: "demo-client",
	});
	console.log(`  ✅ Client created: ${client.id}`);

	console.log("\n🎉 Hierarchy seeded successfully!");
	console.log(`   SUPERADMIN → MASTER → AGENCY → CLIENT`);
	console.log(
		`   ${superadmin.id.slice(0, 8)}… → ${master.id.slice(0, 8)}… → ${agency.id.slice(0, 8)}… → ${client.id.slice(0, 8)}…`,
	);
}

main()
	.catch((err) => {
		console.error("❌ Seed failed:", err);
		process.exit(1);
	})
	.finally(() => process.exit(0));
