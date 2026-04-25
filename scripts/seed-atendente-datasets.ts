/**
 * Seed dos datasets do Atendente no Mastra Studio (Roadmap V3 M1-04).
 *
 * Cria 3 datasets (sdr / closer / pos-venda) com 2 cases seed cada.
 * Vinni adiciona conversas reais via Studio UI ao longo do tempo (meta: 30+ por modo).
 *
 * Uso:
 *   1. Mastra Studio rodando local (`mastra dev` em packages/ai)
 *   2. Executar este script: `pnpm tsx scripts/seed-atendente-datasets.ts`
 *
 * Idempotente: se dataset já existe, pula criação. Items são adicionados
 * sempre (Mastra suporta versionamento — cada execução cria nova versão).
 */
import { getMastra } from "../packages/ai/src/mastra/instance";
import {
	atendenteGroundTruthSchema,
	atendenteInputSchema,
	ATENDENTE_DATASET_NAMES,
	type AtendenteMode,
} from "../packages/ai/src/mastra/datasets/atendente-schemas";
import { ATENDENTE_SEED_CASES } from "../packages/ai/src/mastra/datasets/atendente-seed-cases";

async function main() {
	const mastra = getMastra();
	const datasets = mastra.datasets;

	for (const mode of Object.keys(ATENDENTE_DATASET_NAMES) as AtendenteMode[]) {
		const name = ATENDENTE_DATASET_NAMES[mode];
		const cases = ATENDENTE_SEED_CASES[mode];

		console.log(`\n📦 Dataset: ${name} (${cases.length} cases)`);

		// Procura ou cria dataset
		const existing = await datasets.list();
		let dataset = existing.datasets.find((d) => d.name === name);

		if (!dataset) {
			console.log(`  → criando...`);
			dataset = await datasets.create({
				name,
				description: `Cases de avaliação do Atendente no modo ${mode}`,
				inputSchema: atendenteInputSchema,
				groundTruthSchema: atendenteGroundTruthSchema,
				metadata: {
					mode,
					source: "seed-atendente-datasets.ts",
					createdBy: "M1-04 Roadmap V3",
				},
			});
			console.log(`  ✓ criado: ${dataset.id}`);
		} else {
			console.log(`  ↪ já existe: ${dataset.id}`);
		}

		// Adiciona cases (cria nova versão)
		const items = await dataset.addItems({ items: cases });
		console.log(`  ✓ ${items.length} cases adicionados`);
	}

	console.log("\n✅ Seed completo. Verifique no Studio: http://localhost:4111/datasets");
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("❌ Seed falhou:", err);
		process.exit(1);
	});
