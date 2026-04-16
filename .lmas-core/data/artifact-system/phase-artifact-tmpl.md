---
schema_version: "1.0"
type: phase-artifact
sector: ""          # REQUIRED — brand | design | dev | marketing | business
stage: ""           # REQUIRED — ex: "2-positioning", "1-design-system"
status: draft       # REQUIRED — draft | in-progress | review | complete | superseded
version: 1          # Incrementa em revisoes. Nunca apagar versao anterior.

# Autoria
produced_by: ""     # REQUIRED — agent id (ex: kamala, dev, copywriter)
reviewed_by: []     # Lista de agents que revisaram (incluir smith se aplicavel)
produced_at: ""     # REQUIRED — data ISO (ex: 2026-03-28)
review_passed_at: ""

# Dependencias
depends_on: []
  # - artifact: "brand/1-research"
  #   required_fields: ["publico-alvo", "concorrentes"]
consumed_by: []     # Lista de agents/stages que consomem este artefato

# Completude (Smith F1) — campos REQUIRED devem estar 100% preenchidos para handoff
completeness:
  required_fields_total: 0
  required_fields_filled: 0
  score: 0            # Percentual. < 100% em required = BLOCKED para handoff
  missing: []         # Lista de campos required faltando

# Decisoes desta fase (com rationale — NUNCA sem "why")
decisions: []
  # - key: "archetype"
  #   value: "Heroi"
  #   why: "Publico valoriza superacao"
  #   alternatives: ["Sabio", "Criador"]
  #   adr_ref: ""     # Link para ADR se decisao arquitetural

# Restricoes para fases seguintes
constraints: []
  # - "Tom NUNCA informal/coloquial"
  # - "Paleta: confianca (azul/verde escuro)"

# Referencias a arquivos de contexto do projeto (Smith F8 — formato padrao)
references: {}
  # icp: "ref:context:icp.yaml"
  # brand_dna: "ref:context:brand-dna.yaml"
  # related_debug: "ref:entry:risk-register.yaml#DBG-3"

# Debugs encontrados nesta fase (referencia ao risk-register, NAO duplicar)
debugs_ref: []
  # - "DBG-4"
  # - "RISK-7"

# Integration points (Aria) — onde artefato vira codigo/design/config
integration_points: []
  # - artifact_element: "color.primary"
  #   code_target: "packages/ui/tokens/colors.ts"
  #   format: "CSS custom property + Tailwind config"

# Test strategy (Aria — somente para fases dev)
test_strategy: {}
  # unit: { coverage_target: "80%", focus: [] }
  # integration: { focus: [], requires: [] }
  # e2e: { focus: [], tool: "" }

# Rollback plan (Aria — somente para fases dev)
rollback: {}
  # strategy: ""
  # data_impact: ""
  # time_estimate: ""

# Funnel mapping (Lock — somente para fases marketing)
funnel_mapping: {}
  # stage: ""           # awareness | consideration | decision | retention
  # intent: ""
  # cta: ""
  # kpi: ""

# Investment decision (Mifune — quando envolve gasto)
investment_decision: {}
  # budget: ""
  # projected_roi: ""
  # approved_by: ""
---

# {Sector} / {Stage} — {Project Name}

## Resumo Executivo

[2-3 paragrafos autocontidos. Legivel sem a conversa que o criou.]

## Conteudo Completo

[Conteudo detalhado da fase.]

## Decisoes Tomadas

[Cada decisao com rationale completo. Formato: O QUE + POR QUE + ALTERNATIVAS REJEITADAS.]

## Restricoes para Proximas Fases

[O que NAO pode ser violado pelos agentes/fases seguintes.]

## Consideracoes Importantes

[Contexto que nao se encaixa nas categorias acima mas e relevante.]
