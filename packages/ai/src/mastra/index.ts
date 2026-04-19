/**
 * API publica do subsistema Mastra.
 *
 * Consumido por:
 * - packages/queue worker (07A.6) — invokeAgentForMessage
 * - apps/web health endpoints (07A.7) — getMastra para trace/metrics
 */

export { getCommercialAgent } from "./agents/commercial";
export { getCommercialAgentMemory } from "./memory/config";
export { getMastra } from "./instance";
export { getMastraStorage } from "./storage";
export { buildInstructions } from "./instructions/builder";
export type { AgentForInstructions } from "./instructions/builder";
export {
	invokeAgentForMessage,
	type InvokeAgentForMessageInput,
	type InvokeAgentResult,
} from "./runtime/invoker";
export {
	architectTools,
	type ArchitectToolKey,
} from "./tools/architect";
export {
	commercialTools,
	type CommercialToolKey,
} from "./tools/commercial";
export {
	orchestratorTools,
	type OrchestratorToolKey,
} from "./tools/orchestrator";
