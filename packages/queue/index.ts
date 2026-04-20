export {
	closeRedisConnection,
	defaultJobOptions,
	getRedisConnection,
} from "./src/config";
export {
	agentInvocationJobSchema,
	type AgentInvocationJob,
	ingestDocumentJobSchema,
	type IngestDocumentJob,
} from "./src/schemas";
export {
	AGENT_INVOCATION_QUEUE_NAME,
	closeAgentInvocationQueue,
	dispatchAgentInvocation,
	getAgentInvocationQueue,
} from "./src/queues/agent-invocation";
export {
	closeIngestDocumentQueue,
	dispatchIngestDocument,
	getIngestDocumentQueue,
	INGEST_DOCUMENT_QUEUE_NAME,
} from "./src/queues/ingest-document";
export { getQueueMetrics, type QueueMetrics } from "./src/telemetry";
// Re-export do tipo Queue pra consumidores (rotas health, etc) tiparem sem
// precisar declarar bullmq como dep direta. Type-only — zero impacto runtime.
export type { Queue } from "bullmq";
export {
	startAgentInvocationWorker,
	stopAgentInvocationWorker,
} from "./src/workers/agent-invocation";
export {
	startIngestDocumentWorker,
	stopIngestDocumentWorker,
} from "./src/workers/ingest-document";
export {
	clearOutboundSender,
	getOutboundSender,
	type OutboundSendInfo,
	type OutboundSender,
	registerOutboundSender,
} from "./src/outbound-sender";
