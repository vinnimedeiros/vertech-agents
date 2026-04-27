---
type: guide
title: "Phase 08-alpha — Stories (RAG Infrastructure + architectTools)"
project: vertech-agents
tags:
  - project/vertech-agents
  - phase/08-alpha
  - stories
---

# Stories — Phase 08-alpha (RAG + architectTools)

Stories de implementação da sub-phase 08-alpha, slice antecipado da Phase 08 pra dar fundação à Phase 09 (Arquiteto Construtor).

**Contexto:** reordenação de roadmap aprovada pelo Vinni em 2026-04-19 coloca o Arquiteto como foundation do produto. Pra ele funcionar, precisamos RAG infra + architectTools ANTES da UI do Arquiteto. Esta sub-phase entrega exatamente isso.

**Branch:** `feature/phase-08a-09-architect` (NOVA, separada da `feature/07B.1-agents-list-and-new` que está em hold)

## Status atual

**Sub-phase ativa:** 08-alpha (5 stories em Draft aguardando validação @po)

**Pré-requisitos concluídos:**
- DB aplicado por Tank em produção (migrations 0015 + RLS policies)
- Drizzle schemas criados (knowledge.ts, architect-session.ts, agents.ts atualizado)
- Tech spec + UI spec + Research deps entregues

## Stories

| # | Story | Agente | Status | Escopo |
|---|---|---|---|---|
| [08A.1](./08A.1.story.md) | Package rag infrastructure (ingest + extractors + query) | `@dev` (Neo) | Ready for Review | Extractors 6 tipos, pipeline completo, query |
| [08A.2](./08A.2.story.md) | BullMQ worker ingest-document | `@dev` (Neo) | Ready for Review | Worker + queue + health endpoint |
| [08A.3](./08A.3.story.md) | Registry architectTools | `@dev` (Neo) | Ready for Review | 8 tools do Arquiteto (Zod + transação atômica) |
| [08A.4](./08A.4.story.md) | Upload endpoint + Storage bucket | `@dev` (Neo) | Ready for Review | POST /api/architect/upload + bucket + rate limit |
| [08A.5](./08A.5.story.md) | Quality Gate 08-alpha | `@qa` + `@dev` | Ready for Review | E2E real + RLS + performance + CodeRabbit |

## Grafo de dependências

```
Tank migrations (DB) ✅ aplicadas
        │
        ▼
08A.1 (rag infrastructure — pipeline base)
        │
        ├──► 08A.2 (worker chama ingestDocument)
        │         │
        │         └──► 08A.4 (upload endpoint enqueua)
        │
        └──► 08A.3 (architectTools — searchChunks usa queryKnowledge)
                  │
                  └──► 08A.5 (QA valida tudo)
                        │
                        ▼
                  Gate humano Vinni → Phase 09
```

## Ordem de execução

Sequencial com **quality gate humano entre cada story** (regra MUST `feedback_quality_gate_humano.md`):

**08A.1** → gate → **08A.2** → gate → **08A.3** → gate → **08A.4** → gate → **08A.5** (QA + gate humano) → **Phase 09**

Paralelismo possível em teoria entre 08A.2 e 08A.3 (ambas dependem só de 08A.1), mas **não recomendado** por causa do gate humano.

## Workflow

1. `@po` (Keymaker) roda `*validate-story-draft` em cada story em ordem → status Draft → Ready (ou NO-GO com fixes)
2. `@dev` (Neo) implementa `*develop` → status Ready → InProgress → Ready for Review
3. Vinni valida na prática (story não tem UI visível, mas DB state + logs)
4. `@qa` (Oracle) roda `*qa-gate` na 08A.5 → PASS | CONCERNS | FAIL
5. Gate humano Vinni final após 08A.5 → habilita Phase 09
6. `@devops` consolida push no fim da sub-phase

## Assumptions (documentadas)

- `@mastra/rag` compatível com `@mastra/memory` já instalado 07A (Atlas validou no research, mas cabe @dev confirmar no install)
- Supabase Storage bucket `architect-uploads` será criado via MCP na 08A.4 (@dev pode pedir @devops se bloquear)
- Working memory do Arquiteto (gerenciado pelo @mastra/memory em tabelas mastra_*) será auto-criado quando Agent for invocado pela primeira vez (09.5). Não precisa de migration nesta sub-phase.

## Referências

- **Tech Spec Phase 09 (fonte técnica):** `docs/phase-09/tech-spec-arquiteto.md`
- **UI Spec Phase 09 (fonte visual):** `docs/phase-09/ui-spec-arquiteto.md`
- **Research Dependencies:** `docs/phase-09/research-dependencies.md`
- **PRD v2:** `docs/prd/prd-v2-vertech-agents.md`
- **ADR-001 Arquiteto vs Orquestrador:** `docs/architecture/adr/adr-001-arquiteto-vs-orquestrador.md`
- **Checkpoint projeto:** `docs/PROJECT-CHECKPOINT.md`
