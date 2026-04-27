---
type: decision-brief
title: "Vertical Library — hardcoded TypeScript vs tabela editável"
status: awaiting-decision
date: 2026-04-21
decider: Vinni (CEO)
drafted_by: Morpheus (@lmas-master) + Smith verify (@smith)
tags:
  - project/vertech-agents
  - decision
  - phase/09
  - phase/13
---

# Decisão necessária: vertical library do Arquiteto

## O que é

Vertical library = conjunto de templates + perguntas que o Arquiteto usa pra conduzir a criação do agente. Hoje são 7 verticais built-in (clínica, e-commerce, imobiliária, infoproduto, SaaS, serviços locais, personalizado) com 7 perguntas cada.

Arquivo atual: `apps/web/modules/saas/agents/architect/lib/vertical-questions.ts` (hardcoded TypeScript, 7 verticais × 7 perguntas).

## O problema

PRD v2 §2.2.4 diz:
> "v2 tem biblioteca editável por Master (white label)"

E memória MUST `feedback_multi_layer_features.md`:
> "Superadmin, Master, Agency, Client todos têm kit operacional completo"

Hoje: só dev com acesso ao código pode editar. Um Master do seu produto não consegue personalizar as 7 perguntas da vertical "Imobiliária" pra incluir uma pergunta específica do nicho dele.

Isso bloqueia o modelo white-label (Phase 13).

## Opções

### Opção A — Manter hardcoded agora, migrar em Phase 13 whitelabel (RECOMENDADA)

**O que é:** Deixar `vertical-questions.ts` como está. Phase 13 Whitelabel cria tabela `vertical_library` + UI de CRUD por Master, e faz migração one-time do hardcoded pro DB.

**Prós:**
- Zero risco agora (Phase 09 já está completa)
- Tempo economizado vai pra Phase 07B-v2 (Painel de Refino) que é o próximo bloqueador de produto
- Quando implementar em Phase 13, o hardcoded serve como seed inicial
- Evita retrabalho: se descobrirmos melhores perguntas testando, ajustar um .ts é mais rápido que migration + admin UI
- Alinha com `feedback_escala_desde_dia_1.md` sem violação (Vertech captar demanda não exige white-label no dia 1 — exige agentes funcionando)

**Contras:**
- Débito técnico registrado
- Master não consegue personalizar verticais até Phase 13 (estimativa: ~2-3 meses à frente)
- Dependência linear — Phase 13 não pode deslizar pra 2027

**Esforço:** 0h agora. Phase 13 absorverá.

### Opção B — Antecipar tabela + admin UI agora

**O que é:** Criar tabela `vertical_library`, migration pra seed do hardcoded, CRUD UI em Superadmin (depois em Master), endpoint GET pra o wizard consumir.

**Prós:**
- Cumpre PRD v2 §2.2.4 imediatamente
- Desbloqueia Master pra personalizar antes de Phase 13
- Elimina débito técnico

**Contras:**
- +3-5 dias de trabalho agora (schema + migration + seed + UI Superadmin + endpoint + refactor wizard pra consumir)
- Atrasa Phase 07B-v2 (Painel de Refino) em semana completa
- Phase 09 está Ready for Review — introduzir mudança estrutural agora arrisca regressão antes do gate humano fechar

**Esforço:** ~3-5 dias. Responsáveis: @data-engineer (schema), @dev (UI Superadmin + refactor), @architect (design do endpoint).

### Opção C — Híbrido: hardcoded + override por org em JSONB

**O que é:** Mantém hardcoded como base. Adiciona coluna `vertical_overrides jsonb` na tabela `organization` (ou `master_partner`). Wizard lê hardcoded, sobrepõe com overrides se existirem. Admin UI edita o JSONB.

**Prós:**
- Mais rápido que Opção B (~1-2 dias)
- Desbloqueia customização parcial
- Base comum (hardcoded) continua fonte de verdade

**Contras:**
- JSONB sem schema estrito = risco de dados inválidos
- Se futuro Phase 13 migrar pra tabela, precisa converter overrides
- UX confusa pro Master: "qual a diferença entre a pergunta padrão e a minha?"

**Esforço:** ~1-2 dias.

## Recomendação

**Opção A (manter hardcoded, migrar em Phase 13).**

Motivos:
1. **Prioridade > Completude** — Phase 07B-v2 Painel de Refino é o que destrava produto. Vertical customizada não destrava nada hoje (clientes beta usam verticais padrão).
2. **Risco baixo** — Phase 09 está estável. Mexer agora arrisca o fluxo principal de criação.
3. **Caminho evolutivo claro** — Phase 13 Whitelabel já está no roadmap. Quando chegar, o hardcoded vira seed da tabela em uma migration única.
4. **Regra `feedback_escala_desde_dia_1.md`** não é violada — ela exige infra robusta (BullMQ, rate limit, observabilidade), não customização white-label. Vertech com 7 verticais fixas captura 100% da demanda inicial.

## Próximo passo pro Vinni

Basta responder:
- [ ] A (hardcoded, Phase 13 migra) — recomendado
- [ ] B (antecipar tabela + UI agora)
- [ ] C (híbrido com overrides)

Se escolher B ou C, eu aciono @data-engineer + @dev pra montar stories dentro do Bloco 3. Se escolher A, é só registrar em `docs/architecture/tech-debt-register.md` e seguir pra Phase 07B-v2.
