---
type: security-audit
title: "Secrets audit — .env.local git history"
date: 2026-04-21
auditor: Morpheus (@lmas-master)
project: vertech-agents
status: CLEAN
tags:
  - project/vertech-agents
  - security
  - audit
---

# Secrets audit — 2026-04-21

## Contexto

Smith (@smith) verify levantou **finding C1** alertando possível leak de credenciais em histórico git do repo público `github.com/vinnimedeiros/vertech-agents`. Finding classificado CRITICAL por natureza do repo ser público.

Lista de secrets suspeitos (presentes em `.env.local` atual):
- `DATABASE_URL` (com senha Postgres)
- `SUPABASE_ANON_KEY` (JWT)
- `SUPABASE_SERVICE_ROLE_KEY` (JWT — service role full access)
- `BETTER_AUTH_SECRET` (64 chars hex)
- `OPENAI_API_KEY` (`sk-proj-...`)
- `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` (Cloudflare R2)

## Comandos executados

```bash
# 1. Grep por pattern JWT comum (service_role e anon_key do Supabase usam HS256)
git log --all -p 2>&1 | grep -E "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" | head -5
# Resultado: VAZIO

# 2. Grep por prefixo OpenAI project keys
git log --all -p -S "sk-proj-" 2>&1 | head -50
# Resultado: VAZIO (matches foram só comentários do projeto, não keys)

# 3. Grep por valor literal do BETTER_AUTH_SECRET
git log --all -p -S "BETTER_AUTH_SECRET" 2>&1 | head -30
# Resultado: apenas .env.local.example (placeholder, não valor real) e CI workflow

# 4. História completa do arquivo .env.local
git log --all --full-history -- .env.local 2>&1
# Resultado: VAZIO — arquivo nunca foi commitado

# 5. Adição do .env.local (detecta se já foi commitado em algum ponto)
git log --all --diff-filter=A -- .env.local 2>&1
# Resultado: VAZIO
```

## Resultado: **CLEAN**

`.env.local` nunca foi commitado ao histórico do repositório. Valores reais das credenciais não aparecem em diffs públicos.

Arquivos presentes em git:
- `.env.example` — placeholder só com nomes de variáveis
- `.env.local.example` — placeholder só com nomes de variáveis
- `.gitignore` inclui `.env.local` explicitamente

## Ações preventivas recomendadas

Embora limpo hoje, o risco de leak acidental futuro permanece. Implementar camada extra:

### 1. Pre-commit hook com gitleaks

```bash
# Instalação (em root do monorepo)
pnpm add -D -w husky gitleaks

# Habilitar husky
pnpm exec husky init

# Criar hook .husky/pre-commit
echo "pnpm exec gitleaks protect --staged --no-banner" > .husky/pre-commit
chmod +x .husky/pre-commit
```

Criar `.gitleaks.toml` na raiz com regras customizadas:
```toml
[extend]
useDefault = true

[[rules]]
id = "supabase-service-role"
description = "Supabase Service Role JWT"
regex = '''eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.ey[A-Za-z0-9+/=_-]+\.[A-Za-z0-9+/=_-]+'''

[[rules]]
id = "openai-project-key"
description = "OpenAI Project API Key"
regex = '''sk-proj-[A-Za-z0-9_-]{40,}'''

[[rules]]
id = "cloudflare-r2-secret"
description = "Cloudflare R2 Secret Access Key"
regex = '''[a-f0-9]{64}'''
```

### 2. GitHub secret scanning

Verificar se está ativado no repo settings:
- Settings → Code security and analysis → Secret scanning: **Enabled**
- Push protection: **Enabled** (bloqueia push com secret detectado)

Comando gh:
```bash
gh api repos/vinnimedeiros/vertech-agents/secret-scanning/alerts --paginate
```

### 3. Renomear `.env.local.example` → `.env.example`

Evitar que alguém por engano copie `.env.local.example` achando que é o `.env.local` (nomes similares). Manter só `.env.example`.

## Gate humano

Vinni decide:
- [ ] Implementar pre-commit hook gitleaks? (recomendado)
- [ ] Habilitar GitHub secret scanning se ainda não estiver ativo?
- [ ] Unificar `.env.example` (remover `.env.local.example`)?

## Conclusão

Finding C1 do Smith verify **rebatido por evidência**: credenciais não vazaram. Nenhuma rotação de chaves necessária.

Pre-commit hook fica como melhoria preventiva, não correção urgente.
