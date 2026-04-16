---
id: seo-benchmark
name: "Benchmark — Core Web Vitals Baseline"
version: "1.0.0"
agent: seo
domain: software-dev
elicit: false
description: |
  Mede Core Web Vitals e resource sizes, salva como baseline persistente,
  e compara com runs anteriores para detectar regressoes de performance.

inputs:
  - name: url
    type: string
    required: true
    description: "URL para benchmarking"
  - name: label
    type: string
    required: false
    default: "default"
    description: "Label para identificar o benchmark (ex: pre-deploy, post-deploy, baseline)"

outputs:
  - name: benchmark_report
    type: file
    path: "projects/{projeto}/benchmarks/benchmark-{label}-{date}.json"
    description: "JSON com metricas CWV e resource sizes"

pre_conditions:
  - "URL acessivel"
  - "Browser MCP disponivel (para CWV) ou curl (para HTTP-only metrics)"

post_conditions:
  - "Benchmark salvo em projects/{projeto}/benchmarks/"
  - "Comparacao com benchmark anterior (se existir)"

execution_modes:
  interactive:
    description: "Mostra resultados e compara"
    elicitation_points: 0
  yolo:
    description: "Salva silenciosamente"
    elicitation_points: 0

constitutional_gates: []
---

# seo-benchmark — Core Web Vitals Baseline

## Comando

```
@seo *benchmark {url} [--label {name}]
```

## Metricas Coletadas

### Core Web Vitals

| Metrica | O que mede | Bom | Precisa melhorar | Ruim |
|---------|-----------|-----|-------------------|------|
| **LCP** | Largest Contentful Paint | <2.5s | 2.5-4s | >4s |
| **INP** | Interaction to Next Paint | <200ms | 200-500ms | >500ms |
| **CLS** | Cumulative Layout Shift | <0.1 | 0.1-0.25 | >0.25 |
| **TTFB** | Time to First Byte | <800ms | 800-1800ms | >1800ms |

### Resource Sizes

| Recurso | Metrica |
|---------|---------|
| HTML | Size (KB), compressed |
| JavaScript | Total size, number of files |
| CSS | Total size, number of files |
| Images | Total size, number of files, formats |
| Fonts | Total size, number of files |
| Total page weight | Sum of all resources |

## Processo

### Step 1: Coletar Metricas

Se browser MCP disponivel:
- Navegar para URL
- Executar Performance API: `performance.getEntriesByType('navigation')`
- Coletar LCP, INP, CLS via PerformanceObserver
- Listar resources via `performance.getEntriesByType('resource')`

Se browser MCP NAO disponivel (fallback HTTP):
- `curl -w "%{time_total}" {url}` para TTFB
- Analisar HTML response para resource links
- Reportar metricas HTTP-only (sem CWV real)

### Step 2: Salvar Benchmark

```json
{
  "url": "https://example.com",
  "label": "post-deploy",
  "timestamp": "ISO-8601",
  "cwv": {
    "lcp": 1.8,
    "inp": 120,
    "cls": 0.05,
    "ttfb": 450
  },
  "resources": {
    "html": { "size": 45, "compressed": 12 },
    "js": { "totalSize": 320, "files": 8 },
    "css": { "totalSize": 45, "files": 3 },
    "images": { "totalSize": 580, "files": 12 },
    "fonts": { "totalSize": 120, "files": 4 },
    "totalPageWeight": 1110
  },
  "scores": {
    "lcp": "good",
    "inp": "good",
    "cls": "good",
    "ttfb": "good"
  }
}
```

### Step 3: Comparar com Anterior

Se benchmark anterior existe com mesmo label:

```
BENCHMARK COMPARISON: {label}

| Metrica | Anterior | Atual | Delta | Status |
|---------|----------|-------|-------|--------|
| LCP | 1.5s | 1.8s | +0.3s (+20%) | WARNING |
| INP | 100ms | 120ms | +20ms (+20%) | OK |
| CLS | 0.03 | 0.05 | +0.02 | OK |
| Page Weight | 980KB | 1110KB | +130KB (+13%) | WARNING |

ALERTS:
  LCP increased >10% — investigate large resources added
  Page weight increased >10% — check new JS/image assets
```

Thresholds para alertas:
- Qualquer CWV piorou >10%: WARNING
- Qualquer CWV mudou de "good" para "needs improvement": ALERT
- Page weight aumentou >20%: ALERT

Se NAO existe benchmark anterior:
```
BASELINE CRIADO: Primeiro benchmark para label "{label}". Sem comparacao.
```

## Integrations

| Sistema | Integracao |
|---------|-----------|
| **Deploy Pipeline** | Chamado apos *document-release via chain |
| **Pipeline-Suggest** | Se ALERT, sugerir: @dev *investigate (performance regression) |
| **Checkpoint** | Atualizar com resultado do benchmark |
| **Retro** | Benchmark data alimenta metricas de quality na retrospectiva |

## Error Handling

| Situacao | Acao |
|----------|------|
| URL inacessivel | Reportar erro, nao salvar benchmark |
| Browser MCP indisponivel | Fallback para HTTP-only metrics |
| Benchmark anterior com label diferente | Nao comparar, salvar como novo |
| CWV nao disponivel (SSR/static) | Reportar TTFB e resource sizes apenas |
