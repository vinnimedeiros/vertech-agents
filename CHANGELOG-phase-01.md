# Phase 01 — Foundation Setup

**Data:** 2026-04-16
**Status:** Concluída (pending smoke test)

## O que foi feito

### Infraestrutura base
- Projeto Next.js 16.2.4 com Turbopack default rodando localmente
- Supabase PostgreSQL conectado (projeto `agents-v2`)
- Drizzle ORM 0.44.2 sincronizado com o banco (11 tabelas criadas)
- better-auth 1.2.8 funcional com `drizzleAdapter`
- 3 buckets de Storage no Supabase: `avatars` (público), `whatsapp-media` (privado), `knowledge` (privado)

### Migração Prisma → Drizzle
- Export principal de `@repo/database` trocado de Prisma para Drizzle
- better-auth `prismaAdapter` → `drizzleAdapter`
- drizzle-zod 0.7.1 (compatível com Zod 3)
- Prisma completamente removido (8395 linhas deletadas)
- Re-export de helpers drizzle-orm (`sql`, `eq`, `and`, `or`, etc.) pelo `@repo/database`

### Rebranding
- `config.appName` → "Vertech Agents"
- Hero da landing com copy própria em PT-BR (com acentos corretos)
- Footer marketing e SaaS sem atribuição ao Supastarter
- UserMenu apontando para `/docs` local
- Translations EN e DE atualizadas
- 4 logos Vertech (SVG) adicionados em `apps/web/public/logos/`

### Adições Opção B (robusta)
- Endpoint `/api/health` com check de conectividade do banco (para Coolify liveness probe)
- Rate limiting via `hono-rate-limiter`:
  - Global: 100 req/min por IP
  - Auth: 10 req/min
  - AI: 30 req/min
- Vitest configurado no root com teste smoke do schema (3 testes passando)
- GitHub Actions expandido: lint + typecheck + test + build + e2e em PRs

## Decisões técnicas

### Connection string do Supabase
O Transaction Pooler do Supabase está rejeitando o formato `postgres.[ref]:[pass]@aws-0-sa-east-1.pooler.supabase.com:6543` com erro "Tenant or user not found". Solução: usar conexão direta (`db.[ref].supabase.co:5432`) em dev. Em produção via Coolify, pegar a URL exata do pooler do Supabase dashboard.

### Cliente Drizzle lazy
O cliente DB foi implementado com Proxy para ser lazy — só conecta quando a primeira query é feita. Isso permite que o build do Next 16 (que faz "Collect page data") funcione mesmo sem DATABASE_URL disponível no momento da importação.

### `drizzle-zod` 0.7.1 (não 0.8.x)
A versão 0.8+ emite schemas Zod 4, mas o projeto inteiro usa Zod 3. Downgrade para 0.7.1 mantém compatibilidade.

## Arquivos criados

- `.env.local` (root + apps/web)
- `packages/api/src/middleware/rate-limit.ts`
- `packages/database/drizzle/migrations/0000_new_ultimates.sql`
- `packages/database/drizzle/schema.test.ts`
- `vitest.config.ts`
- `.github/workflows/validate-prs.yml` (expandido)
- `CHANGELOG-phase-01.md`

## Arquivos modificados

- `config/index.ts` — appName + mail from
- `apps/web/modules/marketing/home/components/Hero.tsx`
- `apps/web/modules/marketing/shared/components/Footer.tsx`
- `apps/web/modules/saas/shared/components/Footer.tsx`
- `apps/web/modules/saas/shared/components/UserMenu.tsx`
- `packages/i18n/translations/en.json` + `de.json`
- `packages/api/src/app.ts` (rate limit aplicado)
- `packages/api/src/routes/health.ts` (DB check)
- `packages/database/drizzle/client.ts` (lazy via Proxy)
- `packages/database/drizzle/index.ts` (re-export helpers)
- `packages/database/drizzle/schema/index.ts` (fix: postgres em vez de sqlite)
- `packages/database/drizzle/drizzle.config.ts` (DIRECT_URL + verbose)
- `packages/database/package.json` (scripts Drizzle, sem Prisma)
- `packages/auth/auth.ts` (drizzleAdapter)
- `package.json` (rename para "vertech-agents", scripts test)
- `.gitignore` (LMAS runtime artifacts)

## Arquivos removidos

- `packages/database/prisma/` (diretório inteiro)
- `apps/web/middleware.ts` (renomeado para `proxy.ts` pelo codemod Next 16)

## Como testar

```bash
# 1. Install
pnpm install

# 2. Configurar .env.local (copiar de .env.local.example)

# 3. Sync DB schema
pnpm -F @repo/database push

# 4. Build + test + typecheck
pnpm build
pnpm test
pnpm typecheck

# 5. Dev server
pnpm dev

# 6. Testar endpoints
curl http://localhost:3000/api/health
# Esperado: {"status":"healthy", "checks":{"database":{"status":"ok"...}}}

# 7. Signup manual
# Abrir http://localhost:3000/auth/signup
# Criar conta, validar login, confirmar dashboard
```

## Pendências para Phase 2

- Estender `organization` com `organizationType` (enum) + `parentOrganizationId`
- Implementar CTE recursiva para `getAccessibleOrganizationIds`
- Helpers de autorização (`requireAccess`)
- Feature flags com herança hierárquica
- RLS em buckets de Storage refinada

## Gate Humano

Aguardar aprovação do Vinni antes de prosseguir para Phase 2.
