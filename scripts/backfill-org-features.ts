/**
 * Backfill kit operacional (pipeline + kanban view) pra orgs que não têm.
 *
 * Fix regra MUST feedback_multi_layer_features.md — antes só CLIENT recebia
 * seed automático. Script aplica pra TODAS (SUPERADMIN/MASTER/AGENCY/CLIENT)
 * orgs existentes.
 *
 * Idempotente: ensureDefault* não faz nada se já existe.
 *
 * Run: pnpm --filter @repo/database exec dotenv -c -e ../../.env.local -- tsx ../../scripts/backfill-org-features.ts
 */
import { ensureDefaultOperationalKit } from "@repo/auth";
import { db, sql } from "@repo/database";

async function main() {
	const orgs = await db.execute(sql`
		SELECT id, slug, name, "organizationType" as type
		FROM organization
		ORDER BY
			CASE "organizationType"
				WHEN 'SUPERADMIN' THEN 1
				WHEN 'MASTER' THEN 2
				WHEN 'AGENCY' THEN 3
				WHEN 'CLIENT' THEN 4
			END
	`);

	console.log(`[backfill] ${orgs.rows.length} orgs found`);

	for (const org of orgs.rows as Array<{ id: string; slug: string; name: string; type: string }>) {
		try {
			const { pipelineId } = await ensureDefaultOperationalKit(org.id);
			console.log(`[backfill] ${org.type} ${org.slug} OK (pipeline=${pipelineId})`);
		} catch (err) {
			console.error(`[backfill] ${org.type} ${org.slug} FAILED`, err);
		}
	}

	console.log("[backfill] Done");
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
