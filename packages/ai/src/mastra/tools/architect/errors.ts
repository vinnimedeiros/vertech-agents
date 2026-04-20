/**
 * Erros estruturados das architectTools (Phase 08-alpha, story 08A.3).
 *
 * LLM consumidor (Agente Arquiteto, story 09.5) usa o campo `error` pra
 * decidir corrigir-e-retentar ou escalar para o usuário. Mensagens em pt-BR
 * pra facilitar exibição inline se o Arquiteto repassar ao usuário.
 */

export type ArchitectErrorCode =
	| "DOCUMENT_NOT_FOUND"
	| "SESSION_NOT_FOUND"
	| "SESSION_EXPIRED"
	| "CHECKLIST_INCOMPLETE"
	| "ARTIFACT_NOT_FOUND"
	| "ARTIFACT_LOCKED"
	| "CONCURRENT_UPDATE"
	| "AGENT_NOT_FOUND"
	| "FORBIDDEN"
	| "INVALID_ARTIFACT_TYPE"
	| "MISSING_CONTEXT"
	| "PUBLISH_FAILED"
	| "NOT_IMPLEMENTED_YET";

export type ArchitectToolFailure = {
	success: false;
	error: ArchitectErrorCode;
	message: string;
	details?: unknown;
};

export class ArchitectToolError extends Error {
	constructor(
		public readonly code: ArchitectErrorCode,
		message: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "ArchitectToolError";
	}

	toFailure(): ArchitectToolFailure {
		return {
			success: false,
			error: this.code,
			message: this.message,
			details: this.details,
		};
	}
}

/**
 * Transforma qualquer throw em failure estruturado pra retorno da tool.
 * Usado no catch do execute() de cada architectTool.
 */
export function toFailure(err: unknown): ArchitectToolFailure {
	if (err instanceof ArchitectToolError) {
		return err.toFailure();
	}
	const message = err instanceof Error ? err.message : String(err);
	return {
		success: false,
		error: "PUBLISH_FAILED",
		message: `Erro inesperado: ${message}`,
	};
}
