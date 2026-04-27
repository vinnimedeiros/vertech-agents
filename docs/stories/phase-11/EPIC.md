# Phase 11 — AI Studio (refactor completo)

**Status:** Ready for execution
**Decisor:** Vinni (CEO) 2026-04-26
**Bloqueia:** M2-03 Analista, M2-04 Campanhas, M2-05 Assistente
**Bloqueado por:** Refactor 1 ALS (já entregue)

## Objetivo

Refazer UI de agentes do zero como **AI Studio** seguindo Visão V3 (TIME comercial 4 agentes vendido por agência). Descartar Phase 07A/07B/07C/09 visual; preservar backend.

## Decisões fundadoras (já fechadas)

1. TIME existe como entidade no banco (`team`, `team_member`)
2. Só TIME Comercial em V3 (preset Vertech, agência customiza dentro)
3. Inspetor (Mastra Studio) em aba externa
4. UI refeita ANTES de M2-03

## Escopo

- 4 áreas: Casa dos TIMES, Construtor do TIME, Editor do Agente, Inspetor (link)
- Migration `team` + `team_member` + backfill agents legados
- Sidebar item "Agentes" → "AI Studio"
- Mastra wiring carrega TIME do banco em runtime
- Endpoints `/api/teams/*`
- Rotas `/ai-studio/*`
- Componentes UI dark Linear-style

## Não-escopo (V4+)

- Multi-TIME (Suporte, RH, Cobrança)
- Inspetor embarcado (iframe)
- Mobile responsivo completo
- Add agent custom no canvas

## Stories

| ID | Título | Tipo | Estimativa |
|---|---|---|---|
| 11.0 | Foundation — schema TIME + sidebar rename + shell | infra | M |
| 11.1 | Casa dos TIMES (área 1) | feature | M |
| 11.2 | Construtor do TIME — canvas (área 2) | feature | L |
| 11.2.1 | Construtor — etapa Persona (Brand Voice) | feature | S |
| 11.2.2 | Construtor — etapa Tools | feature | M |
| 11.2.3 | Construtor — etapa Deploy | feature | S |
| 11.3 | Editor do Agente — layout 3 colunas (área 3) | feature | L |
| 11.3.1 | Editor — Properties accordions | feature | M |
| 11.3.2 | Editor — Chat colaborador | feature | M |
| 11.3.3 | Editor — Execution logs ao vivo (SSE) | feature | M |
| 11.4 | Inspetor — link Mastra Studio (área 4) | feature | XS |
| 11.5 | Polimento — empty states, loading, toasts | feature | M |

Total: 12 stories.

## Refs primárias

- `docs/architecture/ai-studio-v3-design.md` — schema, endpoints, arquitetura
- `docs/design/ai-studio-v3-wireframes.md` — wireframes ASCII, tokens, componentes
- `project_ai_studio_decisions_v3.md` (memória) — 4 decisões fundadoras
- Refs visuais: WorkForce One (canvas TIME), Kinetic AI (Editor), Atomie (Casa), LangGraph (Inspector)

## Quality gates

Cada story completada termina com pausa pra Vinni testar UI no navegador antes de prosseguir pra próxima. Regra MUST `quality_gate_humano`.

## Definition of Done (epic)

- [ ] Migration team aplicada em prod
- [ ] Backfill executado sem perda de dados
- [ ] Sidebar mostra "AI Studio"
- [ ] 4 áreas funcionais
- [ ] Mastra Studio link funciona
- [ ] Sandbox M2-02 reusado em Editor
- [ ] Typecheck zero erros (web, ai, queue)
- [ ] Vinni aprovou visualmente cada área
- [ ] Memória atualizada (`project_current_status.md`)
- [ ] Roadmap V3 atualizado (Phase 11 ANTES M2-03)
