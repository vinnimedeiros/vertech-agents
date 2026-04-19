# Phase 07A — Notas do Schema (story 07A.3)

> **Executado por:** `@data-engineer` (Tank) em 2026-04-19
> **Story:** [07A.3](../stories/phase-07/07A.3.story.md)
> **Migration:** `packages/database/drizzle/migrations/0014_broken_wind_dancer.sql`
> **Status:** Aplicada em dev (Supabase `agents-v2`) — verificada via MCP

## O que foi criado

### Tabelas

| Tabela | Colunas | Finalidade |
|---|---|---|
| `agent` | 22 | Entidade de primeira classe por workspace — identidade, persona, modelo, tools, status |
| `agent_version` | 6 | Snapshot imutável de cada publicação — permite rollback e audit (consumido em Phase 07C) |

### Enums

- **`AgentStatus`** (novo): `DRAFT | ACTIVE | PAUSED | ARCHIVED`
- **`MessageStatus`** (aditivo): adicionado `QUEUED` e `PROCESSING` entre `PENDING` e `SENT` — ordem correta preservada via `ALTER TYPE ADD VALUE BEFORE`

### Foreign Keys

| Tabela | Coluna | Aponta pra | On Delete |
|---|---|---|---|
| `agent` | `organizationId` | `organization.id` | `CASCADE` |
| `agent_version` | `agentId` | `agent.id` | `CASCADE` |
| `agent_version` | `createdByUserId` | `user.id` | `SET NULL` |
| `conversation` | `assignedAgentId` | `agent.id` | `SET NULL` (antes era `text` solto — agora é FK real) |

### Índices

- `agent_org_status_idx` em (`organizationId`, `status`) — query "agentes ativos da org X"
- `agent_whatsapp_instance_idx` em `whatsappInstanceId` — lookup por instância WhatsApp
- `agent_version_unique` em (`agentId`, `version`) UNIQUE — previne versão duplicada
- `agent_version_agent_created_idx` em (`agentId`, `createdAt`) — timeline de versões

### Types TypeScript tipados (JSONB)

Exportados em `packages/database/drizzle/schema/agents.ts`:

- `AgentPersonality` — tom, formalidade, humor, empatia
- `AgentBusinessContext` — indústria, produtos, pricing, políticas, regras invioláveis
- `AgentConversationStyle` — saudação, qualificação, objeções, handoff triggers
- `AgentSnapshot` — cópia completa pra `agent_version.snapshot`

Consumidos em:
- `packages/ai/src/mastra/instructions/builder.ts` (Phase 07A.5) — renderiza o prompt
- UI das abas de configuração (Phase 07B, 07C)

## Migration safety aplicada

Pré-FK cleanup (linha 46 da migration):
```sql
UPDATE "conversation" SET "assignedAgentId" = NULL WHERE "assignedAgentId" IS NOT NULL;
```

Em dev é no-op (zero agentes criados ainda), mas torna a migration robusta contra dados fictícios em `assignedAgentId` — evita falha de constraint.

## Decisão adiada — RLS (Row-Level Security)

### Contexto descoberto

Auditei o projeto: **nenhuma migration existente aplica RLS**. Segurança multi-tenant é feita no **backend via `requireOrgAccess()`** + `getAccessibleOrganizationIds()` (Phase 02). A conexão Drizzle usa service role, que **bypassa RLS** de qualquer forma.

### Decisão

**NÃO aplicar RLS apenas em `agent` e `agent_version`.** Fazer isso criaria inconsistência:
- Tabelas antigas (contact, lead, conversation, etc.) sem RLS
- Tabelas novas com RLS "meia-boca" (que service role ignora)
- Complexidade extra sem ganho real de segurança

### Alternativa (o que protege HOJE)

Acesso a `agent`/`agent_version` via queries do backend SEMPRE passa por:

```typescript
// Padrão aplicado em toda query de packages/database/queries/*
import { requireOrgAccess } from "@repo/auth";

export async function getAgentsByOrg(ctx, orgId) {
  await requireOrgAccess(ctx, orgId);  // lança 403 se user não é membro
  return db.query.agent.findMany({ where: eq(agent.organizationId, orgId) });
}
```

### Recomendação pra governança futura

Criar **"Phase Security Audit"** (sub-phase dedicada ou item na Phase 13/Whitelabel) que:
1. Aplica RLS em TODAS as tabelas do schema público
2. Configura better-auth pra emitir JWT consumível pelo Postgres (via `auth.uid()` funcional)
3. Adiciona testes de `test-as-user` pra validar cada policy
4. Cria runbook de "vazamento cross-tenant" (incident response)

Isso é escopo de **segurança operacional**, não de Phase 07 (cérebro). `@architect` e/ou `@qa` conduzem.

## Verificação pós-migration

Via `mcp__plugin_supabase_supabase__execute_sql`:

- ✅ `agent` com 22 colunas
- ✅ `agent_version` com 6 colunas
- ✅ `MessageStatus` enum: 7 valores na ordem correta
- ✅ `AgentStatus` enum: 4 valores
- ✅ 4 FKs com delete rules corretas
- ✅ `pnpm typecheck` (packages/database)

## Próximo passo

Esta story **desbloqueia**:
- **07A.4** (@dev — packages/queue + packages/health) — não depende de schema, paralelo a 07A.3
- **07A.5** (@dev — Mastra core) — importa `agent` + `agentVersion` + types
- **07A.6** (@dev — runtime invoker) — lê/escreve nestas tabelas
- **07A.8** (@dev + @qa — seed + gate) — seed cria agent + agent_version inicial

## Referências

- Schema: `packages/database/drizzle/schema/agents.ts`
- Migration: `packages/database/drizzle/migrations/0014_broken_wind_dancer.sql`
- Design spec: `docs/superpowers/specs/2026-04-19-phase-07-mastra-design.md` §5
- Deps doc: `docs/phase-07/dependencies-confirmed.md`

---

*Tank — dados modelados, integridade preservada. O grid agora reconhece os agentes.*
