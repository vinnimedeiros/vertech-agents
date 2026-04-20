/**
 * Smoke tests dos extractors — sem framework de teste.
 *
 * Roda com: `cd packages/ai && npx tsx src/rag/__tests__/extractors.smoke.ts`
 *
 * O projeto Vertech nao tem vitest/jest configurado (pattern 07A: tests so em
 * helpers criticos). Pra validar os extractors, este script exercita o happy
 * path de cada tipo com fixtures locais + prints de resultado.
 *
 * Em caso de falha, o processo retorna exit code 1 e o gate humano Vinni deve
 * inspecionar. Em sucesso, imprime OK e exit 0.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ExtractorError } from "../errors";
import { extractText } from "../extractors";
import { extractCsv } from "../extractors/csv";
import { extractTxt } from "../extractors/txt";

const FIXTURES = resolve(__dirname, "fixtures");

type Result = { name: string; passed: boolean; message?: string };

const results: Result[] = [];

function assert(name: string, condition: boolean, details?: string): void {
	results.push({
		name,
		passed: condition,
		message: condition ? undefined : (details ?? "assertion failed"),
	});
}

async function testTxt() {
	const buffer = readFileSync(resolve(FIXTURES, "sample.txt"));
	const text = await extractTxt(buffer);
	assert("extractTxt retorna string nao-vazia", text.length > 0);
	assert("extractTxt inclui nome da clinica", text.includes("Sorriso"));
	assert("extractTxt normaliza CRLF", !text.includes("\r\n"));
}

async function testCsv() {
	const buffer = readFileSync(resolve(FIXTURES, "sample.csv"));
	const text = await extractCsv(buffer);
	assert("extractCsv retorna string nao-vazia", text.length > 0);
	assert(
		"extractCsv estrutura em pares campo:valor",
		text.includes("nome: Kit Clareamento A") &&
			text.includes("preco: R$ 450"),
	);
	assert(
		"extractCsv separa registros por newline",
		text.split("\n").length === 4,
	);
}

async function testDispatcher() {
	const buffer = readFileSync(resolve(FIXTURES, "sample.txt"));
	const viaDispatcher = await extractText("txt", buffer);
	const direto = await extractTxt(buffer);
	assert(
		"dispatcher retorna mesmo resultado do extractor direto",
		viaDispatcher === direto,
	);
}

async function testErrorEmpty() {
	try {
		await extractTxt(Buffer.alloc(0));
		assert(
			"extractTxt lanca ExtractorError em buffer vazio",
			false,
			"nao lancou",
		);
	} catch (err) {
		assert(
			"extractTxt lanca ExtractorError em buffer vazio",
			err instanceof ExtractorError && err.code === "EMPTY_CONTENT",
		);
	}
}

async function testDispatcherWrongSource() {
	try {
		// url espera string, passando Buffer
		await extractText("url", Buffer.from("oi"));
		assert("dispatcher URL rejeita Buffer", false, "nao lancou");
	} catch (err) {
		assert(
			"dispatcher URL rejeita Buffer",
			err instanceof ExtractorError &&
				err.code === "UNSUPPORTED_FILE_TYPE",
		);
	}
}

async function main() {
	console.log("🧪 Smoke test: RAG extractors\n");

	await testTxt();
	await testCsv();
	await testDispatcher();
	await testErrorEmpty();
	await testDispatcherWrongSource();

	let passed = 0;
	let failed = 0;
	for (const r of results) {
		const icon = r.passed ? "✅" : "❌";
		console.log(`  ${icon} ${r.name}${r.message ? ` — ${r.message}` : ""}`);
		if (r.passed) {
			passed++;
		} else {
			failed++;
		}
	}

	console.log(
		`\n📊 ${passed} passaram, ${failed} falharam de ${results.length}\n`,
	);

	if (failed > 0) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("❌ Smoke test explodiu:", err);
	process.exit(1);
});
