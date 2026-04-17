/**
 * Backfill: cria pipeline default para CLIENT workspaces criados
 * antes do hook ensureDefaultPipeline existir.
 *
 * Idempotente — ensureDefaultPipeline é no-op se já existe pipeline.
 */

import { db, eq, organization } from "@repo/database";
import { ensureDefaultPipeline } from "@repo/auth";

async function main() {
	const clients = await db
		.select({ id: organization.id, name: organization.name })
		.from(organization)
		.where(eq(organization.organizationType, "CLIENT"));

	if (clients.length === 0) {
		console.log("ℹ️  Nenhum CLIENT workspace encontrado. Nada para fazer.");
		return;
	}

	console.log(`🌱 Backfilling default pipelines em ${clients.length} client(s)...`);

	for (const client of clients) {
		const pipelineId = await ensureDefaultPipeline(client.id);
		console.log(`  ✅ ${client.name} → pipeline ${pipelineId}`);
	}

	console.log("\n🎉 Backfill concluído.");
}

main()
	.catch((err) => {
		console.error("❌ Backfill failed:", err);
		process.exit(1);
	})
	.finally(() => process.exit(0));
