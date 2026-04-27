---
type: audit
title: "Audit Tool Surface — Setor Comercial (2026-04-26)"
project: vertech-agents
date: 2026-04-26
auditor: architect
status: draft
tags:
  - project/vertech-agents
  - architecture
  - audit
  - mastra
  - tools
  - vision-v3
related:
  - "[[PROJECT-ROADMAP-V3]]"
  - "[[audit-mastra-2026-04-25]]"
  - "[[ai-studio-v3-design]]"
---

# Audit Tool Surface — Setor Comercial (2026-04-26)

**Auditor:** @architect (Architect)  
**Solicitado por:** Vinni (CEO)  
**Branch:** `feature/phase-09-architect-ui`  
**Bloqueia:** Phase 11.2.2 (Tools panel editável), M2-03 Analista, M2-04 Campanhas

---

## Resumo executivo (3 linhas, leia primeiro)

> [!warning] Gap real: Atendente tem 11 tools, produto expõe ~32 ações no setor comercial. Cobertura efetiva ≈ 40%.
> **Mais grave:** o Atendente NÃO consegue (1) atualizar prioridade/origem/interesse/responsável do lead, (2) enviar mídia (imagem/áudio/PDF) pelo WhatsApp, (3) marcar conversa como lida ou mudar status (resolvido/arquivado), (4) tagear contatos. **Recomendação:** antes de Phase 11.2.2, fechar 6 tools P0 (1 sprint) que destravam o GTM. RAG-1 e proposta PDF continuam stubs até M2-02/M5.

---

## 1. Tools registradas hoje no Atendente

Path: `packages/ai/src/mastra/tools/atendente/index.ts` — 11 tools exportadas em `atendenteTools` registry.

| # | Tool | Inputs principais | O que faz | Status |
|---|------|-------------------|-----------|--------|
| 1 | `criarLead` | nome, telefone, email, titulo, valor | Cria contato + lead no pipeline default da org, primeira stage | Funcional |
| 2 | `moverLeadStage` | leadId, stageId | Move lead de stage e cria activity STAGE_CHANGE | Funcional |
| 3 | `atualizarLead` | leadId, titulo, descricao, valor | Atualiza só título/descrição/valor | Funcional parcial (faltam 6 campos) |
| 4 | `definirTemperatura` | leadId, COLD/WARM/HOT | Define temperatura | Funcional |
| 5 | `verHistoricoLead` | leadId, limite | Lê activities + count de mensagens | Funcional |
| 6 | `buscarConhecimento` | query, topK | RAG-1 — busca knowledge base | **Stub** (TODO M2-02) |
| 7 | `verDisponibilidade` | dias, duracaoMinutos | Lista eventos ocupados na agenda | Funcional |
| 8 | `agendarEvento` | titulo, inicioISO, duracao, leadId | Cria evento no calendário + activity MEETING | Funcional |
| 9 | `criarTarefa` | leadId, titulo, descricao | Cria activity TASK | Funcional (não há tabela `task` separada) |
| 10 | `pedirHumano` | leadId, motivo, urgencia | Registra activity SYSTEM, sem notificação ainda | **Stub** (notificação só em M2-05) |
| 11 | `enviarPropostaPdf` | leadId, plano, valor, observacoes | Registra activity NOTE, não gera PDF nem envia | **Stub** (PDF gen + envio WA pendente) |

**Resumo:** 8 funcionais / 3 stubs / 1 funcional parcial.

---

## 2. Surface operacional descoberta no produto

### 2.1. Pipeline / Lead

**Onde mora:** `apps/web/modules/saas/crm/**` + actions em `apps/web/modules/saas/crm/lib/actions.ts`, `actions-bulk.ts`, `actions-pipeline.ts`, `actions-views.ts`, `actions-templates.ts`. Schema em `packages/database/drizzle/schema/crm.ts`.

| Ação no produto | Onde está exposto | Field/server action |
|---|---|---|
| Criar lead manualmente | NewLeadDialog | `createLeadAction` |
| Mover lead de stage (kanban drag, modal, bulk) | PipelineKanban, LeadModal, BulkActionsBar | `moveLeadToStageAction` / `bulkMoveLeadsAction` |
| Editar título do lead | LeadModal inline | `updateLeadAction` |
| Editar descrição | LeadModal textarea | `updateLeadAction` |
| Editar valor estimado (BRL) | LeadModal CurrencyField | `updateLeadAction` |
| Definir temperatura (COLD/WARM/HOT) | LeadModal/LeadCard pickers | `updateLeadAction` |
| Definir prioridade (LOW/NORMAL/HIGH/URGENT) | LeadModal PrioritySelect | `updateLeadAction` |
| Definir origem (slug) | LeadModal OriginPicker | `updateLeadAction` |
| Definir interesses (array de tags) | LeadModal InterestsPicker | `updateLeadAction` |
| Atribuir responsável (user da org) | LeadModal AssigneePicker / BulkActionsBar | `updateLeadAction` / `bulkAssignLeadsAction` |
| Favoritar (star) | LeadModal | `updateLeadAction` |
| Definir dueDate | Schema tem campo, **UI não expõe edição direta hoje** | (campo no schema) |
| Excluir lead | LeadModal / BulkActionsBar | `deleteLeadAction` / `bulkDeleteLeadsAction` |
| Registrar atividade (CALL/EMAIL/MEETING/TASK/WHATSAPP/NOTE) | LeadModal ActivityLogger | `logActivityAction` |
| Comentar (NOTE livre) | LeadModal sidebar | `logActivityAction` |
| Listar atividades | LeadModal ActivitySidebar | `getLeadDetailsAction` |
| Marcar como ganho (won stage) | LeadModal "marcar ganho" | `moveLeadToStageAction` |
| Tags livres no lead | Schema `lead.tags[]` — UI parcial | (filtros usam, edição inline ainda não) |
| Subtasks count/done | Schema tem — UI ainda não expõe edição | (campo) |

### 2.2. Chat / WhatsApp messages

**Onde mora:** `apps/web/modules/saas/chat/**`, actions em `apps/web/modules/saas/chat/lib/actions.ts`. Driver Baileys em `packages/whatsapp`.

| Ação no produto | Onde está exposto | Field/server action |
|---|---|---|
| Iniciar conversa com contato existente | NewConversationDialog | `createOrGetConversationAction` |
| Enviar mensagem de texto | MessageComposer | `sendTextMessageAction` (dispara `sendWhatsAppText`) |
| Enviar imagem | MessageComposer paperclip | `sendMediaMessageAction` (dispara `sendWhatsAppImage`) |
| Enviar áudio (gravado) | MessageComposer AudioRecorder | `sendMediaMessageAction` (dispara `sendWhatsAppVoiceNote`) |
| Enviar vídeo | MessageComposer | `sendMediaMessageAction` (dispara `sendWhatsAppVideo`) |
| Enviar documento/PDF | MessageComposer | `sendMediaMessageAction` (dispara `sendWhatsAppDocument`) |
| Caption em mídia | MessageComposer | `sendMediaMessageAction` |
| Marcar conversa como lida | ConversationList click | `markConversationAsReadAction` |
| Mudar status (NEW→ACTIVE→WAITING→RESOLVED→ARCHIVED) | ConversationList menu | `updateConversationStatusAction` |
| Atribuir user à conversa | ConversationFilters / detalhe | `assignUserToConversationAction` |
| Fixar/desafixar conversa (max 3) | Menu do item | `togglePinConversationAction` |
| Excluir conversa | Menu do item | `deleteConversationAction` |
| Galeria de mídia da conversa | ContactMediaGallery | (read-only) |
| Editar dados do contato pelo painel | ContactDetailsPanel inline | `updateContactAction` |
| Criar lead a partir da conversa | ContactDetailsPanel "Criar lead" | `createLeadAction` |
| **Reagir a mensagem (emoji)** | NÃO existe UI nem action | — |
| **Encaminhar mensagem** | NÃO existe | — |
| **Reply/quote a mensagem** | Schema tem `replyToMessageId` mas UI não usa | — |

### 2.3. Contatos WhatsApp

**Onde mora:** `apps/web/modules/saas/whatsapp-contacts/**`, actions em `lib/actions.ts`.

| Ação no produto | Onde está exposto | Field/server action |
|---|---|---|
| Sync inicial dos 826 contatos do celular | Botão "Sincronizar" | `syncWhatsAppContactsNowAction` |
| Filtrar por status (todos / sem conversa / em conversa / viraram lead) | WhatsAppContactsTable | filtro client-side |
| Buscar por nome/telefone | Search input | filtro client-side |
| Promover contato a lead (single ou bulk) | Botão "Promover" | `promoteContactsToLeadsAction` |
| Abrir conversa com contato | Botão "Conversar" | `openConversationWithContactAction` |
| Refresh de perfil WhatsApp (foto, business) | Hook automático | `refreshContactWhatsAppProfileAction` |
| **Tagear contato** | Schema `contact.tags[]` existe — **UI ainda não expõe edição** | — |
| **Editar contato direto na lista** | NÃO — só via ContactDetailsPanel ou LeadModal | — |
| **Exportar contatos (CSV)** | NÃO existe | — |
| **Segmentar contatos (filtros salvos)** | NÃO existe ainda | — |

---

## 3. Gap analysis (cruzamento)

> Símbolos: ✅ existe / ❌ falta / ⚠️ stub / ➗ funcional parcial

### 3.1. Pipeline / Lead

| Ação no produto | Tool registrada | Status |
|---|---|---|
| Criar lead | `criarLead` | ✅ |
| Mover lead de stage | `moverLeadStage` | ✅ |
| Editar título | `atualizarLead` | ✅ |
| Editar descrição | `atualizarLead` | ✅ |
| Editar valor | `atualizarLead` | ✅ |
| Definir temperatura | `definirTemperatura` | ✅ |
| **Definir prioridade** (LOW/NORMAL/HIGH/URGENT) | (nenhuma) | ❌ |
| **Definir origem** (slug) | (nenhuma) | ❌ |
| **Definir interesses** (array) | (nenhuma) | ❌ |
| **Atribuir responsável** (assignedTo user) | (nenhuma) | ❌ |
| **Favoritar (star)** | (nenhuma) | ❌ |
| **Definir dueDate** | (nenhuma) | ❌ |
| **Adicionar/remover tags do lead** | (nenhuma) | ❌ |
| **Marcar como ganho/perdido** (won/lost stage) | `moverLeadStage` cobre, mas LLM precisaria saber o stageId destino | ➗ |
| Excluir lead | (nenhuma) | ❌ — provavelmente intencional (perigoso pra IA) |
| Registrar atividade CALL/EMAIL/MEETING/etc | `criarTarefa` cria TASK; demais tipos não cobertos | ➗ |
| Adicionar comentário/nota livre | (nenhuma) — `criarTarefa` força tipo TASK | ❌ |
| Listar atividades | `verHistoricoLead` | ✅ |
| Buscar lead por filtro/nome (cross-conversation) | (nenhuma) | ❌ |
| Listar leads por stage / por filtro | (nenhuma) | ❌ |
| **Atualização parcial genérica do lead** | hoje 3 tools separadas — `atualizarLead` (3 campos), `definirTemperatura`, `moverLeadStage`. Os outros 7 campos faltam | ❌ |

### 3.2. Chat / WhatsApp messages

| Ação no produto | Tool registrada | Status |
|---|---|---|
| Enviar texto via WA | (implícito — agente devolve string e Atendente runtime envia) | ✅ via `agent.stream()` + handler |
| **Enviar imagem** | (nenhuma) | ❌ |
| **Enviar áudio** (TTS ou voice note) | (nenhuma) | ❌ |
| **Enviar vídeo** | (nenhuma) | ❌ |
| **Enviar documento (PDF)** | (nenhuma — `enviarPropostaPdf` é stub) | ❌ |
| **Marcar conversa como lida** | (nenhuma) | ❌ |
| **Mudar status conversa** (RESOLVED, ARCHIVED) | (nenhuma) | ❌ |
| **Atribuir user/agent à conversa** | (nenhuma) | ❌ |
| **Fixar conversa** | (nenhuma — discutível se IA deveria) | ❌ (intencional?) |
| **Reply/quote mensagem** | (nenhuma) | ❌ |
| **Reagir com emoji** | (nenhuma — UI também não tem) | ❌ (sem-suporte product-wide) |
| **Buscar mensagens cross-conversation** | (nenhuma) | ❌ |
| **Listar conversas ativas da org** | (nenhuma) | ❌ |

### 3.3. Contatos WhatsApp

| Ação no produto | Tool registrada | Status |
|---|---|---|
| Promover contato → lead | `criarLead` faz tudo (cria contato + lead) | ✅ |
| **Editar contato existente** (nome, email, empresa) | (nenhuma) | ❌ |
| **Tagear contato** | (nenhuma) | ❌ |
| **Vincular contato existente a lead** (sem duplicar contato) | hoje `criarLead` sempre cria contato novo | ❌ — duplica contatos |
| **Buscar contato por telefone/nome** | (nenhuma) | ❌ |
| **Sync WhatsApp contacts** | (nenhuma — só via botão UI) | ❌ (provavelmente intencional, ação cara) |
| **Refresh perfil WA** (foto, business) | (nenhuma) | ❌ (intencional — ação técnica) |

### 3.4. Conhecimento / Memória

| Ação no produto | Tool registrada | Status |
|---|---|---|
| RAG-1 (knowledge base do agente) | `buscarConhecimento` | ⚠️ stub |
| RAG-2 (memória profunda do lead — Working Memory + Semantic Recall) | implícito via Memory factory, NÃO via tool | ✅ funciona, mas não chamável |
| RAG-3 (Analista — pesquisa pipeline + insights) | (nenhuma — Analista chega em M2-03) | ❌ futuro |

---

## 4. Recomendação V3 (priorizada)

### P0 — Bloqueia GTM (fechar antes Phase 11.2.2)

Sem isso o Atendente fica com cara de chatbot meia-boca em produção.

| Tool nova | Justificativa | Esforço |
|---|---|---|
| `atualizarLead` (genérica) cobrindo 10 campos via discriminated union: `{ campo: "prioridade"\|"origem"\|"interesse"\|"responsavel"\|"tags"\|"dueDate"\|"favoritar"\|..., valor: ... }` | Single-source pra atualização parcial. Substitui split atual de 3 tools. LLM precisa SOMENTE descrever qual campo + valor. | M (4-6h) |
| `enviarMidia` (image/audio/video/document) | Atendente vendendo SaaS sem mandar print de tela é incompleto. Áudio gera intimidade. PDF de proposta é must-have. | M (4-6h) — wire `sendWhatsAppImage/Voice/Video/Document` em tool wrapping conversa ativa do lead |
| `marcarConversaResolvida` (e/ou status update) | Quando lead vira ganho, conversa precisa fechar pra não poluir caixa | S (2h) |
| `buscarLeadOuContato` (query + filtros) | Cross-conversation search. "Tem alguém chamado João Silva no pipeline?" | M (3-4h) |
| `comentarLead` (NOTE livre, não TASK) | Hoje `criarTarefa` força tipo TASK. Precisa NOTE de raciocínio interno do agente. | XS (30min) |
| `vincularLeadAContato` (não criar duplicata) | Evita 2 contatos do mesmo telefone quando agente cria lead pra contato já sincronizado | S (1h) |

**Total P0:** ~15-20h, 1 sprint folgada.

### P1 — Depois de M2-05 (Analista valida)

| Tool nova | Justificativa | Esforço |
|---|---|---|
| `buscarConhecimento` (wire real RAG-1) | Hoje stub. M2-02 wire pgvector. | M — wire de Phase 08-alpha |
| `enviarPropostaPdf` (gerar real) | PDF gen com `pdfkit` + envio via `enviarMidia` | L (1 sprint) |
| `pedirHumano` (notificação real) | M2-05 Assistente recebe via grupo WA interno | M (depende M2-05) |
| `tagearContato` | Segmentação fina pra Campanhas (M2-04) | XS |
| `listarLeadsPorStage` | Útil pra Atendente fazer "follow-up de leads em qualificação" | S |

### V4 — Nice to have

- `reagirMensagem` — depende UI ter suporte
- `replyMensagem` — schema já tem `replyToMessageId`, UI não usa
- `exportarContatos` — fora do escopo do Atendente, mais pro Analista
- `mesclarLeads` (merge) — perigoso, melhor humano

---

## 5. Recomendações arquiteturais

### 5.1. **Refator: 1 tool genérica `atualizarLead` em vez de N tools por campo**

Hoje: `atualizarLead` (3 campos) + `definirTemperatura` (1 campo) + `moverLeadStage` (1 campo). Faltam 7 campos. Multiplicar pra 10 tools por campo é ruim — sobrecarrega prompt do LLM e dificulta evolução.

**Padrão recomendado** (Mastra v1.28 suporta nativamente via Zod discriminated union):

```ts
inputSchema: z.object({
  leadId: z.string(),
  patch: z.object({
    titulo: z.string().optional(),
    descricao: z.string().optional(),
    valor: z.number().optional(),
    temperatura: z.enum(["COLD", "WARM", "HOT"]).optional(),
    prioridade: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
    origem: z.string().optional(),
    interesses: z.array(z.string()).optional(),
    responsavelId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    favoritar: z.boolean().optional(),
    dueDate: z.string().datetime().optional().nullable(),
  }),
}),
```

Mantém `moverLeadStage` separada (semantica clara) e `definirTemperatura` como alias (migrar gradualmente).

### 5.2. **Schema gaps — flagar @data-engineer**

UI/produto **NÃO** tem campos faltando — todos os campos referenciados acima já existem em `lead`/`contact`/`conversation`. Schema está completo. Nenhuma migration necessária pra fechar gap P0.

**Único débito real:** tabela `task` separada de `lead_activity` (hoje TASK é só uma row de activity com `type: "TASK"`). Não bloqueia, mas se Phase 11 trouxer "ver tarefas pendentes globais", vai precisar de tabela própria. Decisão pode esperar.

### 5.3. **Padrão de input/output divergente**

Tools atuais usam `(input: any, ctx: any)` — tipagem fraca. **Mastra v1.28 aceita tipagem forte via inferência do schema.** Refactor recomendado em paralelo ao P0:

```ts
// ❌ Hoje
execute: async (input: any, ctx: any) => { ... }

// ✅ Recomendado
execute: async (input, ctx) => {  // tipos inferidos do inputSchema
  const orgId = ctx?.requestContext?.get("organizationId") as string | undefined;
  ...
}
```

Ver snippet 1 da skill `mastra-expert`. Posicional, tipos via inferência, runtime context propagado pelo Mastra.

### 5.4. **RAG-2 (memória profunda do lead)**

Já funciona via Working Memory + Semantic Recall na config do Memory (`packages/ai/src/mastra/memory/config.ts`). **Não precisa tool dedicada** — Mastra puxa automaticamente no contexto do `agent.stream()`.

**Risco:** se LLM quiser explicitamente "consultar o que sei sobre esse lead" em um turno específico (sem ter recebido recall automático), não tem como invocar manualmente. Considerar `consultarMemoriaLead(leadId, query)` em P1 quando rodar dataset com casos onde recall automático falhou.

### 5.5. **Tool de busca cross-conversation**

`buscarLeadOuContato(query, filtros)` é dual-use: serve pro Atendente E pro Analista (M2-03). Implementar em P0 com filtros básicos (nome, telefone, stage, temperatura). Estender no M2-03 com filtros avançados (datas, valor range, tags AND/OR).

### 5.6. **Anti-pattern detectado: criação duplicada de contato**

`criarLead` no `tools/atendente/index.ts` linha 89-98 sempre faz `db.insert(contact).values(...)` — não verifica se contato existe. Em prod, Atendente vai criar contato duplicado pra todo lead novo (o normal é o contato já existir, sincronizado do WhatsApp).

**Fix imediato:** antes do insert, fazer `findFirst` por `(organizationId, phone)` e só inserir se não existir. **Bloqueador implícito** — ainda não detectado em prod só porque sandbox testa com leads novos.

### 5.7. **Tools de mídia precisam descobrir a conversa ativa**

`enviarMidia(leadId, type, mediaUrl)` precisa resolver a conversa WhatsApp ativa do lead. Pattern: lookup `lead.contactId` → `conversation` por `(contactId, channel="WHATSAPP")` → reusa `sendMediaMessageAction` ou chama o driver direto. Tool **NÃO** deve criar conversa nova — se não existe, retornar erro pro LLM ("contato sem conversa WhatsApp ativa").

### 5.8. **Phase 11.2.2 (Tools panel editável) — bloqueada por estes gaps**

A UI de "Tools" do Inspetor V3 vai mostrar 11 itens hoje, mas o produto exige ~17-20 tools cobertas. Se Phase 11.2.2 sair antes de fechar P0, os usuários (agências) vão configurar agentes com superfície incompleta — depois precisam refazer. **Recomendação forte:** segurar UI de Tools panel até P0 done.

---

## 6. Próximos passos

> [!todo] Decisões + handoffs
> 1. **Vinni (CEO)** decide priorização: aprova P0 antes de Phase 11.2.2? (Recomendação: sim, 1 sprint trava o GTM correto)
> 2. **@data-engineer** valida que nenhuma migration é necessária pro P0 (esta auditoria diz que não, mas confirme schema dos campos `priority`, `origin`, `assignedTo`, `tags`, `dueDate`, `starred`, `interests` em `lead`)
> 3. **@dev (Neo)** implementa P0 em ordem: `atualizarLead` (genérica) → `enviarMidia` → `comentarLead` → `marcarConversaResolvida` → `buscarLeadOuContato` → `vincularLeadAContato`. Fix bug de duplicação de contato em `criarLead` no mesmo PR.
> 4. **@architect** redesenha o painel de Tools de Phase 11.2.2 já contemplando a surface completa (17-20 tools) com agrupamento por categoria (Lead / Conversa / Conhecimento / Agenda / Handoff).
> 5. **@qa (Oracle)** atualiza scorers de qualificação pra contemplar tools P0 — hoje `qualificacaoScorer` mede só campos do briefing, precisa medir "agente usou as tools certas"

> [!info] Fora deste audit (mas mencionar pro Vinni)
> - Schema `lead.tags[]` e `contact.tags[]` existem mas UI ainda não tem edição inline. Phase futura precisa cobrir isso pra Campanhas (M2-04) funcionar.
> - Subtasks (`lead.subtaskCount/Done`) estão no schema sem UI nem tool. Decisão de produto: descartar? Ou implementar? Hoje é campo morto.
