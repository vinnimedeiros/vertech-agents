# Phase 07 — Mastra Integration (Design Spec)

> **Status:** Design aprovado pelo CEO (Vinni) em 2026-04-19 em nível estratégico. Decisões técnicas tomadas por @architect (Aria) sob delegação explícita.
>
> **Autores:** @pm (Morgan — ordem e escopo), @architect (Aria — arquitetura técnica), com insumos do vault Obsidian (PRD + Decisões Arquiteturais + flowchart).
>
> **Pré-requisitos:** Phases 01–06.5 concluídas (foundation, multitenancy, core UI, CRM com template library, chat, WhatsApp Baileys + contatos).

---

## 1. Visão executiva (linguagem de CEO)

Phase 07 entrega o **cérebro** do produto: um agente comercial inteligente rodando no WhatsApp, configurável por workspace, com memória persistente entre conversas, fila industrial de processamento pronta pra escala, e 13 abas de configuração visuais. É a primeira vez em que o Vertech deixa de ser "CRM com chat" e vira **operação assistida por IA**.

Ao fim da Phase 07, o CEO (Vinni) consegue:

- **Criar um agente** por uma interface visual com 13 abas de personalização (nome, persona, tom de voz, negócio, tools, modelo, WhatsApp etc)
- **Ativar o agente** e vincular a uma instância de WhatsApp
- **Conversar com o agente pelo celular** como se fosse um atendente humano
- **Ver memória persistindo** entre sessões (o agente lembra de conversas anteriores com o mesmo contato)
- **Ver, no Superadmin, endpoints de saúde** do sistema de mensagens (queue, Mastra, Redis, database) — precursor do Health Tech Dashboard da Phase 10c

**O que ainda NÃO existe ao fim da 07** (fica pras phases seguintes):
- Tools de execução (mover lead, criar reunião, consultar base de conhecimento) — Phase 08
- Arquiteto / co-criação de agente por conversa — Phase 09
- Orquestrador / copiloto universal da aplicação — Phase 10
- Supervisor Panel de agentes — Phase 10b
- Health Tech Dashboard consolidado — Phase 10c

---

## 2. Escopo, sub-phases e ordem de execução

### 2.1 Decomposição em 3 sub-phases

Ordem linear com **gate humano** (Vinni valida UI) entre cada uma:

```
07A ──► gate Vinni ──► 07B ──► gate Vinni ──► 07C ──► gate Vinni ──► Phase 08
```

| Sub-phase | Entrega técnica | Entrega visível pro CEO | Gate humano valida |
|---|---|---|---|
| **07A** | Núcleo Mastra + BullMQ + Redis + health endpoints + agente dinâmico (seed SQL) | Agente comercial respondendo no WhatsApp via seed SQL. Sem UI de criação ainda. | Conversa de 5 turnos com memória persistindo |
| **07B** | UI essencial: lista de agentes + detalhe com **6 abas** (Identidade, Persona, Negócio, Conversas, Modelo, WhatsApp) | CRUD visual completo do agente. Sem tocar em SQL. | Criar agente do zero via UI, ativar, vincular WhatsApp |
| **07C** | Flow Diagram (React Flow) + **7 abas** restantes (Ferramentas placeholder, Follow-up placeholder, Mensagens, Horários, Conteúdo placeholder, Política, Versões) + audit/undo por aba | Experiência "produção-ready" do detalhe do agente | Criar, editar, reverter mudança, ver Flow Diagram animado |

**Ordem é lei da física — NÃO negociável:**
- Phase 09 (Arquiteto) precisa da infra Mastra já rodando (07)
- Phase 09 precisa dos `architectTools` (Phase 08)
- Phase 10 (Orquestrador) precisa da infra Mastra + `orchestratorTools` (Phase 08)

### 2.2 Fora do escopo (explícito)

❌ Tools de verdade (Phase 08)
❌ RAG / base de conhecimento (Phase 08)
❌ Arquiteto / co-criação (Phase 09)
❌ Orquestrador (Phase 10)
❌ UI consolidada do Health Tech (Phase 10c)
❌ Evolution API / migração de WhatsApp — 07 usa o adapter abstrato do package `@repo/whatsapp` existente (Baileys por baixo, trocável no futuro)

---

## 3. Decisões arquiteturais fechadas

### 3.1 Stack AI

| Item | Decisão |
|---|---|
| Framework AI | **Mastra** (sobre Vercel AI SDK) — confirmado em `Decisoes Arquiteturais.md`. **NUNCA** LangGraph/LangChain |
| Providers suportados | **OpenAI + Anthropic**, todos os modelos disponíveis no AI SDK |
| Modelo default | **`gpt-4.1-mini`** — ID exato a ser confirmado via context7 pelo @analyst antes do @dev tocar no `package.json` |
| Storage de memória Mastra | **`@mastra/pg`** (oficial) — ID exato e API atuais a confirmar via context7. Fallback: `@mastra/libsql` sobre Postgres |
| Estrutura de tools | **3 registries separados** desde 07A: `commercialTools` (populado em 08), `architectTools` (stub em 07A, populado em 09), `orchestratorTools` (stub em 07A, populado em 10) |

### 3.2 Processamento de mensagens

| Item | Decisão |
|---|---|
| Padrão de dispatch | **Queue durável com BullMQ + Redis** (não fire-and-forget) — alinhado com `feedback_escala_desde_dia_1.md` |
| Tentativas | 3, com backoff exponencial (2s, 8s, 32s) |
| DLQ | Dead Letter Queue inspecionável via Bull-Board em dev; via Superadmin em prod |
| Concorrência | 5 jobs simultâneos por worker (configurável) |
| Timeout | 60s por job (LLM típico < 5s; 60s é segurança) |
| Idempotência | Job carrega `messageId` — worker aborta silenciosamente se mensagem já `SENT` |
| Rate limit | 30 mensagens/min por organization (rede de segurança contra abuso) |

### 3.3 Observabilidade (Health Tech)

| Item | Decisão |
|---|---|
| Contrato | Endpoints `/api/admin/health/{componente}` retornam JSON uniforme (`status`, `metrics`, `alerts`, `timestamp`) |
| Endpoints em 07A | `queue`, `mastra`, `redis`, `database` |
| Endpoints em 07 geral | `llm-providers` (OpenAI + Anthropic, latência, rate limit, custo acumulado) |
| Gate de acesso | Role `superadmin` via middleware existente |
| Bull-Board | Ativo em dev (`/admin/queues`), desativado em prod |
| Mastra Studio | `mastra dev` ativo em dev local, desativado em prod via env `MASTRA_STUDIO_ENABLED=false` |
| UI consolidada | Phase 10c (nova) — fora desta spec |

### 3.4 Agente comercial — dinâmico e multi-tenant

Um único `Agent` class no Mastra que lê configuração do banco via `requestContext`. **NÃO** criar um `Agent` por workspace (não escala).

```typescript
// pseudocódigo — implementação real em packages/ai/src/mastra/agents/commercial.ts
const commercialAgent = new Agent({
  id: 'commercial-agent',
  model: async ({ requestContext }) => {
    const agent = await db.agent.findById(requestContext.get('agentId'));
    return agent.model;  // ex: 'openai/gpt-4.1-mini' ou 'anthropic/claude-haiku-4-5'
  },
  instructions: async ({ requestContext }) => {
    const agent = await db.agent.findById(requestContext.get('agentId'));
    return buildInstructions(agent);  // templado a partir de persona/business/style
  },
  tools: async ({ requestContext }) => {
    const agent = await db.agent.findById(requestContext.get('agentId'));
    return filterTools(commercialTools, agent.enabledTools);  // subset habilitado
  },
  memory: new Memory({
    options: { lastMessages: 20, observationalMemory: true },
  }),
});
```

### 3.5 Invocação a partir do WhatsApp

Fluxo inbound:
1. Webhook WhatsApp → `packages/whatsapp` persiste message `status=QUEUED`
2. `packages/queue` enfileira job `agent-invocation` em Redis
3. Webhook retorna 200 ao provider em ~100ms
4. Worker BullMQ (processo separado ou mesmo container) puxa job
5. Marca message `PROCESSING`
6. Invoca `commercialAgent.generate()` com `requestContext` populado
7. Persiste resposta como outbound message
8. Envia via `@repo/whatsapp` → marca `SENT` ou `FAILED`

**Princípios:**
- Webhook handler **NUNCA** chama Mastra direto
- Worker é responsável por tudo pós-enfileiramento
- `message.status` visível em tempo real via query → alimenta Health Tech

---

## 4. Packages afetados

| Package | Ação |
|---|---|
| `packages/ai` | EXPANDE — novo subdir `src/mastra/` |
| `packages/queue` | NOVO — BullMQ + Redis config, queues, workers |
| `packages/health` | NOVO — contrato TypeScript e helpers de health check |
| `packages/database` | EXPANDE — novas tabelas `agent` + `agent_version`, ajustes em `conversation` e `messageStatusEnum` |
| `packages/whatsapp` | TOCA LEVE — implementar `emitConversationEvent` (hoje stub) pra chamar dispatcher da queue |
| `apps/web` | EXPANDE — rotas API `/api/admin/health/*`, rotas `/agents/*` (07B), Bull-Board em `/admin/queues` (dev only) |

### 4.1 Estrutura proposta `packages/ai`

```
packages/ai/
├── index.ts                  # re-exports (AI SDK + Mastra)
├── client.ts                 # existente (React)
├── lib/                      # existente (prompts, helpers)
└── src/
    └── mastra/
        ├── index.ts
        ├── instance.ts       # new Mastra({ ... })
        ├── storage.ts        # PostgresStore config
        ├── agents/
        │   └── commercial.ts
        ├── tools/
        │   ├── commercial.ts    # stub vazio (07A)
        │   ├── architect.ts     # stub vazio (07A)
        │   └── orchestrator.ts  # stub vazio (07A)
        ├── instructions/
        │   └── builder.ts    # buildInstructions(agent)
        ├── memory/
        │   └── config.ts
        └── runtime/
            └── invoker.ts    # invokeAgentForMessage(messageId)
```

### 4.2 Estrutura proposta `packages/queue`

```
packages/queue/
├── index.ts                  # exports públicos
├── src/
│   ├── config.ts             # Redis conn + BullMQ defaults
│   ├── schemas.ts            # Zod schemas dos job payloads
│   ├── queues/
│   │   └── agent-invocation.ts
│   ├── workers/
│   │   └── agent-invocation.ts   # processor + retry policy + DLQ
│   └── telemetry.ts          # integra com packages/health
```

### 4.3 Estrutura proposta `packages/health`

```
packages/health/
├── index.ts
├── src/
│   ├── contract.ts           # TypeScript do contrato uniforme
│   ├── helpers.ts            # defineHealthCheck, formatMetrics
│   └── components/
│       ├── queue.ts          # checker pra BullMQ
│       ├── mastra.ts         # checker pra storage Mastra
│       ├── redis.ts          # checker de conexão Redis
│       ├── database.ts       # checker Postgres (latência, slow queries)
│       └── llm-providers.ts  # checker OpenAI + Anthropic
```

---

## 5. Schema Drizzle

### 5.1 Nova tabela `agent`

**Arquivo:** `packages/database/drizzle/schema/agents.ts`

Enum:
- `AgentStatus`: `DRAFT` | `ACTIVE` | `PAUSED` | `ARCHIVED`

Colunas essenciais:
- Identidade: `name`, `role`, `avatarUrl`, `gender`, `description`
- Modelo: `model` (default `openai/gpt-4.1-mini`), `temperature`, `maxSteps`
- Persona (JSONB): `personality`, `businessContext`, `conversationStyle`
- Override manual: `instructions` (text)
- Tools: `enabledTools` (text[])
- RAG: `knowledgeDocIds` (text[])
- Status/versão: `status`, `version`
- Vínculo: `whatsappInstanceId` (nullable)
- Timestamps: `createdAt`, `updatedAt`, `publishedAt`

Índices:
- `agent_org_status_idx` em (`organizationId`, `status`)
- `agent_whatsapp_instance_idx` em `whatsappInstanceId`

FK: `organizationId` → `organization.id` ON DELETE CASCADE

### 5.2 Nova tabela `agent_version`

Snapshot imutável pra audit e rollback (Phase 07C).

Colunas:
- `agentId` (FK → `agent.id`, cascade)
- `version` (int, incremental)
- `snapshot` (JSONB — cópia completa do agent)
- `createdByUserId` (FK → `user.id`, nullable — null = system)
- `createdAt`

Unique index: (`agentId`, `version`)

### 5.3 Ajustes em tabelas existentes

**`conversation`:**
- Adicionar FK `assignedAgentId` → `agent.id` ON DELETE SET NULL (hoje é text solto)

**`messageStatusEnum`:**
- Adicionar `QUEUED` e `PROCESSING` (entre `PENDING` e `SENT`)

### 5.4 Tipos TypeScript (JSONB tipados)

**Arquivo:** `packages/database/types/agent.ts`

- `AgentPersonality`: tone, formality, humor, empathyLevel
- `AgentBusinessContext`: industry, products, pricing, policies, inviolableRules
- `AgentConversationStyle`: greeting, qualificationQuestions, objectionHandling, handoffTriggers
- `AgentSnapshot`: cópia completa do agent pra `agent_version.snapshot`

### 5.5 RLS policies

Via migration separada:
- `SELECT agent` → membership na `organizationId`
- `INSERT/UPDATE/DELETE agent` → role `admin` ou `owner`
- `SELECT agent_version` → herdado via join
- Endpoints `/api/admin/health/*` → guarded via middleware Better-Auth (role `superadmin`), não RLS

**Responsável:** `@data-engineer` (Dozer) executa migrations e RLS.

---

## 6. UI por sub-phase

### 6.1 Sub-phase 07A — UI zero

Nenhuma UI visual. Agente criado via seed SQL em `packages/database/seeds/agents-seed.ts`. Vinni valida via:
- Celular pessoal conectado como lead
- Terminal: query SQL direto pra conferir conversa armazenada
- Bull-Board em `http://localhost:3000/admin/queues` (dev)
- `curl http://localhost:3000/api/admin/health/queue`

### 6.2 Sub-phase 07B — UI essencial (6 abas)

**Rota:** `/app/[orgSlug]/agents`

#### Lista de agentes (`/agents`)
- Cards em grid: avatar, nome, role, status badge, modelo, vínculo WhatsApp, versão
- Ações por card: ver detalhe, ativar/pausar, duplicar
- Botão primary "+ Novo agente" → form simples (nome + role + modelo) → criar em status `DRAFT` → redireciona pro detalhe

#### Detalhe do agente (`/agents/[agentId]`)
- Header: avatar + nome editável inline + status badge + ações (ativar/pausar/arquivar)
- Tabs horizontais (6 abas — 07B):

| Aba | Path | Conteúdo |
|---|---|---|
| **Identidade** | `/agents/[id]` (default) | Nome, role, avatar upload, gênero (radio), descrição (textarea) |
| **Persona** | `/agents/[id]/persona` | Sliders tom/formalidade/humor/empatia + textarea de regras invioláveis |
| **Negócio** | `/agents/[id]/business` | Indústria, produtos/serviços, pricing, políticas (campos de texto longo) |
| **Conversas** | `/agents/[id]/conversation` | Saudação default, perguntas de qualificação (lista editável), tratamento de objeções, triggers de handoff humano |
| **Modelo** | `/agents/[id]/model` | Radio provider (OpenAI/Anthropic) + dropdown modelo (lista curada) + sliders temperatura + maxSteps |
| **WhatsApp** | `/agents/[id]/whatsapp` | Dropdown de instâncias disponíveis + preview do número vinculado + ações unlink/relink |

#### Padrão comum em toda aba
- **Dirty state banner** no topo quando há mudanças não salvas: "Você tem alterações não salvas — [Salvar] [Descartar]"
- **Auto-save** desligado (evita publicação acidental de agente mal configurado)
- Ações **Salvar** e **Descartar** fixas no rodapé da aba

**Stack UI:** shadcn/ui (já instalado) + Radix + Tailwind. Formulários com `react-hook-form` + `zod` validators (padrão do boilerplate).

**Responsável:** `@ux-design-expert` (Sati) revisa layouts antes do @dev implementar. `@sm` cria 1 story por aba (6 stories de 07B).

### 6.3 Sub-phase 07C — UI completa (Flow Diagram + 7 abas restantes + audit/undo)

#### Agent Flow Diagram (React Flow) — no Overview

- Hierarquia visual: **Orquestrador** (node pai, placeholder até Phase 10) → **Agente** (node central com avatar e persona) → **Categorias Funcionais** (Atendimento, Gestão, Agendamento, Follow-up, Proposta — 5 nodes) → **Tools específicas** (folhas — placeholder, populadas em Phase 08)
- Animações: entrada com fade-in, conexões com stroke-dasharray animado
- Interatividade:
  - Click em categoria → expande/colapsa filhos
  - Click em tool → abre modal de configuração (placeholder em 07C, funcional em 08)
- Posicionamento automático via `dagre` ou layout manual com `React Flow` `useLayoutedElements`

#### 7 abas restantes (07C)

| Aba | Path | Escopo em 07C |
|---|---|---|
| **Ferramentas** | `/agents/[id]/tools` | Lista de tools disponíveis com toggle on/off. Em 07C é placeholder: mostra grade com 7 tools da Phase 08 como "em breve" (ou ativáveis se Phase 08 já rodou) |
| **Follow-up** | `/agents/[id]/followup` | Placeholder com mensagem "Configurável na Phase 08" + preview visual das 3 estratégias (agressivo/moderado/suave) |
| **Mensagens** | `/agents/[id]/messages` | Templates reutilizáveis com variáveis (nome contato, data) + preview com dados fake |
| **Horários** | `/agents/[id]/schedule` | Default 24/7 (toggle). Opcional: configurar janelas por dia da semana + timezone. Ver `feedback_always_lmas_team.md` contexto do default |
| **Conteúdo** | `/agents/[id]/knowledge` | Placeholder "Base de conhecimento chega na Phase 08" com preview da UI futura |
| **Política** | `/agents/[id]/policy` | Opt-out/LGPD toggle (default: respeita opt-out), disclaimer obrigatório configurável |
| **Versões** | `/agents/[id]/versions` | Timeline de `agent_version` + botão "Ver diff" (usa `react-diff-viewer` ou similar) + botão "Reverter pra essa versão" |

#### Audit/undo por aba

- Toda mudança em qualquer aba cria entrada em `agent_version` (snapshot completo) OU em `agent_audit_log` (delta — mais leve)
- **Decisão técnica:** usar `agent_version` pra snapshots completos quando usuário clica "Salvar" explicitamente (cria versão). Pra mudanças intra-sessão, não persiste.
- Undo 30d: limite de `created_at > NOW() - INTERVAL '30 days'` na aba Versões

**Responsável:** `@ux-design-expert` faz wireframes de Flow Diagram + abas, `@dev` implementa, `@qa` gate visual.

---

## 7. Fluxo runtime end-to-end (reforço visual)

```
┌───────────────────────┐
│ Lead envia msg        │
│ WhatsApp              │
└───────────┬───────────┘
            ▼
┌───────────────────────────────────────────┐
│ packages/whatsapp — webhook handler       │
│ • Persiste message (status=QUEUED)        │
│ • Chama emitConversationEvent()           │
│ • Retorna 200 em ~100ms                   │
└───────────┬───────────────────────────────┘
            ▼
┌───────────────────────────────────────────┐
│ packages/queue — dispatcher               │
│ • Enfileira job em Redis (BullMQ)         │
│ • Payload: { messageId, conversationId,   │
│            organizationId }               │
└───────────┬───────────────────────────────┘
            ▼ (latência variável: 1-10s)
┌───────────────────────────────────────────┐
│ packages/queue — worker                   │
│ • Puxa job da fila                        │
│ • Marca message PROCESSING                │
│ • Invoca packages/ai                      │
└───────────┬───────────────────────────────┘
            ▼
┌───────────────────────────────────────────┐
│ packages/ai — invoker                     │
│ 1. Busca agent config do banco            │
│ 2. Monta requestContext                   │
│ 3. commercialAgent.generate(texto, {      │
│      memory: { resource, thread },        │
│      requestContext                       │
│    })                                     │
│ 4. Recebe resposta (texto + usage)        │
│ 5. Persiste outbound message (PENDING)    │
└───────────┬───────────────────────────────┘
            ▼
┌───────────────────────────────────────────┐
│ packages/whatsapp — sender                │
│ • sendText(instance, phone, text)         │
│ • Marca message SENT ou FAILED            │
│ • Emite evento pra Supabase Realtime      │
└───────────────────────────────────────────┘
```

**Observabilidade em cada camada:**
- `message.status` + `message.metadata` (tokens, duration, error) — todo o fluxo rastreável via query SQL
- BullMQ mantém histórico do job (completed/failed/retries)
- `packages/health` expõe tudo via endpoints uniformes

---

## 8. Health endpoints (contrato e implementação)

### 8.1 Contrato uniforme

```typescript
// packages/health/src/contract.ts
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export type HealthAlert = {
  severity: 'warning' | 'critical';
  message: string;
  since?: string;  // ISO timestamp
};

export type HealthCheckResult = {
  component: string;
  status: HealthStatus;
  metrics: Record<string, number | string>;
  alerts: HealthAlert[];
  timestamp: string;
};
```

### 8.2 Endpoints em 07A

| Endpoint | Retorna |
|---|---|
| `GET /api/admin/health/queue` | BullMQ: `waiting`, `active`, `completed_1h`, `failed_1h`, `dlq_count`, `oldest_job_age_seconds`. Status `degraded` se `waiting > 100` ou `oldest_job_age > 300s`. Status `unhealthy` se Redis não responde |
| `GET /api/admin/health/mastra` | Mastra: `active_conversations`, `storage_connected`, `last_invocation_ago_seconds`. Status `unhealthy` se storage desconectado |
| `GET /api/admin/health/redis` | Redis: `connected`, `memory_used_mb`, `commands_per_second`, `connected_clients`. Status `unhealthy` se desconectado |
| `GET /api/admin/health/database` | Postgres: `connected`, `avg_query_ms_5m`, `active_connections`, `slow_queries_1h`. Status `degraded` se `avg_query_ms_5m > 500` |

### 8.3 Middleware de acesso

- Rotas `/api/admin/**` protegidas por `requireSuperadmin()` — reusa plugin admin do Better-Auth
- Retorna `401` se não autenticado, `403` se não superadmin

### 8.4 Bull-Board em dev

- Montar em `apps/web/app/(admin)/admin/queues/page.tsx` usando `@bull-board/api` + `@bull-board/nextjs`
- Só acessível em `NODE_ENV === 'development'` e com role superadmin
- Em prod, rota retorna 404

---

## 9. Equipe LMAS por sub-phase

Conforme `feedback_always_lmas_team.md` — sempre roteado, nunca Claude genérico.

### 07A — Núcleo Mastra

| Agente | Tarefas |
|---|---|
| `@analyst` (Link) | Pesquisar ID exato do modelo `gpt-4.1-mini` no AI SDK via context7. Confirmar package oficial atual de storage Postgres do Mastra (`@mastra/pg` vs alternativa). |
| `@architect` (Aria) | Validar contratos entre `packages/ai`, `packages/queue`, `packages/whatsapp`. Decisão de posicionamento do worker (processo separado ou mesmo container inicial). |
| `@data-engineer` (Dozer) | Schema Drizzle (`agent`, `agent_version`), ajustes em `conversation.assignedAgentId` e `messageStatusEnum`, RLS policies, migration SQL. |
| `@sm` (Niobe) | Criar stories (breakdown em subtasks implementáveis). |
| `@po` (Keymaker) | Validar cada story (checklist 10 pontos). |
| `@dev` (Neo) | Implementar Mastra instance, agent dinâmico, builder de instructions, invoker, queue, workers, health endpoints. Seed SQL de agente de teste. |
| `@qa` (Oracle) | Quality gate: typecheck + lint + build + Mastra inicializa + agente responde via celular + memória persiste entre mensagens. |
| `@devops` (Operator) | Adicionar container Redis no Coolify (se for rodar integração com container real). Configurar `REDIS_URL`. Push + commit (exclusivo). |

### 07B — UI essencial (6 abas)

| Agente | Tarefas |
|---|---|
| `@ux-design-expert` (Sati) | Layout do detalhe do agente, padrão comum das 6 abas, componentes de sliders da Persona, pattern de dirty state banner. |
| `@sm` | 6 stories (uma por aba) + 2 stories auxiliares (lista + header/detalhe). |
| `@po` | Validar stories. |
| `@dev` | Implementar componentes, forms com react-hook-form, server actions, integração com tanstack-query, zod validation. |
| `@qa` | Gate visual: criar agente do zero via UI, editar cada aba, salvar, ativar, vincular WhatsApp, conversar. |

### 07C — Flow Diagram + polimento

| Agente | Tarefas |
|---|---|
| `@ux-design-expert` | Design do Flow Diagram React Flow, animações, interatividade. Wireframes das 7 abas restantes. |
| `@sm` | ~10 stories (Flow Diagram + 7 abas + audit/undo). |
| `@po` | Validar stories. |
| `@data-engineer` | Definir estrutura de `agent_version` pra suportar undo eficiente. Retention policy 30d. |
| `@dev` | React Flow integration, diff viewer, undo logic, placeholders polidos. |
| `@qa` | Gate visual completo da experiência de operação do agente. |

---

## 10. Critérios de conclusão (por sub-phase)

### 10.1 Gate humano 07A

Vinni valida manualmente:

1. ✅ Criar agente via seed SQL (Vinni executa script ou @dev já seedou)
2. ✅ Vincular agente a uma instância de WhatsApp existente (SQL direto)
3. ✅ Enviar mensagem do celular pessoal pro WhatsApp da empresa
4. ✅ Agente responde coerentemente em português (sem tools ainda, só conversa)
5. ✅ Enviar segunda mensagem — agente lembra do contexto anterior
6. ✅ Reiniciar servidor no meio de uma mensagem — verificar que o job reprocessa (não perde)
7. ✅ Acessar Bull-Board em `/admin/queues` — ver job processado
8. ✅ `curl /api/admin/health/queue` — retorna status `healthy` com métricas

**Critérios técnicos automáticos:**
- `pnpm typecheck` passa
- `pnpm build` passa
- Testes unitários dos helpers novos passam
- Mastra inicia sem erro
- Worker BullMQ inicia sem erro

### 10.2 Gate humano 07B

Vinni valida:

1. ✅ Acessar `/app/[orgSlug]/agents` — lista carrega
2. ✅ Clicar "+ Novo agente" — form cria agente em DRAFT
3. ✅ Entrar no detalhe, preencher cada uma das 6 abas, salvar cada uma
4. ✅ Dirty state funciona (não perde mudanças acidentalmente)
5. ✅ Alterar modelo pra `claude-haiku-4-5` — agente passa a responder via Anthropic
6. ✅ Vincular instância de WhatsApp via aba dedicada
7. ✅ Ativar agente (status DRAFT → ACTIVE) via ação no header
8. ✅ Conversar pelo celular — funciona

### 10.3 Gate humano 07C

Vinni valida:

1. ✅ Flow Diagram renderiza na Overview com animações
2. ✅ As 7 abas restantes renderizam (placeholders informativos quando depende de Phase 08)
3. ✅ Fazer 3 mudanças na aba Persona, salvar cada uma — aba Versões mostra 3 entries
4. ✅ Clicar "Reverter" na versão anterior — mudanças voltam
5. ✅ Ver diff entre duas versões
6. ✅ Experiência visual polida: transições suaves, sem jumps de layout, loading states claros

---

## 11. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| API do Mastra mudou entre vault doc (2025/início 2026) e agora | @dev tenta usar API obsoleta | @analyst pesquisa docs atuais via context7 antes do @dev tocar código |
| `@mastra/pg` não existir (nome mudou) | Storage não conecta | Fallback pra `@mastra/libsql` ou adapter custom sobre Drizzle |
| LLM Provider rate limit | Agente trava em produção | Rate limit 30/min por org + retry com backoff + DLQ |
| Redis cai em produção | Sistema para de processar mensagens | Health check + alerta + container Coolify com auto-restart |
| Mensagem duplicada (retry) | Agente responde 2x | Idempotência via `messageId` no job — abort se `status === SENT` |
| Race condition: 2 mensagens inbound no mesmo instante | Ordem de resposta errada | Serialização por conversa: pattern `jobId` único por `conversationId` + FIFO order, ou `BullMQ` groups (se disponível na versão instalada — @analyst confirma). Fallback: processar serialmente por `conversationId` via lock curto em Redis |
| Schema migration quebra dado existente | Phase 06 já persistiu dados | Todas as mudanças são aditivas (nova tabela, novas colunas, novos enum values) — nenhum DROP |

---

## 12. Dependências externas e pesquisas obrigatórias

Antes do @dev implementar, @analyst DEVE confirmar via context7:

1. **Mastra storage para Postgres** — package oficial atual. Documentar em `CHANGELOG-phase-07.md`
2. **ID exato do modelo `gpt-4.1-mini`** no AI SDK (`@ai-sdk/openai`)
3. **IDs dos modelos Anthropic** disponíveis no AI SDK: Claude Haiku 4.5 (`claude-haiku-4-5`), Claude Sonnet 4.6, Claude Opus 4.7
4. **React Flow** versão atual + best practices de layout automático
5. **BullMQ** versão atual + pattern de `groupKey` pra serialização por conversa
6. **Bull-Board** versão + integração com Next.js App Router

---

## 13. Rollout

### 13.1 Ordem de execução (consolidado)

1. @analyst confirma dependências (seção 12) — ~20min
2. @architect valida contratos finais com dependências reais — ~20min
3. @data-engineer escreve migration 07A (schema + enum update + FK) — ~40min
4. @sm cria stories 07A (estimado 6-8 stories) — ~30min
5. @po valida stories — ~20min
6. @dev executa stories 07A — ~3h
7. @qa quality gate 07A — ~30min
8. **GATE HUMANO 07A — Vinni valida em tela** — esperar aprovação
9. (repete 4-8 pra 07B e 07C)
10. @devops consolidada push + PR — ao fim de cada sub-phase ou no fim da Phase 07 inteira

### 13.2 Checkpoint (obrigatório após cada sub-phase)

Atualização inline em `projects/vertech-agents/PROJECT-CHECKPOINT.md` após @qa gate, antes do gate humano do Vinni. Conforme `checkpoint-protocol.md`.

---

## 14. Aprovação estratégica

- [x] Ordem 07A → 07B → 07C → 08 → 09 → 10 (Morgan PM, Vinni)
- [x] Stack AI: Mastra sobre Vercel AI SDK, NUNCA LangGraph (Vinni)
- [x] Providers: OpenAI + Anthropic, default `gpt-4.1-mini` (Vinni)
- [x] Processamento: BullMQ + Redis (Vinni — "sem duvidas")
- [x] Health Tech: endpoints distribuídos, UI consolidada em Phase 10c (Vinni)
- [x] 6 abas essenciais no 07B, 7 abas restantes + Flow Diagram no 07C (Vinni/Aria)
- [x] Gate humano após cada sub-phase (Vinni — "vamos trabalhar assim sempre")
- [x] Delegação de detalhes técnicos à equipe LMAS (Vinni — "eu não sou dev, eu sou CEO")

---

*Autoria: @architect (Aria) consolidando insumos do @pm (Morgan), vault Obsidian, memórias do projeto e diretrizes do CEO Vinni.*
*Data: 2026-04-19*
*Próximo passo: @sm (Niobe) cria stories de execução da sub-phase 07A.*
