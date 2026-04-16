---
id: analyst-retro
name: "Retro — Retrospectiva Semanal"
version: "1.0.0"
agent: analyst
domain: software-dev
elicit: true
description: |
  Retrospectiva semanal que analisa git history, stories completadas, metricas de agentes,
  e gera report com trends comparativos. Multi-project aware.
  Adaptado do padrao /retro para ecossistema LMAS multi-agente.

inputs:
  - name: project_id
    type: string
    required: false
    description: "ID do projeto (default: projeto ativo). Use --all para cross-project."
  - name: period_days
    type: number
    required: false
    default: 7
    description: "Periodo de analise em dias (default: 7)"

outputs:
  - name: retro_report
    type: file
    path: "projects/{projeto}/retros/retro-{YYYY}-W{WW}.md"
    description: "Relatorio de retrospectiva com metricas e trends"

pre_conditions:
  - "Repositorio git com historico de commits"
  - "Projeto ativo definido no contexto"

post_conditions:
  - "Relatorio salvo em projects/{projeto}/retros/"
  - "Checkpoint atualizado com referencia ao retro"

execution_modes:
  interactive:
    description: "Apresenta metricas e pede feedback do usuario"
    elicitation_points: 2
  yolo:
    description: "Gera relatorio completo autonomamente"
    elicitation_points: 0

constitutional_gates: []
---

# analyst-retro — Retrospectiva Semanal

## Comando

```
@analyst *retro [--project {id}] [--period {days}] [--all]
```

## Processo

### Step 1: Coleta de Dados

1. **Git log do periodo**
   ```bash
   git log --since="{period} days ago" --format="%H|%an|%ae|%ad|%s" --date=short
   ```
   Extrair: total commits, commits por dia, arquivos mais modificados, LOC adicionadas/removidas.

2. **Stories no periodo**
   - Ler `projects/{projeto}/stories/` — filtrar por datas no frontmatter ou changelog
   - Contar: stories criadas (Draft), validadas (Ready), implementadas (InProgress→Done)
   - Listar transicoes de status

3. **Checkpoint diffs**
   - Comparar `PROJECT-CHECKPOINT.md` atual vs git show do inicio do periodo
   - Identificar decisoes tomadas, bloqueios resolvidos, proximos passos completados

4. **Agentes utilizados** (se analytics disponivel)
   - Ler `.lmas/analytics/session-usage.jsonl` ou `.lmas/analytics/skill-usage.jsonl`
   - Contar ativacoes por agente no periodo

### Step 2: Analise

1. **Velocity**
   - Stories done esta semana vs semana anterior (se retro anterior existe)
   - Commits/dia medio
   - Tendencia: acelerando, estavel, desacelerando

2. **Distribuicao de trabalho**
   - % commits em features vs fixes vs docs vs chore
   - Agentes mais usados (top 5)
   - Arquivos mais tocados (hotspots — possivel tech debt)

3. **Quality indicators**
   - Ratio fix commits vs feature commits (alto = muitos bugs)
   - Stories que voltaram de QA (retrabalho)
   - Tempo medio entre Draft e Done (cycle time)

4. **Patterns e Concerns**
   - Arquivos editados em >50% dos commits (hotspot = candidato a refactor)
   - Stories bloqueadas por mais de 3 dias
   - Dependencias externas que causaram delay

### Step 3: Gerar Report

Salvar em `projects/{projeto}/retros/retro-{YYYY}-W{WW}.md`:

```markdown
---
type: retro
title: "Retrospectiva Semana {WW}/{YYYY}"
project: {projeto}
period: "{data_inicio} a {data_fim}"
tags:
  - project/{projeto}
  - retro
---

# Retrospectiva Semana {WW}/{YYYY}

## Resumo Executivo
- {3-5 bullets com highlights da semana}

## Metricas

| Metrica | Esta Semana | Semana Anterior | Trend |
|---------|------------|----------------|-------|
| Stories Done | N | N-1 | up/down/stable |
| Commits | N | N-1 | up/down/stable |
| LOC adicionadas | N | N-1 | up/down/stable |
| Fix ratio | X% | X% | up/down/stable |

## Highlights
- {Maiores conquistas da semana}

## Concerns
- {Padroes problematicos detectados}
- {Hotspots de codigo}
- {Bloqueios recorrentes}

## Agentes Mais Ativos
1. @{agent} — N ativacoes
2. @{agent} — N ativacoes

## Recomendacoes para Proxima Semana
- {Sugestoes baseadas em tendencias}
```

### Step 4: Atualizar Checkpoint

Adicionar em "Ultimo Trabalho":
```
Retrospectiva semana {WW}: {resumo em 1 linha}. Report: projects/{projeto}/retros/retro-{YYYY}-W{WW}.md
```

## Multi-Project Mode

- `*retro` — retro do projeto ativo
- `*retro --project lmas` — retro de projeto especifico
- `*retro --all` — retro agregada de TODOS os projetos (cross-project summary)

Cross-project agrega metricas de cada `projects/*/` e compara velocity entre projetos.

## Trend Tracking

Se retro anterior existe em `projects/{projeto}/retros/`:
- Comparar metricas automaticamente
- Mostrar tendencias (3+ semanas = trend confiavel)
- Alertar se velocity caiu >20% sem explicacao

Se nao existe retro anterior:
- Primeira retro = baseline. Sem comparacao.

## Integration com Pipeline-Suggest

Apos completar *retro, sugerir:
- Se concerns encontrados: `@dev *investigate` para hotspots
- Se stories bloqueadas: `@pm *create-story` para desbloqueio
- Se velocity subindo: `@pm *execute-epic` para acelerar

## Error Handling

| Situacao | Acao |
|----------|------|
| Sem commits no periodo | Reportar "Nenhum commit no periodo. Semana sem atividade registrada." |
| Sem stories | Reportar metricas de git apenas, sem metricas de stories |
| Sem retro anterior | Gerar baseline sem comparacao |
| Projeto nao encontrado | Listar projetos disponiveis e pedir selecao |
