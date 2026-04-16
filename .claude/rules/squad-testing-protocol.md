---
paths:
  - "squads/**"
  - ".claude/commands/**"
---
# Squad Testing Protocol

## Purpose

Protocolo de validacao para squads instalados em `squads/`. Garante que squads funcionam corretamente com o framework LMAS e nao quebram core agents.

## 6 Tipos de Teste

### 1. Schema Validation

Cada `squad.yaml` DEVE validar contra `.lmas-core/schemas/squad-schema.json`:

- `name` presente e kebab-case
- `version` presente e semver
- `lmas.type` = "squad" (NAO `aios`)
- `components.tasks` listados (task-first architecture)
- `components.agents` listados

**Como testar:** `grep "lmas:" squads/{name}/squad.yaml` — deve retornar resultado.

### 2. Agent Activation

Cada agent `.md` dentro do squad DEVE ter estrutura minima:

- `agent.name` presente
- `agent.id` presente
- `persona` ou `persona_profile` presente
- Arquivo nao vazio

**Como testar:** `grep -l "agent:" squads/{name}/agents/*.md` — deve listar todos os agents.

### 3. Command Listing

Agents com commands DEVEM listar pelo menos `help` e 1 command funcional.

**Como testar:** `grep -c "- name:" squads/{name}/agents/{chief}.md` — deve ser >= 2.

### 4. Fallback Test (C-1)

Core agents que referenciam squad tasks DEVEM funcionar SEM o squad instalado:

1. Anotar os commands enhanced do core agent (ex: Mouse `*write-sales-letter`)
2. Remover temporariamente `squads/{name}/`
3. Verificar que o core agent ativa sem erro
4. Verificar que commands enhanced executam (com output basico)
5. Restaurar squad

**Regra:** NUNCA crashar por falta de squad.

### 5. Cross-Domain Test

Workflows cross-domain DEVEM referenciar apenas agents que existem:

**Como testar:**
```bash
for agent in $(grep "agent:" .lmas-core/data/workflow-chains.yaml | grep -o '"@[^"]*"' | sort -u); do
  id=$(echo $agent | tr -d '"@')
  test -f ".lmas-core/development/agents/$id.md" && echo "OK: $id" || echo "MISSING: $id"
done
```

### 6. Namespace Test

Nenhum command de squad deve colidir com commands de core agents:

- Core agent commands TEM prioridade
- Squad commands sao acessados via `@{squad}:{agent} *{command}`
- Se colisao detectada, squad command DEVE usar prefixo

**Como testar:** Comparar outputs de `grep "- name:" .lmas-core/development/agents/{core}.md` com `grep "- name:" squads/{squad}/agents/{agent}.md`.

## Quando Executar

| Evento | Testes obrigatorios |
|--------|-------------------|
| Squad instalado | 1 (schema), 2 (activation), 3 (commands) |
| Core agent enhanced | 4 (fallback) |
| Workflow cross-domain criado | 5 (cross-domain) |
| Novo command adicionado | 6 (namespace) |
| Pre-push | Todos os 6 |

## Obrigatoriedade

Este protocolo e SHOULD para desenvolvimento iterativo e MUST para pre-push.
