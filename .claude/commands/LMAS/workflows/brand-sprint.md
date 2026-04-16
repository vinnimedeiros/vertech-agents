# Brand Sprint Workflow

Workflow composto que orquestra o setor BRAND do inicio ao fim.
6 fases sequenciais com handoff artifact-driven.

**Source of truth:** `.lmas-core/data/artifact-system/sector-stages.yaml` (setor: brand)
Ao executar, o orquestrador DEVE ler sector-stages.yaml para obter a sequencia atualizada.
As tabelas abaixo sao RESUMO — em caso de divergencia, sector-stages.yaml prevalece.

## Instrucoes de Execucao

Ao ser ativado, Morpheus DEVE:

1. **Ler pipeline-status.yaml** do projeto ativo
2. **Identificar** em qual stage o setor brand esta (ou se nao iniciou)
3. **Resumir** de onde estamos e propor continuar a partir do stage atual

### Fases

| # | Stage | Agent | Skill | Artifact |
|---|-------|-------|-------|----------|
| 1 | Research | @analyst | `/LMAS:agents:analyst` | artifacts/brand/1-research.md |
| 2 | Positioning | @kamala | `/LMAS:agents:kamala` | artifacts/brand/2-positioning.md |
| 3 | Naming | @kamala | `/LMAS:agents:kamala` | artifacts/brand/3-naming.md |
| 4 | Identity | @kamala | `/LMAS:agents:kamala` | artifacts/brand/4-identity.md |
| 5 | Narrative | @bugs | `/LMAS:agents:bugs` | artifacts/brand/5-narrative.md |
| 6 | Brand Book | @kamala | `/LMAS:agents:kamala` | artifacts/brand/6-brandbook.md |

### Protocolo por Fase

Para CADA fase, o orquestrador:

1. **Antes:** Verificar dependencias (artifact da fase anterior existe e esta `complete`)
2. **Ativar:** Sugerir ao usuario copiar o comando da skill: `/LMAS:agents:{agent}`
3. **Durante:** O agente ativado produz o artifact usando `phase-artifact-tmpl.md`
4. **Apos:** Atualizar `pipeline-status.yaml` (stage_completed, next_action)
5. **Bridge:** Se ha bridge para outro setor (ex: brand/4 → design/1), validar contrato
6. **Smith:** Oferecer `🕶️ Deseja que o Smith verifique?` apos stages criticos (2, 4, 6)

### Bridges de Saida

- `brand/4-identity` → `design/1-design-system` (BRIDGE-brand-to-design)
- `brand/6-brandbook` → `marketing/1-strategy` (BRIDGE-brand-to-marketing)

### Context Files Produzidos

- `brand-dna.yaml` (atualizado progressivamente nos stages 2-6)
- `competitive-landscape.yaml` (produzido no stage 1)
- `icp.yaml` (produzido ou validado no stage 1)

### Quando Usar

- Projeto novo que precisa de marca antes de design/marketing
- Rebranding de projeto existente
- Qualquer projeto que vai ter landing page, app, ou presenca digital

### Comando

```
/LMAS:workflows:brand-sprint
```

Morpheus orquestra. Cada fase ativa o agente correto via skill.
