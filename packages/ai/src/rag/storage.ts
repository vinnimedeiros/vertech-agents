import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { IngestError } from "./errors";

/**
 * Helper interno pra acessar Supabase Storage via service role.
 *
 * O projeto usa better-auth (nao Supabase Auth), entao RLS do Storage nao
 * reconhece o usuario logado. Usamos service_role aqui pra fazer download
 * de documentos que ja foram validados pelo upload endpoint (story 08A.4).
 *
 * O bucket `architect-uploads` e criado em 08A.4. Se nao existir, download
 * falha com erro claro.
 */

const BUCKET = "architect-uploads";

let clientCache: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient {
	if (clientCache) {
		return clientCache;
	}

	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !key) {
		throw new IngestError(
			"DOWNLOAD_FAILED",
			"Supabase nao configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
		);
	}

	clientCache = createClient(url, key, {
		auth: { persistSession: false },
	});
	return clientCache;
}

/**
 * Baixa um arquivo do bucket `architect-uploads` como Buffer.
 *
 * @param path Caminho completo no bucket (ex: `${orgId}/${sessionId}/${docId}/file.pdf`)
 * @throws {IngestError} Se bucket nao existe, path nao encontrado, ou download falha.
 */
export async function downloadFromStorage(path: string): Promise<Buffer> {
	const client = getStorageClient();

	const { data, error } = await client.storage.from(BUCKET).download(path);

	if (error) {
		throw new IngestError(
			"DOWNLOAD_FAILED",
			`Falha ao baixar ${path} do bucket ${BUCKET}: ${error.message}`,
			{ cause: error },
		);
	}

	if (!data) {
		throw new IngestError(
			"DOWNLOAD_FAILED",
			`Arquivo ${path} retornou vazio do bucket ${BUCKET}`,
		);
	}

	const arrayBuffer = await data.arrayBuffer();
	return Buffer.from(arrayBuffer);
}
