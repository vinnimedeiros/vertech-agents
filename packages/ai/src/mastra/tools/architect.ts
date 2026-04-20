/**
 * Registry `architectTools` — 8 tools exclusivas do Agente Arquiteto (ADR-001).
 *
 * Consumido pelo Agent Arquiteto (story 09.5) via `tools: architectTools` no
 * `new Agent({ ... })`. Isolamento: ADR-001 proíbe este registry em agentes
 * Comercial ou Orquestrador.
 *
 * Todas as tools compartilham o mesmo contract de retorno discriminado por
 * `success`. Erros são estruturados via `ArchitectToolError` — o LLM lê o
 * campo `error` e decide corrigir-e-retentar vs escalar ao usuário.
 *
 * Dependências de runtime context (populadas pelo Agent em 09.5):
 * - `sessionId`: id da agent_creation_session ativa
 * - `userId`: id do usuário logado (auditoria)
 * - `organizationId`: id da org (tenant isolation)
 * - `workingMemory`: shape ArchitectWorkingMemory completo (ver helpers.ts)
 */
import { acknowledgeUpload } from "./architect/acknowledge-upload";
import { approveArtifact } from "./architect/approve-artifact";
import { generateArtifact } from "./architect/generate-artifact";
import { getDocumentKnowledge } from "./architect/get-document-knowledge";
import { publishAgentFromSession } from "./architect/publish-agent";
import { refineArtifact } from "./architect/refine-artifact";
import { searchChunks } from "./architect/search-chunks";
import { updateAgentStructurally } from "./architect/update-agent-structurally";

export { acknowledgeUpload } from "./architect/acknowledge-upload";
export { approveArtifact } from "./architect/approve-artifact";
export { generateArtifact } from "./architect/generate-artifact";
export { getDocumentKnowledge } from "./architect/get-document-knowledge";
export { publishAgentFromSession } from "./architect/publish-agent";
export { refineArtifact } from "./architect/refine-artifact";
export { searchChunks } from "./architect/search-chunks";
export { updateAgentStructurally } from "./architect/update-agent-structurally";

export {
	ArchitectToolError,
	type ArchitectErrorCode,
	type ArchitectToolFailure,
} from "./architect/errors";

export type {
	ArchitectWorkingMemory,
	ArchitectStage,
	ArtifactTypeInput,
	Capability,
	ChecklistValidationError,
	FieldDiff,
} from "./architect/helpers";

export const architectTools = {
	acknowledgeUpload,
	generateArtifact,
	refineArtifact,
	approveArtifact,
	searchChunks,
	getDocumentKnowledge,
	publishAgentFromSession,
	updateAgentStructurally,
} as const;

export type ArchitectToolKey = keyof typeof architectTools;
