/**
 * API publica do subsistema Mastra.
 *
 * Consumido por:
 * - packages/queue worker (07A.6) — invokeAgentForMessage
 * - apps/web health endpoints (07A.7) — getMastra para trace/metrics
 */

export { RequestContext } from "@mastra/core/request-context";
export {
	getAtendenteCtx,
	runWithAtendenteCtx,
	type AtendenteCtx,
} from "./runtime/context-store";
export { getArchitectAgent } from "./agents/architect";
export { getCommercialAgent } from "./agents/commercial";
export {
	getTeamMembers,
	TEAM_MEMBER_IDS,
	type TeamMemberId,
} from "./agents/team-members";
export { getArchitectAgentMemory } from "./memory/architect";
export { getCommercialAgentMemory } from "./memory/config";
export {
	leadProfileSchema,
	type LeadProfile,
} from "./memory/working-memory-schema";
export {
	ATENDENTE_DATASET_NAMES,
	atendenteGroundTruthSchema,
	atendenteInputSchema,
	type AtendenteGroundTruth,
	type AtendenteInput,
	type AtendenteMode,
} from "./datasets/atendente-schemas";
export { ATENDENTE_SEED_CASES } from "./datasets/atendente-seed-cases";
export {
	promessaIndevidaScorer,
	qualificacaoScorer,
	toneScorer,
} from "./scorers";
export {
	ATENDENTE_MODES,
	getAtendenteModeInstructions,
	inferModeFromStage,
} from "./instructions/atendente-modes";
export {
	atendenteTools,
	type AtendenteToolKey,
} from "./tools/atendente";
export { getArchitectWorkingMemory } from "./memory/architect-read";
export {
	getArchitectMessages,
	type ArchitectMessage,
} from "./memory/architect-messages";
export {
	extractArchitectArtifact,
	type ExtractorInput,
	type ExtractorMessage,
	type ExtractorResult,
} from "./extractors/architect-extractor";
export { getMastra } from "./instance";
export { getMastraStorage } from "./storage";
export { buildInstructions } from "./instructions/builder";
export type { AgentForInstructions } from "./instructions/builder";
export {
	buildArchitectInstructions,
	type ArchitectInstructionsContext,
	ARCHITECT_TEMPLATE_IDS,
} from "./instructions/architect";
export {
	ARCHITECT_TEMPLATE_REGISTRY,
	getArchitectTemplate,
	type ArchitectTemplate,
	type ArchitectTemplateId,
} from "./templates";
export {
	architectWorkingMemorySchema,
	type ArchitectWorkingMemorySchema,
} from "./types/architect-working-memory";
export {
	invokeAgentForMessage,
	type InvokeAgentForMessageInput,
	type InvokeAgentResult,
} from "./runtime/invoker";
export {
	architectTools,
	publishAgentFromSessionCore,
	type ArchitectToolKey,
	type PublishAgentCoreInput,
	type PublishAgentCoreResult,
} from "./tools/architect";
export {
	commercialTools,
	type CommercialToolKey,
} from "./tools/commercial";
export {
	orchestratorTools,
	type OrchestratorToolKey,
} from "./tools/orchestrator";

// Phase 07B: catalogo curado de modelos LLM. Pra uso em client components,
// importar diretamente de `@repo/ai/models` (browser-safe, sem dependencia
// server-only).
export {
	DEFAULT_MODEL_ID,
	findModel,
	getDefaultModelForProvider,
	getModelLabel,
	getModelsByProvider,
	getProviderFromModel,
	SUPPORTED_MODEL_IDS,
	SUPPORTED_MODELS,
	type SupportedModel,
	type SupportedModelProvider,
} from "./models";
