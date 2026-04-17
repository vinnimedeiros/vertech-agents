# Phase 02 — Multi-Tenancy Hierárquica

**Data:** 2026-04-16
**Status:** Concluída

## O que foi feito

### Extensão do schema organization
- Enum `OrganizationType`: `SUPERADMIN | MASTER | AGENCY | CLIENT`
- Coluna `parentOrganizationId` (self-FK com `ON DELETE RESTRICT`)
- Colunas JSONB: `branding`, `features`, `billing` (default `{}`)
- Índices: `organization_parent_idx`, `organization_type_idx`
- Relations Drizzle self-referencial (`parent` + `children`)

### Migration
- Gerada via `drizzle-kit generate` → `0001_wide_titanium_man.sql`
- FK self-referential adicionada manualmente (drizzle-kit não gera pra self-refs)
- Marcação da migration `0000` como aplicada (tabela `drizzle.__drizzle_migrations`) pra reconciliar com o push anterior
- Aplicação via `drizzle-kit migrate` (sem mais `db push` a partir daqui)

### Helpers de autorização (`packages/auth/lib/`)

**`access.ts`:**
- `getOrgAccess(userId, orgId)` — membership direto
- `getAccessibleOrganizationIds(userId)` — CTE recursiva com depth limit (`MAX_HIERARCHY_DEPTH = 4`)
- `canAccessOrganization(userId, orgId)` — direto + ancestrais
- `requireOrgAccess(userId, orgId)` — throw se não autorizado

**`organizations-hierarchy.ts`:**
- `isValidChildType(parent, child)` — switch case das 4 invariantes
- `createChildOrganization({ creatorUserId, parentOrgId, childType, name, slug })` — com validação + member owner

### Feature flags (`packages/utils/lib/features.ts`)
- `hasFeature(orgId, feature)` — herança recursiva do parent
- `setFeature(orgId, feature, enabled)` — set explícito
- `unsetFeature(orgId, feature)` — remove do map pra voltar a herdar

Features declaradas: `whatsapp`, `ai_agents`, `multi_agents`, `pipeline_advanced`, `calendar_sync`, `custom_domain`, `knowledge_base`, `whitelabel`.

### Scripts (`tooling/scripts/src/`)
- `bootstrap-superadmin.ts` — promove user a Superadmin (idempotente)
- `seed-hierarchy.ts` — cria Master + Agency + Client de demo

### Testes
- 13 testes de `isValidChildType` cobrindo todas as 16 combinações possíveis de parent×child
- Total do projeto: **16 testes passando**

## Decisões técnicas

### CTE com depth limit
A CTE recursiva `getAccessibleOrganizationIds` usa `WHERE d.depth < 4` como safeguard contra ciclos (recomendação do @data-engineer). A hierarquia tem profundidade máxima conhecida de 3 níveis (SUPERADMIN → MASTER → AGENCY → CLIENT).

### `server-only` evitado
Tentei adicionar `import "server-only"` nos helpers, mas isso quebra scripts Node puros (bootstrap/seed) que rodam em CLI. Solução: removido do helpers, adicionado `@repo/utils` ao `transpilePackages` do Next.js pra bundling correto.

### Exports explícitos em `@repo/utils`
Features.ts NÃO é re-exportado por `@repo/utils/index.ts` porque isso arrastaria o `pg` driver pro client bundle. Import explícito: `import { hasFeature } from "@repo/utils/lib/features"`.

### Scripts em `tooling/scripts` em vez de `packages/database`
`@repo/scripts` já tinha `@repo/auth` + `@repo/database` como deps. Evita dependência circular que existiria se fizéssemos `@repo/database` importar de `@repo/auth`.

### Organization extension vs tabela separada
Os especialistas divergiram no review (architect sugeriu `TenantProfile` separado; data-engineer aceitou extensão direta). Seguimos a extensão direta — mais simples, e better-auth usa Prisma select explícito (ignora colunas extras).

## Hierarquia de teste criada

```
Vertech Agents (Platform)    SUPERADMIN
  Demo Master Partner        MASTER
    Demo Agency              AGENCY
      Demo Client Inc        CLIENT
```

User owner: `vinni@vertech-agents.com`

## Arquivos criados

- `packages/auth/lib/access.ts`
- `packages/auth/lib/organizations-hierarchy.ts`
- `packages/auth/lib/organizations-hierarchy.test.ts`
- `packages/utils/lib/features.ts`
- `tooling/scripts/src/bootstrap-superadmin.ts`
- `tooling/scripts/src/seed-hierarchy.ts`
- `packages/database/drizzle/migrations/0001_wide_titanium_man.sql`

## Arquivos modificados

- `packages/database/drizzle/schema/postgres.ts` (extensão organization + enum + relations)
- `packages/auth/index.ts` (re-export dos helpers)
- `packages/utils/index.ts` (NÃO re-exporta features)
- `packages/utils/package.json` (adicionou `@repo/database`)
- `tooling/scripts/package.json` (scripts bootstrap/seed)
- `apps/web/next.config.ts` (+`@repo/utils` em transpilePackages)

## Como testar

```bash
# Pré-requisito: user existente
# (criado no smoke test da Phase 1: vinni@vertech-agents.com)

# Bootstrap
SUPERADMIN_EMAIL=vinni@vertech-agents.com pnpm -F @repo/scripts bootstrap:superadmin

# Seed
pnpm -F @repo/scripts seed:hierarchy

# Validar via SQL
SELECT id, name, "organizationType", "parentOrganizationId"
FROM "organization" ORDER BY "organizationType";

# Rodar testes
pnpm test
```

## Pendências para Phase 3

- Implementar Organization Switcher visual
- Shell da aplicação (sidebar + topbar)
- Rotas scoped `/app/[orgSlug]/...`
- `OrganizationProvider` com context React

## Gate Humano

Aguardando aprovação do Vinni antes de prosseguir para Phase 3 (Core UI & Navigation).
