---
type: adr
id: ADR-005
title: "Dashboard Cache Strategy — In-Memory + Tag Invalidation"
project: vertech-agents
status: accepted
date: 2026-04-26
tags:
  - project/vertech-agents
  - adr
  - performance
  - wave-2
---

# ADR-005: Dashboard Cache Strategy — In-Memory + Tag Invalidation

## Status

Accepted (2026-04-26).

## Contexto

Bloco H — Dashboard v2 — Wave 2. 5 cards topo + métricas profundas (interesses, origem, temperatura, follow-up, campanhas). Cada métrica = agregação SQL (count/group by/sum). Filtro período "de até" varia.

Risco: dashboard abrir = ~10 queries pesadas. 50 usuários simultâneos no horário comercial = degradação de DB.

## Decisão

**Next.js `unstable_cache` com tags + invalidação via `revalidateTag` em mutations relevantes.**

### Pattern

```typescript
// packages/database/src/cache/dashboard.ts
import { unstable_cache } from "next/cache";

export const getDashboardLeadsCount = unstable_cache(
  async (orgId: string, from: Date, to: Date) => {
    return await db.select(...).from(lead)...;
  },
  ["dashboard-leads-count"],
  {
    tags: (orgId) => [`org:${orgId}`, `org:${orgId}:leads`],
    revalidate: 60, // 1 min TTL fallback
  }
);

// Invalidação após mutation:
await db.insert(lead).values(...);
revalidateTag(`org:${orgId}:leads`);
```

### Granularidade

- TTL fallback: 60s (refresh garantido mesmo sem invalidação)
- Tags por scope: `org:{id}`, `org:{id}:leads`, `org:{id}:conversations`, `org:{id}:campaigns`, `org:{id}:agenda`
- Mutation que afeta métrica = `revalidateTag` específico

### Filtro período

- Cache key inclui `from` + `to` (ISO truncado pro dia → "2026-04-01_2026-04-30")
- Períodos comuns (hoje, 7d, 30d, mês) cacheáveis. Período custom (range específico) ainda cacheia mas hit rate menor.

## Alternativas rejeitadas

### A. Materialized views Postgres
**Rejeitado MVP.** Refresh agendado (cron job DB) não casa com filtro período dinâmico ("últimos 30 dias" varia diariamente). Materialized view fixa = perde flexibilidade do "de até".

### B. Redis cache externo
**Rejeitado MVP.** Já temos Redis (BullMQ). Mas Next.js `unstable_cache` é stable o suficiente pra MVP (Edge runtime support, integração nativa). Adicionar layer Redis = sync de invalidação custosa. Considerar pós V3 quando rodando em multi-instance.

### C. SWR no client
**Rejeitado.** Cache no client não reduz load no DB (1 user 5 abas = 5 queries). Server-side cache reduz na fonte.

### D. Sem cache (queries diretas)
**Rejeitado.** Queries de agregação em tabelas grandes (lead, message, conversation com 100k+ rows) = lento. Mesmo com índices, 10 queries/abertura × 50 users = problema.

## Performance esperada

| Cenário | Sem cache | Com cache (hit) | Com cache (miss) |
|---|---|---|---|
| Abertura dashboard (1 user) | ~800ms (10 queries × 80ms) | ~50ms | ~800ms |
| 50 users simultâneos | DB stress | DB tranquilo | DB stress (1 vez) |
| Hit rate esperado | — | 70-85% (operação normal) | — |

## Consequências

### Positivas
- Sem dependência nova
- Invalidação cirúrgica (lead criado não invalida cache de campanhas)
- Edge-compatible (Vercel-style edge functions, se migrar)

### Negativas
- Cache local por instance Next. Multi-instance Coolify = caches duplicados.
  - **Mitigação V3:** quando escalar pra >1 instance, migrar pra Redis cache (já temos).
- Esquecer `revalidateTag` em mutation = stale data até TTL.
  - **Mitigação:** wrapper `mutateLead`/`mutateConversation` que invalida tags relevantes. `@qa` cobra em review.

## Implementação

| Componente | Owner | Story |
|---|---|---|
| Helpers cache em `packages/database/src/cache/dashboard.ts` | @data-engineer | H.2 |
| Wrappers mutation com `revalidateTag` | @dev | H.2 |
| Server actions dashboard com cache | @dev | H.2 |
| Documentar tags em `tech-debt-register.md` | @architect | H.2 |

## Refs

- Next.js unstable_cache: https://nextjs.org/docs/app/api-reference/functions/unstable_cache
- revalidateTag: https://nextjs.org/docs/app/api-reference/functions/revalidateTag
