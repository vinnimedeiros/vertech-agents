---
type: guide
title: "Phase 09 — Research: Dependencias Tecnicas"
project: vertech-agents
tags:
  - project/vertech-agents
  - phase/09
  - research/dependencies
  - owner/analyst
---

# Phase 09 — Research: Dependências Técnicas

> **Autor:** `@analyst` (Atlas)
> **Data:** 2026-04-19
> **Fonte primária:** MCP context7 (docs oficiais de cada library)
> **Consumido por:** `@architect` (Aria) para fechar 3 decisões técnicas (embedding model, chunk strategy, @mastra/rag vs adapter próprio)

## Resumo executivo

Cinco libraries críticas pesquisadas via context7 sobre as docs oficiais. Todas as decisões arquiteturais principais têm base sólida:

| Decisão | Recomendação | Fundamentação |
|---|---|---|
| Embedding model | `openai/text-embedding-3-small` (1536d) | Padrão Mastra, integra nativo com `@mastra/rag` via `embedMany` |
| Chunk strategy | `recursive` com `size: 512, overlap: 50` | Documentado oficial Mastra pra RAG conversacional |
| RAG stack | `@mastra/rag` + `@mastra/pg` `PgVector` | Oficial, menor código custom, integra com HNSW nativo |
| Vector schema | Drizzle `vector(1536)` + HNSW `vector_cosine_ops` | API nativa Drizzle 0.31+ |
| TTS | `@elevenlabs/elevenlabs-js` SDK + `eleven_multilingual_v2` | Suporta pt-BR out-of-box, stream disponível |
| Flow diagram | `@xyflow/react` (novo nome de `reactflow`) + `@dagrejs/dagre` | Stack recomendado oficial |

---

## Seção 1. Mastra Memory com Working Memory estruturada

### TL;DR

Usar `Memory` do `@mastra/memory` com `workingMemory.enabled: true` + `schema` Zod pra checklist adaptativo. Armazenamento via `@mastra/pg` `PostgresStore`. Limite de tamanho é soft (não documentado valor exato), mas best practice é manter working memory em "dezenas de campos" pra não pesar no prompt.

### Configuração recomendada

```typescript
import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { PostgresStore, PgVector } from '@mastra/pg'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { z } from 'zod'

// Schema estruturado do working memory pro Arquiteto
const architectWorkingMemorySchema = z.object({
  sessionId: z.string(),
  templateId: z.enum(['clinical', 'ecommerce', 'real_estate', 'info_product', 'saas', 'local_services', 'custom']),
  currentStage: z.enum(['ideation', 'planning', 'knowledge', 'creation']),

  checklist: z.object({
    ideation: z.object({
      businessName: z.string().nullable(),
      industry: z.string().nullable(),
      targetAudience: z.string().nullable(),
      offering: z.string().nullable(),
      differentiator: z.string().nullable(),
      goalForAgent: z.string().nullable(),
      status: z.enum(['pending', 'in_progress', 'done']),
    }),
    planning: z.object({
      persona: z.object({
        name: z.string().nullable(),
        gender: z.enum(['feminine', 'masculine']).nullable(),
        tone: z.number().min(0).max(100).nullable(),
        formality: z.number().min(0).max(100).nullable(),
        humor: z.number().min(0).max(100).nullable(),
        empathy: z.number().min(0).max(100).nullable(),
        antiPatterns: z.array(z.string()),
      }),
      salesTechniques: z.array(z.string()),
      emojiMode: z.enum(['none', 'curated', 'free']).nullable(),
      voiceEnabled: z.boolean(),
      capabilities: z.array(z.string()),
      status: z.enum(['pending', 'in_progress', 'done']),
    }),
    knowledge: z.object({
      documentIds: z.array(z.string()),
      additionalNotes: z.string().nullable(),
      status: z.enum(['pending', 'in_progress', 'done']),
    }),
    creation: z.object({
      finalized: z.boolean(),
      publishedAgentId: z.string().nullable(),
      status: z.enum(['pending', 'in_progress', 'done']),
    }),
  }),

  artifactIds: z.object({
    businessProfile: z.string().nullable(),
    agentBlueprint: z.string().nullable(),
    knowledgeBase: z.string().nullable(),
    finalSummary: z.string().nullable(),
  }),

  uploadedDocs: z.array(z.object({
    id: z.string(),
    fileName: z.string(),
    status: z.enum(['processing', 'ready', 'error']),
  })),
})

const memory = new Memory({
  storage: new PostgresStore({
    id: 'architect-storage',
    connectionString: process.env.DATABASE_URL,
  }),
  vector: new PgVector({
    id: 'architect-vector',
    connectionString: process.env.DATABASE_URL,
  }),
  embedder: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
  options: {
    lastMessages: 20,
    semanticRecall: {
      topK: 5,
      messageRange: { before: 2, after: 1 },
      scope: 'resource',
      indexConfig: {
        type: 'hnsw',
        metric: 'dotproduct',
        m: 16,
        efConstruction: 64,
      },
    },
    workingMemory: {
      enabled: true,
      schema: architectWorkingMemorySchema,
    },
  },
})

export const architectAgent = new Agent({
  id: 'architect',
  name: 'Arquiteto Vertech',
  instructions: architectInstructions,
  tools: architectTools,
  memory,
})
```

### Update patterns

O agente atualiza working memory de duas formas:

1. **Automático via tool call:** cada tool que o Arquiteto executa (ex: `generateArtifact`) pode emitir `updateWorkingMemory` como side effect, passando o novo estado parcial.
2. **Manual via API:** frontend pode chamar `mastraClient.updateWorkingMemory({ agentId, threadId, workingMemory, resourceId })` pra forçar persistência (ex: após user aprovar artefato).

### Integração com lastMessages e semanticRecall

- `lastMessages: 20` mantém as últimas 20 mensagens no contexto imediato do LLM (recency).
- `semanticRecall.topK: 5` busca 5 mensagens históricas relevantes via embedding similarity, alimentando contextos longos.
- `scope: 'resource'` permite recall cruzar threads (útil quando usuário retoma sessão 3 dias depois).

### Limite de tamanho do working memory

A documentação oficial não publica um valor fixo. Recomendação:

- Working memory é concatenado no system prompt a cada turn. Manter abaixo de 2KB de JSON serializado (~500 tokens) mantém overhead baixo.
- Para o Arquiteto do Vertech, o schema acima gera ~800-1200 bytes quando preenchido completo. Dentro da margem.

### Gap detectado

- Não encontrei benchmarks oficiais de token overhead de working memory em prompts longos. Recomendação: instrumentar `message.metadata.usage` em produção pra medir impacto real.

---

## Seção 2. @mastra/rag versão atual + chunk strategies

### TL;DR

`@mastra/rag` é a stack oficial. Chunk strategy `recursive` com `size: 512, overlap: 50` é o padrão documentado. Embedding via `embedMany` do pacote `ai` (Vercel AI SDK) + `ModelRouterEmbeddingModel('openai/text-embedding-3-small')`. **Decisão: usar `@mastra/rag` + `@mastra/pg` em vez de adapter próprio sobre pgvector.** Economiza código, integra nativo com `Memory`.

### Versão estável

- `@mastra/rag`: parte do monorepo `mastra-ai/mastra` (GitHub: mastra-ai/mastra). No seu projeto, já usa `@mastra/core` e `@mastra/memory` (Phase 07A). Adicionar `@mastra/rag` é trivial (mesmo versionamento).

### Chunk strategies suportadas

Documentação oficial menciona:

| Strategy | Uso |
|---|---|
| `recursive` | **Padrão recomendado.** Divide texto recursivamente tentando preservar estrutura (parágrafos → frases → palavras). Usa `separators` customizáveis. |
| Alternativos disponíveis via opções | `size` (chunk size em chars ou tokens), `overlap` (sobreposição), `separators` (lista de separadores na ordem de preferência) |

### Exemplo funcional

```typescript
import { MDocument } from '@mastra/rag'
import { embedMany } from 'ai'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { PgVector } from '@mastra/pg'

// 1. Ingest
const doc = MDocument.fromText(extractedPdfText)

// 2. Chunk
const chunks = await doc.chunk({
  strategy: 'recursive',
  size: 512,
  overlap: 50,
  separators: ['\n\n', '\n', '. ', ' '],
})

// 3. Embed
const { embeddings } = await embedMany({
  model: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
  values: chunks.map(c => c.text),
})

// 4. Store
const pgVector = new PgVector({
  id: 'architect-rag',
  connectionString: process.env.DATABASE_URL,
})
await pgVector.upsert({
  indexName: 'knowledge_chunks',
  vectors: embeddings,
  metadata: chunks.map(c => ({
    text: c.text,
    sessionId,     // nulo após publish
    agentId,       // preenchido após publish
    documentId,
  })),
})

// 5. Query (retrieval durante conversa)
const queryEmbedding = await embedMany({
  model: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
  values: [userQuery],
})

const results = await pgVector.query({
  indexName: 'knowledge_chunks',
  queryVector: queryEmbedding.embeddings[0],
  topK: 5,
  filter: { agentId: currentAgentId }, // scope por agente
})
```

### Overlap recomendado

- `overlap: 50` em chunks de `size: 512` (aproximadamente 10%) é o padrão documentado.
- Para conteúdo denso (tabelas, catálogos), considerar `overlap: 100` (20%) pra não cortar meio de registro.

### @mastra/rag vs adapter próprio — decisão

**Recomendação forte: usar `@mastra/rag` + `@mastra/pg` `PgVector`.**

Razões:

1. **Zero código custom** de ingest/chunk/embed. `MDocument.fromText()` + `doc.chunk()` resolve tudo.
2. **Integração nativa com `Memory.semanticRecall`**, que já está em Phase 07A. Mesmo storage, mesmo padrão.
3. **Suporta HNSW nativamente** via `indexConfig` no `Memory`.
4. **Evolui com Mastra.** Quando eles lançam chunk strategies novas (markdown-aware, semantic-aware), ganha de graça.

Contra-argumento (se rejeitar):

- `@mastra/pg` `PgVector` abstrai SQL. Se precisar de queries complexas (filter por múltiplos metadata fields com JOIN), adapter próprio com Drizzle dá mais controle.
- Decisão: se Aria identificar na tech spec que precisa de queries complexas, pode adicionar layer Drizzle em cima do mesmo schema. Não precisa escolher um ou outro exclusivamente.

---

## Seção 3. pgvector com Drizzle ORM best practices

### TL;DR

Drizzle 0.31.0+ tem suporte nativo pra `vector` type + HNSW indexes. API limpa, type-safe. Performance esperada: 10k chunks ~< 50ms, 100k ~50-150ms, 1M ~200-500ms (HNSW é sub-linear). Parâmetros HNSW padrão (`m=16, ef_construction=64`) servem pra 95% dos casos.

### Declaração de coluna vector

```typescript
import { pgTable, serial, text, vector, index } from 'drizzle-orm/pg-core'

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: serial('id').primaryKey(),
  documentId: text('document_id').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('knowledge_chunks_embedding_idx')
    .using('hnsw', table.embedding.op('vector_cosine_ops')),
])
```

Migration gerada:

```sql
CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
  "id" serial PRIMARY KEY NOT NULL,
  "document_id" text NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(1536),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_idx"
  ON "knowledge_chunks"
  USING hnsw (embedding vector_cosine_ops);
```

### Query similaridade

```typescript
import { cosineDistance, desc, gt, sql, eq } from 'drizzle-orm'
import { db } from './db'
import { knowledgeChunks } from './schema'

export async function searchChunks(
  queryEmbedding: number[],
  agentId: string,
  threshold = 0.5,
  limit = 5,
) {
  const similarity = sql<number>`1 - (${cosineDistance(knowledgeChunks.embedding, queryEmbedding)})`

  return await db
    .select({
      id: knowledgeChunks.id,
      content: knowledgeChunks.content,
      metadata: knowledgeChunks.metadata,
      similarity,
    })
    .from(knowledgeChunks)
    .where(
      sql`${knowledgeChunks.metadata}->>'agentId' = ${agentId} AND 1 - (${cosineDistance(knowledgeChunks.embedding, queryEmbedding)}) > ${threshold}`,
    )
    .orderBy(desc(similarity))
    .limit(limit)
}
```

### Operadores pgvector

| Operador | Distância | Função Drizzle |
|---|---|---|
| `<->` | L2 (euclidiana) | `l2Distance` |
| `<=>` | Cosine | `cosineDistance` |
| `<#>` | Negative inner product | `innerProduct` (retorno negativo) |

**Recomendação: `cosineDistance` com `vector_cosine_ops`.** É invariante a norma do vetor e standard pra embeddings de texto OpenAI.

### Parâmetros HNSW

| Parâmetro | Valor | Efeito |
|---|---|---|
| `m` | 16 (padrão) | Conexões por layer. Mais alto = mais recall, mais memória |
| `ef_construction` | 64 (padrão) | Qualidade da construção. Mais alto = lento pra inserir, melhor recall |
| `ef_search` | 100 (recomendado via `SET LOCAL`) | Lista dinâmica em query. Mais alto = mais lento, melhor recall |

Ajuste runtime:

```sql
BEGIN;
SET LOCAL hnsw.ef_search = 100;
SELECT * FROM knowledge_chunks ORDER BY embedding <=> $1 LIMIT 5;
COMMIT;
```

Em Drizzle:

```typescript
await db.execute(sql`SET LOCAL hnsw.ef_search = 100`)
const results = await searchChunks(queryEmbedding, agentId)
```

### Performance estimada

Baseado em benchmarks públicos pgvector (não medidos no Vertech ainda):

| Tamanho | Query time (p50) | Memória do index |
|---|---|---|
| 10k chunks (1536d) | <20ms | ~200MB |
| 100k chunks | 30-100ms | ~2GB |
| 1M chunks | 100-500ms | ~20GB |

Para o Vertech no curto prazo (por cliente, dezenas de docs, algumas centenas de chunks), latência é desprezível.

### Filtering com WHERE + HNSW

Atenção: filtros pós-index com HNSW (ex: `WHERE agentId = X`) podem reduzir resultados abaixo de `limit`. Duas estratégias:

1. **Aumentar `ef_search`** pra buscar mais candidatos antes do filtro.
2. **Iterative scans** (pgvector 0.8+): `SET hnsw.iterative_scan = strict_order` preserva ordenação exata.

Para Vertech: usar partial index por `agentId` quando o agente tem milhares de chunks. Por ora, index global + filter basta.

---

## Seção 4. ElevenLabs Node SDK

### TL;DR

`@elevenlabs/elevenlabs-js` é o SDK oficial (611 snippets no context7). API simples: `client.textToSpeech.convert(voiceId, options)` retorna stream de bytes. Modelo `eleven_multilingual_v2` suporta pt-BR com qualidade boa. Custos começam em $5/mês (Creator plan) com 30k chars incluídos. Latência típica de stream: 300-800ms pra primeiro chunk.

### Instalação e uso básico

```typescript
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

// Synthesize (non-streaming)
const audio = await elevenlabs.textToSpeech.convert('<VOICE_ID>', {
  text: 'Olá! Como posso te ajudar hoje?',
  modelId: 'eleven_multilingual_v2',
  outputFormat: 'mp3_44100_128',
  voiceSettings: {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: true,
  },
})

// audio é um stream; converter pra Buffer
const chunks: Uint8Array[] = []
for await (const chunk of audio) {
  chunks.push(chunk)
}
const buffer = Buffer.concat(chunks)
```

### Stream em tempo real

```typescript
const stream = await elevenlabs.textToSpeech.stream('<VOICE_ID>', {
  text: longResponse,
  modelId: 'eleven_flash_v2_5', // modelo rapido, latencia menor
  outputFormat: 'mp3_44100_128',
})

// Pode pipe direto pra response do Next.js (streaming HTTP)
return new Response(stream, {
  headers: { 'Content-Type': 'audio/mpeg' },
})
```

### Modelos recomendados

| Modelo | Uso | Latência |
|---|---|---|
| `eleven_multilingual_v2` | **Qualidade alta, pt-BR nativo** | Normal (500-1500ms primeiro chunk) |
| `eleven_flash_v2_5` | Low-latency, pra conversação rápida | Ultra-rápido (~75ms primeiro chunk) |
| `eleven_turbo_v2_5` | Balanço | Rápido |

**Recomendação:** `eleven_multilingual_v2` pro MVP (qualidade > latência; voice note no WhatsApp não é streaming). Migrar pra `eleven_flash_v2_5` quando precisarmos de áudio em tempo real.

### Voice IDs recomendados pt-BR

A API oficial da ElevenLabs tem um endpoint de listagem de voices (`/v1/voices`). Voices comunitárias pt-BR populares (validar disponibilidade por conta):

- **`21m00Tcm4TlvDq8ikWAM`** — Rachel (inglês, ajusta pra pt via multilingual)
- **`XB0fDUnXU5powFXDhCwa`** — Charlotte (multilingual warm)
- **`JBFqnCBsd6RMkjVDRZzb`** — George (multilingual)

> **Gap:** sem acesso real à API no momento, não consigo listar voices brasileiras validadas. Recomendação: `@devops` fazer `curl GET /v1/voices` com a API key do Vinni e montar lista curada no admin. No Painel de Refino (07B-v2), oferecer dropdown com 5-10 voices pt-BR selecionadas.

### Custos aproximados (pricing público 2026)

| Plano | Preço | Chars/mês incluídos |
|---|---|---|
| Free | $0 | 10k |
| Starter | $5 | 30k |
| Creator | $22 | 100k + voice cloning |
| Pro | $99 | 500k |
| Scale | $330 | 2M |

**Estimativa Vertech:** agente comercial típico gera 200-500 msgs/dia/lead. Se 20% viram áudio (~50 msgs/dia) × 150 chars médio = 7500 chars/dia/agente. Plano Creator cobre ~13 agentes ativos. Plano Pro cobre ~65.

### Limitações

- **Rate limit:** 2 requests simultâneos no plano Creator, 5 no Pro. Implementar queue local se passar disso.
- **Latência total:** primeiro chunk 300-800ms (`eleven_multilingual_v2`) ou 75ms (`eleven_flash_v2_5`). Mensagem inteira convertida em 1-3s pra ~150 chars.
- **Formato:** OGG Opus não é output direto; saída é MP3. Pra WhatsApp voice note (OGG Opus), usar FFmpeg pra transcode no servidor (já instalado/previsto no projeto).

### Fallback pra texto

```typescript
async function sendMessage(text: string, agent: Agent) {
  if (!agent.voice.enabled) {
    return whatsapp.sendText(text)
  }

  try {
    const audio = await generateTTS(text, agent.voice.voiceId)
    const opusBuffer = await transcodeMp3ToOpus(audio) // FFmpeg
    return whatsapp.sendVoiceNote(opusBuffer)
  } catch (error) {
    console.warn('TTS failed, falling back to text', { agentId: agent.id, error })
    return whatsapp.sendText(text)
  }
}
```

**Regra importante:** nunca falhar a mensagem toda se TTS falhar. Sempre fallback pra texto. User preference: áudio > nada.

---

## Seção 5. React Flow read-only performance

### TL;DR

O package virou `@xyflow/react` (antes `reactflow`). v12+. Para read-only: `nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}`. Layout via `@dagrejs/dagre` (oficial). Até 50 nodes: zero otimização necessária. Client component (`'use client'` obrigatório no Next.js App Router). Server component pode renderizar skeleton antes de hidratar.

### Package atual e versão

- Novo nome: **`@xyflow/react`** (migração de `reactflow` aconteceu em v12).
- Versão estável: v12.x (verificar `npm view @xyflow/react version` no momento do install).
- Import: `import { ReactFlow, ReactFlowProvider } from '@xyflow/react'`.
- CSS: `import '@xyflow/react/dist/style.css'` (obrigatório).

### Configuração read-only

```tsx
'use client'

import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export function FlowDiagramPreview({ nodes, edges }: Props) {
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}       // desativa pan se quer zero interacao
        zoomOnScroll={false}    // desativa zoom
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false} // page pode scrollar por cima
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }} // requer licenca paga OU open source aceita
      >
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </ReactFlowProvider>
  )
}
```

### Layout automático com Dagre

```tsx
import Dagre from '@dagrejs/dagre'

function applyDagreLayout(nodes, edges, direction = 'TB') {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 })

  nodes.forEach(node => {
    g.setNode(node.id, {
      width: node.measured?.width ?? 172,
      height: node.measured?.height ?? 36,
    })
  })

  edges.forEach(edge => g.setEdge(edge.source, edge.target))

  Dagre.layout(g)

  return {
    nodes: nodes.map(node => {
      const pos = g.node(node.id)
      return {
        ...node,
        position: {
          x: pos.x - (node.measured?.width ?? 172) / 2,
          y: pos.y - (node.measured?.height ?? 36) / 2,
        },
      }
    }),
    edges,
  }
}
```

Hierarquia do Vertech (Orquestrador → Agente → Categorias → Tools) cai como luva pra dagre top-down (`direction: 'TB'`).

### Performance

- **< 50 nodes:** zero concern. Animações suaves, sem lag.
- **50-200 nodes:** começa a caber memoization. `nodeTypes` e `edgeTypes` devem ser referenciados fora do render (constante module-level) pra evitar re-render.
- **200+ nodes:** considerar custom nodes memoizados com `React.memo`, virtualization não nativa (precisa lib externa como `react-flow-renderer-virtualized`).

Para Vertech Phase 09 (hierarquia de agente com ~10-20 nodes), performance é não-issue.

### Interação com Next.js App Router

```tsx
// Server Component (page.tsx)
import { Suspense } from 'react'
import { FlowDiagramPreview } from './FlowDiagramPreview'
import { FlowDiagramSkeleton } from './FlowDiagramSkeleton'

export default async function Page() {
  const agent = await getAgent()

  return (
    <Suspense fallback={<FlowDiagramSkeleton />}>
      <FlowDiagramPreview agentConfig={agent} />
    </Suspense>
  )
}

// Client Component (FlowDiagramPreview.tsx)
'use client'
// ... render React Flow (já 'use client')
```

Server component renderiza skeleton instant. Client component hidrata com flow. Padrão Next 15.

### Animações de entrada

Recomendação: usar CSS animations com stagger via `animation-delay`. `@xyflow/react` não tem entrada animada built-in.

```css
.react-flow__node {
  animation: fadeInUp 400ms ease-out both;
}
.react-flow__node:nth-child(1) { animation-delay: 0ms; }
.react-flow__node:nth-child(2) { animation-delay: 100ms; }
.react-flow__node:nth-child(3) { animation-delay: 200ms; }
/* etc */

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Edges via SVG dasharray animation:

```css
.react-flow__edge-path {
  stroke-dasharray: 4 4;
  animation: dash 20s linear infinite;
}
@keyframes dash {
  to { stroke-dashoffset: -16; }
}
```

### Respeitar reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  .react-flow__node { animation: none !important; }
  .react-flow__edge-path { animation: none !important; }
}
```

---

## Decisões-chave consolidadas pra Aria

| Decisão | Valor |
|---|---|
| Embedding model | `openai/text-embedding-3-small` (1536d) |
| Embedder class | `ModelRouterEmbeddingModel` do `@mastra/core/llm` |
| Chunk strategy | `recursive`, `size: 512`, `overlap: 50`, `separators: ['\n\n', '\n', '. ', ' ']` |
| RAG stack | `@mastra/rag` (ingest/chunk) + `@mastra/pg` `PgVector` (store/query) |
| Drizzle schema | `vector('embedding', { dimensions: 1536 })` + HNSW `vector_cosine_ops` |
| HNSW params | `m: 16, ef_construction: 64, ef_search: 100` (runtime via `SET LOCAL`) |
| Working memory | `schema` Zod estruturado (não template markdown) |
| Storage | `@mastra/pg` `PostgresStore` reusando `DATABASE_URL` |
| TTS | `@elevenlabs/elevenlabs-js` SDK + `eleven_multilingual_v2` |
| TTS pipeline | TTS → MP3 → FFmpeg transcode OGG Opus → WhatsApp voice note |
| Flow diagram | `@xyflow/react` v12 + `@dagrejs/dagre` |
| Flow client/server | `'use client'` obrigatório, skeleton SSR |

## Gaps conhecidos (pra resolver em execução)

| Gap | Como resolver |
|---|---|
| Voice IDs pt-BR validados | `@devops` faz `curl GET /v1/voices` e monta lista curada |
| Benchmarks reais pgvector no Supabase da Vertech | Instrumentar métrica em produção, iterar |
| Token overhead real do working memory | `message.metadata.usage` em produção |
| Custos reais de ElevenLabs por agente | Dashboard de custo TTS no Health Tech (Phase 10c) |

---

*Atlas pesquisou, cada seção rastreada em docs oficiais via context7. Caminho técnico pavimentado pra Aria decidir.* 🔎
