---
type: adr
id: ADR-002
title: "Phase 09 — wizard determinístico substitui chat single-pane"
status: accepted
date: 2026-04-21
supersedes: "PRD v2 §4.2.2 (chat full single-pane tipo Claude)"
tags:
  - project/vertech-agents
  - adr
  - phase/09
  - architecture
author: Morpheus (@lmas-master) sob direção de Vinni (CEO)
audience: Equipe LMAS + próximos agentes lendo PRD v2
---

# ADR-002 — Phase 09 pivotou de chat single-pane para wizard determinístico

## Contexto

O PRD v2 (`docs/prd/prd-v2-vertech-agents.md`), aprovado em 2026-04-19, definiu a Phase 09 como:

- Chat full single-pane tipo Claude/ChatGPT (`§4.2.2`)
- Multi-turn adaptativo via roteiro invisível (`§4.3`)
- Cards de artefato inline com `[Refinar] [Mandar alteração no chat] [Aprovar]`
- Working memory estruturada mantida pelo LLM
- Upload durante toda a conversa

Entre 2026-04-19 e 2026-04-20, três tentativas de implementação dessa arquitetura falharam:

1. **Working memory built-in do Mastra (`updateWorkingMemory`)** — LLM não seguia o protocolo de preenchimento incremental. Respondia "problema técnico ao estruturar informações" sem avançar etapa.
2. **Instructions reforçadas + schema Zod permissivo** — Mesmo padrão de falha.
3. **Extractor-driven (LLM secundário `gpt-4o-mini` lendo conversa em background)** — LLM principal continuou apenas conversando sem avançar. Cards de artefato nunca se materializavam de forma confiável.

Ver histórico cronológico em:
- Commits `fbcdd00` (extractor-driven descartado), `56cf9a1` (refactor wizard completo), `a89d057`, `453fd1a`, `0f33edf`
- Memória da sessão: `~/.claude/projects/.../memory/project_phase_09_pivot.md`

## Decisão

**Phase 09 adota wizard determinístico com 4 steps e forms estruturados.**

### Nova arquitetura (atual, implementada)

| Step | Função | Tecnologia |
|------|--------|-----------|
| 1. Idealização | Form: gender radio + 7 checkboxes expansíveis (perguntas por vertical) + textarea opcional. Min 3 respondidas. Char pool 10k dividido. | React controlled form |
| 1.5. Analysis Review | Mini-PRD gerado (businessName, summary, services, agentGoals, identity). Botões `[Refinar] [Aprovar e continuar]` | POST `/api/architect/analyze` + `/refine-analysis` |
| 2. Planejamento | Blueprint com 5-8 blocos narrativos + persona sliders + capabilities. Botões `[Ajustar] [Aprovar plano]` | POST `/api/architect/plan` |
| 3. Conhecimento | "Tenho arquivos" (useFileUpload) ou "Pular" | Reuso do upload 08A.4 |
| 4. Criação | Resumo final + botão "Criar agente {nome}" | POST `/api/architect/sessions/[id]/publish` (transação atômica) |

### Papel do LLM

- Gera outputs estruturados via `generateObject` (Vercel AI SDK) com schemas Zod permissivos e `mode: "json"`.
- Modelo: `gpt-4o` com `maxRetries: 2`.
- **Não** conduz conversa multi-turn.
- **Não** chama tools como `updateWorkingMemory` ou `generateArtifact`.

### Componentes novos (path: `apps/web/modules/saas/agents/architect/components/wizard/`)

- `WizardShell.tsx` — orquestrador de state, hidrata artefatos via `?session=` query param
- `WizardStepper.tsx` — progress bar 4 steps, clicável em done + atual
- `IdealizationStep.tsx`
- `AnalysisReviewStep.tsx`
- `PlanningStep.tsx`
- `KnowledgeStep.tsx`
- `CreationStep.tsx`

### Arquitetura antiga (dormente, não deletada)

Permanece em `components/chat/*` + `hooks/useArchitectChat.ts` + Mastra Architect Agent. Não acionada pelo wizard. Poderá ser reaproveitada na **Phase 07B-v2** para o "Chat de Evolução pós-criação" (§4.6 do PRD v2).

## Consequências

### Positivas

- **Fluxo previsível** — usuário e agente operam em estados finitos conhecidos. Testável, debuggável, mensurável.
- **UX comparável ao Mercado Agentes** — referência competitiva validada.
- **LLM controlado** — `generateObject` com schema Zod reduz superfície de falha.
- **Determinismo em publish** — transação atômica `publishAgentFromSessionCore` sabe exatamente quais artefatos consumir.

### Negativas / trade-offs aceitos

- **Sem multi-turn adaptativo na criação** — usuário responde forms, não conversa.
- **Upload restrito ao Step 3** — em vez de durante toda a conversa (PRD v2 §4.2.4).
- **Chat de Evolução movido para 07B-v2** — originalmente parte da Phase 09.
- **Working memory do Mastra não usada** na Phase 09. Será reavaliada para Chat de Evolução.

### Impacto nas próximas phases

- **Phase 07B-v2** permanece como Painel de Refino (abas + Flow Diagram + Sandbox). **Chat de Evolução** (§4.6) é movido para cá e pode reusar componentes antigos.
- **Phase 08-beta** (commercialTools) não é afetada.
- **Phase 10** (Orquestrador) não é afetada.

## Alternativas descartadas

1. **Continuar investindo em chat single-pane** — já consumimos 3 iterações falhadas. Custo de oportunidade alto.
2. **Híbrido chat + wizard** — complexidade aumentada sem evidência de ganho.
3. **Aguardar LLMs melhores para tool-use confiável** — indefinido. Vertech capta demanda desde o dia 1 (regra MUST `feedback_escala_desde_dia_1.md`).

## Links

- PRD v2: `docs/prd/prd-v2-vertech-agents.md`
- Pesquisa competitiva Mercado Agentes: `docs/research/mercado-agentes-assistant-flow.md`
- Memória da sessão do pivot: `~/.claude/projects/C--Users-Vinni-Medeiros-vertech-agents/memory/project_phase_09_pivot.md`
- Tech spec atualizado: `docs/phase-09/tech-spec-arquiteto.md` (a atualizar — aponta para este ADR)

## Status e revisão

- Pivot executado entre 2026-04-19 e 2026-04-20.
- Decisão registrada formalmente em 2026-04-21 após verify adversarial do Smith (@smith) apontar divergência doc vs código (finding PRD-1).
- Revisão prevista: após gate humano Vinni end-to-end do wizard (se comportamento for satisfatório, manter; se falhar em produção, reavaliar).
