/**
 * Seed os 5 templates built-in da Phase 04F (Template Library).
 *
 * isBuiltIn=true + organizationId=null → globais, visíveis pra todas as orgs.
 * Idempotente: se já existem built-ins, não duplica.
 *
 * Run: pnpm --filter @repo/database exec dotenv -c -e ../../.env.local -- tsx ../../scripts/seed-builtin-templates.ts
 */
import { db, eq, sql, statusTemplate } from "@repo/database";

// Copiado de apps/web/modules/saas/crm/lib/status-templates-data.ts
// Mantido inline pra evitar importar módulo de app no script infra.
const BUILT_IN_TEMPLATES = [
	{
		name: "Genérico",
		vertical: "generico",
		description: "Funil enxuto pra qualquer negócio que vende algo. 4 etapas, sem fricção.",
		stages: [
			{ name: "Novo lead", color: "#94a3b8", category: "NOT_STARTED", probability: 10, maxDays: null, position: 0 },
			{ name: "Em contato", color: "#3b82f6", category: "ACTIVE", probability: 40, maxDays: 7, position: 1 },
			{ name: "Ganho", color: "#22c55e", category: "WON", probability: 100, maxDays: null, position: 2 },
			{ name: "Perdido", color: "#ef4444", category: "LOST", probability: 0, maxDays: null, position: 3 },
		],
	},
	{
		name: "Clínica / Consultório",
		vertical: "clinica",
		description: "Funil de agendamento pra clínicas médicas, odontológicas, estéticas.",
		stages: [
			{ name: "Novo lead", color: "#94a3b8", category: "NOT_STARTED", probability: 10, maxDays: null, position: 0 },
			{ name: "Qualificação", color: "#3b82f6", category: "ACTIVE", probability: 30, maxDays: 3, position: 1 },
			{ name: "Avaliação agendada", color: "#a855f7", category: "SCHEDULED", probability: 60, maxDays: 14, position: 2 },
			{ name: "Tratamento proposto", color: "#f59e0b", category: "ACTIVE", probability: 75, maxDays: 30, position: 3 },
			{ name: "Fechado", color: "#22c55e", category: "WON", probability: 100, maxDays: null, position: 4 },
			{ name: "Não converteu", color: "#ef4444", category: "LOST", probability: 0, maxDays: null, position: 5 },
		],
	},
	{
		name: "E-commerce",
		vertical: "ecommerce",
		description: "Funil de recuperação de carrinho e upsell pós-venda.",
		stages: [
			{ name: "Carrinho abandonado", color: "#94a3b8", category: "NOT_STARTED", probability: 15, maxDays: 2, position: 0 },
			{ name: "Recuperação ativa", color: "#3b82f6", category: "ACTIVE", probability: 40, maxDays: 5, position: 1 },
			{ name: "Pagamento pendente", color: "#f59e0b", category: "SCHEDULED", probability: 75, maxDays: 2, position: 2 },
			{ name: "Comprado", color: "#22c55e", category: "WON", probability: 100, maxDays: null, position: 3 },
			{ name: "Abandonou", color: "#ef4444", category: "LOST", probability: 0, maxDays: null, position: 4 },
		],
	},
	{
		name: "Imobiliária",
		vertical: "imobiliaria",
		description: "Funil de qualificação + visita + proposta pra imóveis residenciais e comerciais.",
		stages: [
			{ name: "Novo lead", color: "#94a3b8", category: "NOT_STARTED", probability: 5, maxDays: null, position: 0 },
			{ name: "Qualificação", color: "#3b82f6", category: "ACTIVE", probability: 20, maxDays: 7, position: 1 },
			{ name: "Visita agendada", color: "#a855f7", category: "SCHEDULED", probability: 45, maxDays: 21, position: 2 },
			{ name: "Proposta enviada", color: "#f59e0b", category: "ACTIVE", probability: 65, maxDays: 30, position: 3 },
			{ name: "Negociação", color: "#ec4899", category: "ACTIVE", probability: 80, maxDays: 45, position: 4 },
			{ name: "Fechado", color: "#22c55e", category: "WON", probability: 100, maxDays: null, position: 5 },
			{ name: "Perdido", color: "#ef4444", category: "LOST", probability: 0, maxDays: null, position: 6 },
		],
	},
	{
		name: "Infoproduto / Mentoria",
		vertical: "infoproduto",
		description: "Funil de captação + aquecimento + venda pra lançamentos e mentorias.",
		stages: [
			{ name: "Lead do lançamento", color: "#94a3b8", category: "NOT_STARTED", probability: 8, maxDays: null, position: 0 },
			{ name: "Aquecimento", color: "#3b82f6", category: "ACTIVE", probability: 25, maxDays: 14, position: 1 },
			{ name: "Sessão estratégica", color: "#a855f7", category: "SCHEDULED", probability: 55, maxDays: 7, position: 2 },
			{ name: "Proposta apresentada", color: "#f59e0b", category: "ACTIVE", probability: 75, maxDays: 10, position: 3 },
			{ name: "Matriculado", color: "#22c55e", category: "WON", probability: 100, maxDays: null, position: 4 },
			{ name: "Não converteu", color: "#ef4444", category: "LOST", probability: 0, maxDays: null, position: 5 },
		],
	},
] as const;

async function main() {
	console.log(`[seed-templates] Inserting ${BUILT_IN_TEMPLATES.length} built-in templates`);
	for (const tpl of BUILT_IN_TEMPLATES) {
		const [existing] = (await db.execute(sql`
			SELECT id FROM status_template
			WHERE "isBuiltIn" = true AND vertical = ${tpl.vertical}
			LIMIT 1
		`)).rows as Array<{ id: string }>;

		if (existing) {
			console.log(`[seed-templates] SKIP ${tpl.vertical} (already exists: ${existing.id})`);
			continue;
		}

		const [inserted] = await db.insert(statusTemplate).values({
			organizationId: null,
			name: tpl.name,
			description: tpl.description,
			vertical: tpl.vertical,
			stages: tpl.stages as unknown as typeof statusTemplate.$inferInsert.stages,
			isBuiltIn: true,
			usageCount: 0,
			createdBy: null,
		}).returning();

		console.log(`[seed-templates] INSERT ${tpl.vertical} OK (${inserted.id})`);
	}
	console.log("[seed-templates] Done");
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
