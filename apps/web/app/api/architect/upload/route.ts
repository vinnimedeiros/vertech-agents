import { createId } from "@repo/database";
import {
	ARCHITECT_UPLOAD_LIMIT,
	checkRateLimit,
} from "@saas/agents/architect/lib/rate-limit";
import {
	MAX_ATTACHMENTS_PER_REQUEST,
	UploadError,
	buildStoragePath,
	persistUploadAndEnqueue,
	requireSessionOwnership,
	uploadToStorage,
	validateFile,
} from "@saas/agents/architect/lib/upload-helpers";
import { getSession } from "@saas/auth/lib/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/architect/upload (story 08A.4)
 *
 * Multipart form-data:
 * - `sessionId`: string (uuid da agent_creation_session em DRAFT)
 * - `file`: File | File[] (até MAX_ATTACHMENTS_PER_REQUEST arquivos)
 *
 * Fluxo:
 * 1. Auth (better-auth session)
 * 2. Rate limit 10/60s por user
 * 3. Validar sessionId ownership
 * 4. Pra cada file: validar tipo/tamanho, gerar documentId, upload pro bucket,
 *    insert knowledge_document PENDING, enfileirar job ingest-document
 * 5. Retorna array com documento por arquivo
 *
 * Files processados em paralelo via Promise.allSettled — um falhar não
 * derruba o lote; erros individuais vêm no response com `error` code.
 */
export async function POST(req: Request) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return NextResponse.json(
				{ error: "UNAUTHENTICATED" },
				{ status: 401 },
			);
		}

		const rate = await checkRateLimit(
			session.user.id,
			ARCHITECT_UPLOAD_LIMIT,
		);
		if (!rate.allowed) {
			return NextResponse.json(
				{ error: "RATE_LIMITED", retryAfter: rate.retryAfter },
				{
					status: 429,
					headers: { "Retry-After": String(rate.retryAfter) },
				},
			);
		}

		const formData = await req.formData();
		const sessionId = formData.get("sessionId");
		if (typeof sessionId !== "string" || sessionId.length === 0) {
			return NextResponse.json(
				{ error: "MISSING_SESSION_ID" },
				{ status: 400 },
			);
		}

		const files = formData
			.getAll("file")
			.filter((f): f is File => f instanceof File);
		if (files.length === 0) {
			return NextResponse.json({ error: "NO_FILES" }, { status: 400 });
		}
		if (files.length > MAX_ATTACHMENTS_PER_REQUEST) {
			return NextResponse.json(
				{
					error: "TOO_MANY_ATTACHMENTS",
					message: `Máximo de ${MAX_ATTACHMENTS_PER_REQUEST} arquivos por request.`,
				},
				{ status: 400 },
			);
		}

		const { organizationId } = await requireSessionOwnership(
			sessionId,
			session.user.id,
		);

		const results = await Promise.allSettled(
			files.map((file) =>
				processOneFile({ file, sessionId, organizationId }),
			),
		);

		const documents: Array<{
			ok: true;
			id: string;
			fileName: string;
			fileType: string;
			fileSize: number;
			status: "PENDING";
		}> = [];
		const errors: Array<{
			ok: false;
			fileName: string;
			error: string;
			message: string;
		}> = [];

		results.forEach((r, idx) => {
			const file = files[idx];
			const fileName = file?.name ?? "unknown";
			if (r.status === "fulfilled") {
				documents.push({
					ok: true,
					id: r.value.id,
					fileName: r.value.title,
					fileType: r.value.fileType,
					fileSize: r.value.fileSize,
					status: r.value.status,
				});
			} else {
				const err = r.reason;
				if (err instanceof UploadError) {
					errors.push({
						ok: false,
						fileName,
						error: err.code,
						message: err.message,
					});
				} else {
					errors.push({
						ok: false,
						fileName,
						error: "UNKNOWN",
						message:
							err instanceof Error ? err.message : String(err),
					});
				}
			}
		});

		return NextResponse.json({ documents, errors });
	} catch (err) {
		if (err instanceof UploadError) {
			return NextResponse.json(
				{ error: err.code, message: err.message, details: err.details },
				{ status: err.status },
			);
		}
		console.error("[architect/upload] fatal", err);
		return NextResponse.json(
			{
				error: "INTERNAL",
				message: err instanceof Error ? err.message : "?",
			},
			{ status: 500 },
		);
	}
}

async function processOneFile({
	file,
	sessionId,
	organizationId,
}: {
	file: File;
	sessionId: string;
	organizationId: string;
}) {
	const { fileType } = validateFile(file);
	const documentId = createId();
	const storagePath = buildStoragePath(
		organizationId,
		sessionId,
		documentId,
		file.name,
	);
	const buffer = Buffer.from(await file.arrayBuffer());

	await uploadToStorage(storagePath, buffer, file.type);

	return persistUploadAndEnqueue({
		organizationId,
		sessionId,
		documentId,
		title: file.name,
		fileUrl: storagePath,
		fileType,
		fileSize: file.size,
	});
}
