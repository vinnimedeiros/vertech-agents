# Stories — Phase 07 (Mastra + Agente Comercial)

Stories de execução da Phase 07 (sub-phases 07A, 07B, 07C), geradas pelo `@sm` (River) a partir do design spec consolidado em `docs/superpowers/specs/2026-04-19-phase-07-mastra-design.md`.

## Status atual

**Sub-phase ativa:** 07B (UI essencial — 6 abas de edição) — **8 stories implementadas, aguardando gate humano final**

**Sub-phase 07A:** ✅ Concluída e pushed em `3458641` (2026-04-19). 15 commits distribuídos.

## Sub-phase 07A — 8 stories (concluída ✅)

| # | Story | Agente | Status |
|---|---|---|---|
| [07A.1](./07A.1.story.md) | Confirmação de dependências externas | `@analyst` | ✅ Done |
| [07A.2](./07A.2.story.md) | Redis em dev local (via Docker) | `@devops` | ✅ Done |
| [07A.3](./07A.3.story.md) | Schema Drizzle 07A | `@data-engineer` | ✅ Done |
| [07A.4](./07A.4.story.md) | Packages `queue` + `health` | `@dev` | ✅ Done |
| [07A.5](./07A.5.story.md) | Mastra core (instance + agente) | `@dev` | ✅ Done |
| [07A.6](./07A.6.story.md) | Runtime + worker + webhook | `@dev` | ✅ Done |
| [07A.7](./07A.7.story.md) | Health endpoints + Bull-Board | `@dev` | ✅ Done |
| [07A.8](./07A.8.story.md) | Seed + Quality Gate | `@dev` + `@qa` | ✅ Done |

## Sub-phase 07B — 8 stories (ativa)

Geradas em 2026-04-19 após:
- Gate humano Vinni aprovou Phase 07A
- `@ux-design-expert` (Sati) entregou spec visual em `docs/phase-07/ui-spec-07b-agent-detail.md` (sidenav vertical, rotas próprias por aba, dirty state banner)

| # | Story | Agente | Status | Bloqueia |
|---|---|---|---|---|
| [07B.1](./07B.1.story.md) | Lista de agentes + Novo agente (form MVP) | `@dev` | Draft | 07B.2 |
| [07B.2](./07B.2.story.md) | Shell do detalhe + header + menu lateral | `@dev` | Draft | 07B.3-8 |
| [07B.3](./07B.3.story.md) | Aba Identidade | `@dev` | Draft | gate 07B |
| [07B.4](./07B.4.story.md) | Aba Persona (sliders + TagList) | `@dev` | Draft | 07B.6, 07B.7 |
| [07B.5](./07B.5.story.md) | Aba Negócio (textareas) | `@dev` | Draft | gate 07B |
| [07B.6](./07B.6.story.md) | Aba Conversas (textareas + TagList) | `@dev` | Draft | gate 07B |
| [07B.7](./07B.7.story.md) | Aba Modelo (radio + select + sliders) | `@dev` | Draft | gate 07B |
| [07B.8](./07B.8.story.md) | Aba WhatsApp + Quality Gate 07B | `@dev` + `@qa` | Draft | Gate humano Vinni |

## Grafo de dependências 07B

```
07B.1 (lista + novo agente)
   │
   ▼
07B.2 (shell: header + menu + hooks)
   │
   ▼
07B.3 (Identidade — instala radio-group, define pattern da aba)
   │
   ▼
07B.4 (Persona — cria LabeledSlider + TagList)
   │                 │
   │                 ├──► 07B.6 (Conversas — reusa TagList)
   │                 │
   │                 └──► 07B.7 (Modelo — reusa LabeledSlider)
   │
   ▼
07B.5 (Negócio — textareas, independente)
07B.6 (Conversas)
07B.7 (Modelo)
   │
   ▼
07B.8 (WhatsApp + Quality Gate)
   │
   ▼
Gate humano Vinni → 07C
```

## Ordem de execução 07B

Sequencial com **quality gate humano entre cada story** (regra MUST `feedback_quality_gate_humano.md`):

**07B.1** → gate humano → **07B.2** → gate humano → **07B.3** → gate humano → **07B.4** → gate humano → **07B.5** → gate humano → **07B.6** → gate humano → **07B.7** → gate humano → **07B.8** + QA gate → gate humano Vinni → **07C**

Paralelismo possível entre 07B.5, 07B.6, 07B.7 (todas dependem só de 07B.2 e componentes da 07B.4), mas **não recomendado** por causa do gate humano — cada story sai e espera aprovação antes da próxima.

## Sub-phases futuras

- **07C** — UI completa: Flow Diagram (React Flow) + 7 abas restantes (Ferramentas, Follow-up, Mensagens, Horários, Conteúdo, Política, Versões) + audit/undo por aba. Stories geradas após gate humano 07B.

## Workflow

1. `@sm` (River) cria stories aqui em `Draft`
2. `@po` (Keymaker) roda `*validate-story-draft` em cada uma → status `Approved` ou retorna com fixes
3. `@dev` (Neo) implementa `*develop` → status `InProgress` → `Ready for Review`
4. `@qa` (Oracle) roda `*qa-gate` → `PASS | CONCERNS | FAIL`
5. Se PASS → gate humano Vinni valida na UI/celular
6. Se aprovado → próxima story
7. `@devops` (Operator) consolida push no fim da sub-phase

## Referências

- Design spec técnico: `docs/superpowers/specs/2026-04-19-phase-07-mastra-design.md`
- UI spec 07B (Sati): `docs/phase-07/ui-spec-07b-agent-detail.md`
- Vault Obsidian: `C:\Users\Vinni Medeiros\Matrix\Matrix\projects\Vertech-agents\phases\phase-07-mastra.md`
- Regras LMAS: `.claude/rules/*.md`
- Feedback MUST (sidenav): `~/.claude/projects/.../memory/feedback_agent_detail_sidenav.md`
