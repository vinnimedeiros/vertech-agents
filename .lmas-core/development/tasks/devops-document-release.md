---
id: devops-document-release
name: "Document Release — Auto-Update Docs Post-Merge"
version: "1.0.0"
agent: devops
domain: software-dev
elicit: true
description: |
  Apos merge/push, identifica docs desatualizados e sugere atualizacoes.
  Scaneia README, guides, CLAUDE.md, architecture docs por referencias quebradas
  ou exemplos desatualizados.

inputs:
  - name: scope
    type: string
    required: false
    description: "Path especifico para scanear (default: todo o projeto)"
  - name: base_ref
    type: string
    required: false
    description: "Commit/branch base para calcular diff (default: HEAD~1)"

outputs:
  - name: stale_docs_list
    type: string
    description: "Lista de docs desatualizados com sugestoes de atualizacao"

pre_conditions:
  - "Merge ou push recente com arquivos modificados"

post_conditions:
  - "Docs desatualizados identificados e listados"
  - "Sugestoes de atualizacao apresentadas"
  - "Checkpoint atualizado"

execution_modes:
  interactive:
    description: "Lista docs e pergunta quais atualizar"
    elicitation_points: 2
  yolo:
    description: "Lista docs e aplica atualizacoes automaticamente"
    elicitation_points: 0

constitutional_gates:
  - article: "III"
    check: "Deliverable-Driven — docs sao deliverables que devem estar atualizados"
    severity: "SHOULD"
---

# devops-document-release — Auto-Update Docs Post-Merge

## Comando

```
@devops *document-release [--scope {path}] [--base {ref}]
```

## Processo

### Step 1: Identificar Arquivos Modificados

```bash
git diff --name-only {base_ref}..HEAD
```

Filtrar apenas arquivos de codigo/config (nao docs em si):
- `src/**`, `packages/**`, `lib/**`, `bin/**`
- `*.ts`, `*.js`, `*.tsx`, `*.jsx`, `*.json`, `*.yaml`
- Excluir: `*.md`, `*.test.*`, `node_modules/`

### Step 2: Buscar Docs que Referenciam Arquivos Modificados

Para cada arquivo modificado, buscar em docs:
```bash
grep -rl "{filename}" docs/ README.md CLAUDE.md projects/*/CLAUDE.md 2>/dev/null
```

Tambem buscar:
- Nomes de funcoes/classes exportadas que mudaram
- Paths de imports que foram movidos
- Variaveis de ambiente adicionadas/removidas

### Step 3: Classificar Docs por Urgencia

| Urgencia | Criterio | Acao |
|----------|---------|------|
| **HIGH** | Doc referencia arquivo que foi DELETADO ou RENOMEADO | Link quebrado — atualizar obrigatoriamente |
| **MEDIUM** | Doc referencia arquivo que teve mudanca de API (exports mudaram) | Exemplo pode estar desatualizado |
| **LOW** | Doc referencia arquivo que teve mudanca interna (sem API change) | Provavelmente ok, verificar |

### Step 4: Apresentar Findings

```
DOCUMENT RELEASE — {N} docs potencialmente desatualizados

HIGH (links quebrados):
  - docs/guides/auth.md:15 — referencia `src/auth/login.ts` (DELETADO → movido para `src/features/auth/login.ts`)
  - README.md:42 — referencia `npm run dev` (script renomeado para `npm run start:dev`)

MEDIUM (API mudou):
  - docs/architecture/api.md:30 — referencia `createUser()` (assinatura mudou — novo param `role`)

LOW (mudanca interna):
  - CLAUDE.md:88 — referencia `packages/auth/` (mudancas internas, doc provavelmente ok)
```

### Step 5: Aplicar Atualizacoes (modo interativo)

Para cada finding HIGH/MEDIUM:
1. Mostrar o trecho desatualizado do doc
2. Sugerir correcao
3. Perguntar se aplicar

Em modo YOLO: aplicar HIGHs automaticamente, listar MEDIUMs para review.

### Step 6: Atualizar Checkpoint

```
Document release: {N} docs atualizados pos-merge. Files: {lista}
```

## Escopo de Busca

| Tipo de Doc | Path | Scanear? |
|------------|------|---------|
| README | `README.md` | SIM |
| Project CLAUDE | `projects/*/CLAUDE.md` | SIM |
| Architecture docs | `docs/architecture/**` | SIM |
| Guides | `docs/guides/**` | SIM |
| Framework Reference | `docs/FRAMEWORK-REFERENCE-GUIDE.md` | SIM |
| Stories | `docs/stories/**` | NAO (imutaveis apos Done) |
| Agent files | `.lmas-core/development/agents/**` | NAO (L2 protegido) |
| Constitution | `.lmas-core/constitution.md` | NAO (L1 protegido) |

## Integrations

| Sistema | Integracao |
|---------|-----------|
| **Deploy Pipeline** | Chamado apos *canary CLEAR via chain |
| **Pipeline-Suggest** | Apos completar, sugerir: *benchmark (se app web) |
| **Checkpoint** | Atualizar com lista de docs atualizados |

## Error Handling

| Situacao | Acao |
|----------|------|
| Sem arquivos modificados no diff | Reportar "Nenhuma mudanca detectada" |
| Sem docs referenciando arquivos modificados | Reportar "Docs parecem atualizados" |
| Doc em path protegido (L1/L2) | Listar finding mas NAO editar — apenas reportar |
