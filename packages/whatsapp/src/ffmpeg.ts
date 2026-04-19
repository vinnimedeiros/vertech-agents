import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

/**
 * Converte um áudio (URL ou Buffer) pra OGG Opus mono 48kHz — formato nativo
 * de voice note do WhatsApp. Sem essa conversão, a mensagem chega como
 * arquivo em vez de bolinha de áudio.
 *
 * **Requer `ffmpeg` instalado no sistema:**
 * - Dev (Windows): `winget install FFmpeg` ou `choco install ffmpeg`
 * - Docker prod: `RUN apt-get install -y ffmpeg` no Dockerfile
 */
export async function convertToOggOpus(input: string | Buffer): Promise<Buffer> {
	const id = randomUUID();
	const inputPath = join(tmpdir(), `${id}.in`);
	const outputPath = join(tmpdir(), `${id}.ogg`);

	let buffer: Buffer;
	if (typeof input === "string") {
		const response = await fetch(input);
		if (!response.ok) {
			throw new Error(`Falha ao baixar áudio (${response.status})`);
		}
		buffer = Buffer.from(await response.arrayBuffer());
	} else {
		buffer = input;
	}

	await writeFile(inputPath, buffer);

	await new Promise<void>((resolve, reject) => {
		const proc = spawn("ffmpeg", [
			"-i",
			inputPath,
			"-c:a",
			"libopus",
			"-b:a",
			"64k",
			"-vbr",
			"on",
			"-compression_level",
			"10",
			"-ar",
			"48000",
			"-ac",
			"1",
			"-y",
			outputPath,
		]);
		let stderr = "";
		proc.stderr?.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		proc.on("error", reject);
		proc.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-200)}`));
		});
	});

	const output = await readFile(outputPath);
	await Promise.all([
		unlink(inputPath).catch(() => {}),
		unlink(outputPath).catch(() => {}),
	]);
	return output;
}

/**
 * Verifica se ffmpeg está disponível no PATH. Útil pra expor health check.
 */
export async function isFfmpegAvailable(): Promise<boolean> {
	return await new Promise((resolve) => {
		const proc = spawn("ffmpeg", ["-version"]);
		proc.on("error", () => resolve(false));
		proc.on("close", (code) => resolve(code === 0));
	});
}
