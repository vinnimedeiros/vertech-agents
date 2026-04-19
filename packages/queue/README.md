# @repo/queue

Wrapper de BullMQ + Redis para processamento durable de jobs em background.

## Contexto

Criado na **Phase 07A** (story 07A.4) como infraestrutura horizontal. Usado pelo worker do agente comercial (07A.6) e consumivel por Phase 08 (follow-up dispatcher, RAG ingest).

## Uso

### Enfileirar uma invocacao do agente

```typescript
import { dispatchAgentInvocation } from "@repo/queue";

await dispatchAgentInvocation({
  messageId: "msg_123",
  conversationId: "conv_456",
  organizationId: "org_789",
});
```

### Ler metricas da fila (consumido por @repo/health)

```typescript
import { getAgentInvocationQueue, getQueueMetrics } from "@repo/queue";

const metrics = await getQueueMetrics(getAgentInvocationQueue());
// { waiting, active, completedLastHour, failedLastHour, dlqCount, oldestWaitingAgeSeconds }
```

## Patterns importantes

### Idempotencia

`dispatchAgentInvocation` usa `jobId = messageId`. Re-enfileirar o mesmo `messageId` e no-op — BullMQ dedupe automaticamente.

### Serializacao por conversa

Jobs com mesmo `deduplication.id` (formato `conv:{conversationId}`) sao serializados pelo BullMQ. Duas mensagens chegando na mesma conversa sao processadas em sequencia, sem lock manual.

### Retry policy default

```typescript
{
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
}
```

Customizar por job passando opcoes extras.

## Ambiente

Requer `REDIS_URL` configurada. Dev local: `redis://localhost:6379` (ver `docs/infrastructure/redis.md`).

## Nao incluido nesta phase

- Worker (implementado em 07A.6 → `src/workers/agent-invocation.ts`)
- Dashboard (QueueDash em 07A.7)
