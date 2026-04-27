# AI Studio V3 — Arquitetura Técnica

**Status:** Aprovado pelas 4 decisões fundadoras 2026-04-26
**Decisor:** Vinni (CEO)
**Escopo:** Phase 11 (refactor completo da UI de agentes — descarta Phase 07A/07B/07C/09 visual; preserva backend `/api/agents`, schema `agent`, Mastra wiring)

## Contexto

UI atual de agentes (Phase 07A/B/C + 09 wizard cancelado) é insuficiente pra Visão V3 (TIME comercial 4 agentes vendido por agência). Necessário refactor completo seguindo padrão **WorkForce One** (canvas TIME) + **Kinetic AI** (agent detail) + Mastra Studio nativo (inspector).

## Decisões fundadoras

1. **TIME existe como entidade no banco** (não convenção visual)
2. **Só TIME Comercial em V3** — preset Vertech, agência customiza dentro. Multi-TIME = V4+
3. **Inspetor (Mastra Studio) em aba externa** — V4+ embeda
4. **UI refeita ANTES de M2-03 Analista**

## Schema novo

### Tabela `team` (entidade TIME)

```typescript
export const teamKindEnum = pgEnum("TeamKind", [
  "COMMERCIAL", // V3: único valor permitido
  // V4+: SUPPORT, RH, COLLECTIONS, CUSTOM
]);

export const teamStatusEnum = pgEnum("TeamStatus", [
  "DRAFT",
  "ACTIVE",
  "SANDBOX",
  "PAUSED",
  "ARCHIVED",
]);

export const team = pgTable(
  "team",
  {
    id: varchar("id", { length: 255 })
      .$defaultFn(() => cuid())
      .primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),

    // Identidade
    name: text("name").notNull(),
    description: text("description"),
    kind: teamKindEnum("kind").notNull().default("COMMERCIAL"),

    // Brand DNA — voz unificada do TIME (todos agentes herdam)
    brandVoice: json("brandVoice").$type<BrandVoice>().notNull().default({}),

    // Status operacional do TIME inteiro
    status: teamStatusEnum("status").notNull().default("DRAFT"),

    // Vínculo com instância WhatsApp (compartilhado pelo TIME)
    whatsappInstanceId: text("whatsappInstanceId"),

    // Métricas snapshot (atualizado por job — leitura rápida na home)
    metrics: json("metrics").$type<TeamMetrics>(),

    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    publishedAt: timestamp("publishedAt"),
  },
  (table) => [
    index("team_org_status_idx").on(table.organizationId, table.status),
  ],
);

export type BrandVoice = {
  name?: string; // "Camila", "Pedro" — nome visível ao lead
  tone?: "formal" | "semiformal" | "informal";
  formality?: "voce_sem_girias" | "tu" | "vc_girias";
  humor?: "seco" | "leve" | "descontraido" | "sem_humor";
  empathyLevel?: "alta" | "media" | "baixa";
  inviolableRules?: string[]; // regras globais do TIME
};

export type TeamMetrics = {
  leadsAttendedToday?: number;
  qualificationRateLast7d?: number; // 0-1
  humanHandoffsLast7d?: number;
  campaignsActive?: number;
  lastSyncAt?: string; // ISO
};
```

### Tabela `team_member` (n:m team↔agent)

```typescript
export const teamMemberRoleEnum = pgEnum("TeamMemberRole", [
  "SUPERVISOR",  // Atendente
  "ANALYST",     // Analista de inteligência
  "CAMPAIGNS",   // Agente de campanhas
  "ASSISTANT",   // Assistente comercial (ponte humano)
]);

export const teamMember = pgTable(
  "team_member",
  {
    id: varchar("id", { length: 255 })
      .$defaultFn(() => cuid())
      .primaryKey(),
    teamId: text("teamId")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    agentId: text("agentId")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),

    role: teamMemberRoleEnum("role").notNull(),

    // Texto curto que o Supervisor vê pra decidir delegação
    // Vira fragmento do system prompt do Supervisor
    delegateInstruction: text("delegateInstruction").notNull().default(""),

    // Bio breve (visível no card do canvas)
    bio: text("bio").notNull().default(""),

    // Posição visual no canvas (futuro: drag-and-drop)
    position: integer("position").notNull().default(0),

    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("team_member_unique").on(table.teamId, table.agentId),
    uniqueIndex("team_supervisor_unique")
      .on(table.teamId)
      .where(sql`role = 'SUPERVISOR'`), // só 1 supervisor por team
    index("team_member_team_idx").on(table.teamId),
  ],
);
```

### Mudanças em `agent`

Sem breaking changes. Adicionar:

```typescript
// Em packages/database/drizzle/schema/agents.ts
{
  // Vínculo lógico (nullable durante migration; obrigatório após backfill)
  teamId: text("teamId").references(() => team.id, { onDelete: "cascade" }),
}

// Index novo
index("agent_team_idx").on(table.teamId)
```

### Migration strategy

1. **Migration up:**
   - Cria `team` + `team_member` + enums
   - Adiciona `agent.teamId` nullable
   - **Backfill:** pra cada `organization`, cria `team` default "TIME Comercial Vertech" status=DRAFT, vincula todos `agent` existentes como SUPERVISOR (single-agent legado vira supervisor solo)
   - **Pós-backfill:** `agent.teamId` vira NOT NULL

2. **Migration down:**
   - `agent.teamId` volta a ser nullable
   - Drop `team_member`, `team`, enums

## Arquitetura backend

### Mastra wiring atualizado

Hoje `getCommercialAgent()` lê via `requestContext.agentId`. Pra V3 multi-tenant TIME:

```typescript
// packages/ai/src/mastra/agents/team-loader.ts (NOVO)
export async function loadTeamFromContext(
  requestContext: RequestContextLike
): Promise<TeamWithMembers> {
  const teamId = requestContext.get("teamId") as string;
  if (!teamId) throw new Error("requestContext.teamId obrigatório");

  return await db.query.team.findFirst({
    where: eq(team.id, teamId),
    with: {
      members: {
        with: { agent: true },
      },
    },
  });
}

// Supervisor agent agora carrega sub-agents do team_member
export function getCommercialAgent(): Agent {
  return new Agent({
    // ...
    agents: async ({ requestContext }) => {
      const team = await loadTeamFromContext(requestContext);
      const subAgents = team.members
        .filter((m) => m.role !== "SUPERVISOR")
        .reduce((acc, m) => {
          acc[m.role.toLowerCase()] = buildAgentFromRecord(m.agent, m.delegateInstruction);
          return acc;
        }, {} as Record<string, Agent>);
      return subAgents;
    },
  });
}
```

`requestContext` populado por route handler/worker com `teamId` ao lado de `agentId`. Worker BullMQ resolve `teamId` via `conversation.organizationId → team.organizationId`.

### Endpoints novos

| Endpoint | Método | Função |
|---|---|---|
| `/api/teams` | GET | Lista TIMES da org (Casa) |
| `/api/teams` | POST | Cria TIME (só Master Agency) |
| `/api/teams/:id` | GET | Detalhes do TIME (Construtor) |
| `/api/teams/:id` | PATCH | Atualiza nome/brandVoice/status |
| `/api/teams/:id/members` | GET | Lista membros |
| `/api/teams/:id/members` | POST | Adiciona agent ao TIME (role + delegate) |
| `/api/teams/:id/members/:memberId` | PATCH | Atualiza role/delegate/bio |
| `/api/teams/:id/members/:memberId` | DELETE | Remove agent do TIME |
| `/api/teams/:id/sandbox/start` | POST | Liga sandbox mode |
| `/api/teams/:id/activate` | POST | Ativa TIME (DRAFT → ACTIVE) |
| `/api/teams/:id/metrics` | GET | Métricas do TIME (cards home) |

Endpoints `/api/agents` existentes preservados (drill-in usa). Adiciona filtro `?teamId=` em GET.

### Inspetor — botão externo

```typescript
// apps/web/app/(saas)/(account)/ai-studio/teams/[teamId]/inspector/route.ts (NOVO)
export async function GET(req: Request, { params }) {
  const { teamId } = await params;
  // Mastra Studio roda em :4111 local, configurável via env
  const studioUrl = process.env.MASTRA_STUDIO_URL || "http://localhost:4111";

  // Anexar context queryparams pra Studio filtrar pelo team
  const target = `${studioUrl}/?team=${teamId}`;
  return NextResponse.redirect(target);
}
```

UI: botão "Abrir Inspetor" → `<a href="/ai-studio/teams/{id}/inspector" target="_blank">`.

V4+ embarca via iframe quando auth share for resolvido.

## Estrutura de rotas (Next.js App Router)

```
apps/web/app/(saas)/(account)/ai-studio/
  ├── layout.tsx                     # AI Studio shell (sidebar + header)
  ├── page.tsx                       # Casa dos TIMES (área 1)
  │
  └── teams/
      ├── new/page.tsx               # Criar TIME (só Master Agency)
      │
      └── [teamId]/
          ├── page.tsx               # Construtor do TIME (área 2)
          ├── inspector/route.ts     # Redirect Mastra Studio (área 4)
          │
          └── agents/
              └── [agentId]/
                  ├── page.tsx       # Editor do Agente (área 3, persona)
                  ├── tools/page.tsx
                  ├── memory/page.tsx
                  ├── modes/page.tsx
                  └── deploy/page.tsx
```

Rotas legadas `/agents/*` redirecionam pra `/ai-studio/teams/{teamId}/agents/{agentId}`.

## Sidebar rename

Item "Agentes" no sidebar Vertech vira "**AI Studio**". Path `/ai-studio`. Ícone Bot mantido ou trocado por `Bot` + `Sparkles`.

## Componentes principais

### Área 1 (Casa)
- `TeamGrid` — grid responsivo de TeamCard
- `TeamCard` — avatar do TIME (gerado), nome, status badge, métricas live, drill-in
- `EmptyState` — primeiro acesso (CTA criar TIME se Master Agency)
- `TeamFilters` — status grouping (Active / Sandbox / Paused / Draft)

### Área 2 (Construtor TIME)
- `TeamCanvas` — React Flow custom (Supervisor topo + sub-agents fan-out)
- `SupervisorNode` — card grande do Atendente
- `MemberNode` — card de sub-agent (role-colored)
- `AddMemberSlot` — placeholder tracejado pra adicionar
- `TeamSidebar` — etapas (Persona / Tools / Deploy), 3 ativas em V3
- `TeamTopBar` — breadcrumb + Active toggle + Sandbox toggle + Save
- `BrandVoicePanel` — formulário do brand DNA (slide-in inline)

### Área 3 (Editor Agente)
- `AgentEditor` — layout 3 colunas (nav, canvas central, properties)
- `AgentNav` — etapas verticais
- `PersonaCanvas` — card visual da persona (avatar, mood, métricas)
- `PropertiesPanel` — accordions (Model / Memory / Modes / Tools / Voice)
- `CollabChat` — chat lateral pra editar agente conversando (bottom-left)
- `ExecutionLogs` — logs ao vivo do sandbox (bottom-right)

### Compartilhados
- `StatusBadge` — Active/Sandbox/Paused/Draft com cores
- `MetricChip` — métrica inline
- `RoleAvatar` — avatar gerado por role + nome

## Anti-patterns reforçados

- ❌ React Flow workflow editor genérico (não fluxograma de etapas)
- ❌ Sheets/drawers laterais (regra global Vinni)
- ❌ Tabs horizontais (substituídas por sidebar lateral)
- ❌ Forms monolíticos
- ❌ Modais de criação de tools (tools são curadas pelo dev)

## Plano de implementação

### Phase 11.0 — Foundation
- Migration `team` + `team_member` + enum + backfill
- Sidebar rename "Agentes" → "AI Studio"
- Layout `/ai-studio` (shell vazio)
- Rotas legadas redirecionam

### Phase 11.1 — Casa dos TIMES (área 1)
- `/api/teams` GET/POST
- Página `/ai-studio` com TeamGrid
- Cards com métricas mock (job de agregação vem depois)
- CTA criar TIME (só Master Agency)

### Phase 11.2 — Construtor do TIME (área 2)
- `/api/teams/:id/members` CRUD
- Página `/ai-studio/teams/[teamId]` com canvas React Flow
- Top bar Active/Sandbox toggle
- Sidebar 3 etapas (Persona / Tools / Deploy)
- Phase 11.2.1 — Persona panel (Brand Voice form)
- Phase 11.2.2 — Tools panel (registry curado por agent)
- Phase 11.2.3 — Deploy panel (validações pré-ativação)

### Phase 11.3 — Editor do Agente (área 3)
- Página `/ai-studio/teams/[teamId]/agents/[agentId]`
- Layout 3 colunas
- Properties accordions
- Collab chat (M2-02 sandbox reuso)
- Execution logs (Server-Sent Events do invoker)

### Phase 11.4 — Inspetor link (área 4)
- Route handler redirect Mastra Studio
- Botão na top bar do Construtor

### Phase 11.5 — Polimento
- Empty states
- Loading skeletons
- Toast feedbacks
- Acessibilidade básica

## Riscos e mitigations

| Risco | Mitigation |
|---|---|
| Backfill de agents legados quebra | Migration faz dry-run primeiro, log diff antes commit |
| Mastra wiring `agents:` async não escala | Cache em memória por teamId com TTL 60s, invalidate em PATCH |
| React Flow custo de DX vs ROI | Validar com PoC simples primeiro (Phase 11.2 antes de detalhar) |
| Mastra Studio not running em prod | Inspetor mostra fallback "Studio offline" se redirect 502 |
| Multi-tenant Brand Voice conflitar com agent personality | Hierarquia: TIME > agent (agent override só campos específicos) |

## Métricas de sucesso

- Sidebar item "AI Studio" leva à Casa em <300ms
- TeamCard rendariza com métricas em <500ms (cache snapshot)
- Construtor canvas carrega 4 agents fan-out em <1s
- Editor abre properties + canvas + chat em <800ms
- Zero regressão em invoker/sandbox existente
