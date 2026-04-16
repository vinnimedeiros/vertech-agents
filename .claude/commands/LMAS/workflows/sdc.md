# SDC — Story Development Cycle

O workflow PRINCIPAL do framework. Toda feature, bugfix ou implementacao passa por este ciclo de 4 fases.

**O que e:** Ciclo de desenvolvimento dirigido por stories. Cria a story → valida → implementa → revisa qualidade.

**Source of truth:** `.lmas-core/data/artifact-system/sector-stages.yaml` (setor: dev)
Ao executar, ler sector-stages.yaml para sequencia atualizada. Tabelas abaixo sao RESUMO.

## Instrucoes de Execucao

Ao ser ativado, Morpheus DEVE:

1. **Ler pipeline-status.yaml** do projeto ativo (setor dev)
2. **Ler stories/** para identificar stories pendentes
3. **Propor** iniciar/continuar o ciclo a partir do estado atual

### Fases

| # | Fase | Agent | Skill | O que faz |
|---|------|-------|-------|-----------|
| 1 | Create | @sm (River) | `/LMAS:agents:sm` | Cria a user story com AC, tasks, estimativa |
| 2 | Validate | @po (Keymaker) | `/LMAS:agents:po` | Valida story com checklist de 10 pontos. GO (>=7) ou NO-GO |
| 3 | Implement | @dev (Neo) | `/LMAS:agents:dev` | Implementa codigo, testes, migrations. Status: InProgress |
| 4 | QA Gate | @qa (Oracle) | `/LMAS:agents:qa` | Quality gate de 7 checks. PASS / CONCERNS / FAIL |

### Pos-QA

- **PASS** → Story Done. Oferecer: `/LMAS:agents:devops` para push
- **CONCERNS** → Dev corrige issues menores, re-submit
- **FAIL** → Volta para fase 3 (QA Loop: max 5 iteracoes)

### Protocolo por Fase

1. **Antes:** Verificar prerequisitos (fase anterior completa)
2. **Ativar:** Sugerir ao usuario: `Copie: /LMAS:agents:{agent}`
3. **Durante:** Agente executa conforme sua persona e task dependencies
4. **Apos:** Atualizar story status + pipeline-status.yaml
5. **Smith:** Oferecer verificacao apos fase 3 (implementacao)

### Context Files Relevantes

- `nfrs.yaml` — @dev e @qa precisam ler para performance/security
- `risk-register.yaml` — @dev DEVE ler para nao repetir debugs

### Quando Usar

- Implementar qualquer feature nova
- Corrigir bug (modo simplificado: pode pular fase 1 se story ja existe)
- Refatoracao (fase 1 cria story de refactor)

### Comando

```
/LMAS:workflows:sdc
```
