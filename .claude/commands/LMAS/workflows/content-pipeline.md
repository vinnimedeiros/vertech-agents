# Content Pipeline — Marketing Sector

Pipeline completo do setor MARKETING. Da estrategia a publicacao.

**O que e:** Ciclo de producao de conteudo. Estrategia → SEO → Calendario → Copy → Review → Publicacao.

**Source of truth:** `.lmas-core/data/artifact-system/sector-stages.yaml` (setor: marketing)
Ao executar, ler sector-stages.yaml para sequencia atualizada. Tabelas abaixo sao RESUMO.

## Instrucoes de Execucao

Ao ser ativado, Morpheus DEVE:

1. **Ler pipeline-status.yaml** — setor marketing
2. **Verificar bridges de entrada:**
   - brand/6-brandbook → REQUIRED para stage 1
   - business/2-offer → REQUIRED para stage 4 (copy de oferta)
3. **Se bridges nao validados:** informar o que falta antes de comecar

### Fases

| # | Stage | Agent | Skill | Artifact |
|---|-------|-------|-------|----------|
| 1 | Strategy | @content-strategist | `/LMAS:agents:content-strategist` | artifacts/marketing/1-strategy.md |
| 2 | SEO/Keywords | @seo | `/LMAS:agents:seo` | artifacts/marketing/2-seo-keywords.md |
| 3 | Content Calendar | @content-strategist | `/LMAS:agents:content-strategist` | artifacts/marketing/3-content-calendar.md |
| 4 | Copywriting | @copywriter | `/LMAS:agents:copywriter` | artifacts/marketing/4-copy/ |
| 5 | Review Gate | @content-reviewer | `/LMAS:agents:content-reviewer` | artifacts/marketing/5-review-report.md |
| 6 | Publish | @social-media-manager | `/LMAS:agents:social-media-manager` | artifacts/marketing/6-publish-log.md |

### Pos-Review (Stage 5)

- **Score >= 7/10** → PASS. Prosseguir para publicacao
- **Score 5-6/10** → CONCERNS. @copywriter revisa pontos especificos
- **Score < 5/10** → FAIL. Volta para stage 4 (max 3 iteracoes)

### Context Files Necessarios

- `brand-dna.yaml` — Tom de voz, do/dont, personalidade
- `icp.yaml` — Pra quem estamos escrevendo
- `competitive-landscape.yaml` — Contra quem estamos competindo
- `content-quality-gate.yaml` — Criterios de scoring
- `business-model.yaml` — Offer stack (para copy de oferta)

### Approval Chain

Copy aprovado segue: @content-reviewer (score) → @marketing-chief (final) → @social-media-manager (publica)

### Comando

```
/LMAS:workflows:content-pipeline
```
