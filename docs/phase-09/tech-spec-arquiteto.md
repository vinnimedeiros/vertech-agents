---
type: guide
title: "Phase 09 — Tech Spec: Arquiteto Construtor"
project: vertech-agents
tags:
  - project/vertech-agents
  - phase/09
  - architecture
  - owner/architect
---

# Phase 09 — Tech Spec: Arquiteto Construtor

> **Autor:** `@architect` (Aria)
> **Data:** 2026-04-19
> **Consumido por:** `@sm` (stories), `@data-engineer` (migrations), `@dev` (implementação)
> **Fontes:** PRD v2, UI Spec Phase 09 (Sati), Research Dependencies (Atlas), ADR-001
> **Status:** Decisões técnicas fechadas com base na pesquisa do Atlas

## 1. Visão arquitetural

### 1.1 Posicionamento do Arquiteto no sistema

O Arquiteto é o **terceiro agente Mastra** do Vertech. Os três convivem isolados por registry de tools e por responsabilidade (ADR-001):

| Agente | Registry | Escopo | Modelo recomendado |
|---|---|---|---|
| Comercial | `commercialTools` | Conversa com leads em WhatsApp | `openai/gpt-4.1-mini` |
| **Arquiteto** | **`architectTools`** | **Construção e evolução de agentes (UI Phase 09 + 07B-v2)** | **`openai/gpt-4o` (forte)** |
| Orquestrador | `orchestratorTools` | Operação diária da aplicação | `openai/gpt-4.1-mini` |

**Por que modelo forte no Arquiteto:** conversação guiada com checklist adaptativo, raciocínio sobre materiais uploadados, geração estruturada de artefatos (não só responder mensagem curta). Custo extra compensa pela qualidade perceptível do agente gerado.

### 1.2 Fluxo de dados end-to-end

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER (CLIENT)                         │
│                                                                  │
│  /agents/new page                                                │
│    │                                                             │
│    ├─> ArchitectChat ──[useChat AI SDK]──> POST /api/arch/chat  │
│    │                                         (stream SSE)        │
│    │                                                             │
│    ├─> ArchitectComposer (attachments)                          │
│    │    │                                                        │
│    │    └─> POST /api/architect/upload                          │
│    │                                                             │
│    └─> ArtifactCard/RefinementDialog                            │
│         │                                                        │
│         └─> Server Actions (refineArtifact, approveArtifact)    │
└─────────────┬────────────────────────────────┬───────────────────┘
              │                                │
              ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                      NEXT.JS SERVER                              │
│                                                                  │
│  /api/architect/chat/route.ts                                    │
│    │                                                             │
│    ├─> Valida auth + rate limit (10/min/session)                │
│    ├─> Carrega agent_creation_session + workingMemory            │
│    ├─> architectAgent.stream(message, { memory, requestContext })│
│    │      │                                                      │
│    │      └─> Mastra internals (next section)                   │
│    │                                                             │
│    └─> toAIStreamResponse() ── stream SSE ──► Client             │
│                                                                  │
│  /api/architect/upload/route.ts                                  │
│    │                                                             │
│    ├─> Recebe multipart (PDF/DOCX/CSV/XLSX/TXT/img)             │
│    ├─> Upload → Supabase Storage (bucket: architect-uploads)    │
│    ├─> Cria row em knowledge_documents (status: pending)        │
│    └─> Enqueue job ingest-document na queue BullMQ              │
└─────────────┬────────────────────────────────┬───────────────────┘
              │                                │
              ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                  MASTRA + BACKGROUND WORKER                      │
│                                                                  │
│  architectAgent (packages/ai/src/mastra/agents/architect.ts)     │
│    │                                                             │
│    ├─> Resolve instructions (template contextualizado)          │
│    ├─> Loads workingMemory (Zod schema) do @mastra/pg           │
│    ├─> Executa tools (architectTools)                           │
│    │      │                                                      │
│    │      ├─> generateArtifact → DB upsert + event              │
│    │      ├─> refineArtifact → DB update + event                │
│    │      ├─> searchChunks → @mastra/pg PgVector.query          │
│    │      ├─> uploadDocument → já processado pelo worker        │
│    │      └─> publishAgentFromSession → tx atômica              │
│    │                                                             │
│    └─> Stream tokens ──> route handler ──► client                │
│                                                                  │
│  BullMQ worker: ingest-document                                  │
│    │                                                             │
│    ├─> Baixa arquivo do Storage                                 │
│    ├─> Extrai texto (pdf-parse/mammoth/papaparse/xlsx)          │
│    ├─> MDocument.fromText + chunk recursive (size=512, ovl=50)  │
│    ├─> embedMany OpenAI text-embedding-3-small                  │
│    ├─> pgVector.upsert (schema knowledge_chunks)                │
│    └─> Marca document ready + emite evento                      │
└──────────────────────────────────────────────────────────────────┘
              │                                │
              ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                      SUPABASE POSTGRES                           │
│                                                                  │
│  Tables (L4, project runtime):                                   │
│    • agent (07A + campos novos v2)                              │
│    • agent_creation_session (NEW)                               │
│    • agent_version (07A)                                        │
│    • knowledge_documents (NEW)                                  │
│    • knowledge_chunks (NEW, vector(1536) + HNSW)                │
│    • mastra_* tables (Memory do @mastra/pg)                     │
│                                                                  │
│  Extensions: pgvector (HNSW index)                              │
└──────────────────────────────────────────────────────────────────┘
```

### 1.3 Princípios arquiteturais

1. **Isolamento por registry.** Tools do Arquiteto **nunca** tocam agentes em produção exceto via `publishAgentFromSession` e `updateAgentStructurally`. Rascunho vive em tabela separada (`agent_creation_session`).
2. **Background para operações caras.** Ingest de documento e embedding vão pra BullMQ (já instalado 07A). Chat nunca bloqueia por upload.
3. **Atomicidade na publicação.** Criação de agente + migração de vector store + version snapshot + audit log acontece em única transação Postgres com rollback em falha.
4. **Streaming first.** Composer bloqueia envio enquanto stream ativo. Back-pressure garantido por estado do useChat.
5. **Paridade 1:1 UI ↔ tools.** Cada campo editável do Painel de Refino (07B-v2) terá tool correspondente em `architectTools` (Configurabilidade Tripla).

---

## 2. Instructions template do Arquiteto

### 2.1 Sistema de template

Instructions são compiladas dinamicamente por `buildArchitectInstructions(context)` em `packages/ai/src/mastra/instructions/architect.ts`. Contexto inclui:

- `templateId` (Clínica, E-commerce, etc) → injeta perguntas específicas do vertical
- `currentStage` (ideation/planning/knowledge/creation) → ajusta foco da conversa
- `checklist` do working memory → Arquiteto sabe o que já foi respondido
- `uploadedDocuments` → lista documentos já processados

### 2.2 System prompt master (em pt-BR, production-ready)

```typescript
export function buildArchitectInstructions(context: ArchitectContext): string {
  const { templateId, currentStage, checklist, uploadedDocuments } = context
  const template = TEMPLATE_REGISTRY[templateId]

  return `
Você é o Arquiteto, um agente especialista do Vertech Agents. Seu papel é conduzir o usuário (dono de um negócio) a construir um agente comercial completo através de uma conversa guiada em 4 etapas.

## Sua personalidade

Você é consultivo, direto, acolhedor. Fala português brasileiro natural. Nunca fala como robô. Nunca usa travessão (—). Usa emojis com moderação (saudação, celebração), nunca em tópicos técnicos ou de preço. Pensa em como um consultor sênior de vendas conversaria.

## Contexto do usuário

- Template escolhido: ${template.label}
- Tipo de negócio: ${template.industry}
- Etapa atual: ${currentStage}

## As 4 etapas (nunca menciona explicitamente ao usuário)

1. **Ideação** (coletar contexto do negócio)
   - Você precisa descobrir: nome do negócio, público-alvo, oferta (serviços/produtos), diferencial (opcional), objetivo do agente
   - Foque em 3-5 perguntas naturais. Não dispare questionário.
   - Se o usuário responde vago, aprofunde: "Me conta um exemplo concreto?"
   - Se responde cobrindo vários campos, pule perguntas já respondidas.

2. **Planejamento** (persona e capabilities)
   - Você propõe persona (nome, gênero F/M, tom em 4 eixos), técnicas comerciais (Rapport/SPIN/AIDA/PAS/Objeção/Follow-up), emojis (modo + quando usar), voz TTS (opcional), capabilities (qualificação/agendamento/FAQ/handoff/follow-up)
   - Proponha valores concretos baseados no negócio. Não peça o usuário escolher de menu.
   - Exemplo: "Pra uma clínica premium como a sua, proponho a Sofia, tom caloroso-profissional, técnicas Rapport + SPIN soft. Concorda?"

3. **Conhecimento** (materiais)
   - Verifica documentos já uploadados durante a conversa
   - Pergunta se falta algo (catálogo, tabela de preços, FAQ, PDF institucional)
   - Aceita "seguir sem material" se usuário preferir
   - Faz 2-3 perguntas de domínio específicas do vertical (ex: clínica: "quais urgências vocês atendem?")

4. **Criação** (resumo e publish)
   - Mostra Resumo Final consolidado
   - Gera preview do Flow Diagram
   - Usuário clica "Criar agente" (não você)

## Regras de fluxo adaptativo

- Se o usuário FOGE do fluxo (pergunta não-relacionada): acolha brevemente, volte ("ótimo, anotei. Voltando à sua clínica...")
- Se o usuário cobre N perguntas em 1 frase: marque todas no checklist interno, pule pra próxima pendente
- Se resposta vaga: aprofunde ANTES de seguir
- Se usuário demonstra urgência: acelere, corte perguntas opcionais
- Se usuário parece confuso: explique "pra te ajudar melhor, preciso saber..."
- NUNCA pergunte 2 coisas na mesma mensagem

## Geração de artefatos

Você gera artefatos estruturados ao concluir cada etapa:
- Ao fim da Ideação → chame tool \`generateArtifact({ artifactType: 'business_profile' })\`
- Ao fim do Planejamento → \`generateArtifact({ artifactType: 'agent_blueprint' })\`
- Ao fim do Conhecimento → \`generateArtifact({ artifactType: 'knowledge_base' })\`
- Na Criação → \`generateArtifact({ artifactType: 'final_summary' })\`

QUANDO gerar artefato vs continuar pergunta:
- Gere SOMENTE quando o checklist da etapa está completo (todos os campos obrigatórios preenchidos)
- Antes de gerar, sempre confirme: "Posso estruturar o que coletamos até aqui?"
- Se usuário diz sim: chame tool, depois mensagem natural explicando o card

## Upload de materiais

- Quando usuário anexa arquivo: use \`acknowledgeUpload(documentId)\` e cite no próximo turn
- Na etapa Conhecimento, use \`getDocumentKnowledge\` pra fazer recap do que foi extraído
- Se documento falhou: ofereça retry ou seguir sem

## Refinamento de artefatos

- Se usuário clica [Mandar alteração no chat]: ele vai digitar instrução no próximo turn
- Leia a instrução, chame \`refineArtifact({ artifactId, instruction })\`
- Substitua o card antigo pelo novo na resposta

## Comportamento em tool calls

- Sempre narre ao usuário o que você está fazendo antes/depois: "vou estruturar isso" / "pronto, dá uma olhada"
- NUNCA faça tool call sem contextualizar pro usuário
- Se tool falha: informe honestamente, ofereça retry

## Template específico deste negócio

${template.promptInjection}

## Checklist atual (você SEMPRE sabe o estado do working memory)

${JSON.stringify(checklist, null, 2)}

## Documentos já processados

${uploadedDocuments.length > 0
  ? uploadedDocuments.map(d => `- ${d.fileName} (${d.status})`).join('\n')
  : '(nenhum ainda)'}

## Few-shot examples

**Usuário responde vago na Ideação:**
> User: "Vendo um curso online"
> Você: "Legal! Me conta um pouco mais: é curso de quê, qual o público principal, e qual é o ticket médio?"

**Usuário cobre vários campos de uma vez:**
> User: "Sou dentista em SP, clínica premium com 4 dentistas, foco em estética"
> Você: (marca businessName, industry, differentiator, targetAudience implícito) "Bacana. Entendi a estrutura. Duas perguntas pra fechar o contexto: qual o objetivo principal do agente (qualificar, agendar, atender dúvidas)? E o ticket médio por procedimento?"

**Usuário foge do fluxo:**
> User: "Quanto custa o Vertech?"
> Você: "Vou te passar informações de plano depois da criação, beleza? Voltando ao seu negócio: [próxima pergunta pendente]"
`
}
```

### 2.3 Template por vertical

Cada template tem arquivo próprio em `packages/ai/src/mastra/templates/` (ex: `clinical.ts`):

```typescript
export const CLINICAL_TEMPLATE: ArchitectTemplate = {
  id: 'clinical',
  label: 'Clínica',
  industry: 'saúde',
  emoji: '🏥',

  promptInjection: `
Este é um template de clínica (odontologia, estética, médica, veterinária).

Perguntas-chave específicas pra explorar:
- Especialidades e procedimentos oferecidos
- Convênios aceitos (se algum)
- Horário de atendimento
- Urgências atendidas
- Tempo médio de procedimento
- Política de cancelamento e remarcação
- LGPD e privacidade de dados de saúde

Presets de técnicas comerciais sugeridos:
- Rapport (crucial em saúde, alta empatia)
- Objeção de preço (procedimento eletivo tem ticket alto)
- Handoff em urgências médicas

Persona padrão sugerida:
- Tom: caloroso (70-80/100)
- Formalidade: balanceada (55-70/100)
- Humor: baixo (20-30/100)
- Empatia: alta (80-90/100)
- Anti-patterns: nunca inventar diagnóstico, nunca dar instrução médica, sempre encaminhar pra profissional

Emojis sugeridos: 😊 ✨ 🙂 (nunca em tópicos de dor/urgência/preço)

Capabilities essenciais:
- Qualificação (tipo de procedimento, urgência, horário preferido)
- Agendamento (integração com agenda do consultório)
- FAQ (procedimentos comuns, formas de pagamento)
- Handoff (urgência médica, dor forte, pergunta clínica específica)
`,
}
```

### 2.4 Quando gerar artefato vs continuar pergunta

Regra no prompt (reforçada por tool description):

- **Gerar:** se todos os campos obrigatórios da etapa estão preenchidos no `checklist[currentStage]`
- **Continuar:** se falta pelo menos 1 campo obrigatório OU se usuário acabou de enviar info nova (deixe absorver, confirme entendimento antes de avançar)

### 2.5 Quando acusar upload

- `acknowledgeUpload(documentId)` é chamado **no próximo turn** após upload aparecer em `uploadedDocuments`. Não precisa esperar `status: 'ready'` (acusa recebimento + avisa "estou processando").
- Quando `status` muda pra `ready`, o sistema emite evento via Realtime. O Arquiteto recebe no próximo invoke e faz menção natural se for relevante ao contexto atual.

---

## 3. Working memory structure

### 3.1 Schema TypeScript completo

```typescript
// packages/ai/src/mastra/types/architect-working-memory.ts
import { z } from 'zod'

export const architectWorkingMemorySchema = z.object({
  sessionId: z.string().uuid(),
  templateId: z.enum([
    'clinical',
    'ecommerce',
    'real_estate',
    'info_product',
    'saas',
    'local_services',
    'custom',
  ]),

  currentStage: z.enum(['ideation', 'planning', 'knowledge', 'creation']),

  checklist: z.object({
    ideation: z.object({
      businessName: z.string().nullable().default(null),
      industry: z.string().nullable().default(null),
      targetAudience: z.string().nullable().default(null),
      offering: z.string().nullable().default(null),
      differentiator: z.string().nullable().default(null),
      goalForAgent: z.string().nullable().default(null),
      ticketMean: z.string().nullable().default(null),
      status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
    }),

    planning: z.object({
      persona: z.object({
        name: z.string().nullable().default(null),
        gender: z.enum(['feminine', 'masculine']).nullable().default(null),
        tone: z.number().min(0).max(100).nullable().default(null),
        formality: z.number().min(0).max(100).nullable().default(null),
        humor: z.number().min(0).max(100).nullable().default(null),
        empathy: z.number().min(0).max(100).nullable().default(null),
        antiPatterns: z.array(z.string()).default([]),
      }),
      salesTechniques: z.array(z.object({
        presetId: z.enum(['rapport', 'spin', 'aida', 'pas', 'objection', 'followup']),
        intensity: z.enum(['soft', 'balanced', 'aggressive']),
      })).default([]),
      emojiConfig: z.object({
        mode: z.enum(['none', 'curated', 'free']).default('curated'),
        curatedList: z.array(z.string()).default([]),
        allowed: z.array(z.enum(['greeting', 'celebration', 'achievement', 'empathy'])).default([]),
        forbidden: z.array(z.enum(['pricing', 'objection', 'complaint', 'serious_topic'])).default([]),
      }),
      voiceConfig: z.object({
        enabled: z.boolean().default(false),
        provider: z.enum(['elevenlabs', 'qwen-self-hosted']).nullable().default(null),
        voiceId: z.string().nullable().default(null),
        mode: z.enum(['always_text', 'always_audio', 'triggered']).default('always_text'),
        triggers: z.array(z.string()).default([]),
      }),
      capabilities: z.array(z.enum([
        'qualification',
        'scheduling',
        'faq',
        'handoff',
        'followup',
      ])).default([]),
      status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
    }),

    knowledge: z.object({
      documentIds: z.array(z.string().uuid()).default([]),
      additionalNotes: z.string().nullable().default(null),
      domainAnswers: z.record(z.string(), z.string()).default({}),
      status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
    }),

    creation: z.object({
      finalized: z.boolean().default(false),
      publishedAgentId: z.string().uuid().nullable().default(null),
      status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
    }),
  }),

  artifactIds: z.object({
    businessProfile: z.string().uuid().nullable().default(null),
    agentBlueprint: z.string().uuid().nullable().default(null),
    knowledgeBase: z.string().uuid().nullable().default(null),
    finalSummary: z.string().uuid().nullable().default(null),
  }),
})

export type ArchitectWorkingMemory = z.infer<typeof architectWorkingMemorySchema>
```

### 3.2 Tamanho

Schema preenchido gera aproximadamente 1.5-2KB JSON serializado. Em tokens: ~400-600 (estimativa). Abaixo do limite soft recomendado pelo Mastra (~500 tokens).

### 3.3 Estratégia de update

Working memory é atualizado em **3 pontos**:

1. **Tool call do Arquiteto:** cada tool relevante (`generateArtifact`, `refineArtifact`, `acknowledgeUpload`) retorna o estado parcial novo do working memory. Mastra aplica merge.
2. **Server Action do usuário:** quando user aprova artefato inline (`approveArtifact`), o server action atualiza working memory via `mastraClient.updateWorkingMemory()`.
3. **Event-driven (upload ready):** quando BullMQ worker completa ingest, emite evento que dispara sync do working memory via background job (adiciona `documentId` a `checklist.knowledge.documentIds` e status da knowledge muda pra `in_progress`).

Conflitos (ex: user aprova E Arquiteto gera outro artefato simultaneamente) resolvidos por **optimistic locking com version column** em `agent_creation_session` (DB-level, não no working memory).

### 3.4 Integração com lastMessages e semanticRecall

Conforme pesquisa Atlas § 1:

```typescript
options: {
  lastMessages: 20,                    // 20 msgs recentes sempre no prompt
  semanticRecall: {
    topK: 5,                            // 5 msgs recalled via embedding
    messageRange: { before: 2, after: 1 },
    scope: 'resource',                  // cruza threads (user reabre sessão)
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
}
```

Prompt final montado pelo Mastra:
1. System prompt (buildArchitectInstructions)
2. Working memory estruturada (JSON)
3. Last 20 messages
4. Semantic recall results (5 msgs históricas relevantes)
5. Current user message

---

## 4. Tool signatures

### 4.1 Registry: `architectTools`

Localização: `packages/ai/src/mastra/tools/architect.ts`

```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const architectTools = {
  acknowledgeUpload,
  generateArtifact,
  refineArtifact,
  approveArtifact,
  searchChunks,
  getDocumentKnowledge,
  publishAgentFromSession,
  updateAgentStructurally,
  suggestTemplateForBusiness,
  simulateConversation, // stub em 09, funcional em 07B-v2 (sandbox)
}
```

### 4.2 Tools essenciais (Phase 09)

#### 4.2.1 `acknowledgeUpload`

```typescript
const acknowledgeUpload = createTool({
  id: 'acknowledge-upload',
  description: `Reconhece que um documento foi uploadado pelo usuário e está sendo processado.
Use quando um novo documento aparecer em workingMemory.uploadedDocuments.
NÃO use se o documento já foi reconhecido antes.`,
  inputSchema: z.object({
    documentId: z.string().uuid(),
    brief_acknowledgment: z.string().max(120).describe(
      'Mensagem curta natural pro usuário, ex: "Recebi o catálogo, vou processar aqui"'
    ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    document: z.object({
      id: z.string().uuid(),
      fileName: z.string(),
      status: z.enum(['processing', 'ready', 'error']),
    }),
  }),
  execute: async ({ context, mastra }) => {
    const { documentId, brief_acknowledgment } = context
    const sessionId = mastra.requestContext.get('sessionId')

    const doc = await db.query.knowledgeDocuments.findFirst({
      where: and(
        eq(knowledgeDocuments.id, documentId),
        eq(knowledgeDocuments.sessionId, sessionId),
      ),
    })

    if (!doc) {
      return { success: false, error: 'Document not found or not in this session' }
    }

    return {
      success: true,
      document: {
        id: doc.id,
        fileName: doc.title,
        status: doc.status,
      },
    }
  },
})
```

**Errors:**
- `DOCUMENT_NOT_FOUND`: documentId não pertence à sessão
- `SESSION_EXPIRED`: sessão abandoned

#### 4.2.2 `generateArtifact`

```typescript
const generateArtifact = createTool({
  id: 'generate-artifact',
  description: `Gera um artefato estruturado consolidando o que foi coletado até aqui.
Use APENAS quando todos os campos obrigatórios da etapa atual estão preenchidos.
Sempre confirme com o usuário antes de chamar: "posso estruturar o que coletamos?"`,
  inputSchema: z.object({
    artifactType: z.enum([
      'business_profile',    // Ideação
      'agent_blueprint',     // Planejamento
      'knowledge_base',      // Conhecimento
      'final_summary',       // Criação
    ]),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    artifact: z.object({
      id: z.string().uuid(),
      type: z.string(),
      content: z.record(z.string(), z.any()),
      status: z.literal('generated'),
    }),
  }),
  execute: async ({ context, mastra }) => {
    const sessionId = mastra.requestContext.get('sessionId')
    const workingMemory = await getWorkingMemory(sessionId)
    const { artifactType } = context

    const content = buildArtifactContent(artifactType, workingMemory)
    // Ex: pra 'business_profile' consolida checklist.ideation

    const artifact = await db.insert(agentArtifacts).values({
      sessionId,
      type: artifactType,
      content,
      status: 'generated',
    }).returning()

    // Update working memory inline
    await updateWorkingMemory(sessionId, {
      artifactIds: {
        ...workingMemory.artifactIds,
        [camelCase(artifactType)]: artifact[0].id,
      },
    })

    return {
      success: true,
      artifact: artifact[0],
    }
  },
})
```

#### 4.2.3 `refineArtifact`

```typescript
const refineArtifact = createTool({
  id: 'refine-artifact',
  description: `Regenera um artefato aplicando instrução em linguagem natural do usuário.
Use quando usuário disser [Mandar alteração no chat] seguido de uma instrução.
NÃO use pra mudanças pontuais (usar approveArtifact com patch).`,
  inputSchema: z.object({
    artifactId: z.string().uuid(),
    instruction: z.string().min(5).max(500),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    artifact: z.object({
      id: z.string().uuid(),
      type: z.string(),
      content: z.record(z.string(), z.any()),
      status: z.literal('regenerated'),
    }),
    diff: z.array(z.object({
      field: z.string(),
      before: z.any(),
      after: z.any(),
    })),
  }),
  execute: async ({ context, mastra }) => {
    const { artifactId, instruction } = context
    const current = await db.query.agentArtifacts.findFirst({ where: eq(agentArtifacts.id, artifactId) })

    // LLM sub-call pra regenerar content com instrução aplicada
    const newContent = await regenerateArtifactContent(current.content, instruction, current.type)

    await db.update(agentArtifacts)
      .set({ content: newContent, status: 'regenerated', updatedAt: new Date() })
      .where(eq(agentArtifacts.id, artifactId))

    return {
      success: true,
      artifact: { ...current, content: newContent, status: 'regenerated' },
      diff: computeDiff(current.content, newContent),
    }
  },
})
```

#### 4.2.4 `approveArtifact`

```typescript
const approveArtifact = createTool({
  id: 'approve-artifact',
  description: 'Marca artefato como aprovado. Trava edições. Avança etapa no working memory.',
  inputSchema: z.object({
    artifactId: z.string().uuid(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    artifact: z.object({ id: z.string().uuid(), status: z.literal('approved') }),
    nextStage: z.enum(['planning', 'knowledge', 'creation']).nullable(),
  }),
  execute: async ({ context, mastra }) => {
    const sessionId = mastra.requestContext.get('sessionId')
    const { artifactId } = context

    await db.update(agentArtifacts)
      .set({ status: 'approved', approvedAt: new Date() })
      .where(eq(agentArtifacts.id, artifactId))

    const workingMemory = await getWorkingMemory(sessionId)
    const artifact = await db.query.agentArtifacts.findFirst({ where: eq(agentArtifacts.id, artifactId) })

    const nextStage = getNextStage(artifact.type, workingMemory)

    // Advance working memory
    await updateWorkingMemory(sessionId, {
      currentStage: nextStage ?? workingMemory.currentStage,
      checklist: {
        ...workingMemory.checklist,
        [getStageForArtifactType(artifact.type)]: {
          ...workingMemory.checklist[getStageForArtifactType(artifact.type)],
          status: 'done',
        },
      },
    })

    return { success: true, artifact, nextStage }
  },
})
```

#### 4.2.5 `searchChunks` (retrieval RAG)

```typescript
const searchChunks = createTool({
  id: 'search-chunks',
  description: `Busca no vector store os chunks de conhecimento mais relevantes à query.
Use quando precisar de info específica do material uploadado (ex: "qual o preço do procedimento X?").`,
  inputSchema: z.object({
    query: z.string().min(3),
    topK: z.number().int().min(1).max(10).default(5),
  }),
  outputSchema: z.object({
    chunks: z.array(z.object({
      content: z.string(),
      similarity: z.number(),
      documentId: z.string(),
      documentTitle: z.string(),
    })),
  }),
  execute: async ({ context, mastra }) => {
    const sessionId = mastra.requestContext.get('sessionId')
    const { query, topK } = context

    const { embeddings } = await embedMany({
      model: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
      values: [query],
    })

    const results = await pgVector.query({
      indexName: 'knowledge_chunks',
      queryVector: embeddings[0],
      topK,
      filter: { sessionId }, // RAG de rascunho, escopo sessão
    })

    return {
      chunks: results.map(r => ({
        content: r.metadata.text,
        similarity: r.score,
        documentId: r.metadata.documentId,
        documentTitle: r.metadata.documentTitle,
      })),
    }
  },
})
```

#### 4.2.6 `getDocumentKnowledge` (recap etapa Conhecimento)

```typescript
const getDocumentKnowledge = createTool({
  id: 'get-document-knowledge',
  description: 'Retorna resumo do que foi extraído de todos os documentos da sessão. Use na etapa Conhecimento pra fazer recap pro usuário.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    documents: z.array(z.object({
      id: z.string().uuid(),
      title: z.string(),
      status: z.enum(['processing', 'ready', 'error']),
      summary: z.string().nullable(),
      chunkCount: z.number().int(),
    })),
  }),
  execute: async ({ mastra }) => {
    const sessionId = mastra.requestContext.get('sessionId')
    const docs = await db.query.knowledgeDocuments.findMany({
      where: eq(knowledgeDocuments.sessionId, sessionId),
      with: { chunks: { columns: { id: true } } },
    })

    return {
      documents: docs.map(d => ({
        id: d.id,
        title: d.title,
        status: d.status,
        summary: d.extractedSummary, // field populado pelo worker após ingest
        chunkCount: d.chunks.length,
      })),
    }
  },
})
```

#### 4.2.7 `publishAgentFromSession` (transação atômica)

Detalhada em § 6.

#### 4.2.8 `updateAgentStructurally` (Chat de Evolução pós-criação)

Usado apenas no Painel de Refino 07B-v2. Documento esse aqui pra completude do registry.

```typescript
const updateAgentStructurally = createTool({
  id: 'update-agent-structurally',
  description: `Aplica mudanças estruturais em agente já publicado.
Use no Chat de Evolução quando usuário pede alteração (ex: "adicionei 2 produtos novos").
SEMPRE confirme com usuário antes de aplicar (mostrando diff).`,
  inputSchema: z.object({
    agentId: z.string().uuid(),
    changes: z.object({
      businessContext: z.any().optional(),
      personality: z.any().optional(),
      conversationStyle: z.any().optional(),
      emojiConfig: z.any().optional(),
      voice: z.any().optional(),
      salesTechniques: z.any().optional(),
      addKnowledgeDocIds: z.array(z.string().uuid()).optional(),
      removeKnowledgeDocIds: z.array(z.string().uuid()).optional(),
    }),
    reason: z.string().describe('Descrição humana da mudança pra audit log'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    newVersion: z.number().int(),
    diff: z.array(z.object({
      field: z.string(),
      before: z.any(),
      after: z.any(),
    })),
  }),
  execute: async ({ context, mastra }) => {
    return await db.transaction(async (tx) => {
      const agent = await tx.query.agents.findFirst({ where: eq(agents.id, context.agentId) })

      // Aplica changes
      const updated = mergeChanges(agent, context.changes)
      await tx.update(agents).set(updated).where(eq(agents.id, context.agentId))

      // Snapshot agent_version
      const version = agent.version + 1
      await tx.insert(agentVersions).values({
        agentId: context.agentId,
        version,
        snapshot: updated,
        createdByUserId: mastra.requestContext.get('userId'),
        reason: context.reason,
      })

      // Audit log
      await tx.insert(orchestratorAuditLog).values({
        actorType: 'architect',
        action: 'agent_updated_structurally',
        resourceType: 'agent',
        resourceId: context.agentId,
        changes: context.changes,
        reason: context.reason,
      })

      // Emit event (via realtime)
      await emitEvent('agent.updated', { agentId: context.agentId, version })

      return {
        success: true,
        newVersion: version,
        diff: computeDiff(agent, updated),
      }
    })
  },
})
```

### 4.3 Tools auxiliares (Phase 09)

#### 4.3.1 `suggestTemplateForBusiness`

Uso: se usuário escolheu "Personalizado" e descreveu o negócio, Arquiteto pode sugerir aplicar template conhecido.

```typescript
inputSchema: z.object({
  businessDescription: z.string().min(10),
}),
outputSchema: z.object({
  suggestedTemplateId: z.string().nullable(),
  reasoning: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
}),
```

#### 4.3.2 `simulateConversation` (stub em 09, funcional em 07B-v2)

Reservado pra Sandbox do Painel de Refino. Em Phase 09 só cria o registry vazio.

---

## 5. RAG strategy

### 5.1 Decisões finais (fundamentadas na pesquisa Atlas)

| Decisão | Valor | Referência |
|---|---|---|
| Embedding model | `openai/text-embedding-3-small` (1536d) | Atlas § 1 |
| Framework RAG | `@mastra/rag` (MDocument) + `@mastra/pg` (PgVector) | Atlas § 2 |
| Chunk strategy | `recursive` | Atlas § 2 |
| Chunk size | 512 chars | Padrão oficial |
| Chunk overlap | 50 chars | Padrão oficial |
| Separators | `['\n\n', '\n', '. ', ' ']` | Atlas § 2 |
| Index | HNSW `vector_cosine_ops` | Atlas § 3 |
| Index params | `m=16, ef_construction=64` | Padrão pgvector |
| Query `ef_search` | 100 (via `SET LOCAL`) | Atlas § 3 |
| Top-K retrieval | 5 | Balanço context vs token |
| Similarity threshold | 0.5 (cosine similarity) | Conservative, evita lixo |

### 5.2 Pipeline completo de ingest

```typescript
// packages/ai/src/rag/ingest.ts
import { MDocument } from '@mastra/rag'
import { embedMany } from 'ai'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { pgVector } from '../mastra/instance'
import { db } from '@repo/database'
import { extractText } from './extractors' // pdf-parse, mammoth, xlsx, papaparse

export async function ingestDocumentJob(documentId: string) {
  const doc = await db.query.knowledgeDocuments.findFirst({ where: eq(knowledgeDocuments.id, documentId) })
  if (!doc) throw new Error('DOC_NOT_FOUND')

  await db.update(knowledgeDocuments)
    .set({ status: 'processing' })
    .where(eq(knowledgeDocuments.id, documentId))

  try {
    // 1. Baixa e extrai texto
    const fileBuffer = await downloadFromStorage(doc.fileUrl)
    const text = await extractText(fileBuffer, doc.fileType)

    // 2. Chunk
    const mdoc = MDocument.fromText(text)
    const chunks = await mdoc.chunk({
      strategy: 'recursive',
      size: 512,
      overlap: 50,
      separators: ['\n\n', '\n', '. ', ' '],
    })

    // 3. Embed (batch)
    const { embeddings } = await embedMany({
      model: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
      values: chunks.map(c => c.text),
    })

    // 4. Upsert em knowledge_chunks
    await db.insert(knowledgeChunks).values(
      chunks.map((chunk, i) => ({
        documentId: doc.id,
        content: chunk.text,
        embedding: embeddings[i],
        metadata: {
          position: i,
          totalChunks: chunks.length,
          sessionId: doc.sessionId,
          agentId: doc.agentId, // null durante rascunho
          documentTitle: doc.title,
          text: chunk.text, // duplicado pra facilitar query
        },
      }))
    )

    // 5. Gera resumo do doc (opcional, pra recap na etapa Conhecimento)
    const summary = await generateDocSummary(text.slice(0, 3000))

    await db.update(knowledgeDocuments)
      .set({
        status: 'ready',
        chunkCount: chunks.length,
        extractedSummary: summary,
      })
      .where(eq(knowledgeDocuments.id, documentId))

    await emitEvent('knowledge.document.ready', { documentId, sessionId: doc.sessionId })

  } catch (error) {
    await db.update(knowledgeDocuments)
      .set({ status: 'error', errorMessage: error.message })
      .where(eq(knowledgeDocuments.id, documentId))

    await emitEvent('knowledge.document.failed', { documentId, error: error.message })
  }
}
```

### 5.3 Retrieval durante conversa

```typescript
// Via tool searchChunks (§ 4.2.5) ou direto em packages/ai/src/rag/query.ts

export async function queryKnowledge(
  sessionId: string | null,
  agentId: string | null,
  query: string,
  topK = 5,
  similarityThreshold = 0.5,
) {
  const { embeddings } = await embedMany({
    model: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
    values: [query],
  })

  const filter = sessionId ? { sessionId } : { agentId }

  // ef_search tuning pra recall
  await db.execute(sql`SET LOCAL hnsw.ef_search = 100`)

  const results = await pgVector.query({
    indexName: 'knowledge_chunks',
    queryVector: embeddings[0],
    topK: topK * 2, // buffer pra filter depois
    filter,
  })

  return results
    .filter(r => r.score > similarityThreshold)
    .slice(0, topK)
}
```

### 5.4 Performance expectations

| Cenário | Chunks | Query p50 | Query p95 |
|---|---|---|---|
| Sessão média (3 PDFs + 1 URL) | ~200 chunks | <20ms | <50ms |
| Agente médio produção (10+ docs) | ~1000 chunks | <50ms | <150ms |
| Agente denso (catálogos grandes) | ~10k chunks | <100ms | <300ms |

Monitorar via health endpoint `/api/admin/health/database` (já existe 07A).

---

## 6. Transação atômica de publicação

### 6.1 Sequência completa

```typescript
// apps/web/app/api/architect/publish/route.ts (server action ou route)
// Chamada por publishAgentFromSession tool OR botão "Criar agente" da etapa Criação

export async function publishAgentFromSession(sessionId: string, userId: string) {
  return await db.transaction(async (tx) => {
    // 1. Carrega sessão completa
    const session = await tx.query.agentCreationSession.findFirst({
      where: and(
        eq(agentCreationSession.id, sessionId),
        eq(agentCreationSession.userId, userId),
        eq(agentCreationSession.status, 'draft'),
      ),
    })
    if (!session) throw new PublishError('SESSION_NOT_FOUND_OR_WRONG_STATUS')

    // 2. Carrega working memory da sessão Mastra
    const workingMemory = await getWorkingMemoryFromMastra(sessionId)

    // 3. Valida checklist completo
    const validationErrors = validateChecklistForPublish(workingMemory.checklist)
    if (validationErrors.length > 0) {
      throw new PublishError('CHECKLIST_INCOMPLETE', validationErrors)
    }

    // 4. Cria agent
    const [agent] = await tx.insert(agents).values({
      organizationId: session.organizationId,
      name: workingMemory.checklist.planning.persona.name,
      role: buildAgentRole(workingMemory),
      avatarUrl: null, // usuário define depois no Painel de Refino
      gender: workingMemory.checklist.planning.persona.gender,
      description: buildAgentDescription(workingMemory),

      // Config do modelo (default)
      model: 'openai/gpt-4.1-mini',
      temperature: 0.7,
      maxSteps: 10,

      // Persona + business + conversation style (JSONB)
      personality: {
        tone: workingMemory.checklist.planning.persona.tone,
        formality: workingMemory.checklist.planning.persona.formality,
        humor: workingMemory.checklist.planning.persona.humor,
        empathyLevel: workingMemory.checklist.planning.persona.empathy,
        inviolableRules: workingMemory.checklist.planning.persona.antiPatterns,
      },
      businessContext: buildBusinessContext(workingMemory.checklist.ideation),
      conversationStyle: buildConversationStyle(workingMemory),

      // Features novas v2
      emojiConfig: workingMemory.checklist.planning.emojiConfig,
      voice: workingMemory.checklist.planning.voiceConfig,
      salesTechniques: workingMemory.checklist.planning.salesTechniques,
      antiPatterns: workingMemory.checklist.planning.persona.antiPatterns,
      conversationExamples: [], // vazio, preenche no Painel de Refino

      // Tools habilitadas baseadas em capabilities
      enabledTools: deriveToolsFromCapabilities(workingMemory.checklist.planning.capabilities),

      // Knowledge docs IDs
      knowledgeDocIds: workingMemory.checklist.knowledge.documentIds,

      // Status
      status: 'DRAFT',
      version: 1,
      whatsappInstanceId: null, // vincular depois no Painel de Refino

      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning()

    // 5. Migra knowledge_documents de rascunho pra oficial
    await tx.update(knowledgeDocuments)
      .set({ agentId: agent.id, sessionId: null })
      .where(eq(knowledgeDocuments.sessionId, sessionId))

    // 6. Atualiza metadata dos chunks (o FK é via documentId, mas metadata.agentId facilita query)
    await tx.execute(sql`
      UPDATE knowledge_chunks
      SET metadata = jsonb_set(
        metadata,
        '{agentId}',
        to_jsonb(${agent.id}::text)
      )
      WHERE (metadata->>'sessionId') = ${sessionId}
    `)

    // 7. Cria snapshot v1 em agent_versions
    await tx.insert(agentVersions).values({
      agentId: agent.id,
      version: 1,
      snapshot: agent,
      createdByUserId: userId,
      reason: 'Published from Architect session',
    })

    // 8. Marca sessão publicada
    await tx.update(agentCreationSession)
      .set({
        status: 'published',
        publishedAgentId: agent.id,
        updatedAt: new Date(),
      })
      .where(eq(agentCreationSession.id, sessionId))

    // 9. Audit log
    await tx.insert(orchestratorAuditLog).values({
      actorType: 'architect',
      actorUserId: userId,
      action: 'agent_published',
      resourceType: 'agent',
      resourceId: agent.id,
      organizationId: session.organizationId,
      metadata: { sessionId, knowledgeDocCount: session.draftKnowledgeDocs?.length ?? 0 },
    })

    // 10. Emite eventos (fora da transação seria ideal, mas aqui ok pra simplicidade)
    await emitEvent('agent.created', { agentId: agent.id, organizationId: session.organizationId })
    if (workingMemory.checklist.knowledge.documentIds.length > 0) {
      await emitEvent('knowledge.migrated', { agentId: agent.id, documentIds: workingMemory.checklist.knowledge.documentIds })
    }

    return agent
  })
}
```

### 6.2 Rollback paths

Transação Postgres reverte tudo automaticamente se qualquer step lançar. Pontos críticos:

| Step | Falha possível | Mitigação |
|---|---|---|
| Step 3 (validate checklist) | Campos faltando | Erro early antes de qualquer write, UI exibe lista do que falta |
| Step 4 (insert agent) | Constraint violation, FK inválido | Transação reverte, UI mostra erro + permite retry |
| Step 5 (migrar docs) | Concurrent update em knowledge_documents | Unlikely se lock adequado; se falhar, revert |
| Step 6 (update metadata chunks) | JSONB malformado | Validação prévia do workingMemory |
| Step 7 (agent_versions snapshot) | JSONB size > limit (raro) | Truncar snapshot grande antes de insert |

Em falha: retorna erro estruturado ao UI, Arquiteto exibe mensagem ("tive um erro, vamos tentar de novo?"). Rascunho permanece em `draft`, usuário pode retomar.

### 6.3 Retry strategy

Cliente UI implementa retry automático até 3 vezes com backoff exponencial (1s, 3s, 9s). Se falhar 3x, mostra mensagem com código `ERR-{sessionId}` pra suporte (UI Spec § 10.2).

---

## 7. Streaming, back-pressure, rate limit

### 7.1 Streaming com Vercel AI SDK

```typescript
// apps/web/app/api/architect/chat/route.ts
import { mastra } from '@/lib/mastra'

export async function POST(request: Request) {
  const session = await requireSession(request)
  const body = await request.json()
  const { sessionId, messages, attachmentIds } = body

  // Rate limit middleware (§ 7.3)
  await checkRateLimit(session.userId, sessionId)

  // Valida session ownership
  await requireSessionOwnership(session.userId, sessionId)

  // Invoca Arquiteto via Mastra stream
  const result = await mastra.getAgent('architect').stream(
    messages[messages.length - 1].content,
    {
      memory: {
        thread: sessionId,
        resource: session.userId,
      },
      runtimeContext: {
        sessionId,
        userId: session.userId,
        organizationId: session.organizationId,
        attachmentIds,
      },
    }
  )

  // Returns AI SDK compatible stream
  return result.toAIStreamResponse()
}
```

### 7.2 Back-pressure no composer (client side)

```typescript
// apps/web/modules/saas/agents/architect/hooks/useArchitectChat.ts
import { useChat } from '@ai-sdk/react'

export function useArchitectChat(sessionId: string) {
  const { messages, input, handleSubmit, isLoading, stop } = useChat({
    api: '/api/architect/chat',
    id: sessionId,
    body: { sessionId },
    onError: handleError,
    experimental_throttle: 50,
  })

  const canSend = !isLoading && input.trim().length > 0

  return { messages, input, handleSubmit, canSend, isLoading, stop }
}
```

`canSend` controla o botão enviar. `isLoading` é true enquanto stream ativo → botão disabled. User pode clicar `stop` pra abortar mid-stream (ESC key também).

### 7.3 Rate limit

**Implementação: server-side middleware com Redis.**

```typescript
// apps/web/lib/rate-limit/architect.ts
import { redis } from '@repo/queue/redis'

export async function checkRateLimit(userId: string, sessionId: string) {
  const key = `rate:architect:${sessionId}`
  const limit = 10 // 10 msgs/min/session
  const window = 60 // 1 minuto

  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, window)
  }

  if (current > limit) {
    const ttl = await redis.ttl(key)
    throw new RateLimitError({
      retryAfter: ttl,
      limit,
      window,
    })
  }
}
```

No cliente, se 429 retornar:
- Toast "Você está falando muito rápido. Arquiteto precisa de tempo pra processar. Tente em {ttl}s."
- Composer desabilitado por `ttl` segundos com countdown.

### 7.4 Retry em erro de stream

AI SDK `useChat` tem retry built-in via `onError` callback. Estratégia:

```typescript
const { reload } = useChat({ /* ... */ })

function handleError(error: Error) {
  if (error.name === 'AbortError') return // user stopped
  if (isNetworkError(error)) {
    toast.info('Sem conexão. Vou tentar de novo em instantes.')
    setTimeout(() => reload(), 3000)
    return
  }
  toast.error('Erro inesperado. Tente de novo.')
}
```

### 7.5 Reconexão automática

- Hook `useOnlineStatus` detecta `navigator.onLine`.
- Quando volta online: botão envio habilita, auto-retry da última mensagem em queue local.
- Queue local em `localStorage` (persistente).

---

## 8. Session persistence + auto-save

### 8.1 Schema `agent_creation_session` (refinado)

```typescript
// packages/database/drizzle/schema/agent-creation-session.ts
export const agentCreationSession = pgTable('agent_creation_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organization.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  templateId: text('template_id').notNull(),
  status: pgEnum('agent_creation_status', ['draft', 'published', 'abandoned']).notNull().default('draft'),

  // Mastra storage lida com messages + workingMemory via Memory class.
  // Aqui só guardamos ponteiros + metadata
  mastraThreadId: text('mastra_thread_id').notNull(), // = id desta sessão
  mastraResourceId: text('mastra_resource_id').notNull(), // = userId

  // Cache do último snapshot do working memory (pra lista de rascunhos e recovery fast)
  draftSnapshot: jsonb('draft_snapshot').$type<ArchitectWorkingMemory>(),

  publishedAgentId: uuid('published_agent_id').references(() => agent.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  abandonedAt: timestamp('abandoned_at'),
}, (table) => [
  index('session_org_status_idx').on(table.organizationId, table.status),
  index('session_user_status_idx').on(table.userId, table.status),
])
```

### 8.2 Frequência de auto-save

**Decisão: auto-save em 2 triggers, não debounce contínuo:**

1. **Após cada tool call do Arquiteto** (imediato, via Mastra internals). Mastra persiste working memory automaticamente em `mastra_*` tables.
2. **Após cada mensagem do usuário enviada** (server-side, ao gravar msg no thread Mastra também atualiza `draftSnapshot` em `agent_creation_session`).

Não há debounce em cliques de UI porque cada click que altera estado (aprovar, refinar, anexar) é server action que persiste imediatamente.

**`draftSnapshot` JSONB:** redundância pensada. Mastra guarda working memory em seu próprio formato (em tabelas `mastra_threads` + `mastra_messages`). `draftSnapshot` é **cache denormalizado** pra queries rápidas na tela de boas-vindas (lista "Rascunhos em andamento") sem precisar consultar Mastra internals.

### 8.3 Cleanup de sessões abandoned

```typescript
// packages/queue/src/jobs/cleanup-abandoned-sessions.ts
// Cron job diário (3AM UTC)

export async function cleanupAbandonedSessions() {
  const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 dias

  // Marca abandoned
  await db.update(agentCreationSession)
    .set({ status: 'abandoned', abandonedAt: new Date() })
    .where(
      and(
        eq(agentCreationSession.status, 'draft'),
        lt(agentCreationSession.updatedAt, threshold),
      )
    )

  // Remove vector store órfãos (documentos de sessões abandoned)
  const abandonedSessionIds = await db.query.agentCreationSession.findMany({
    where: eq(agentCreationSession.status, 'abandoned'),
    columns: { id: true },
  })

  await db.delete(knowledgeDocuments)
    .where(
      and(
        inArray(knowledgeDocuments.sessionId, abandonedSessionIds.map(s => s.id)),
        isNull(knowledgeDocuments.agentId), // nunca foi promovido
      )
    )

  // (knowledge_chunks cascade via FK onDelete: 'cascade')

  // Opcional: hard delete sessões abandoned > 30 dias
  const hardThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  await db.delete(agentCreationSession)
    .where(
      and(
        eq(agentCreationSession.status, 'abandoned'),
        lt(agentCreationSession.abandonedAt, hardThreshold),
      )
    )
}
```

### 8.4 Retomada de sessão

Ao abrir `/agents/new?session={sessionId}`:

1. Server component busca `agentCreationSession` e valida `userId`.
2. Hidrata `useChat` com `id: sessionId` → AI SDK carrega histórico via Mastra.
3. Renderiza working memory atual (`draftSnapshot`) pra determinar `currentStage` e status do status-bar.
4. Primeira mensagem nova do Arquiteto: "Olá! Estávamos criando a Sofia. Você parou em Planejamento..." (Arquiteto lê próprio working memory no primeiro turn pós-retomada).

### 8.5 Limite de sessões simultâneas

Soft limit: 5 sessões `draft` por usuário. Ao criar 6ª, UI alerta "você tem 5 rascunhos, abandone um pra criar novo". Hard limit: 20 (não deveria chegar lá).

---

## 9. Packages afetados

### 9.1 Novos

```
packages/ai/src/
├── mastra/
│   ├── agents/
│   │   ├── commercial.ts (07A)
│   │   └── architect.ts  ← NOVO
│   ├── tools/
│   │   ├── commercial.ts (stub 07A, populado 08-beta)
│   │   ├── architect.ts  ← NOVO (registry completo)
│   │   └── orchestrator.ts (stub 07A, populado Phase 10)
│   ├── instructions/
│   │   ├── commercial.ts (07A)
│   │   └── architect.ts  ← NOVO (buildArchitectInstructions)
│   ├── templates/  ← NOVO subdir
│   │   ├── clinical.ts
│   │   ├── ecommerce.ts
│   │   ├── real-estate.ts
│   │   ├── info-product.ts
│   │   ├── saas.ts
│   │   ├── local-services.ts
│   │   └── custom.ts
│   └── types/
│       └── architect-working-memory.ts  ← NOVO
└── rag/  ← NOVO subdir
    ├── ingest.ts
    ├── extractors/
    │   ├── pdf.ts       (pdf-parse)
    │   ├── docx.ts      (mammoth)
    │   ├── csv.ts       (papaparse)
    │   ├── xlsx.ts      (xlsx package)
    │   ├── txt.ts
    │   └── url.ts       (cheerio + fetch)
    ├── query.ts
    └── summary.ts
```

### 9.2 Apps/web

```
apps/web/
├── app/
│   └── api/
│       └── architect/
│           ├── chat/route.ts   ← NOVO (SSE stream)
│           ├── upload/route.ts ← NOVO (multipart handler)
│           └── publish/route.ts ← NOVO (route option) OR server action
├── modules/
│   └── saas/
│       └── agents/
│           └── architect/  ← NOVO subdir
│               ├── components/
│               │   ├── welcome/
│               │   │   ├── Hero.tsx
│               │   │   ├── TemplateGrid.tsx
│               │   │   ├── TemplateCard.tsx
│               │   │   └── SessionHistory.tsx
│               │   ├── chat/
│               │   │   ├── Header.tsx
│               │   │   ├── StatusBar.tsx
│               │   │   ├── Chat.tsx
│               │   │   ├── Message.tsx
│               │   │   ├── Composer.tsx
│               │   │   ├── AttachmentMenu.tsx
│               │   │   ├── AttachmentPending.tsx
│               │   │   └── AttachmentMessage.tsx
│               │   ├── artifacts/
│               │   │   ├── ArtifactCard.tsx
│               │   │   ├── InlineRefinement.tsx
│               │   │   ├── DialogRefinement.tsx
│               │   │   ├── BlueprintForm.tsx
│               │   │   ├── PersonaSlider.tsx
│               │   │   ├── EmojiConfig.tsx
│               │   │   ├── VoiceConfig.tsx
│               │   │   └── TechniqueSelect.tsx
│               │   └── diagram/
│               │       ├── Preview.tsx
│               │       └── CreateCTA.tsx
│               ├── hooks/
│               │   ├── useArchitectChat.ts
│               │   └── useSessionRecovery.ts
│               ├── lib/
│               │   ├── actions.ts       (server actions: approveArtifact, refineArtifactPatch, publish)
│               │   └── server.ts        (getSession, listDrafts, listAgents)
│               └── types.ts
```

### 9.3 Packages existentes (mudanças)

| Package | Mudança |
|---|---|
| `packages/ai` | Novos exports (architectAgent, architectTools) |
| `packages/database` | Novas tabelas (knowledge_documents, knowledge_chunks, agent_creation_session), novas columns em `agent` |
| `packages/queue` | Nova queue `ingest-document` + worker |
| `packages/whatsapp` | Nenhuma mudança nesta phase |
| `packages/health` | Novo checker `/api/admin/health/rag` (opcional em 09, cobrir em 10c) |

### 9.4 Dependencies novas

```json
{
  "dependencies": {
    "@mastra/rag": "latest",
    "@xyflow/react": "^12",
    "@dagrejs/dagre": "^1.1",
    "@elevenlabs/elevenlabs-js": "latest",
    "pdf-parse": "^1.1",
    "mammoth": "^1.8",
    "papaparse": "^5.4",
    "xlsx": "^0.18",
    "cheerio": "^1.0"
  }
}
```

### 9.5 Environment variables novas

```
OPENAI_API_KEY=sk-...                       # já existe (07A)
ELEVENLABS_API_KEY=...                      # NOVO (07B-v2, cadastrar ASAP)
ARCHITECT_UPLOADS_BUCKET=architect-uploads  # NOVO, Supabase Storage bucket
RAG_EF_SEARCH=100                           # opcional, default 100
```

---

## 10. Riscos técnicos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| **API Mastra mudou desde 07A** | Working memory ou Memory class quebra | Atlas pesquisou docs atuais, exemplos batem com o que usamos em 07A. Adicional: rodar `pnpm add @mastra/memory@latest @mastra/rag@latest` ANTES de começar, validar |
| **Chunk strategy ruim pra pt-BR** | Retrieval retorna chunks sem sentido | Testar com material real (catálogos de Vinni). Se `recursive` falhar, considerar `separators` custom com `, ` e `; ` |
| **Embedding cost** | OpenAI cobra por token. 1M chars ingested ~$0.02 (text-embedding-3-small). Aceitável | Sem mitigação urgente. Monitorar via Health Tech |
| **Race: user aprova artefato enquanto Arquiteto regenera** | Estado divergente | Optimistic lock via `agentArtifacts.version` column. Update condicional `WHERE version = ?` |
| **Ingest de PDF de 200 páginas bloqueia worker** | Job demora 3-5min, outras mensagens da mesma sessão travam | BullMQ worker já tem concorrência 5 (07A). Jobs independentes. Chat nunca bloqueia (upload é fire-and-ack) |
| **Vector store órfão após abandoned** | Storage bloat | Cleanup cron 7 dias + cascade delete via FK |
| **pgvector HNSW build lento em produção** | Index creation pode levar minutos | Build em migration com `CONCURRENTLY` pra não bloquear writes |
| **ElevenLabs rate limit** | 2 requests paralelos no Creator plan | Queue específica `tts-synthesis` com concorrência 1-2. Fallback pra texto se queue cheia >30s |
| **Mastra working memory excede prompt budget** | Respostas truncadas, context perdido | Schema acima calibrado <2KB. Monitorar `message.metadata.tokensUsed` em produção |
| **User faz upload malicioso (virus, zip bomb)** | Storage + compute | File size limit 10MB (client + server), MIME type strict whitelist, scan com clamav (futuro) ou usar Supabase built-in |
| **React Flow re-render em cada tool call** | UI lenta | `nodeTypes`/`edgeTypes` em const module-level, useMemo no agentConfig prop |
| **LLM gera tool call com schema inválido** | Crash no execute | Zod validate no inputSchema retorna erro estruturado pro LLM corrigir no próximo turn |

---

## 11. Checklist de validação pré-execução

Antes de `@sm` quebrar em stories:

- [ ] Vinni aprova tech spec (este doc)
- [ ] `@data-engineer` aprovou schema Drizzle propostos (§ 8.1, § 4 schema agent, § 5.2 knowledge tables)
- [ ] `@analyst` (Atlas) já entregou research-dependencies.md ✅
- [ ] `pnpm add @mastra/rag @xyflow/react @dagrejs/dagre @elevenlabs/elevenlabs-js` testa install
- [ ] Supabase project tem pgvector extension habilitada (via MCP ou SQL console)
- [ ] ElevenLabs API key cadastrada em `.env.local` (pra testes locais desde já, mesmo que TTS seja 07B-v2)
- [ ] Supabase Storage bucket `architect-uploads` criado

---

## 12. Handoff

Esta spec é consumida por:

### 12.1 `@data-engineer` (Dozer) — migrations 08-alpha

Tasks específicas:
1. Habilitar `pgvector` extension em Supabase
2. Migration `agent_creation_session` (§ 8.1)
3. Migration `knowledge_documents` + `knowledge_chunks` (§ 5, com vector(1536) + HNSW `vector_cosine_ops` via raw SQL)
4. Migration agregar colunas novas em `agent` (§ 6 refs: emojiConfig, voice, salesTechniques, antiPatterns, conversationExamples)
5. Migration `agent_artifacts` (novo, derivado do § 4.2.2)
6. RLS policies pra todas as tabelas novas
7. Fixtures/seed de templates (via `packages/ai/src/mastra/templates/` não precisa migration)

### 12.2 `@sm` (Niobe) — quebrar em stories

Estimativa com base nesta spec:

**Phase 08-alpha (5 stories):**
- 08α.1 Habilitar pgvector + migrations base (data-engineer)
- 08α.2 Package rag infra (ingest/chunk/embed/query)
- 08α.3 Registry `architectTools` (stubs + tools críticas)
- 08α.4 Upload endpoint + BullMQ worker ingest
- 08α.5 Quality gate 08-alpha

**Phase 09 (10 stories):**
- 09.1 Tela de boas-vindas + grid templates + SessionHistory
- 09.2 Shell do chat (header + status-bar + área mensagens)
- 09.3 Composer com textarea expansível + keyboard shortcuts
- 09.4 Attachment menu + upload flow + mini-cards
- 09.5 Architect agent (Mastra) + instructions template + working memory
- 09.6 ArtifactCard base + 3 actions (generateArtifact tool)
- 09.7 ArtifactInlineRefinement (Perfil + Conhecimento)
- 09.8 ArtifactDialogRefinement (Blueprint completo)
- 09.9 FlowDiagramPreview + `publishAgentFromSession` transação atômica
- 09.10 Estados especiais + Quality Gate humano

### 12.3 `@dev` (Neo) — implementação

Executa stories com gate humano do Vinni entre cada. Paralelismo possível mas não recomendado (regra quality gate humano).

### 12.4 `@qa` (Oracle) — gates

Quality gate 08-alpha:
- Upload PDF 5 páginas processa em <30s
- Query retorna top-5 chunks com similarity >0.5
- pgvector query p95 <100ms em 200 chunks

Quality gate 09:
- Criar agente do zero em <20min (timing humano)
- Todos os 4 artefatos gerados
- Refinar via painel inline funciona
- Refinar via chat regenera artefato
- Upload mid-conversa + Arquiteto acusa + usa no recap
- Publish atômico completa com agente em DRAFT
- Session retomada após close/reopen mantém estado

### 12.5 `@devops` (Operator) — push

Consolida push e PR ao fim de cada sub-phase (08-alpha, depois 09). Jamais no meio de stories.

---

## 13. Decisões travadas (não renegociar)

1. Arquiteto separado do Comercial e Orquestrador (ADR-001)
2. `@mastra/rag` + `@mastra/pg` stack, não adapter próprio
3. `openai/text-embedding-3-small` (1536d), não other
4. Chunk `recursive, size 512, overlap 50`
5. HNSW `vector_cosine_ops`, `m=16, ef_construction=64`
6. Working memory via Zod schema estruturado, não markdown
7. `@xyflow/react` v12 (não `reactflow` deprecated)
8. ElevenLabs `eleven_multilingual_v2` modelo default
9. `eleven_multilingual_v2` default, `eleven_flash_v2_5` pra streaming futuro
10. Rate limit 10 msg/min/session via Redis
11. `agent_creation_session` status: draft/published/abandoned (não active/archived)
12. Cleanup abandoned 7 dias soft, 30 dias hard

## 14. Decisões adiadas (não bloqueiam Phase 09)

- Ajuste fino de `ef_search` por escala (instrumentar depois)
- Provider TTS alternativo (Qwen auto-hospedado, Phase 09.5 ou depois)
- Chunk strategy avançada (markdown-aware, semantic-aware) se recursive mostrar problemas
- Pre-compute de summary de documento longo (agora só os primeiros 3000 chars)
- Multi-language (agora só pt-BR)

---

*Aria visionou. Fundação concebida, material pra Dozer talhar o schema e Niobe quebrar em stories. Arquitetura é promessa de futuro.* 🏗️
