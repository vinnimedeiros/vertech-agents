# Stories — Phase 07 (Mastra + Agente Comercial)

Stories de execução da Phase 07 (sub-phases 07A, 07B, 07C), geradas em 2026-04-19 pelo `@sm` (River) a partir do design spec consolidado em `docs/superpowers/specs/2026-04-19-phase-07-mastra-design.md`.

## Status atual

**Sub-phase ativa:** 07A (Núcleo Mastra)

## Sub-phase 07A — 8 stories

| # | Story | Agente | Status | Bloqueia |
|---|---|---|---|---|
| [07A.1](./07A.1.story.md) | Confirmação de dependências externas | `@analyst` | Draft | 07A.4, 07A.5, 07A.6 |
| [07A.2](./07A.2.story.md) | Redis container no Coolify | `@devops` | Draft | 07A.4, 07A.7 |
| [07A.3](./07A.3.story.md) | Schema Drizzle 07A | `@data-engineer` | Draft | 07A.5, 07A.6, 07A.8 |
| [07A.4](./07A.4.story.md) | Packages `queue` + `health` | `@dev` | Draft | 07A.5, 07A.6, 07A.7 |
| [07A.5](./07A.5.story.md) | Mastra core (instance + agente) | `@dev` | Draft | 07A.6 |
| [07A.6](./07A.6.story.md) | Runtime + worker + webhook | `@dev` | Draft | 07A.7, 07A.8 |
| [07A.7](./07A.7.story.md) | Health endpoints + Bull-Board | `@dev` | Draft | 07A.8 |
| [07A.8](./07A.8.story.md) | Seed + Quality Gate | `@dev` + `@qa` | Draft | Gate humano Vinni |

## Grafo de dependências

```
   07A.1 (research)        07A.2 (Redis)
       │                       │
       └──────┬────────────────┘
              ▼
   07A.3 (schema)    07A.4 (infra packages)
       │                  │
       └──────┬───────────┘
              ▼
         07A.5 (Mastra core)
              │
              ▼
         07A.6 (runtime + worker + webhook)
              │
              ▼
         07A.7 (health endpoints)
              │
              ▼
         07A.8 (seed + quality gate)
              │
              ▼
      Gate humano Vinni → 07B
```

## Paralelismo possível

- **Onda 1 (paralelo):** 07A.1, 07A.2 (independentes entre si)
- **Onda 2 (paralelo, após onda 1):** 07A.3, 07A.4
- **Onda 3 (sequencial):** 07A.5 → 07A.6 → 07A.7 → 07A.8

## Sub-phases futuras

- **07B:** UI essencial — 6 abas (Identidade, Persona, Negócio, Conversas, Modelo, WhatsApp) + lista de agentes. Stories geradas após gate humano 07A.
- **07C:** UI completa — Flow Diagram (React Flow) + 7 abas restantes + audit/undo. Stories geradas após gate humano 07B.

## Workflow

1. `@sm` (River) cria stories aqui em `Draft`
2. `@po` (Keymaker) roda `*validate-story-draft` em cada uma → status `Approved`
3. `@dev` (Neo) implementa `*develop` → status `InProgress` → `Ready for Review`
4. `@qa` (Oracle) roda `*qa-gate` → `PASS | CONCERNS | FAIL`
5. Se PASS → gate humano Vinni valida na UI/celular
6. Se aprovado → próxima story ou próxima sub-phase
7. `@devops` (Operator) faz push/PR no fim de cada sub-phase

## Referências

- Design spec: `docs/superpowers/specs/2026-04-19-phase-07-mastra-design.md`
- Vault Obsidian: `C:\Users\Vinni Medeiros\Matrix\Matrix\projects\Vertech-agents\phases\phase-07-mastra.md`
- Regras LMAS: `.claude/rules/*.md`
