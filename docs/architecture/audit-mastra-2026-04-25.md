---
type: guide
title: "Auditoria Mastra v1.28 — Vertech Agents (M1+M2)"
project: vertech-agents
tags: [project/vertech-agents, audit, mastra, vision-v3]
date: 2026-04-25
status: completo
---

# Auditoria Mastra v1.28 — Vertech Agents (M1+M2)

## 1. Sumário Executivo

Score geral do módulo IA: **7.0 / 10**.

A arquitetura está bem pensada para multi-tenant e o roadmap V3 (Atendente Supervisor, Memory observational, scorers, sandbox) está fielmente refletido no código. Lazy init em todas as factories, separação `instance.ts` ↔ `mastra-runtime/index.ts` e isolamento de registries por agente (Architect vs Commercial) são canônicos. Memory do Atendente está com config muito próxima do recomendado oficial (working memory + semantic recall escopo `resource` + observational).

**Dois pontos críticos** poluem a base e merecem refactor antes de M2-03 (Analista):

1. **`AsyncLocalStorage` (ALS) como workaround de `requestContext`** — segundo docs oficiais (`docs/src/content/en/docs/server/request-context.mdx` e `mcp-server.mdx`), Mastra v1.28 **já propaga** `requestContext` automaticamente para tools via `context.requestContext`. O ALS no `runtime/context-store.ts` provavelmente foi adicionado pra contornar **outro bug** (ex: tools resolvidas via callback dinâmico não estavam recebendo `context` populado, ou o `agent.stream` não foi passando contexto pra tools que executam fora do step do LLM). É **gambiarra parcial**: funciona, mas duplica fonte de verdade e cria risco de drift entre `context.requestContext.get()` (oficial) e `getAtendenteCtx()` (custom).

2. **Scorers como funções TS puras** — comentário no código diz que `createScorer` "não está exposto na 1.28". O package `@mastra/core@1.28` na realidade expõe scorers via subpath (`@mastra/core/scores`), e a API estável atual usa **`createScorer` do pacote `@mastra/evals` ou `@mastra/core/scores`**. É **gambiarra documentada** (com nota técnica honesta), mas precisa ser refatorada antes do Studio puxar resultados.

**Riscos arquiteturais não óbvios:** singleton `mastraInstance` + `Memory` singleton com `vector: getPgVector()` compartilhado entre threads pode vazar conexões PG sob carga BullMQ; `defaultOptions.maxSteps: 10` no agent + `maxSteps: 5` na call do sandbox cria **comportamento inconsistente** (o passado por chamada vence, mas é confuso); falta tratamento de `requestContext` no worker BullMQ que invoca via `agent.generate()` (esse caminho é OK porque passa `requestContext` direto, mas o ALS NÃO está envolvido nele — divergência entre route handler e worker).

## 2. Pontuação por área

| Área | Score | Justificativa |
|---|---|---|
| Agents (Commercial + Architect) | 8/10 | Lazy init, dynamic config por `requestContext`, descrições claras, supervisor stub correto |
| Tools (createTool signature) | 9/10 | Assinatura `(inputData, context)` está canônica desde v1, registry global em `instance.ts` é boa prática |
| Memory (working + semantic + observational) | 8/10 | Config quase 100% canônica, schema Zod no working memory está certo, mas falta GC config explícito |
| RAG (pgvector + embedder) | 7/10 | Singleton `getPgVector()` é OK, falta validar índice HNSW dotproduct vs cosine pra `text-embedding-3-small` (oficial recomenda cosine) |
| Workflows | N/A | Não usado ainda — M2-03+ vai introduzir |
| Scorers | 4/10 | Implementação correta funcionalmente, mas fora da API oficial — não pluga em `mastra.scorers` nem aparece no Studio |
| Datasets | 5/10 | Schemas Zod prontos mas `seed-cases` não chama API oficial `mastra.datasets.create()` — não persiste |
| Studio (mastra-runtime entrypoint) | 9/10 | Padrão `export const mastra = getMastra()` em arquivo dedicado é canônico |
| Multi-tenant (request context propagation) | 5/10 | Funciona via ALS workaround mas duplica fonte de verdade com pattern oficial |
| Workers BullMQ (agent-invocation) | 7/10 | Passa `requestContext` direto pro `agent.generate()` (correto), mas NÃO usa ALS — divergência semântica vs route handler |

## 3. Inventário de Desvios

| ID | Arquivo:linha | Pattern atual | Pattern oficial | Classificação | Severidade | Impacto | Ação |
|---|---|---|---|---|---|---|---|
| G1 | `runtime/context-store.ts:25-33` | ALS global `als = new AsyncLocalStorage` + `runWithAtendenteCtx` wrapper | `context.requestContext.get('key')` dentro do `execute` da tool. Fonte: https://mastra.ai/docs/server/request-context | **gambiarra** | high | Duplica fonte de verdade; tools podem ler valor stale do ALS quando `RequestContext` foi atualizado. Risco em concurrency BullMQ. | Refactor: remover ALS, ler tudo via `context.requestContext.get()`. Se algum bug específico justificou ALS, abrir issue no GitHub Mastra com repro. |
| G2 | `api/agents/[agentId]/sandbox/chat/route.ts:75-91` | `runWithAtendenteCtx({...}, () => agent.stream(...))` envolvendo `agent.stream` | `agent.stream(prompt, { requestContext })` direto. Fonte: https://mastra.ai/docs/agents/dynamic-agents | **gambiarra** | high | Mesmo do G1; consequência é cada nova route precisar lembrar do wrapper. | Remover wrapper, deixar só `agent.stream(prompt, { requestContext: ctx })`. |
| G3 | `mastra/scorers/types.ts:22-27` | Interface custom `Scorer` com `score(run)` | `createScorer({...})` de `@mastra/core/scores` ou `@mastra/evals`. Fonte: https://mastra.ai/docs/observability/scorers | **gambiarra** | medium | Studio não vê; não roda em CI Mastra; não pluga em `mastra.scorers`. | Migrar pra `createScorer` oficial. Se subpath ainda não estável em 1.28, instalar `@mastra/evals`. |
| G4 | `mastra/instance.ts:33` | `tools: atendenteTools as never` no `new Mastra({...})` | `tools` no Mastra constructor é opcional pra Studio descobrir; OK manter, mas o `as never` é code smell | **aceitável** | low | Cast `as never` esconde mismatch de tipos. | Tipar corretamente: `tools: atendenteTools satisfies ToolsRegistry`. |
| G5 | `mastra/agents/commercial.ts:98-100` + `api/.../chat/route.ts:89` | `defaultOptions.maxSteps: 10` no Agent + `maxSteps: 5` na call | Definir em UM lugar só. Per-call vence, mas mistura confunde. Fonte: https://mastra.ai/docs/agents/overview | **bug semântico** | medium | Sandbox roda com 5, prod roda com 10 — comportamento inconsistente entre canais. | Padronizar: deixar só `defaultOptions.maxSteps` e remover `maxSteps` das chamadas, ou vice-versa. |
| G6 | `mastra/storage.ts:14-28` | Singleton `PostgresStore` com `connectionString: process.env.DATABASE_URL` | OK — mas falta `pool` config explícita. Default PgPool é 10 conns, BullMQ + Next pode exaurir. Fonte: https://mastra.ai/docs/server-db/storage | **monitorar** | medium | Sob carga (worker concurrency 5+ jobs) pode estourar pool default. | Adicionar `poolConfig: { max: 20 }` ou validar default da `@mastra/pg`. |
| G7 | `mastra/memory/config.ts:46-49` | `metric: "dotproduct"` para `text-embedding-3-small` | OpenAI embeddings são L2-normalized, dotproduct ≈ cosine, mas pattern Mastra é cosine. Fonte: https://mastra.ai/docs/rag/vector-store | **aceitável** | low | Resultados praticamente iguais. | Documentar a escolha (`dotproduct` é levemente mais barato em CPU) ou trocar pra `cosine` pra alinhar com docs. |
| G8 | `mastra/agents/commercial.ts:43,46` + `78-80` + `console.log` | `console.log` direto em hot path do agent | Usar `mastra.getLogger()` (Pino built-in) ou `pino` direto. Fonte: https://mastra.ai/docs/observability | **desatualizado** | low | Logs sem structured fields, sem level filter. | Trocar por `mastra.getLogger().info(...)` ou prefixar com `[debug]`. |
| G9 | `mastra/agents/architect.ts:55` | `tools: architectTools` (registry estático) | OK pra agent fixed (não multi-tenant). Canônico. Fonte: https://mastra.ai/docs/tools/overview | **canônico** | — | — | Manter. |
| G10 | `mastra/instance.ts:21-38` | `getMastra()` lazy + `mastraInstance` singleton | Padrão recomendado pra Next.js (evita re-init em hot reload). Fonte: https://mastra.ai/docs/getting-started/nextjs | **canônico** | — | — | Manter. |
| G11 | `mastra-runtime/index.ts:13-15` | `export const mastra = getMastra()` | Canônico — Studio precisa de top-level export sync. Fonte: https://mastra.ai/docs/server-db/deployment | **canônico** | — | — | Manter. |
| G12 | `runtime/invoker.ts:111-117` | `new RequestContext<Record<string,unknown>>([['agentId', agent.id], ...])` | API canônica de RequestContext aceita Map-like array no constructor. Fonte: typedef `@mastra/core/request-context` | **canônico** | — | — | Manter. |
| G13 | `runtime/invoker.ts:126-133` | `commercial.generate(text, { maxSteps, requestContext, memory })` SEM ALS wrapper | É o jeito CERTO. Confirma que ALS no sandbox é redundante. | **canônico** | — | — | Use como referência pra remover G1+G2. |
| G14 | `mastra/agents/commercial.ts:94` | `agents: getTeamMembers()` retornando `{}` em M1 | Canônico — Mastra aceita Record vazio pra Supervisor stub. Fonte: https://mastra.ai/docs/agents/supervisor-agents | **canônico** | — | — | Manter; popular em M2-03+. |
| G15 | `mastra/memory/config.ts:53-56` | `workingMemory: { enabled: true, schema: leadProfileSchema }` (Zod) | Canônico — Memory aceita Zod schema direto. Fonte: https://mastra.ai/docs/memory/working-memory | **canônico** | — | — | Manter. |
| G16 | `package.json:7-9` | `@mastra/core: ^1.28.0`, `@mastra/memory: ^1.17.1`, `@mastra/pg: ^1.9.2` | OK — versões atuais estáveis 2026. `mastra` CLI 1.6.3 está desatualizado. | **desatualizado** | low | Studio em versão antiga pode não mostrar features novas. | `pnpm add -D mastra@latest` no `packages/ai`. |

## 4. Plano de Refactor Priorizado

### Refactor 1 (CRÍTICO): Eliminar ALS, usar `context.requestContext` oficial

- **Justificativa:** Remove gambiarra, alinha com docs Mastra, simplifica novas routes, elimina divergência semântica entre sandbox (com ALS) e worker BullMQ (sem ALS).
- **Arquivos afetados:** `runtime/context-store.ts` (deletar), `api/agents/[agentId]/sandbox/chat/route.ts` (remover wrapper), todas as tools que chamam `getAtendenteCtx()` (substituir por `context.requestContext.get()`).
- **Esforço:** M (médio — precisa achar todos os call-sites em `tools/atendente/`).
- **Risco regressão:** med — testar sandbox antes de merge.
- **Como testar:** rodar sandbox, verificar `console.log` da tool mostra `organizationId` correto. Rodar worker BullMQ (mensagem WhatsApp simulada) e validar mesma cadeia.

### Refactor 2 (CRÍTICO): Migrar scorers pra API oficial

- **Justificativa:** Plugar no Studio + datasets + experiments oficial.
- **Arquivos afetados:** `mastra/scorers/*.ts` (refator), `mastra/instance.ts` (adicionar `scorers: { qualificacao, tone, promessaIndevida }`).
- **Esforço:** M.
- **Risco regressão:** baixo — interface `score(run)` mapeia 1:1 pra `createScorer`.
- **Como testar:** abrir Studio local, ver scorers listados; rodar `mastra dev` e disparar evaluation contra dataset seed.

### Refactor 3 (MEDIUM): Padronizar `maxSteps`

- **Justificativa:** Comportamento determinístico entre canais.
- **Arquivos:** `commercial.ts` (`defaultOptions.maxSteps`), todas as routes (`maxSteps`).
- **Esforço:** S.
- **Risco:** baixo.
- **Como testar:** invocar agent via sandbox e via worker, contar steps no metadata.

### Refactor 4 (MEDIUM): Persistir datasets oficiais via `mastra.datasets.create()`

- **Justificativa:** Habilita experiments + regression testing CI.
- **Arquivos:** `mastra/datasets/atendente-seed-cases.ts` + script de seed.
- **Esforço:** M.
- **Risco:** baixo.

### Refactor 5 (LOW): PoolConfig explícito + structured logging

- **Justificativa:** Robustez sob carga (Vinni quer escala dia 1).
- **Arquivos:** `storage.ts`, todos os `console.log`.
- **Esforço:** S.

## 5. Análise dos 4 Fixes Desta Sessão

| Fix | Era gambiarra? | Pattern oficial existe? | Refactor recomendado? |
|---|---|---|---|
| `runtimeContext → requestContext` | NÃO | SIM. v1 migration guide explícito (`docs/src/content/en/guides/migrations/upgrade-to-v1/tools.mdx`): renomeação oficial em v1.0+. | NÃO — fix correto, pattern canônico. |
| `AsyncLocalStorage` no route handler | **SIM (parcial)** | SIM. Docs oficiais (`docs/src/content/en/docs/server/request-context.mdx`) mostram `context.requestContext.get('key')` dentro de tools — propagação automática. | **SIM** — Refactor 1 acima. ALS pode ser sintoma de outro bug; testar primeiro sem ALS, se falhar abrir issue Mastra com repro. |
| `execute(inputData, context)` posicional | NÃO | SIM. v1 migration guide mostra exatamente essa assinatura: `execute: async (inputData, context) => {...}`. | NÃO — fix correto. |
| `createScorer` substituído por funções TS | **SIM (documentada)** | SIM (parcial). `@mastra/core/scores` ou `@mastra/evals` expõe `createScorer`. Subpath pode estar em transição na 1.28. | **SIM** — Refactor 2 acima. Confirmar subpath no node_modules antes. |

## 6. Decisões a Documentar como ADR

- **ADR-XXX-1: Estratégia de propagação de contexto multi-tenant em Mastra** — decidir entre (a) confiar 100% em `context.requestContext` oficial, (b) manter ALS por compatibilidade. Recomendação: (a).
- **ADR-XXX-2: Estratégia de scorers — custom vs `@mastra/evals`** — quando migrar e quais scorers continuar code-based vs LLM-as-Judge.
- **ADR-XXX-3: PoolConfig do PostgresStore Mastra sob BullMQ** — definir `max` connections e validar contra concurrency do worker.
- **ADR-XXX-4: maxSteps por agente vs por chamada** — política única (recomendação: só `defaultOptions.maxSteps`).

## 7. Riscos não óbvios

1. **Hot reload + cache stale do `@repo/database`** — mencionado no contexto Obsidian. Mastra dev server importa `instance.ts` que importa `db`; se `packages/database/node_modules/.cache/*.mjs` ficar stale, queries de `loadAgentFromContext` quebram silenciosamente. **Mitigação:** adicionar `rm -rf packages/database/node_modules/.cache` ao script `dev` ou usar `--no-cache`.
2. **Memory leak em observational memory** — versões 1.4.x da `@mastra/memory` tiveram leak conhecido. Estamos em 1.17.1 — verificar changelog se foi resolvido. Monitorar RSS do worker BullMQ por 24h em prod.
3. **Race condition em `mastraInstance` singleton sob serverless** — Next.js no Coolify (Node container) é OK, mas se algum dia migrar pra Vercel Edge runtime, singleton quebra entre invocações. Documentar restrição.
4. **PgVector singleton compartilhado entre Memory do Architect e do Atendente** — se ambos chamarem em paralelo durante setup wizard, pode haver contenção de pool. Mesmo problema de G6.
5. **`agent.stream` em background BullMQ vs request-response** — worker usa `.generate()` (não-stream) e route usa `.stream()`. Ambos passam `requestContext`, mas o **memory thread/resource difere semanticamente** — `sandbox-{agentId}-{userId}` (sandbox) vs `conv-{conversationId}` (prod). Conversas de teste no sandbox NÃO contaminam working memory de prod (bom), mas se o usuário testar no sandbox e depois falar com lead real, contexto não migra. Pode ser intencional, mas merece doc.

## 8. Stack Adjacente (curto)

- **pgvector (`packages/ai/src/rag/pgvector.ts`):** singleton OK. Validar índice criado é HNSW e não IVFFlat.
- **BullMQ workers:** `agent-invocation.ts` está usando padrão correto (`generate()` async, retry policy via job options). Falta passar `traceId` no `requestContext` pra correlação com OpenTelemetry/Studio quando ativarmos.
- **Vercel AI SDK:** projeto usa `ai@4.3.16` direto no `useChat` do `SandboxClient.tsx`. Mastra v1.28 usa AI SDK internamente (compatível). Cuidado ao atualizar `ai` package — Mastra pode pin versão específica.
- **Drizzle:** integração correta — `loadAgentFromContext` usa `db.query.agent.findFirst`. Cache stale do build artefact é único risco real.

## 9. Roadmap de próximos passos do módulo IA

Antes de começar **M2-03 (Analista)** do `PROJECT-ROADMAP-V3.md`, fazer:

1. ✅ **Refactor 1 (eliminar ALS)** — ANTES de ter 2º agente, senão a gambiarra se multiplica.
2. ✅ **Refactor 3 (maxSteps único)** — fácil, faz agora.
3. ⏳ **Refactor 2 (scorers oficiais)** — prioritário pra Studio/CI mas pode ir em paralelo com M2-03.
4. ⏳ **Refactor 4 (datasets oficiais)** — depende de 2.
5. ⏳ **ADRs 1-4** — documentar decisões antes de complicar com Workflows (M3+).
6. ⚠️ **Investigar** se ALS foi colocado por causa de bug real (talvez tools resolvidas via callback dinâmico em `tools: async ({ requestContext })` perdem contexto). Repro mínimo + issue Mastra GitHub.

**Não começar Workflows (M3) sem ter Refactors 1+2+3 mergeados.** Workflows multiplicam superfície de propagação de contexto e a gambiarra ALS não escala.

---

**Fontes oficiais consultadas:**
- https://mastra.ai/docs/server/request-context
- https://mastra.ai/docs/agents/dynamic-agents
- https://mastra.ai/docs/agents/supervisor-agents
- https://mastra.ai/docs/memory/overview
- https://mastra.ai/docs/memory/working-memory
- https://mastra.ai/docs/observability/scorers
- https://mastra.ai/docs/server-db/storage
- https://mastra.ai/docs/server-db/deployment
- https://mastra.ai/docs/getting-started/nextjs
- https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/guides/migrations/upgrade-to-v1/tools.mdx
- https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/reference/tools/mcp-server.mdx
