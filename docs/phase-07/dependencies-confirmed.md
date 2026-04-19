# Phase 07 — Dependências Confirmadas

> **Executado por:** `@analyst` (Atlas) em 2026-04-19
> **Story:** [07A.1](../stories/phase-07/07A.1.story.md)
> **Fontes:** context7 (packages oficiais) + Vercel AI Gateway + docs públicas
> **Próximo:** este documento destrava 07A.3 (schema usa default model), 07A.4 (packages), 07A.5 (Mastra), 07A.6 (worker)

## TL;DR — o que o `@dev` precisa saber

```bash
# Mastra core + memória + storage Postgres
pnpm --filter @repo/ai add @mastra/core @mastra/memory @mastra/pg

# BullMQ + Redis client
pnpm --filter @repo/queue add bullmq ioredis

# Dashboard de filas (alternativa ao Bull-Board — ver divergência #2 abaixo)
pnpm --filter @repo/web add @queuedash/ui @queuedash/api

# Diagrama hierárquico (Phase 07C)
pnpm --filter @repo/web add reactflow dagre

# AI SDK já existe no projeto; confirmar versão estável 5.x
pnpm --filter @repo/ai update ai @ai-sdk/openai @ai-sdk/anthropic
```

**Modelo default confirmado:** `openai/gpt-4.1-mini` ✓ (formato correto Vercel AI SDK)

---

## 1. Mastra — Framework de Agentes

| Item | Valor confirmado |
|---|---|
| Package core | `@mastra/core` |
| Package memória | `@mastra/memory` |
| Package storage Postgres | **`@mastra/pg`** ✓ (confirmado via docs oficial) |
| Context7 library ID | `/mastra-ai/mastra` (High reputation, 6127 snippets) |
| Docs fonte | [mastra.ai/docs/memory/storage](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/docs/memory/storage.mdx) |

### Classes exportadas por `@mastra/pg`

**Observação:** os exemplos oficiais usam **dois nomes** para a classe de storage Postgres:
- `PostgresStore` (docs principais)
- `PgStore` (reference/memory-class.mdx)

Provavelmente são aliases ou renomeação recente. O `@dev` deve confirmar no `package.json` atual qual está exportado no momento da instalação — usar o que o TypeScript reconhecer. Exemplo canônico:

```typescript
import { PostgresStore, PgVector } from '@mastra/pg';

new PostgresStore({
  id: 'agent-storage',
  connectionString: process.env.DATABASE_URL!,
});
```

### Memory API confirmada

```typescript
import { Memory } from '@mastra/memory';
import { PostgresStore } from '@mastra/pg';

new Memory({
  storage: new PostgresStore({
    id: 'commercial-agent-storage',
    connectionString: process.env.DATABASE_URL!,
  }),
  options: {
    lastMessages: 20,
    semanticRecall: {
      topK: 5,
      messageRange: 2,
      scope: 'resource',
    },
    workingMemory: {
      enabled: true,
    },
  },
});
```

**Nota importante:** `observationalMemory` (mencionado no vault e no design spec) **não aparece nos docs atuais**. A feature de compressão automática equivalente agora é `semanticRecall` + `workingMemory`. Atualizar o design spec + story 07A.5.

### Uso no generate com memória

```typescript
const agent = mastra.getAgentById('commercial-agent');
await agent.generate(mensagem, {
  memory: {
    resource: `ws-${orgId}:contact-${contactId}`,
    thread: `conv-${conversationId}`,
  },
});
```

API confirmada — compatível com a 07A.6.

---

## 2. Vercel AI SDK

| Item | Valor confirmado |
|---|---|
| Library ID | `/vercel/ai` (High reputation, 4863 snippets) |
| Versões estáveis | 5.x (latest: `ai@5.0.0`) |
| Versão em beta | 6.x (`ai@6.0.0-beta.128`) — **não usar em produção** |
| Provider OpenAI | `@ai-sdk/openai` |
| Provider Anthropic | `@ai-sdk/anthropic` |
| Formato de model ID | `provider/model-id` (ex: `openai/gpt-4.1-mini`) |

**Decisão:** usar **AI SDK 5.x estável**. Postpone upgrade pra 6.x quando sair do beta.

---

## 3. Modelos OpenAI — IDs exatos

Confirmados via Vercel AI Gateway + OpenAI docs:

| Modelo | ID no AI SDK | Contexto | Quando usar |
|---|---|---|---|
| **GPT-4.1 mini** | `openai/gpt-4.1-mini` ✓ **DEFAULT** | 1M tokens | Agente comercial (padrão) |
| GPT-4.1 | `openai/gpt-4.1` | 1M tokens | Agente com complexidade alta |
| GPT-4o | `openai/gpt-4o` | 128k | Alternativa rápida |
| GPT-4o mini | `openai/gpt-4o-mini` | 128k | Uso econômico |

**Confirmação do CEO:** Vinni pediu explicitamente `gpt-4.1-mini` como default. ID oficial `openai/gpt-4.1-mini` — **ajustar schema Drizzle (story 07A.3 AC#3)** com esse valor.

---

## 4. Modelos Anthropic — IDs exatos

Confirmados via Anthropic API docs (lançamento Opus 4.7 em 2026-04-16, 3 dias atrás):

| Modelo | ID no AI SDK | Preço input/output (USD/1M) | Quando usar |
|---|---|---|---|
| **Claude Haiku 4.5** | `anthropic/claude-haiku-4-5-20251001` | $1 / $5 | Alternativa barata Anthropic |
| **Claude Sonnet 4.6** | `anthropic/claude-sonnet-4-6` | $3 / $15 | Balanço qualidade/custo |
| **Claude Opus 4.7** | `anthropic/claude-opus-4-7` | $5 / $25 | Agente premium (Arquiteto Phase 09) |

**Observação:** Haiku 4.5 carrega suffix de data no ID (`-20251001`), diferente de Sonnet e Opus. Se `@dev` encontrar erro de ID inválido, testar `anthropic/claude-haiku-4-5` sem suffix também.

---

## 5. BullMQ — Versão e padrão de serialização

| Item | Valor confirmado |
|---|---|
| Package | `bullmq` (core) |
| Context7 library ID | `/taskforcesh/bullmq` (High reputation, 603 snippets) |
| Versão estável recente | conferir `npm show bullmq version` ao instalar |
| Dashboard oficial | **Bull-Board — ver divergência #2** |

### ⚠️ Divergência #1 — Serialização por conversação

**Design spec (07A.6) sugeria:** `BullMQ groups` por `conversationId` OU lock Redis manual.

**Achado real:**
- **`groups` existe APENAS no BullMQ Pro** (`@taskforcesh/bullmq-pro`) — **produto pago** da Taskforce.sh
- Versão OSS (gratuita) **não tem** groups

**Pattern nativo OSS melhor que lock manual:**

```typescript
// Em vez de lock Redis, usar deduplication do BullMQ OSS:
await queue.add(
  'agent-invocation',
  payload,
  {
    deduplication: {
      id: `conv:${conversationId}`,
      keepLastIfActive: true,  // <-- chave da serialização
    },
  },
);
```

**Como funciona:**
- Jobs com mesmo `deduplication.id` são **serializados automaticamente**
- Se worker está processando uma mensagem da conversa X e chega outra da mesma conversa, a nova fica aguardando
- Quando a atual completa (ou falha), a próxima entra automaticamente
- **Zero lock manual**, zero Redlock, zero infra extra

**Recomendação:** atualizar 07A.6 pra usar `deduplication.keepLastIfActive` em vez de lock Redis. **Mais simples, mais robusto, nativo da lib.**

### Pattern de idempotência (cumulativo)

Usar `jobId: messageId` garante que re-enfileiramento do mesmo `messageId` (retry de webhook, double-send) é deduplicado pelo BullMQ:

```typescript
await queue.add(
  'agent-invocation',
  payload,
  {
    jobId: payload.messageId,  // dedupe por messageId
    deduplication: { id: `conv:${payload.conversationId}`, keepLastIfActive: true },  // serialização por conversa
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
);
```

---

## 6. Bull-Board — ⚠️ Divergência #2

| Item | Status |
|---|---|
| Bull-Board oficial (`@bull-board/api`) | ❌ **Não tem suporte nativo pro Next.js 15 App Router** |
| Dependência | Express (incompatível direto com Next.js) |
| Issue aberta | [#882 desde jan/2025](https://github.com/felixmosh/bull-board/issues/882) — sem solução oficial ainda |

**Workaround conhecido:** rodar Bull-Board em um Express server separado. Em ambiente Coolify, isso seria **mais um container** — overhead desnecessário.

### Alternativa recomendada: **QueueDash**

| Item | Valor |
|---|---|
| Packages | `@queuedash/ui` + `@queuedash/api` |
| Compatibilidade | Bull, BullMQ, Bee-Queue, GroupMQ |
| Next.js integration | Nativa via tRPC — funciona em App Router |
| UI | Moderna, sleek (repo: [alexbudure/queuedash](https://github.com/alexbudure/queuedash)) |
| Licença | Open source |
| Maintenance | Ativa (última release: ~11 dias atrás) |

**Proposta de ajuste no design spec:**
- 07A.4: substituir `Bull-Board` por `QueueDash` como dependência
- 07A.7: rota `/admin/queues` monta `@queuedash/ui` em vez de Bull-Board. Proteção superadmin idêntica.

**Quem decide a troca:** `@architect` (Aria) valida a substituição antes do `@dev` instalar. Se Aria confirmar, atualizar stories 07A.4 e 07A.7 + design spec.

---

## 7. React Flow — Phase 07C

| Item | Valor confirmado |
|---|---|
| Package principal | `reactflow` (ou `@xyflow/react` — nova marca) |
| Versão docs | Atualizadas em março 2026 |
| Layout engines disponíveis | **dagre**, d3-hierarchy, elk.js |
| Recomendação pro Agent Flow Diagram | **`dagre`** — simples, rápido, ótimo pra hierarquias tree-like (Orquestrador → Agente → Categorias → Tools) |
| Package dagre | `dagre` (+ `@types/dagre` em devDeps) |

**Hook disponível:** `useAutoLayout` da React Flow pra reusar.

**Não confirmado via context7 (WebSearch primário):** manter recomendação dagre salvo ajuste futuro pelo `@ux-design-expert` na 07C.

---

## 8. Resumo de divergências do design spec

| # | Item original | Ajuste proposto | Stories afetadas |
|---|---|---|---|
| 1 | BullMQ groups / lock Redis manual pra serialização | `deduplication.keepLastIfActive` (nativo OSS) | 07A.6 |
| 2 | Bull-Board como dashboard | QueueDash (`@queuedash/ui`) | 07A.4, 07A.7, design spec §3.3 |
| 3 | `observationalMemory: true` (não existe mais) | Substituir por `semanticRecall` + `workingMemory` | 07A.5, design spec |
| 4 | Classe storage Mastra: `PostgresStore` vs `PgStore` | `@dev` confirma no momento da instalação baseado no que TypeScript resolver | 07A.5 |

Todas as divergências são **não-bloqueantes** — stories podem prosseguir com os ajustes. `@architect` (Aria) deve validar em passada curta antes do @dev executar 07A.4 e 07A.5.

---

## 9. Mapa completo de instalação

### `packages/ai` (story 07A.5)

```json
{
  "dependencies": {
    "@mastra/core": "latest",
    "@mastra/memory": "latest",
    "@mastra/pg": "latest",
    "ai": "^5.0.0",
    "@ai-sdk/openai": "latest",
    "@ai-sdk/anthropic": "latest",
    "@ai-sdk/react": "latest"
  }
}
```

### `packages/queue` (story 07A.4)

```json
{
  "dependencies": {
    "bullmq": "latest",
    "ioredis": "latest",
    "zod": "latest"
  }
}
```

### `packages/health` (story 07A.4)

```json
{
  "dependencies": {
    "zod": "latest"
  }
}
```

### `apps/web` (story 07A.7, e 07C)

```json
{
  "dependencies": {
    "@queuedash/ui": "latest",
    "@queuedash/api": "latest",
    "reactflow": "latest",
    "dagre": "latest"
  },
  "devDependencies": {
    "@types/dagre": "latest"
  }
}
```

---

## Fontes

- [Mastra docs — Postgres storage](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/docs/memory/storage.mdx)
- [Mastra docs — Memory class reference](https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/reference/memory/memory-class.mdx)
- [BullMQ Pro groups](https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/bullmq-pro/groups/README.md) (pago — descartado)
- [BullMQ deduplication pattern](https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/jobs/deduplication.md)
- [Vercel AI Gateway — GPT-4.1 mini](https://vercel.com/ai-gateway/models/gpt-4.1-mini)
- [OpenAI docs — GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
- [Claude models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Bull-Board Next.js issue #882](https://github.com/felixmosh/bull-board/issues/882)
- [QueueDash](https://github.com/alexbudure/queuedash)
- [React Flow dagre example](https://reactflow.dev/examples/layout/dagre)

---

*Atlas investigando a verdade — dados extraídos da fonte, divergências mapeadas, @dev tem caminho limpo.*
