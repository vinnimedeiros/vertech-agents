---
type: audit
title: "Code Health Audit — Setor Comercial (2026-04-26)"
project: vertech-agents
date: 2026-04-26
auditor: architect
status: draft
tags:
  - project/vertech-agents
  - architecture
  - audit
  - comercial
  - pivot
related:
  - "[[audit-tools-comercial-2026-04-26]]"
  - "[[project_pivot_comercial_100]]"
---

# Code Health Audit — Setor Comercial (2026-04-26)

**Auditor:** @architect (Architect)
**Solicitado por:** Vinni (CEO)
**Branch:** `feature/phase-09-architect-ui`
**Bloco:** G do Pivot Comercial 100%
**Bloqueia:** decisões de refactor antes de Wave 2 do pivot
**Read-only:** este audit não modifica código

---

## Resumo executivo (linguagem CEO)

> [!info] Veredito geral: 7.2/10 — "código bom, mas com 3 furos sérios que podem queimar dinheiro de verdade"

O setor comercial está bem construído na maior parte. CRM (pipeline, leads, contatos) e Chat (WhatsApp + mensagens) seguem o mesmo padrão de qualidade: server actions com validação Zod, multi-tenant guards consistentes, schema bem indexado, optimistic UI no LeadModal.

**Problemas que travam o crescimento agora:**

1. **Vazamento de dados de teste:** leads e atividades marcados como sandbox (do Atendente em testes) aparecem misturados com leads reais no pipeline e dashboard. Quando o Atendente entrar em uso, a operação real fica suja.
2. **Mídia no chat sem fallback:** se um upload travar ou WhatsApp recusar, a mensagem fica em "FAILED" silencioso. Sem retry, sem fila, sem alerta. Em produção, vai-se perder mensagem importante e ninguém vai saber.
3. **Dashboard hoje é placeholder vazio (3 cards mockados):** confirma decisão Vinni de refazer 100%. Nenhum reuso possível, é greenfield.

**Áreas que estão OK e não bloqueiam:** pipeline kanban (estável), CRUD de leads/contatos (canônico), agenda backend (CRUD básico funciona, falta Google sync), auth pattern (consistente).

**Gambiarras pequenas:** 3 padrões `any` no chat lib, 2 loops UPDATE em transações (bulk move, reorder stages) que viram N+1 com 50+ items. Tudo refatorável em 1 sprint sem replanejamento.

**Esforço total dos refactors P0+P1:** ~30-40h, paralelizável com Wave 2 do pivot.

---

## 1. Score por módulo

| Módulo | Score | Bloqueia comercial 100%? | Comentário |
|---|---|---|---|
| Leads / Pipeline | 7.5/10 | parcial | Schema canônico, actions sólidas. P0 sandbox + N+1 em bulk. |
| Chat / WhatsApp | 7.0/10 | sim | sandbox vaza, mídia FAILED silencioso, falha de send sem retry |
| Contatos WhatsApp | 7.5/10 | não | Bom queries, falta delete + edit inline (P1) |
| Agenda backend | 6.5/10 | sim | CRUD ok mas SEM Google Calendar sync, sem recurrence, sem ICS export |
| Integrações | 4.0/10 | sim | Só WhatsApp, layout estático, sem Google OAuth ainda |
| **Dashboard atual** | 1.0/10 | **REFAZER 100%** | Placeholder com 3 cards mockados (decisão Vinni: scrap & rebuild) |

---

## 2. Findings críticos (P0 — bloqueadores)

### P0-1. Vazamento de dados sandbox no pipeline de produção

**Onde:** `apps/web/modules/saas/crm/lib/server.ts` (linhas 128-198, 215-221)
+ `apps/web/modules/saas/chat/lib/server.ts` (linhas 110-208)
+ `apps/web/modules/saas/whatsapp-contacts/lib/server.ts` (`listWhatsAppContactsForOrg`)

**Problema:** O schema `lead`, `lead_activity` e `calendar_event` têm coluna `isSandbox` (default false). Quando o Atendente roda em sandbox mode, cria leads/activities com `isSandbox=true` (ver `apps/web/app/api/agents/[agentId]/sandbox/chat/route.ts`). Mas as queries de produção (`listLeadsForOrg`, `listLeadsByPipeline`, `listPipelinesWithStats`, `listActivitiesByLead`) **não filtram** `isSandbox=false`. Resultado: testes do Atendente poluem o pipeline real.

**Impacto:** assim que Atendente entrar em uso real, leads de teste vão aparecer nos relatórios, dashboard, métricas. Sem como distinguir. Vai dar trabalho de limpar manualmente e cliente vai questionar dados.

**Recomendação:** adicionar `eq(lead.isSandbox, false)` em TODAS as queries de leitura do CRM/dashboard. Criar helper `excludeSandbox()` em `crm/lib/server.ts` e aplicar em todas as listas. Sandbox só leigível pelas rotas `/agents/[id]/sandbox/*`.

**Esforço:** S (3-4h).

---

### P0-2. Envio de mídia no chat sem retry / sem fila

**Onde:** `apps/web/modules/saas/chat/lib/actions.ts` linhas 471-543 (`sendMediaMessageAction`).

**Problema:** o action insere a mensagem em DB com status PENDING/SENT, depois chama `sendWhatsAppImage/Video/Audio/Document`. Se a chamada Baileys falhar (rede, instância caída, mídia rejeitada pelo WhatsApp), a mensagem fica como `FAILED` em DB e ninguém é notificado. **Sem retry, sem dead letter queue, sem reabertura via UI.** A mensagem fica órfã.

**Impacto:** em produção, se 2-5% das mídias falharem (taxa típica WhatsApp Baileys), ninguém percebe até cliente reclamar "não recebi a foto". Problema crítico para vendas via WA.

**Recomendação:**
1. **Curto prazo (P0):** UI mostra status FAILED no message bubble + botão "Tentar de novo" que re-dispara envio.
2. **Médio prazo (P1):** mover envio outbound pra BullMQ com retry exponencial (já existe infra Redis/BullMQ no projeto). Worker processa job, atualiza status no DB, notifica via Realtime.

**Esforço:** P0 sem fila = M (4-6h). P1 com fila = L (1 sprint).

---

### P0-3. Bug duplicação de contato em `criarLead`

**Onde:** referenciado no audit de tools (`audit-tools-comercial-2026-04-26.md` seção 5.6).

**Status:** ainda não corrigido. Bloqueia uso real do Atendente. Já documentado.

---

### P0-4. Endpoint `/api/chat/conversations` retorna lista completa sem paginação

**Onde:** `apps/web/app/api/chat/conversations/route.ts` linhas 26-27 + `chat/lib/server.ts` `listConversationsForOrg`.

**Problema:** retorna TODAS as conversas da org sem limit/cursor/offset. Org com 500+ conversas (esperável em 2-3 meses de uso) vai puxar JSON enorme em todo refresh do chat. Bundle pesa, scroll trava.

**Recomendação:** adicionar paginação cursor-based (`cursor` por `lastMessageAt + id`), limit default 50. Frontend já usa `pinnedAt DESC NULLS LAST` order — manter, só limitar.

**Esforço:** S (2-3h).

---

### P0-5. `bulkMoveLeadsAction` faz N UPDATEs em loop dentro de transação

**Onde:** `apps/web/modules/saas/crm/lib/actions-bulk.ts` linhas 112-130. Mesmo padrão em `actions-pipeline.ts` linha 530-537 (`reorderStagesAction`).

**Problema:** loop `for (const l of foundLeads) { await tx.update(...).where(eq(lead.id, l.id)); }`. Para 50 leads = 50 round-trips DB dentro da transação. Lock-time alto, transação pode timeout.

**Recomendação:** consolidar em 1 UPDATE com CASE WHEN para `stageDates` (precisa SQL templating Drizzle) ou fallback batch-by-stage usando `inArray`. Para reorder: usar `update().set({ position: sql`CASE WHEN id = ${id1} THEN 0 WHEN id = ${id2} THEN 1 ... END` })`.

**Impacto:** sem isso, bulk-move de 100 leads no kanban pode demorar 3-5s e trava UI.

**Esforço:** M (4-5h).

---

## 3. Findings importantes (P1 — quick wins)

### P1-1. Logging com `console.info/warn/error` em hot path

**Onde:** `chat/lib/actions.ts` linhas 342-385, 524-541, 533-541. `whatsapp/lib/actions.ts` linhas 69-73, 108-112.

**Problema:** logs estruturados em texto livre. Sem logger estruturado (Winston/Pino), vai ser impossível filtrar `[sendTextMessageAction] whatsapp send failed` em prod.

**Recomendação:** introduzir `@repo/logger` (pino) com namespaces. Padronizar nível ERROR pra catches. Migrar gradual.

**Esforço:** XS por arquivo. Sprint inteira de cleanup ~6-8h.

---

### P1-2. `LeadModal.tsx` com 1030 linhas e 4 sub-componentes inline

**Onde:** `apps/web/modules/saas/crm/components/LeadModal.tsx`.

**Problema:** 4 sub-componentes (`FieldRow`, `InlineTextField`, `ActivityLogger`, `ActivitySidebar`) declarados no mesmo arquivo. Dificulta busca, edição e teste isolado. 33 hooks usados.

**Recomendação:** extrair sub-componentes pra `crm/components/lead-modal/`:
- `LeadModal.tsx` (~400 linhas) — orquestração
- `LeadModal.FieldRow.tsx` (~80)
- `LeadModal.InlineTextField.tsx` (~100)
- `LeadModal.ActivityLogger.tsx` (~120)
- `LeadModal.ActivitySidebar.tsx` (~150)

**Esforço:** S (3-4h, pure refactor sem mudar comportamento).

---

### P1-3. Casts `as any` em queries Drizzle do chat

**Onde:** `chat/lib/server.ts` linhas 124, 136. `chat/lib/actions.ts` linha 481.

**Problema:** type erasures em código de produção. O erro de tipo está mascarado.

**Recomendação:** `or(...arr)` em Drizzle suporta tipagem; só faltou typar o array como `SQL<unknown>[]`. Fixar com tipos explícitos.

**Esforço:** XS (30min).

---

### P1-4. Convenções inconsistentes entre módulos

**Padrões observados:**

| Módulo | Helper auth | Helper revalidate | Padrão schema |
|---|---|---|---|
| crm/lib/actions | `requireAuthed` inline | `revalidateCrm(slug)` | Zod inline |
| crm/lib/actions-bulk | `requireAuthed` inline | `revalidateCrm` no fim do arquivo | Zod inline |
| crm/lib/actions-pipeline | `requireAuthed` inline | `revalidateCrm` inline | Zod inline |
| chat/lib/actions | `requireAuthed` inline | `revalidateChat(slug)` | Zod inline |
| agenda/lib/actions | `requireAuthed` inline | `revalidateAgenda(slug)` | Zod em `schemas.ts` |
| whatsapp-contacts | `requireAuthed` inline | inline `revalidatePath()` | Zod inline |
| whatsapp/lib/actions | `requireAuthed` inline | `revalidateIntegrations(slug)` | Zod inline |

Cada módulo tem sua versão de `requireAuthed`, `assertOrgAccess`, `revalidateXxx`. Mesma lógica copiada 7x.

**Recomendação:** extrair pra `apps/web/lib/server-action-helpers.ts`:
- `withAuth<T>(handler)` — HOF que injeta `user` autenticado e valida org access via `organizationId` no input.
- `revalidateCrm(slug, area?)` — área opcional pra granular.

Migração gradual: novos actions usam helpers; antigos migram em P2.

**Esforço:** M (4-5h infra + S por módulo migrado).

---

### P1-5. Falta confirmação destrutiva em `deletePipelineAction`

**Onde:** `actions-pipeline.ts` linhas 265-325.

**Problema:** action deleta pipeline e cascade leads. UI tem confirmação? Ainda não verifiquei na ManagePipelinesModal mas: se ativa via button single-click, vai dar problema. Erro "PIPELINE_HAS_LEADS_MUST_MIGRATE" só protege se há leads.

**Recomendação:** verificar UI; se faltar, adicionar AlertDialog com "tem certeza?" + count de leads + opção de migrar.

**Esforço:** S (2h).

---

### P1-6. `OrganizationStart.tsx` (dashboard) tem 39 linhas com dados mockados

**Onde:** `apps/web/modules/saas/organizations/components/OrganizationStart.tsx`.

**Status:** confirmado placeholder. **Não auditar mais — refazer 100% no bloco H do pivot.**

**Único débito atual:** o componente é client (`"use client"`) e usa `useTranslations` mas dados são literais hardcoded (344, 5243, 0.03). Quando refazer, fazer SSR/RSC com dados reais agregados.

---

## 4. Findings médios (P2 — melhoria contínua)

- **P2-1.** `chat/lib/server.ts:110` `listConversationsForOrg` aceita `statusFilter` mas frontend não usa filtro server-side; filtra client-side em ConversationList. Ineficiente quando lista crescer.
- **P2-2.** `crm/lib/server.ts:128` `listLeadsForOrg` retorna 18 campos sempre. Endpoints poderiam pedir só os campos necessários (Drizzle `select({...})` parcial). Bundle do kanban traz `description` e `closedAt` que kanban não usa.
- **P2-3.** `whatsapp-contacts/lib/server.ts:50` `listWhatsAppContactsForOrg` faz 4 queries sequenciais. Poderia ser 1 query com LEFT JOINs + LATERAL para latest lead/conversation. Pesquisar otimização quando lista passar 1000 contatos.
- **P2-4.** Schema `lead.tags[]` e `contact.tags[]` existem sem UI de edição inline. Fica como campo morto até campanhas (M2-04) usar.
- **P2-5.** Schema `lead.subtaskCount/Done` existe mas SEM UI nem tool. Decidir: descartar ou implementar progress bar.
- **P2-6.** Migration de schema no `crm.ts` usa `varchar(255)` em FKs e `text` em outras. Inconsistência. Drizzle gera mesmo SQL mas dificulta leitura.
- **P2-7.** Eventos do bus (`lead.stage.changed`, `conversation.created`) emitidos mas SEM consumidor visível ainda. Audit middleware existe (`startAuditMiddleware`). Quando follow-up (bloco B) entrar, vai consumir esses eventos.
- **P2-8.** `crm/lib/filter-leads.ts` faz filtragem client-side. Funciona bem com <500 leads. Quando cliente passar disso, mover pra server.

---

## 5. Refactor de schema necessários

| Tabela | Mudança | Motivo | Migration? |
|---|---|---|---|
| `lead` | adicionar índice composto `(organizationId, isSandbox, stageId)` | filtros sandbox + stage no kanban | sim |
| `lead_activity` | adicionar índice `(leadId, isSandbox, createdAt DESC)` | timeline filtrada | sim |
| `calendar_event` | adicionar campo `googleEventId` (nullable) + `recurrenceRule` (jsonb) | bloco D Agenda completa exige | sim |
| `calendar` | adicionar `googleCalendarId` (nullable) + `oauthCredentialsRef` | OAuth Google Calendar | sim |
| `conversation` | considerar `lastMessageAt` index com FILTER `WHERE pinnedAt IS NULL` | otimizar lista paginada | sim |
| `message` | considerar adicionar `failedReason` (text) | diagnose retry FAILED | sim |
| `lead`/`contact` | NÃO modificar `tags[]` schema — UI vem em P1 | aguardar bloco B/C | não |

**Total:** 4-5 migrations pequenas. Pode ser uma única migration consolidada chamada `2026_04_27_comercial_pivot_indexes.ts`.

@data-engineer valida antes do @dev aplicar.

---

## 6. Recomendações arquiteturais (consolidação)

### 6.1. Padrão de server action

**Hoje (7 variantes do mesmo loop):**
```ts
async function requireAuthed() { /* repete em 7 arquivos */ }
async function assertXxxAccess(userId, id) { /* repete N vezes */ }
const fooSchema = z.object({...});
export async function fooAction(input, slug) {
  const user = await requireAuthed();
  const data = fooSchema.parse(input);
  await assertXxxAccess(user.id, data.id);
  // ...
  revalidateXxx(slug);
}
```

**Recomendado (helper centralizado):**
```ts
// apps/web/lib/server-action.ts
export const action = createActionFactory({
  auth: requireAuthedUser,
  revalidate: (slug, paths) => paths.forEach(p => revalidatePath(`/app/${slug}${p}`)),
});

// uso
export const updateLeadAction = action
  .input(updateLeadSchema)
  .access(({ input, user }) => assertLeadAccess(user.id, input.id))
  .revalidatePaths(['/crm/pipeline', '/crm/leads'])
  .handler(async ({ input, user, orgId }) => {
    await db.update(lead).set({...}).where(eq(lead.id, input.id));
  });
```

Bibliotecas: `next-safe-action` ou `zsa`. Já estabelecidos. Reduz ~40% do código boilerplate de actions.

### 6.2. Repositório / query helpers

Hoje queries vivem em `lib/server.ts` por módulo. Está ok. **Não migrar pra repositories formais**, mas extrair query reuse:

- `crm/lib/queries/leads.ts` — `listLeadsForOrg`, `getLeadById`, `getLeadByContactId`
- `crm/lib/queries/pipelines.ts` — `getDefaultPipelineWithStages`, `listPipelinesWithStats`
- `chat/lib/queries/conversations.ts` — paginadas
- compartilhar `excludeSandbox()` helper

### 6.3. Realtime + BullMQ pattern

WhatsApp send tem 2 caminhos hoje:
- **Inbound:** webhook → BullMQ → worker Mastra → DB → Realtime supabase notifica frontend
- **Outbound:** action server → DB → Baileys send (sync, sem fila)

**Recomendação:** unificar outbound atrás do BullMQ. Action enfileira job, worker processa, atualiza status, notifica via Realtime. Mesmo pattern dos dois lados. Simplifica retry/observability.

### 6.4. Multi-tenant guard centralizado

`requireOrgAccess(userId, orgId)` está consistente. Manter. Já é canônico via `@repo/auth`.

**Único gap:** algumas queries server-side (ex: `listLeadsForOrg(organizationId)`) não validam que o user da sessão é da org. Confiam no caller. Adicionar guard explícito ou assumir que actions sempre validam (atual).

### 6.5. Pattern de revalidate

Cada módulo tem seu `revalidateXxx` que invalida 3-5 paths. Não há overhead real (revalidate é leve), mas é repetitivo. Aceitável.

### 6.6. Fundação para Analista futuro

Para Analista (M2-03) ler dashboard e propor ações:
- **Necessário:** views materializadas ou queries cacheadas com agregações (leads por stage, conversion rate, tempo médio em stage, % follow-up bem-sucedido).
- **Hoje:** zero. Cada vez que dashboard render, vai agregar do zero.
- **Recomendação:** quando refazer dashboard (bloco H), incluir camada de aggregation queries (`crm/lib/queries/analytics.ts`) com cache via `unstable_cache` Next 15 ou Redis.

---

## 7. Plano de ataque ordenado

### Wave 1 (em paralelo com Wave 2 do pivot — bloco D/E/H)

| # | Item | Esforço | Dono sugerido |
|---|---|---|---|
| W1.1 | Filtro `isSandbox=false` em todas queries CRM/chat (P0-1) | 4h | @dev |
| W1.2 | Botão "Tentar enviar de novo" em mensagem FAILED + UI (P0-2 short) | 4h | @dev |
| W1.3 | Paginação cursor em `/api/chat/conversations` + frontend (P0-4) | 3h | @dev |
| W1.4 | Bulk move/reorder em SQL único com CASE WHEN (P0-5) | 5h | @dev |
| W1.5 | Migration: indexes sandbox + agenda Google fields (P0-1, bloco D) | 3h | @data-engineer |
| W1.6 | Casts `as any` no chat/lib (P1-3) | 30min | @dev |

**Total Wave 1:** ~20h. Paralelizável em 3-4 dias com @dev focado.

### Wave 2 (depois Wave 1 + bloco D/E/H)

| # | Item | Esforço |
|---|---|---|
| W2.1 | Outbound WhatsApp via BullMQ + retry (P0-2 long) | 1 sprint |
| W2.2 | Helper `withAuth/action` centralizado + migrar 1 módulo piloto (P1-4) | 6h |
| W2.3 | Logger estruturado pino (P1-1) | 6h |
| W2.4 | Confirmações destrutivas faltantes (P1-5) | 2h |
| W2.5 | Refactor LeadModal split (P1-2) | 4h |

**Total Wave 2:** ~25h.

### Wave 3 (continuous improvement)

P2-1 a P2-8. Conforme necessidade. Não bloqueia nada.

---

## 8. Próximos passos

> [!todo] Decisões e handoffs
> 1. **Vinni (CEO)** decide ordem:
>    - Recomendação: aprovar Wave 1 inteira ANTES de Wave 2 do pivot. Sandbox + retry + paginação são pré-requisitos do agente Atendente operar limpo.
>    - Alternativa: rodar Wave 1 em paralelo com bloco D (Agenda) já que são @dev tasks.
> 2. **@data-engineer (Dozer)** valida o capítulo 5 (refactor de schema) e prepara migration consolidada.
> 3. **@dev (Neo)** executa Wave 1 conforme aprovação. Cada item vira story isolada.
> 4. **@architect** redesenha `OrganizationStart` (dashboard) durante bloco H — começar do zero, especificar layout (Vinni mapeou em pivot doc).
> 5. **Audit fica como living doc** — adicionar coluna "status" em cada finding (open/in-progress/done) conforme refactors aplicados.

> [!info] Fora deste audit (referência cruzada)
> - **Tools P0:** ver `audit-tools-comercial-2026-04-26.md` — não duplicado aqui.
> - **Mastra/agentes:** ver `audit-mastra-2026-04-25.md` — fora do escopo deste audit (skipped).
> - **AI Studio UI:** ver `ai-studio-v3-design.md` — congelado pelo pivot.
