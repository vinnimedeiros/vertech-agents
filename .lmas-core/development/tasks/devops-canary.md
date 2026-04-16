---
id: devops-canary
name: "Canary — Post-Deploy Monitoring"
version: "1.0.0"
agent: devops
domain: software-dev
elicit: true
description: |
  Loop de monitoring pos-deploy que verifica saude da aplicacao.
  Roda checks a cada 30s por N minutos. Alerta se detectar regressoes.

inputs:
  - name: url
    type: string
    required: true
    description: "URL base da aplicacao para monitorar"
  - name: duration_min
    type: number
    required: false
    default: 5
    description: "Duracao do monitoring em minutos (default: 5)"
  - name: routes
    type: array
    required: false
    description: "Rotas adicionais para verificar alem da raiz (ex: /api/health, /login)"

outputs:
  - name: canary_report
    type: file
    path: ".lmas/canary/canary-{timestamp}.json"
    description: "JSON com resultados de cada check round"

pre_conditions:
  - "Deploy realizado (pos *push ou *create-pr merge)"
  - "URL acessivel"

post_conditions:
  - "Report salvo em .lmas/canary/"
  - "Checkpoint atualizado com resultado"
  - "Se erros encontrados, alerta emitido"

execution_modes:
  interactive:
    description: "Mostra progresso a cada round e pergunta se continuar"
    elicitation_points: 1
  yolo:
    description: "Roda silenciosamente e reporta ao final"
    elicitation_points: 0

constitutional_gates:
  - article: "IV"
    check: "Quality Gates — monitoring e uma forma de quality gate pos-deploy"
    severity: "MUST"
---

# devops-canary — Post-Deploy Monitoring

## Comando

```
@devops *canary {url} [--duration {min}] [--routes "/api/health,/login"]
```

## Checks por Round (a cada 30 segundos)

### 1. HTTP Status
- GET na URL base e em cada rota adicional
- Espera: 200 OK (ou 301/302 para redirects)
- FAIL: 4xx, 5xx, timeout >10s

### 2. Response Time
- Medir tempo de resposta de cada rota
- Baseline: primeira medida = referencia
- ALERT: se response time aumentar >50% vs baseline

### 3. Console Errors (se browser disponivel)
- Se MCP browser disponivel, navegar e checar console.error
- Se nao disponivel, skip silenciosamente

### 4. Content Verification
- Verificar que response body nao esta vazio
- Verificar que nao retorna pagina de erro generica
- Checar se title/meta tags esperados estao presentes

## Loop de Monitoring
n### Context Safety

Se a context window estiver proxima do limite durante o loop:
1. Emitir report PARCIAL com rounds completados ate o momento
2. Salvar JSON parcial em .lmas/canary/ com flag `"partial": true`
3. Encerrar gracefully com mensagem: "Canary encerrado parcialmente — {N} rounds de {total} completados"

```
round = 0
errors = []
baseline = null

while elapsed < duration_min:
  results = run_all_checks(url, routes)
  
  if round == 0:
    baseline = results  # Primeira medida = referencia
  
  if results.has_errors:
    errors.push({ round, timestamp, details })
  
  if results.response_time > baseline.response_time * 1.5:
    errors.push({ round, type: 'PERF_REGRESSION', details })
  
  report_progress(round, results)
  wait(30 seconds)
  round++

generate_final_report(errors, baseline, rounds)
```

## Resultado Final

### CLEAR (sem erros)
```
CANARY CLEAR: {url} monitorado por {duration}min, {rounds} rounds.
Todos os checks passaram. Response time medio: {avg}ms.
```

### ALERT (erros encontrados)
```
CANARY ALERT: {N} erros detectados em {duration}min monitoring!

Erros:
  Round {N}: {tipo} — {detalhes}
  Round {N}: {tipo} — {detalhes}

RECOMENDACAO: Verificar logs do servidor. Considerar rollback se erros persistirem.
Rollback: git revert {commit} && @devops *push
```

## Report JSON

Salvo em `.lmas/canary/canary-{timestamp}.json`:
```json
{
  "url": "https://app.example.com",
  "startedAt": "ISO-8601",
  "duration_min": 5,
  "rounds": 10,
  "baseline": { "responseTime": 150, "status": 200 },
  "errors": [],
  "verdict": "CLEAR|ALERT",
  "avgResponseTime": 160
}
```

## Integrations

| Sistema | Integracao |
|---------|-----------|
| **Deploy Pipeline** | Chamado automaticamente apos *push via chain |
| **Pipeline-Suggest** | Apos canary, sugerir: *document-release (se CLEAR) ou *investigate (se ALERT) |
| **Checkpoint** | Atualizar com resultado do canary |

## Error Handling

| Situacao | Acao |
|----------|------|
| URL inacessivel | Reportar ALERT imediato, nao iniciar loop |
| Timeout em todas as rotas | Reportar ALERT, sugerir verificar DNS/servidor |
| Browser MCP indisponivel | Skip check de console, continuar com HTTP checks |
| Erros em >50% dos rounds | Sugerir rollback imediato |
