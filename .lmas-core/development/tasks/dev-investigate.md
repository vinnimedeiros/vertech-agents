---
id: dev-investigate
name: "Investigate — Root-Cause Debugging"
version: "1.1.0"
agent: dev
domain: software-dev
elicit: true
description: |
  Debugging sistematico com investigacao de root cause. 4 fases: investigate, analyze,
  hypothesize, implement. Iron Law: nenhum fix sem root cause documentado.
  Adaptado para ecossistema LMAS multi-agente com integracao freeze-scope e QA Loop.

inputs:
  - name: bug_description
    type: string
    required: true
    description: "Descricao do bug, erro ou comportamento inesperado"
  - name: mode
    type: enum
    values: ["quick", "full"]
    default: "full"
    description: "quick = bugs triviais (typo, import errado, prop faltando, off-by-one), full = 4 fases completas (intermitente, dados incorretos, erros nao-reproduziveis)"
  - name: freeze_scope
    type: string
    required: false
    description: "Path(s) glob para restringir edicoes durante investigacao (ativa freeze-scope hook)"

outputs:
  - name: investigation_log
    type: file
    path: "projects/{projeto}/decisions/investigation-{date}.md"
    description: "Log da investigacao com root cause, hipoteses testadas e fix aplicado"
  - name: regression_test
    type: file
    description: "Teste de regressao que previne recorrencia do bug"

pre_conditions:
  - "Bug reproduzivel ou evidencia clara (log, screenshot, stack trace)"
  - "Acesso ao codigo-fonte do componente afetado"

post_conditions:
  - "Root cause documentado (NUNCA 'nao sei por que funciona agora')"
  - "Fix aplicado com commit atomico"
  - "Teste de regressao criado e passando"
  - "Checkpoint atualizado"

execution_modes:
  interactive:
    description: "Confirma hipoteses com o usuario antes de testar"
    elicitation_points: 3
  yolo:
    description: "Executa investigacao completa autonomamente"
    elicitation_points: 0

constitutional_gates:
  - article: "SD-III"
    check: "Code Quality Standards — fix deve passar lint, typecheck, test, build"
    severity: "MUST"
  - article: "IV"
    check: "Quality Gates — entrega passa por gate de qualidade"
    severity: "MUST"
---

# dev-investigate — Root-Cause Debugging

## Iron Law

**NENHUM fix sem root cause documentado.** Se voce nao sabe POR QUE o bug acontece, voce nao tem um fix — tem um patch que vai quebrar de novo.

---

## Modo Quick

Para bugs com causa objetivamente trivial:
- Typo no codigo
- Import errado ou faltando
- Prop/argumento faltando ou com nome errado
- Off-by-one em indice ou loop
- Variavel com nome trocado

**Se o bug NAO se encaixa nessa lista, usar modo Full.**

1. **Confirmar** — reproduzir o bug
2. **Fix** — aplicar correcao
3. **Test** — criar teste de regressao
4. **Commit** — `fix: {descricao}` referenciando story se aplicavel

---

## Modo Full (4 fases)

Para bugs onde a causa NAO e obvia: comportamento intermitente, dados incorretos sem causa visivel, erros em producao nao-reproduziveis localmente, race conditions, state corruption.

### Phase 1: INVESTIGATE — Coleta de Evidencias

**Objetivo:** Reproduzir o bug e coletar toda evidencia disponivel.

1. **Reproduzir o bug**
   - Seguir os passos descritos pelo usuario
   - Se nao reproduzivel, documentar tentativas e pedir mais contexto
   - Se intermitente, identificar condicoes que aumentam probabilidade

2. **Coletar evidencias**
   - Stack traces e error messages (copiar exatamente)
   - Logs relevantes (console, server, database)
   - Estado da aplicacao no momento do erro
   - Versoes e ambiente (Node, browser, OS)

3. **Delimitar escopo**
   - Identificar arquivos/modulos envolvidos
   - Verificar quando funcionava (`git log`, `git bisect`)
   - Se `freeze_scope` fornecido, ativar restricao de edicao

4. **Documentar** todas as evidencias antes de analisar

**Output Phase 1:**
```
BUG: {descricao}
REPRODUZIVEL: sim/nao/intermitente
EVIDENCIAS: {stack trace, logs, ultimo commit funcional}
ESCOPO SUSPEITO: {arquivos/modulos}
```

### Phase 2: ANALYZE — Analise do Call Chain

**Objetivo:** Entender o fluxo de execucao que leva ao bug.

1. **Mapear call chain** — do ponto de entrada ate o ponto de falha
2. **Identificar componentes** — listar arquivos, checar mudancas recentes (`git log --follow`)
3. **Isolar o ponto de falha** — logs temporarios, estreitar ate menor trecho possivel

**Output Phase 2:**
```
CALL CHAIN: {entrada} -> {funcao A} -> {funcao B} -> {FALHA}
PONTO DE FALHA: {arquivo:linha}
DADOS NO PONTO: {esperado vs real}
```

### Phase 3: HYPOTHESIZE — Formular e Testar Hipoteses

**Objetivo:** Formular hipoteses e testa-las sistematicamente.

1. **Formular hipoteses** (minimo 1, recomendado 2-3, maximo 5)
   - Baseadas nas evidencias das fases 1-2
   - Cada hipotese TESTAVEL — existe experimento que confirma ou refuta
   - Ordenar por probabilidade

2. **Testar cada hipotese**
   - Descrever experimento, executar, registrar: CONFIRMADA ou REFUTADA
   - Parar ao confirmar uma

3. **Se nenhuma confirmada:**
   - Voltar para Phase 2 com escopo ampliado
   - Considerar: race condition, cache stale, dependency version, env difference
   - Escalar para @architect se travado

**Output Phase 3:**
```
HIPOTESES:
  H1: {descricao} — CONFIRMADA/REFUTADA
  H2: {descricao} — CONFIRMADA/REFUTADA
ROOT CAUSE: {hipotese confirmada}
EXPLICACAO: {por que causa o bug}
```

### Phase 4: IMPLEMENT — Fix + Regression Test

**Objetivo:** Fix baseado em root cause CONFIRMADO + teste de regressao.

1. **Implementar fix** — MINIMO, corrigir root cause, verificar testes existentes
2. **Criar teste de regressao** — DEVE falhar SEM fix, DEVE passar COM fix
3. **Verificar** — todos os testes, lint, typecheck
4. **Commit atomico** — `fix: {descricao}` com root cause na mensagem
5. **Desativar freeze** se ativado
6. **Atualizar checkpoint**

---

## Integrations

| Sistema | Integracao |
|---------|-----------|
| **Freeze Scope** | Se freeze_scope fornecido, ativar no inicio, desativar no final |
| **QA Loop** | Se fix falhar no QA gate, investigacao pode ser reaberta |
| **Checkpoint** | Atualizar Ultimo Trabalho e Proximos Passos |
| **Pipeline-Suggest** | Apos completar, sugerir: @qa *review (se story ativa) ou @devops *push (se fix isolado) |
| **Escalation** | Se travado, escalar para @architect |

## Error Handling

| Situacao | Acao |
|----------|------|
| Bug nao reproduzivel apos 3 tentativas | Pedir mais contexto ao usuario |
| Bug reproduzivel apenas em producao | Coletar logs remotos, comparar config local vs prod, verificar env vars |
| Nenhuma hipotese confirmada | Escalar para @architect |
| Fix quebra outros testes | Rollback, re-analisar |
| Root cause em dependencia externa | Documentar workaround + issue upstream |
