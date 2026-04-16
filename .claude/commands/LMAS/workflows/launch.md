# Launch Pipeline — Cross-Sector

Pipeline CROSS-SETOR para lançamento de produto. Orquestra business + brand + marketing + dev em sequencia.

**O que e:** Pipeline completo que leva um produto do conceito ao mercado, passando por oferta, marca, copy, implementacao e publicacao.

**Source of truth:** `.lmas-core/data/artifact-system/sector-stages.yaml` (todos os setores)
Ao executar, ler sector-stages.yaml para sequencia atualizada. Tabelas abaixo sao RESUMO.

## Instrucoes de Execucao

Ao ser ativado, Morpheus DEVE:

1. **Ler pipeline-status.yaml** — verificar estado de TODOS os setores
2. **Identificar** qual setor precisa avancar primeiro (respeitar dependencias)
3. **Propor** sequencia de execucao baseada no estado atual

### Sequencia Padrao

| # | Setor | Stage | Agent | Skill |
|---|-------|-------|-------|-------|
| 1 | business | 1-research | @analyst | `/LMAS:agents:analyst` |
| 2 | business | 2-offer | @mifune | `/LMAS:agents:mifune` |
| 3 | business | 3-pricing | @mifune | `/LMAS:agents:mifune` |
| 4 | brand | 1-research | @analyst | `/LMAS:agents:analyst` |
| 5 | brand | 2-positioning | @kamala | `/LMAS:agents:kamala` |
| 6 | brand | 3-naming | @kamala | `/LMAS:agents:kamala` |
| 7 | brand | 4-identity | @kamala | `/LMAS:agents:kamala` |
| 8 | design | 1-design-system | @ux-design-expert | `/LMAS:agents:ux-design-expert` |
| 9 | dev | 1-prd → 6-deploy | SDC | `/LMAS:workflows:sdc` |
| 10 | marketing | 1-strategy → 6-publish | Content pipeline | `/LMAS:workflows:content-pipeline` |
| 11 | business | 4-campaign-plan | @traffic-manager | `/LMAS:agents:traffic-manager` |

### Execucao Flexivel

Nem todo projeto segue a ordem acima. Regras:
- **Business e Brand podem rodar em paralelo** (sessoes separadas)
- **Design espera brand/4-identity** (bridge obrigatorio)
- **Dev pode comecar pelo backend** sem esperar design (backend-first)
- **Marketing espera brand/6-brandbook** OU pode comecar estrategia com brand/2-positioning
- Morpheus adapta a sequencia ao estado real do pipeline-status

### Bridges Criticos

| Bridge | De | Para | Obrigatorio? |
|--------|-----|------|-------------|
| BRIDGE-brand-to-design | brand/4-identity | design/1-design-system | SIM |
| BRIDGE-brand-to-marketing | brand/6-brandbook | marketing/1-strategy | SIM |
| BRIDGE-business-to-marketing | business/2-offer | marketing/4-copy | SIM |
| BRIDGE-design-to-dev | design/4-asset-handoff | dev/4-implementation | NAO (backend-first ok) |

### Smith Checkpoints

Oferecer Smith review nos seguintes pontos:
- Apos business/2-offer (oferta e base de tudo)
- Apos brand/4-identity (identidade alimenta design + marketing)
- Apos dev/5-qa-gate (qualidade do codigo)
- Apos marketing/5-review (qualidade do conteudo)

### Comando

```
/LMAS:workflows:launch
```
