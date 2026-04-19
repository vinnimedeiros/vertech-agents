# CHANGELOG — Phase 07A (Mastra Core)

**Status:** Ready for humano gate
**Data:** 2026-04-19
**Branch:** main

## Objetivo da sub-phase

Entregar o **cérebro** do produto: agente comercial Mastra respondendo no WhatsApp de forma dinâmica por workspace, com memória persistida, fila durável de processamento, e observabilidade técnica pronta pra Phase 10c.

## Stories concluídas

| Story | Agente | Resultado |
|---|---|---|
| 07A.1 | `@analyst` (Atlas) | Dependências confirmadas via context7 + WebSearch. 4 divergências do design mapeadas. |
| 07A.2 | `@devops` (Operator) | Redis 7.4.8 em dev local via Docker Compose. Playbook Coolify documentado pra deploy futuro. |
| 07A.3 | `@data-engineer` (Tank) | Schema Drizzle: tabelas `agent` + `agent_version`, enum `MessageStatus` expandido (QUEUED, PROCESSING), FK `conversation.assignedAgentId`. RLS adiada (consistência com projeto). |
| — | `@architect` (Aria) | Validou 5 divergências arquiteturais. Stories 07A.4–07A.7 atualizadas. |
| 07A.4 | `@dev` (Neo) | Packages `@repo/queue` (BullMQ + ioredis) e `@repo/health` (contrato uniforme + checkers). |
| 07A.5 | `@dev` (Neo) | Mastra core: instance + agente comercial dinâmico + builder de instructions + 3 registries stub. |
| 07A.6 | `@dev` (Neo) | Runtime invoker + worker BullMQ + dispatch no webhook WhatsApp + instrumentation hook. |
| 07A.7 | `@dev` (Neo) | 4 health endpoints + superadmin guard + página `/admin/health` preview. |
| 07A.8 | `@dev` (Neo) + `@qa` (Oracle) | Seed scripts + quality gate + checklist humano. |

## Divergências do design original (aprovadas por @architect)

1. **BullMQ serialização**: `deduplication.keepLastIfActive` (OSS nativo) em vez de lock Redis manual ou BullMQ Pro groups
2. **Dashboard de filas**: QueueDash proposto (substituindo Bull-Board incompatível com App Router) — adiado pra quando UI de filas for necessária
3. **Memory API**: `semanticRecall` + `workingMemory` em vez de `observationalMemory` (obsoleto na API atual)
4. **Storage class**: `PostgresStore` do `@mastra/pg` confirmada (não `PgStore`)
5. **RLS**: Adiada pra Security Audit futuro — projeto não usa RLS em nenhuma tabela hoje, seguir padrão

## Arquivos criados

### Packages novos
- `packages/queue/` — BullMQ wrappers, queue tipada, worker, outbound sender registry
- `packages/health/` — Contrato + helpers + checkers Redis/Database

### Novos arquivos em packages existentes
- `packages/ai/src/mastra/` — Mastra instance, agente dinâmico, builder de instructions, invoker
- `packages/database/drizzle/schema/agents.ts` — schema Drizzle
- `packages/database/drizzle/migrations/0014_broken_wind_dancer.sql` — migration schema
- `packages/database/seeds/` — 3 scripts de seed/teste manual
- `packages/whatsapp/src/message-handler.ts` — modificado pra dispatch

### Apps
- `apps/web/app/api/admin/health/{queue,mastra,redis,database}/route.ts` — 4 endpoints
- `apps/web/app/(admin)/admin/health/page.tsx` — preview UI
- `apps/web/modules/saas/auth/lib/superadmin-guard.ts` — guard pra rotas admin
- `apps/web/instrumentation.ts` — registra OutboundSender + inicia worker inline em dev

### Infra
- `docker-compose.dev.yml` — Redis dev local
- `.env.local.example` + `.env.local` — REDIS_URL, MASTRA_STUDIO_ENABLED

### Docs
- `docs/superpowers/specs/2026-04-19-phase-07-mastra-design.md` — design spec consolidado
- `docs/stories/phase-07/` — 8 stories + README
- `docs/phase-07/dependencies-confirmed.md` — dossiê Atlas
- `docs/phase-07/07a-schema-notes.md` — notas schema Tank
- `docs/phase-07/gate-07a-manual-checklist.md` — checklist pro Vinni
- `docs/infrastructure/redis.md` — playbook dev + Coolify
- `CHANGELOG-phase-07a.md` — este arquivo

## Métricas de qualidade

- ✅ **Typecheck** limpo em `@repo/ai`, `@repo/queue`, `@repo/health`, `@repo/database`, `@repo/whatsapp`, `@repo/web`
- ✅ **Tests** 30/30 passing
- ⏳ **Pnpm build** — não executado como gate (heavy); `@dev` recomenda rodar antes de push
- ⏳ **CodeRabbit** — não executado; recomendação: rodar antes do push

## Gate humano pendente

Vinni precisa seguir `docs/phase-07/gate-07a-manual-checklist.md` e validar fluxo end-to-end no celular pessoal.

Após aprovação:
1. `@sm` (Niobe) cria stories de **07B** (UI essencial — 6 abas)
2. Sub-phase 07B inicia

## Pendências conhecidas (nao-bloqueantes)

- **QueueDash integration**: adiado pra quando UI visual de filas for necessária (endpoint de queue já expõe métricas)
- **RLS em `agent`/`agent_version`**: parte do Security Audit futuro
- **Health Tech Dashboard consolidado**: Phase 10c
- **Studio Mastra (`mastra dev`) em UI**: roda standalone em `localhost:4111` em dev, controlado por `MASTRA_STUDIO_ENABLED` env

## Próximos passos imediatos

1. Vinni roda `docs/phase-07/gate-07a-manual-checklist.md`
2. Se aprovado, `@devops` faz push (`@devops *push`)
3. `@sm` cria stories 07B
