---
name: mastra-expert
description: Use when working with Mastra v1.28+ in this project. Triggers automatically when editing files in packages/ai/src/mastra/** OR when keywords "Mastra", "agent.stream", "createTool", "Memory", "Workflow", "Supervisor" appear. Forces consult docs+pitfalls before coding.
---

# Mastra Expert — Vertech Agents

## Quando ativar

- Edição em `packages/ai/src/mastra/**`, `packages/ai/mastra-runtime/**`, `packages/queue/src/workers/agent-invocation.ts`, `packages/queue/src/workers/ingest-document.ts`
- Edição em routes `apps/web/app/api/agents/**`, `apps/web/app/api/architect/**`
- Keywords: `Mastra`, `agent.stream`, `agent.generate`, `createTool`, `Memory`, `Workflow`, `Supervisor`, `RequestContext`, `createScorer`, `PgVector`

## Versão pinada (2026-04-25)

```jsonc
// packages/ai/package.json
"@mastra/core": "^1.28.0",
"@mastra/memory": "^1.17.1",
"@mastra/pg": "^1.9.2",
"@mastra/rag": "^2.2.1",
"ai": "^4.3.16",            // Vercel AI SDK — Mastra usa internamente
"mastra": "^1.6.3"           // CLI dev — desatualizada, atualizar pra latest
```

**Pra atualizar:** `cd packages/ai && pnpm add @mastra/core@latest @mastra/memory@latest @mastra/pg@latest @mastra/rag@latest -w` e depois rodar `pnpm install`. Sempre olhar `https://github.com/mastra-ai/mastra/releases` antes de dar major bump.

## Checklist obrigatório ANTES de codar

1. Identifique versão Mastra atual (`packages/ai/package.json`)
2. Releia `docs/architecture/audit-mastra-2026-04-25.md` — gambiarras conhecidas
3. Consulte API canônica abaixo (snippets copiáveis)
4. Procure pitfall conhecido (seção "Pitfalls" abaixo) — TODOS os 4 erros desta sessão estão lá
5. Confirme typedef linha exata via `node_modules/.pnpm/@mastra+core@*/node_modules/@mastra/core/dist/**/*.d.ts`
6. Use snippet template como base (não invente assinatura)

## API Canônica (snippets copiáveis)

### 1. createTool — assinatura POSICIONAL (inputData, context)

```ts
// FONTE: https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/guides/migrations/upgrade-to-v1/tools.mdx
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const minhaTool = createTool({
  id: "minha-tool",
  description: "Descrição clara — o LLM lê isso pra decidir quando chamar",
  inputSchema: z.object({
    nome: z.string(),
    valor: z.number().optional(),
  }),
  outputSchema: z.object({
    sucesso: z.boolean(),
    leadId: z.string().optional(),
  }),
  // PARÂMETROS POSICIONAIS — NÃO destruturar como ({ context, requestContext })
  execute: async (inputData, context) => {
    // inputData = tipado pelo inputSchema
    const nome = inputData.nome;

    // requestContext propagado AUTOMATICAMENTE pelo Mastra
    const orgId = context?.requestContext?.get("organizationId") as string | undefined;
    if (!orgId) throw new Error("organizationId obrigatório no requestContext");

    // mastra disponível em context (acesso a outros agents/storage)
    // const otherAgent = context?.mastra?.getAgentById("other-agent");

    return { sucesso: true, leadId: "lead-123" };
  },
});
```

### 2. Agent dinâmico (multi-tenant) com config por requestContext

```ts
// FONTE: https://mastra.ai/docs/agents/dynamic-agents + commercial.ts (referência local)
import { Agent } from "@mastra/core/agent";

let agentInstance: Agent | null = null;

export function getMeuAgent(): Agent {
  if (!agentInstance) {
    agentInstance = new Agent({
      id: "meu-agent",
      name: "Meu Agent",
      description: "Descrição usada pelo Supervisor pra delegação",

      // Model dinâmico por tenant
      model: async ({ requestContext }) => {
        const agentId = requestContext?.get?.("agentId") as string | undefined;
        if (!agentId) return "openai/gpt-4.1-mini" as never;
        const record = await loadFromDb(agentId);
        return record.model as never;
      },

      // Instructions dinâmicas
      instructions: async ({ requestContext }) => {
        const agentId = requestContext?.get?.("agentId") as string | undefined;
        if (!agentId) return "Default instructions.";
        return await buildInstructionsFromDb(agentId);
      },

      // Tools dinâmicas (filtra por enabledTools do banco)
      tools: async ({ requestContext }) => {
        const agentId = requestContext?.get?.("agentId") as string | undefined;
        if (!agentId) return {};
        return await loadEnabledToolsFromDb(agentId);
      },

      memory: getMeuAgentMemory(),

      // maxSteps — DEFINIR EM UM LUGAR SÓ (aqui OU na call, não ambos)
      defaultOptions: {
        maxSteps: 10,
      },
    });
  }
  return agentInstance;
}
```

### 3. Route handler invocando agent.stream com RequestContext

```ts
// FONTE: https://mastra.ai/docs/server/request-context + invoker.ts (worker reference)
import { RequestContext } from "@mastra/core/request-context";
import { getMastra } from "@repo/ai";

export async function POST(req: Request) {
  // RequestContext aceita Map-like array no constructor
  const ctx = new RequestContext<Record<string, unknown>>([
    ["agentId", "agent-123"],
    ["organizationId", "org-456"],
    ["isSandbox", true],
  ]);

  const mastra = getMastra();
  const agent = mastra.getAgent("commercialAgent");

  // PASSAR requestContext direto — Mastra propaga pra tools automaticamente
  // NÃO precisa AsyncLocalStorage wrapper
  const result = await agent.stream("Olá", {
    requestContext: ctx,
    memory: {
      thread: `conv-${conversationId}`,
      resource: `lead-${contactId}`,
    },
    // maxSteps aqui SÓ se NÃO definido no Agent.defaultOptions
  });

  // ... stream pro cliente
}
```

### 4. Memory factory (working + semantic + observational)

```ts
// FONTE: https://mastra.ai/docs/memory/overview + memory/config.ts (referência local)
import { Memory } from "@mastra/memory";
import { z } from "zod";

const meuSchema = z.object({
  nome: z.string().nullable(),
  // 5-10 campos máximo (working memory tem custo de prompt)
});

let mem: Memory | null = null;
export function getMeuAgentMemory(): Memory {
  if (!mem) {
    mem = new Memory({
      storage: getMastraStorage(),
      vector: getPgVector(),
      embedder: "openai/text-embedding-3-small",
      options: {
        lastMessages: 30,
        semanticRecall: {
          topK: 5,
          messageRange: { before: 2, after: 1 },
          scope: "resource", // recall cross-thread do mesmo lead
          indexConfig: {
            type: "hnsw",
            metric: "cosine", // recomendado pra OpenAI embeddings
            hnsw: { m: 16, efConstruction: 64 },
          },
        },
        workingMemory: {
          enabled: true,
          schema: meuSchema, // Zod aceito direto
        },
        observationalMemory: {
          model: "google/gemini-2.5-flash",
          scope: "resource",
          observation: { messageTokens: 30_000 },
          reflection: { observationTokens: 60_000 },
        },
      },
    });
  }
  return mem;
}
```

### 5. Supervisor Pattern (Atendente coordenando time)

```ts
// FONTE: https://mastra.ai/docs/agents/supervisor-agents
const supervisor = new Agent({
  id: "atendente",
  // ...config dinâmica acima...
  agents: {
    analista: getAnalistaAgent(),
    campanhas: getCampanhasAgent(),
    assistente: getAssistenteAgent(),
  },
  // O LLM do Atendente vê descrições dos sub-agents e decide delegar via
  // tool calling automático (Mastra injeta como tool 'transfer_to_X')
});
```

### 6. Scorer (API oficial — refator pendente)

```ts
// FONTE: https://mastra.ai/docs/observability/scorers
// IMPORTANTE: hoje (2026-04-25) projeto usa funções TS puras como gambiarra.
// Quando refatorar, usar API oficial:
import { createScorer } from "@mastra/core/scores"; // OU "@mastra/evals"

export const qualificacaoScorer = createScorer({
  name: "qualificacao",
  description: "% de campos do briefing que o agente coletou",
  judge: async ({ input, output, groundTruth }) => {
    // lógica
    return { score: 0.85, reason: "5 de 6 campos" };
  },
});

// Plugar em mastra/instance.ts:
// new Mastra({ scorers: { qualificacao: qualificacaoScorer, ... } })
```

### 7. Workflow com suspend/resume

```ts
// FONTE: https://mastra.ai/docs/workflows/overview
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const stepGather = createStep({
  id: "gather",
  inputSchema: z.object({ leadId: z.string() }),
  outputSchema: z.object({ briefing: z.string() }),
  execute: async (inputData, context) => {
    // (inputData, context) IGUAL createTool — posicional
    return { briefing: "..." };
  },
});

const workflow = createWorkflow({
  id: "qualifica-lead",
  inputSchema: z.object({ leadId: z.string() }),
  outputSchema: z.object({ qualified: z.boolean() }),
})
  .then(stepGather)
  .commit();
```

## Pitfalls — TODOS os erros desta sessão + outros conhecidos

### P1: `runtimeContext` vs `requestContext`

`RuntimeContext` foi RENOMEADO pra `RequestContext` na v1.0. Acessar via `context.requestContext.get(key)`. **NÃO** existe mais `context.runtimeContext`.

### P2: ALS workaround é gambiarra

Se você ver `runWithAtendenteCtx` no projeto: NÃO COPIE PRA NOVAS ROUTES. Mastra propaga `requestContext` automaticamente pra tools via `context.requestContext`. Refactor 1 do audit doc remove isso. Se precisar de contexto na tool, **leia de `context.requestContext.get()`**.

### P3: `execute` é POSICIONAL `(inputData, context)`

```ts
// ❌ ERRADO (pré-v1)
execute: async ({ context, inputData }) => { ... }

// ✅ CERTO (v1+)
execute: async (inputData, context) => {
  const x = inputData.foo;
  const y = context?.requestContext?.get("bar");
}
```

### P4: `createScorer` em transição na 1.28

Subpath `@mastra/core/scores` pode não estar exposto em type declarations (apesar de existir em runtime JS). Workaround: instalar `@mastra/evals` separado OU `// @ts-ignore` temporário. Documentar refactor pendente.

### P5: `maxSteps` em DOIS lugares

Definir só em `Agent.defaultOptions.maxSteps` OU só nas calls (`agent.stream(prompt, { maxSteps })`). Per-call vence quando ambos definidos — confuso. Padronizar.

### P6: `console.log` em hot path

Use `mastra.getLogger()` (Pino built-in) ou `pino` direto. `console.log` perde structured logging.

### P7: Cache stale do `@repo/database`

Hot reload do `mastra dev` quebra silenciosamente quando `packages/database/node_modules/.cache/@repo__database.mjs` fica stale. Sintoma: `loadAgentFromContext` retorna undefined com agentId válido. **Fix:** `rm -rf packages/database/node_modules/.cache && pnpm dev`.

### P8: `metric: "dotproduct"` vs `cosine` em PgVector

Pra OpenAI embeddings (L2-normalized), são equivalentes matematicamente. Mastra docs preferem `cosine`. Sem impacto prático, mas alinhar com docs evita "por que esse é diferente?" no code review.

### P9: PoolConfig default da `@mastra/pg`

Default é 10 conexões. BullMQ worker concurrency 5+ pode estourar. Configurar `poolConfig: { max: 20 }` no `PostgresStore`.

### P10: `agents: {}` em Supervisor stub

OK em M1 (Atendente solo). NÃO bloqueia init do Mastra. Quando popular em M2-03+, sub-agents precisam ser instâncias `Agent` (não factories).

### P11: `tools: atendenteTools as never` no Mastra constructor

Cast `as never` esconde mismatch de tipo. Use `satisfies ToolsRegistry` ou tipo correto.

### P12: Memory `vector` pode contender pool quando 2 agents compartilham PgVector

Architect e Atendente usam mesmo `getPgVector()` singleton. Sob carga simultânea (raro mas possível), conexões podem espera. Monitorar.

## Como testar Mastra

### Studio local

```bash
cd packages/ai
pnpm exec mastra dev --root . --dir mastra-runtime --env ../../.env.local
pnpm exec mastra studio
# Abre http://localhost:4111 — testa agents, vê traces, datasets, scorers
```

### Sandbox (UI Vertech)

`/agents/{agentId}/sandbox` na app web. Usa `requestContext.isSandbox: true` — tools criam dados com flag `isSandbox=true` (isolado de prod).

### Smoke test de tool isolada

```ts
import { minhaTool } from "@repo/ai";
import { RequestContext } from "@mastra/core/request-context";

const ctx = new RequestContext([["organizationId", "org-test"]]);
const result = await minhaTool.execute(
  { nome: "teste" },
  { requestContext: ctx }
);
console.log(result);
```

### Worker BullMQ

```bash
pnpm --filter @repo/queue dev
# Inserir mensagem na fila manualmente via admin ou DB
```

## Recursos externos

- Docs: https://mastra.ai/docs (overview, agents, tools, memory, workflows, rag, observability, server-db)
- v1 migration: https://github.com/mastra-ai/mastra/blob/main/docs/src/content/en/guides/migrations/upgrade-to-v1/
- Examples: https://github.com/mastra-ai/mastra/tree/main/examples
- Discord: https://discord.gg/BTYqqHKUrf
- Audit interno: `docs/architecture/audit-mastra-2026-04-25.md`
- Roadmap V3: `docs/PROJECT-ROADMAP-V3.md` (M1+M2 implementados, M3 Workflows futuro)

## Princípios

1. **Sempre confirmar typedef** antes de assumir assinatura — Mastra evolui rápido.
2. **Não inventar API** — se não está em `https://mastra.ai/docs` ou changelog, perguntar Discord.
3. **Multi-tenant first** — toda nova feature deve aceitar `requestContext` pra isolar org.
4. **Não copiar ALS** — usar `context.requestContext` oficial. Audit Refactor 1 remove gambiarra.
5. **Lazy init** — todo factory `getXxx()` retorna singleton, nunca top-level `new Agent()`.
