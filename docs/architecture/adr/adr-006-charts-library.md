---
type: adr
id: ADR-006
title: "Charts Library — shadcn/ui Charts (Recharts)"
project: vertech-agents
status: accepted
date: 2026-04-26
tags:
  - project/vertech-agents
  - adr
  - ui
  - wave-2
---

# ADR-006: Charts Library — shadcn/ui Charts (Recharts)

## Status

Accepted (2026-04-26).

## Contexto

Story H.4 — Dashboard v2 gráficos. Vinni quer "padrão ouro" alinhado design system Comercial 100% (cards floating, cantos metálicos, tipografia Satoshi+Baskerville, dark theme primário).

Opções avaliadas:
1. **shadcn/ui Charts** (Recharts wrapper) — https://ui.shadcn.com/charts
2. **Tremor** — https://tremor.so
3. **Recharts puro**
4. **visx (Airbnb)**
5. **Apache ECharts**

## Decisão

**shadcn/ui Charts (Recharts wrapper).**

Razões:
- Já usamos shadcn/ui pesado em Vertech. Tokens (`--background`, `--primary`, `--chart-1`...`--chart-5`) plugam nativamente
- Customização CSS via Tailwind direto, sem props prop drilling
- Componentes copy-paste no projeto (não dep externa frágil), Vinni tem controle total do source
- Recharts engine = battle-tested (Stripe, Vercel, etc usam), SSR-friendly
- Tipografia: aceita classes Tailwind nos labels (Satoshi automático)
- Tooltips e legends customizáveis (alinha cards floating padrão)

## Alternativas rejeitadas

### A. Tremor
**Rejeitado.** Linda mas opinionada — design system próprio. Forçaria divergência do shadcn. Mistura visual = quebra "padrão ouro" coeso. Tremor não suporta CSS variables shadcn nativamente, precisaria reset visual.

### B. Recharts puro
**Rejeitado.** Sem wrapper bonito, todo gráfico vira boilerplate (~80 linhas pra um bar chart simples). shadcn-charts dá ergonomia + manutenibilidade.

### C. visx (Airbnb)
**Rejeitado.** Low-level demais. Liberdade enorme, mas time-to-render alto pra MVP. Reservar pra dashboards muito custom no V4 (heatmaps, sankey).

### D. Apache ECharts
**Rejeitado.** Lib pesada (~600kb gzipped), thin React wrapper. Bundle size mata performance no Edge.

## Charts a implementar (H.4)

| Métrica | Chart type | Componente shadcn |
|---|---|---|
| Interesses (% por tipo) | Donut/pie | `<ChartContainer>` + `<Pie>` |
| Origem (% canal) | Horizontal bar | `<ChartContainer>` + `<Bar>` |
| Temperatura | Donut | idem |
| Follow-up (% resposta + % conversão) | Stacked bar ou line | `<Bar>` ou `<Line>` |
| Campanhas (disparo + conversão) | Line + bar combo | `<ComposedChart>` |
| Cards topo (sparklines opcionais) | Sparkline | `<Line>` mini |

## Tokens visuais

CSS vars já definidas em `globals.css`:
```css
--chart-1: <hsl primary>
--chart-2: <hsl secondary>
--chart-3: <hsl accent>
--chart-4: <hsl muted>
--chart-5: <hsl destructive subtle>
```

H.4 usa essas vars. Operador troca tema → charts seguem automaticamente.

## Consequências

### Positivas
- Design system coeso em todo dashboard
- Bundle size: Recharts ~95kb gzipped (aceitável)
- Vinni controla source dos componentes (copy-paste no projeto)
- Drill-down (H.6) = handler `onClick` direto no `<Bar>`/`<Pie>`, sem ginástica

### Negativas
- Recharts tem performance limites com >10k pontos. Mitigação: dashboard agrega antes (não trafega raw data, só métricas).
- Animações default Recharts podem lentar Edge. Mitigação: `isAnimationActive={false}` em charts críticos.

## Implementação

| Componente | Owner | Story |
|---|---|---|
| Setup shadcn-charts (CLI add) | @dev | H.4 |
| Componente reusável `<MetricCard>` (card topo + sparkline) | @dev | H.3 |
| Componente reusável `<MetricChart>` (gráfico métrica profunda) | @dev | H.4 |
| Drill-down handler genérico | @dev | H.6 |

## Refs

- shadcn/ui Charts: https://ui.shadcn.com/charts
- Recharts docs: https://recharts.org
- CSS vars chart shadcn: https://ui.shadcn.com/docs/theming
