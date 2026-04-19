# @repo/health

Contrato uniforme + helpers para health checks de qualquer componente da aplicacao.

## Contexto

Criado na **Phase 07A** (story 07A.4) como parte da estrategia de observabilidade distribuida. Cada phase que cria infra (queue, Mastra, RAG, etc) expoe um endpoint `/api/admin/health/{componente}` que retorna um `HealthCheckResult` uniforme. O **Health Tech Dashboard** (Phase 10c) consolida tudo numa UI.

## Contrato

```typescript
type HealthCheckResult = {
  component: string;
  status: "healthy" | "degraded" | "unhealthy";
  metrics: Record<string, number | string>;
  alerts: Array<{ severity: "warning" | "critical"; message: string; since?: string }>;
  timestamp: string; // ISO
};
```

## Uso

### Definir um health check novo

```typescript
import { defineHealthCheck } from "@repo/health";

export const checkMyService = defineHealthCheck(
  "my-service",
  async () => ({
    status: "healthy",
    metrics: { latencyMs: 42, activeConnections: 3 },
    alerts: [],
  }),
);

// O wrapper preenche `component: "my-service"` e `timestamp` automaticamente.
// Exceptions viram `unhealthy` com alert critical — nunca propagam pro endpoint.
```

### Consumir checkers existentes

```typescript
import { checkRedis, checkDatabase } from "@repo/health";

const redis = await checkRedis();
const db = await checkDatabase();
```

### Agregar status de multiplos componentes

```typescript
import { aggregateStatus } from "@repo/health";

const overall = aggregateStatus([redis.status, db.status]);
// unhealthy > degraded > healthy
```

## Checkers incluidos

| Componente | Export | Cobertura |
|---|---|---|
| Redis | `checkRedis` | PING latency, memory, clients, commands/s, dbsize |
| Postgres | `checkDatabase` | SELECT 1 latency, active connections, pool stats |

## Checkers vindouros

- `checkMastra` (Phase 07A.7) — active conversations, storage connected, last invocation
- `checkLLMProviders` (Phase 07 geral) — OpenAI/Anthropic latency, rate limit, custo
- `checkRAG` (Phase 08) — pgvector, ingest queue
- `checkWhatsApp` (Phase 07A.7, reusar de Phase 06)

## Boundary rule

`@repo/health` pode depender de `@repo/queue` (pra reusar `getRedisConnection()`), mas **NAO** importa de `@repo/ai`, `@repo/database` direto, ou `@repo/whatsapp`. Checkers especificos desses componentes vivem no mesmo package do componente OU neste package em `src/components/`, conforme ficar mais logico.
