/**
 * Audita quais features existem por org (SUPERADMIN/MASTER/AGENCY/CLIENT).
 * Checa violação regra MUST feedback_multi_layer_features.md.
 *
 * Run: pnpm --filter @repo/database exec dotenv -c -e ../../.env.local -- tsx ../../scripts/audit-org-features.ts
 */
import { db, sql } from "@repo/database";

async function main() {
	const orgs = await db.execute(sql`
		SELECT o.id, o.slug, o.name, o."organizationType" as type
		FROM organization o
		ORDER BY
			CASE o."organizationType"
				WHEN 'SUPERADMIN' THEN 1
				WHEN 'MASTER' THEN 2
				WHEN 'AGENCY' THEN 3
				WHEN 'CLIENT' THEN 4
			END
	`);

	console.log("=".repeat(80));
	console.log("AUDIT DE FEATURES POR ORGANIZACAO");
	console.log("=".repeat(80));

	for (const org of orgs.rows as Array<{ id: string; slug: string; name: string; type: string }>) {
		const [pipelineCount] = (await db.execute(sql`
			SELECT COUNT(*)::int as cnt FROM pipeline WHERE "organizationId" = ${org.id}
		`)).rows as Array<{ cnt: number }>;
		const [stageCount] = (await db.execute(sql`
			SELECT COUNT(*)::int as cnt FROM pipeline_stage ps
			JOIN pipeline p ON p.id = ps."pipelineId"
			WHERE p."organizationId" = ${org.id}
		`)).rows as Array<{ cnt: number }>;
		const [statusTplCount] = (await db.execute(sql`
			SELECT COUNT(*)::int as cnt FROM status_template WHERE "organizationId" = ${org.id}
		`)).rows as Array<{ cnt: number }>;
		const [agentCount] = (await db.execute(sql`
			SELECT COUNT(*)::int as cnt FROM agent WHERE "organizationId" = ${org.id}
		`)).rows as Array<{ cnt: number }>;
		const [waCount] = (await db.execute(sql`
			SELECT COUNT(*)::int as cnt FROM whatsapp_instance WHERE "organizationId" = ${org.id}
		`)).rows as Array<{ cnt: number }>;
		const [leadCount] = (await db.execute(sql`
			SELECT COUNT(*)::int as cnt FROM lead WHERE "organizationId" = ${org.id}
		`)).rows as Array<{ cnt: number }>;
		const [pipelineViewCount] = (await db.execute(sql`
			SELECT COUNT(*)::int as cnt FROM pipeline_view WHERE "organizationId" = ${org.id}
		`)).rows as Array<{ cnt: number }>;

		console.log(`\n[${org.type}] ${org.name} (slug=${org.slug})`);
		console.log(`  pipelines:       ${pipelineCount.cnt}`);
		console.log(`  pipeline_stages: ${stageCount.cnt}`);
		console.log(`  status_templates: ${statusTplCount.cnt}`);
		console.log(`  pipeline_views:  ${pipelineViewCount.cnt}`);
		console.log(`  agents:          ${agentCount.cnt}`);
		console.log(`  whatsapp_inst:   ${waCount.cnt}`);
		console.log(`  leads:           ${leadCount.cnt}`);

		const gaps: string[] = [];
		if (pipelineCount.cnt === 0) gaps.push("SEM PIPELINE");
		if (pipelineCount.cnt > 0 && stageCount.cnt === 0) gaps.push("PIPELINE SEM STAGES");
		if (pipelineViewCount.cnt === 0) gaps.push("SEM PIPELINE VIEWS");
		if (gaps.length > 0) {
			console.log(`  GAPS: ${gaps.join(", ")}`);
		}
	}

	console.log("\n" + "=".repeat(80));
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
