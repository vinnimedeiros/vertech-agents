---
type: roadmap
title: "Vertech Agents — Roadmap V3 (TIME 4 agentes)"
project: vertech-agents
tags:
  - project/vertech-agents
  - roadmap
  - vision-v3
date: 2026-04-25
status: ativo
supersedes: PRD v2 phases (Phase 09 wizard + Phase 10 orquestrador)
related:
  - "[[mercado-agentes-sintese-comparativa]]"
  - "[[mastra-deep-dive-2026]]"
  - "[[analise-independente-construtor]]"
  - "[[project_vision_v3_produto]]"
  - "[[project_decisoes_q1_q12_fechadas]]"
  - "[[project_mastra_strategy]]"
---

# Roadmap V3 — TIME 4 agentes IA

> [!info] Decisão fundadora
> Pivot V2→V3 batido em 2026-04-25 após pesquisa Mercado Agentes (1.0+2.0) + análise independente + Mastra deep dive. Vertech vende **TIME comercial de IA** (4 agentes coordenados c/ identidade unificada), NÃO agente único. Modelo agência B2B2B (setup pago + recorrência).
>
> Decisões consolidadas:
> - 12 perguntas estratégicas Q1-Q12 fechadas (`mercado-agentes-sintese-comparativa.md` seção 4)
> - 3 alertas R1-R3 endereçados (R1 Baileys agora + API oficial paralelo, R2 evolução progressiva, R3 sandbox playground escopo restrito)
> - Plano Mastra P0/P1/P2 (`project_mastra_strategy.md`)

---

## Princípios de execução

1. **Modo dev total até MVP** — primeira ida prod só quando 4 agentes coordenados validados
2. **Evolução progressiva multi-agent** — Atendente solo → +Analista → +Campanhas → +Assistente. Critério mensurável "3 coordenam >70% sucesso → escala pra 4"
3. **Mastra-first** — usar features nativas (Supervisor, Studio, Memory observacional, Workflows suspend) antes de construir custom
4. **Quality gate humano** após cada sub-phase (Vinni testa UI antes de seguir)
5. **Sem retrabalho** — escolher sempre opção que escala (BullMQ+Redis+observabilidade desde MVP)

---

## Estrutura — 7 Milestones

| Milestone | Tema | Status | Critério done |
|-----------|------|--------|---------------|
| **M0** | Fundação V3 (já existente) | ~80% feito | Phases 1-6.5 + 07A + 08-alpha + Agenda em prod-ready |
| **M1** | Mastra Foundation (P0 plano Mastra) | A iniciar | Studio self-hosted + Supervisor + Memory observacional + Datasets + Scorers |
| **M2** | TIME 4 agentes (evolução progressiva R2) | A iniciar | 4 agentes coordenados >70% sucesso medido em Studio |
| **M3** | UX & Construtor V3 (Q6 fechado) | A iniciar | Wizard primário + Canvas opt-in + Configurações Avançadas + 10+ templates |
| **M4** | Multi-tenant & BYOK cascata | A iniciar | Cascata 4 níveis + Cofre keys criptografado + permissões árvore |
| **M5** | Humanização & Vendas | A iniciar | 8+ módulos humanização + 5 frameworks vendas + Tom desacoplado |
| **M6** | WhatsApp Abstraction + R1 + Reativação | A iniciar | Camada canal abstrata + anti-bloqueio + reativação 5k contatos |
| **M7** | Pagamentos & Launch | A iniciar | AbacatePay + 1 cliente piloto real + iteração feedback |

---

## M0 — Fundação V3 (existente, parcialmente feito)

| Phase | Status | Notas |
|-------|--------|-------|
| 1-4F: CRM + Pipeline + Templates Library | ✅ | Pipeline v2 com kanban + lead modal ClickUp-style |
| 05: Chat 3 colunas + Realtime | ✅ | ConversationMessagesProvider unificado |
| 06: WhatsApp Baileys | ✅ | Singleton globalThis + Postgres auth state + sendVoiceNote OGG |
| 06.5: Contatos WhatsApp + sync 826 contatos | ✅ | NewConversationDialog + promote a lead |
| 07A: Mastra core | ✅ | Agente comercial dinâmico via WhatsApp + memória + BullMQ + health endpoints |
| 08-alpha: RAG infra (pgvector + chunking + RLS) | ✅ | Bucket + 4 migrations + 14 RLS policies + HNSW index |
| 11: Agenda | ✅ | Recém criada |
| **07B**: UI essencial agente (8 stories) | 🧪 → **CANCELAR / REFATORAR em M3** | Sub-rotas /agents/[id]/{persona,business,...} viraram alvo de refactor pra Hub estilo Mercado 2.0 |
| **07C**: UI completa Flow Diagram + 7 abas | ⏳ → **EXPANDIR escopo em M3** | Vira Flow Diagram do TIME (4 agentes) + Configurações Avançadas 12 abas |
| **08-beta**: 7 tools básicas | ⏳ → **REFATORAR em M2** | Tools viram parte da Phase Atendente (M2-01) com schema completo Mastra |
| **09**: Wizard architect (PIVOT 04-20) | ⏳ → **CANCELAR (reaproveita parcialmente em M3)** | Wizard atual congelado. Code reaproveitado em UX-02 |
| **10**: Orquestrador | ⏳ → **CANCELAR / SUBSTITUIR por Supervisor Pattern em M2** | Mastra Supervisor cobre nativamente |

> [!warning] Phases canceladas/refatoradas
> Phase 09 (wizard atual) e Phase 10 (orquestrador) **canceladas** como existem. Reaproveitam parcialmente em M3 (Wizard V3) e M2 (Supervisor).
> Phase 07B/07C/08-beta **refatoradas** com novos escopos.

---

## M1 — Mastra Foundation (P0 do plano Mastra)

> [!success] Sprint 1-2 (próximas 2 sprints)
> Pré-requisito de TUDO depois. Sem isso, próximas phases andam às cegas.

| Phase | Objetivo | DoD |
|-------|----------|-----|
| **M1-01: Mastra Studio self-hosted Coolify** | Subir Studio Docker apontando pro Postgres Supabase | Traces aparecem em /studio. Latência + custo + tokens visíveis. |
| **M1-02: Supervisor Pattern stub** | Refatorar Atendente como Supervisor (estrutura pronta sem sub-agents ainda) | `agentAsTool()` configurado. ResourceId namespacing funcional. |
| **M1-03: Memory completa** | Working Memory + Semantic Recall + Threads + Resources + Observational Memory | Schema Zod 8 campos (nome/vertical/dor/momento/ticket/decisor/urgência/objeção). Versão Mastra `>=1.4.x`. |
| **M1-04: Datasets versionados** | 30 conversas reais por modo (SDR/closer/pós-venda) = 90 conversas | Datasets criados via UI Studio. Construídos parcial de traces de produção interna. |
| **M1-05: Scorers customizados** | 3 scorers: qualificação correta, tom apropriado, ausência promessa indevida | Rodam online (sample 20%) + offline em datasets. Threshold definido. |

---

## M2 — TIME 4 agentes (evolução progressiva R2)

> [!warning] Critério mensurável obrigatório
> Cada nova adição valida coordenação ANTES de comprometer próxima. Métrica: ">70% sucesso de coordenação em sandbox playground". Se cair pra 50%, recua pra config anterior.

| Phase | Agente novo | Objetivo | DoD |
|-------|-------------|----------|-----|
| **M2-01: Atendente solo c/ 3 modos** | Atendente | 3 modos contextuais (SDR/closer/pós-venda) + 12 tools core (Mastra schema completo) + handoff humano básico via tool | Funcional em sandbox playground. Score qualificação >70%. |
| **M2-02: Sandbox Playground (R3)** | — | Chat playground + tabs Pipeline+Agenda + flag is_sandbox + suite testes integração CI | User testa conversando, vê pipeline avançando + agendamento aparecendo em tabs. Reset programático. |
| **M2-03: + Analista (validação)** | + Analista | Lê pipeline + RAG-3 (Jina Reranker v3) + propõe ações em painel. NÃO conversa com lead. | Coordenação Atendente↔Analista >70% sucesso medido em Studio. Caso falhe, recua. |
| **M2-04: + Campanhas (validação)** | + Campanhas | Workflow Mastra com suspend/resume + queue BullMQ + delay 30s±10s + opt-out + circuit breaker | Coordenação 3 agentes >70%. Campanha enfileira → envia → suspende esperando lead → retoma webhook. |
| **M2-05: + Assistente (validação final TIME)** | + Assistente | Opera só em grupo WhatsApp interno cliente+equipe. Recebe `pedirHumano(motivo, urgência)` do Atendente. | TIME 4 agentes coordenados >70% sucesso. Pronto pra prod (M7). |

---

## M3 — UX & Construtor V3 (Q6 fechado)

> [!info] Pattern decidido
> Wizard guiado primário + Canvas opt-in pro Modo Avançado + IA copilot reativo. INVERTE Opção B (canvas primário) por recomendação análise independente.

### Modal entrada (3 caminhos)
- **[A] Importar briefing** (recomendado pra agência com cliente): cola/upload, IA preenche wizard
- **[B] Começar do zero c/ guia** (DEFAULT): wizard 7 etapas com smart defaults por vertical
- **[C] Modo Avançado canvas** (operador experiente): canvas drag-drop + 12 abas Config Avançadas

| Phase | Objetivo | DoD |
|-------|----------|-----|
| **M3-01: Wizard 7 etapas (substitui Phase 09 atual)** | Identidade TIME / Negócio / Persona ICP / Conhecimento / 4 papéis (1 aba por agente) / Comportamento+Humanização / Sandbox+Publicar | Wizard funcional, 12 campos obrigatórios padrão briefing, salvar rascunho |
| **M3-02: Hub estilo Mercado 2.0 (refator Phase 07B)** | 3 tabs (Início + Conteúdo▾ + Ferramentas▾). Stats dashboard. Status agente. Badge modelo + versão | Hub navegável, dropdowns funcionando, links pra Configurações Avançadas |
| **M3-03: Configurações Avançadas (12 abas, ampliação Phase 07C)** | Identidade detalhada / Negócio / Conhecimento / Comportamento / Humanização / Modelo IA / API Keys / Galeria Mídias / Contatos / Integrações / Notificações / Técnicas Vendas | Painel lateral abre via Wand, todas 12 abas com conteúdo + Salvar |
| **M3-04: Canvas opt-in com 4 nodes pré-populados** | React Flow com 4 nodes-agentes pré-populados (NÃO vazio). Click no node abre painel direito. Roteador Inteligente como componente visual | Canvas editável, drag-drop, sub-painéis funcionais |
| **M3-05: Flow Diagram do TIME (read-only resumo + editável avançado)** | 4 agentes nodes + tools sub-pins + bridges + roteador + conexões externas (WA, CRM, Agenda, BC) | Renderização correta com cores distintas. Read-only no wizard etapa 7. |
| **M3-06: 10+ Templates por vertical** | Saúde / Imóveis / E-com / Info-produto / SaaS / Liberais / Fitness / Pet / Auto / Education + Em Branco | Cada template pré-popula identidade + comportamento + 6+ etapas conversacionais + tools sugeridas |
| **M3-07: IA Copilot reativo** | Botões pontuais por seção: "Pré-preencher c/ IA" / "Sugerir 5 regras" / "Gerar copy campanha" / "Escrever prompt etapa" | NÃO chat aberto sempre lateral. User pede, IA responde. |

---

## M4 — Multi-tenant & BYOK cascata (Q1 fechado)

| Phase | Objetivo | DoD |
|-------|----------|-----|
| **M4-01: BYOK em cascata via Mastra RuntimeContext** | Middleware HTTP injeta API key no RequestContext baseado em cascata Super Admin → Master → Agency → Cliente | Cliente final NUNCA vê campo de chave. Agência configura herança ou troca por cliente. |
| **M4-02: Cofre API Keys criptografado** | Cada nível (Super/Master/Agency) tem cofre próprio. Chaves criptografadas + reusáveis entre agentes da org | UI cofre estilo Mercado 2.0. Max 20 chaves por org. |
| **M4-03: Permissões árvore checkbox** | RBAC custom com árvore checkbox (Construtor / CRM / Campanhas / Agenda) por usuário | UI permissões granular. Defaults por org type (cliente leigo / cliente tech / operador agência / admin) |

---

## M5 — Humanização & Vendas (Q8/Q9/Q12 fechados)

| Phase | Objetivo | DoD |
|-------|----------|-----|
| **M5-01: Humanização modular 8+ módulos** | Filtro Anti-Robô / Escrita Casual / Simular Erros (off default) / Tom Descontraído / **Divisor de Mensagens com delay smart Auto** / Emojis Naturais (probabilidade %) / Fluxo Conversa / Voice Tone Calibration / Cultural Adaptation BR | Cada módulo toggleable + sub-config rica (% / max chars / delay smart) |
| **M5-02: Tom desacoplado de Personalidade** | Tom (4 cards: Formal/Profissional/Amigável/Casual) + Traços (20 opções, max 3) + Brand Voice (3ª camada) + Preview live | UI desacoplada. Gênero 3 opções (incluindo Neutro) |
| **M5-03: Frameworks vendas configuráveis** | SPIN + Upsell + Cross-sell + NEAT + BANT + MEDDIC + GAP Selling. Toggle off default. Customizável por vertical/cliente | Cada framework injeta no system prompt quando ativo |

---

## M6 — WhatsApp Abstraction + R1 + Reativação

> [!danger] R1 — Baileys agora + API oficial paralelo
> Decisão Vinni: continua Baileys agora pra lançar. Em paralelo trabalha API oficial (Twilio/360dialog/Z-API). Camada de abstração Phase WA-01 prepara troca futura sem refactor 6 meses.

| Phase | Objetivo | DoD |
|-------|----------|-----|
| **M6-01: Camada abstração canal WhatsApp** | Interface `IWhatsAppChannel` (sendText/sendMedia/onMessage/onReceipt) + impl Baileys + slot pra impl BSP futura | Trocar Baileys → BSP é só trocar impl. Tools internas usam interface, não Baileys direto. |
| **M6-02: Anti-bloqueio sério (CORE não polish)** | Rate limit + opt-out automático ("PARAR"/"DESCADASTRAR") + circuit breaker (se Baileys flutua, pausa envios) + alertas reputation score | Métrica reputation visível em Studio. Bloqueio detectado em <5min. |
| **M6-03: Reativação base 5k contatos (onboarding crítico)** | Sync inicial (já tem Phase 06.5) + Campanha de descoberta gerenciada pelo Analista + Segmentação rica em 2-3 semanas | Cliente importa 5k → dispara em ondas → recupera 5-10% → paga setup em 30 dias |

---

## M7 — Pagamentos & Launch

| Phase | Objetivo | DoD |
|-------|----------|-----|
| **M7-01: AbacatePay (era Phase 12)** | Cobrança recorrente assinatura + setup pago | Cobrança ativa, recibos, dunning |
| **M7-02: Pilot 1 cliente real** | 1 agência + 1 cliente final em produção. WhatsApp ativo. Métricas Studio rodando | NPS + qualidade + uptime medidos. Bugs críticos resolvidos. |
| **M7-03: Iteração feedback** | Backlog priorizado de melhorias do pilot | 3-5 melhorias críticas implementadas |

---

## Dependências críticas

```
M0 (~80% feito)
    ↓
M1 Mastra Foundation ←─ pré-requisito de TUDO
    ↓
    ├─→ M2-01 Atendente solo
    │       ↓
    │   M2-02 Sandbox Playground
    │       ↓
    │   M2-03 + Analista
    │       ↓
    │   M2-04 + Campanhas (precisa M5-01 Divisor + M6-02 anti-bloqueio)
    │       ↓
    │   M2-05 + Assistente
    │
    ├─→ M3 UX (parte em paralelo com M2 após M2-01)
    │   M3-01 Wizard → M3-02 Hub → M3-03 Config Avançadas → M3-04 Canvas
    │
    ├─→ M4 Multi-tenant (paralelo a M2/M3 após M1-01 Studio)
    │
    ├─→ M5 Humanização (necessário pra M2-04 Campanhas)
    │
    └─→ M6 WhatsApp Abstraction (pré-requisito de M2-04)

M2 + M3 + M4 + M5 + M6 todos done
    ↓
M7 Pagamentos & Launch
```

## Milestones de produto

| Marco | Entrega | Phases necessárias |
|-------|---------|-------------------|
| **MVP interno (dev)** | Atendente solo funcional + Sandbox + Wizard básico + WhatsApp + BYOK | M1 + M2-01 + M2-02 + M3-01 + M3-02 + M4-01 + M6-01 + M6-02 |
| **V1 (Lançamento)** | TIME 4 agentes + Templates + Campanhas + Reativação + Pagamentos | + M2-03/04/05 + M3-03 a M3-07 + M4-02/03 + M5 completo + M6-03 + M7-01/02 |
| **V2 (Pós-PMF)** | MCP server + Voice + Networks B2B2B + Camada 3 dev mode | M2 P2 do Mastra + features extras |

---

## Pontos cegos pra atenção contínua

1. **Modelo agência B2B2B** — modelar 3 cenários (5/15/30 agências em ano 1) com churn 5/10/20%. Account management dedicado.
2. **TAM real ICP tech-savvy não-dev** — validar em 5-10 entrevistas reais antes PRD final
3. **Camadas 1/2/3** — começar com 2 (Básica wizard + Avançada canvas). Camada 3 dev mode pós-PMF
4. **Tools nativas vs marketplace custom** — decidir cedo. Faltam Gmail/Sheets/Calendar/HubSpot nativas
5. **Lock-in Mastra** — baixo risco (Apache 2.0, tools/memory portáveis Postgres). Trocar = 2-4 sprints

---

## Próxima ação imediata

**M1-01: Subir Mastra Studio self-hosted no Coolify.**

Passos:
1. Container Docker do Mastra Studio na VPS Coolify
2. Variáveis de ambiente apontando pro Postgres Supabase
3. Conectar agente Atendente (já existente Phase 07A)
4. Confirmar traces aparecem
5. Quality gate humano: Vinni confirma UI funcional

Estimativa: 1 sprint (1-2 semanas).
