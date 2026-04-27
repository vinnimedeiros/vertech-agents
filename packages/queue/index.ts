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
	googleCalendarSyncJobSchema,
	type GoogleCalendarSyncJob,
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
export {
	GOOGLE_CALENDAR_SYNC_QUEUE_NAME,
	closeGoogleCalendarSyncQueue,
	dispatchGoogleCalendarSync,
	getGoogleCalendarSyncQueue,
	scheduleGoogleCalendarSyncRepeatable,
} from "./src/queues/google-calendar-sync";
export {
	clearGoogleSyncRunner,
	getGoogleSyncRunner,
	registerGoogleSyncRunner,
	type GoogleSyncRunner,
	type GoogleSyncRunResult,
} from "./src/google-sync-runner";
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
	startGoogleCalendarSyncWorker,
	stopGoogleCalendarSyncWorker,
} from "./src/workers/google-calendar-sync";
export {
	clearOutboundSender,
	getOutboundSender,
	type OutboundSendInfo,
	type OutboundSender,
	registerOutboundSender,
} from "./src/outbound-sender";
