---
type: guide
title: "Phase 09 — Stories (Arquiteto Construtor)"
project: vertech-agents
tags:
  - project/vertech-agents
  - phase/09
  - stories
---

# Stories — Phase 09 (Arquiteto Construtor)

Stories de implementação da Phase 09, **foundation do produto** conforme reformatação de roadmap aprovada pelo Vinni em 2026-04-19.

**Contexto:** O Arquiteto é a porta de entrada primária da experiência de criação de agentes. Substitui o formulário simples manual (07B v1 agora em hold) por uma conversa guiada multi-turn com artefatos refináveis inline. Ver PRD v2 § 4 e UI Spec Phase 09 pra visão completa.

**Branch:** `feature/phase-08a-09-architect` (NOVA, separada da `feature/07B.1-agents-list-and-new` que está em hold)

## Status atual

**Phase ativa:** 09 (10 stories em Draft aguardando validação @po)

**Pré-requisitos:**
- Phase 08-alpha concluída (stories 08A.1-5, ver `docs/stories/phase-08/`)
- Quality Gate 08-alpha PASS com aprovação do Vinni

## Stories

| # | Story | Agente | Status | Escopo principal |
|---|---|---|---|---|
| [09.1](./09.1.story.md) | Tela de boas-vindas | `@dev` | Draft | Hero + grid 7 templates + SessionHistory |
| [09.2](./09.2.story.md) | Shell do chat | `@dev` | Draft | Header + StatusBar + área de mensagens |
| [09.3](./09.3.story.md) | Composer | `@dev` | Draft | Textarea expansível + shortcuts |
| [09.4](./09.4.story.md) | AttachmentMenu + upload | `@dev` | Draft | Anexos inline + mini-cards |
| [09.5](./09.5.story.md) | Architect Agent + route handler | `@dev` | Draft | Mastra agent + instructions + streaming |
| [09.6](./09.6.story.md) | ArtifactCard inline | `@dev` | Draft | Card com 3 ações + 4 renderers |
| [09.7](./09.7.story.md) | Inline Refinement | `@dev` | Draft | Perfil + Conhecimento (forms simples) |
| [09.8](./09.8.story.md) | Dialog Refinement | `@dev` | Draft | Blueprint (form complexo 7 seções) |
| [09.9](./09.9.story.md) | FlowDiagramPreview + publish | `@dev` | Draft | React Flow + transação atômica |
| [09.10](./09.10.story.md) | Estados especiais + Quality Gate | `@dev` + `@qa` | Draft | Edge cases + E2E Playwright |

## Grafo de dependências

```
Phase 08-alpha (RAG + architectTools) ✅
        │
        ▼
09.1 (Tela boas-vindas)
        │
        ▼
09.2 (Shell do chat)
        │
        ├──► 09.3 (Composer base)
        │         │
        │         └──► 09.4 (Attachment menu)
        │                   │
        │                   ▼
        └──► 09.5 (Architect Agent + route + useChat)
                  │
                  ├──► 09.6 (ArtifactCard)
                  │         │
                  │         ├──► 09.7 (Inline Refinement)
                  │         │
                  │         └──► 09.8 (Dialog Refinement)
                  │
                  └──► 09.9 (FlowDiagram + publish)
                             │
                             ▼
                       09.10 (Estados + QA gate)
                             │
                             ▼
                       Gate humano Vinni → Phase 07B-v2
```

## Ordem de execução

Sequencial com **quality gate humano entre cada story** (regra MUST `feedback_quality_gate_humano.md`):

**09.1** → gate → **09.2** → gate → **09.3** → gate → **09.4** → gate → **09.5** → gate → **09.6** → gate → **09.7** → gate → **09.8** → gate → **09.9** → gate → **09.10** (QA + gate final Vinni) → **Phase 07B-v2**

Paralelismo possível entre 09.7 e 09.8 (ambas dependem só de 09.6), mas **não recomendado** por causa do gate humano.

## Workflow

1. `@po` (Keymaker) roda `*validate-story-draft` em cada story em ordem sequencial → status Draft → Ready
2. `@dev` (Neo) implementa `*develop` → status Ready → InProgress → Ready for Review
3. Vinni valida UI na prática entre cada story
4. `@qa` (Oracle) roda `*qa-gate` na 09.10 → PASS | CONCERNS | FAIL
5. Gate humano Vinni final após 09.10 → habilita Phase 07B-v2
6. `@devops` consolida push + PR no fim da Phase

## Features novas entregues (PRD v2)

A Phase 09 MVP entrega:

- **Criação conversacional de agente** via 4 etapas invisíveis (Ideação → Planejamento → Conhecimento → Criação)
- **Artefatos refináveis inline** (cards com 3 ações)
- **Upload durante conversa** (diferencial vs Mercado Agentes)
- **Emojis calibráveis granular** (modo + curadoria + usage rules)
- **Técnicas comerciais presets** (6 built-in mixáveis)
- **Voz TTS** config (implementação real em 07B-v2)
- **Tom natural calibrável** (anti-patterns + exemplos)
- **Template library** inicial 7 verticais
- **Publicação atômica** criando agent em DRAFT

Pós-criação (Chat de Evolução, Sandbox, Flow Diagram interativo) fica para 07B-v2 e 07C.

## Métricas de sucesso (PRD v2 § 10)

- Time-to-first-active-agent: < 30 min em beta (medir em 09.10)
- Taxa de abandono no Arquiteto: < 35%
- Agentes com RAG ativo: > 60%
- NPS evolução pós-criação: > 50 (mede em 07B-v2)

## Referências

- **Tech Spec Phase 09 (fonte técnica):** `docs/phase-09/tech-spec-arquiteto.md`
- **UI Spec Phase 09 (fonte visual):** `docs/phase-09/ui-spec-arquiteto.md`
- **Research Dependencies:** `docs/phase-09/research-dependencies.md`
- **PRD v2:** `docs/prd/prd-v2-vertech-agents.md`
- **ADR-001 Arquiteto vs Orquestrador:** `docs/architecture/adr/adr-001-arquiteto-vs-orquestrador.md`
- **Phase 08-alpha stories:** `docs/stories/phase-08/README.md`
- **Checkpoint projeto:** `docs/PROJECT-CHECKPOINT.md`
