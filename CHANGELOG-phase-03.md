# Phase 03 — Core UI & Navigation

**Data:** 2026-04-16
**Status:** Concluída

## O que foi feito

### Rotas CRM (setor Comercial)
Criadas sob `/app/[organizationSlug]/crm/`:

- `chat` — Atendimento WhatsApp unificado (placeholder)
- `pipeline` — Kanban de vendas (placeholder)
- `agenda` — Eventos e reuniões (placeholder)
- `leads` — Lista de contatos em prospecção (placeholder)
- `clientes` — Leads convertidos (placeholder)
- `propostas` — Orçamentos e propostas (placeholder)
- `integracoes` — WhatsApp, Google Calendar etc (placeholder)

Cada rota tem `PageHeader` + `ComingSoon` com ícone e copy própria em pt-BR.

### Rotas Agents
Criadas sob `/app/[organizationSlug]/agents/`:

- `page.tsx` — Lista de agentes (placeholder + botão "Novo agente")
- `new/page.tsx` — Construtor via Arquiteto (placeholder)
- `[agentId]/page.tsx` — Detalhe do agente (placeholder)

### Componentes compartilhados
- `ComingSoon.tsx` — Card centralizado com ícone, título e descrição, usado em todas as páginas placeholder
- `CrmTopbar.tsx` — Barra dinâmica de abas do setor Comercial com active state por pathname
- `PageHeader.tsx` — Estendido para aceitar `children` (slot de actions)

### NavBar atualizada
- Items novos: **Início**, **Comercial**, **Agentes**, **Configurações**, **Minha conta**
- Copy inteira em pt-BR (sem `useTranslations`, hardcoded por enquanto)
- Ícones: HomeIcon, BriefcaseBusinessIcon, SparklesIcon, SettingsIcon, UserCog2Icon

### Internationalization: pt-BR only
- Removidos `en` e `de` como opções
- `config.i18n.locales` reduzido a `pt-br` (currency BRL)
- `defaultLocale` = "pt-br"
- Deletados: `de.json`, `overview.de.mdx`, `privacy-policy.de.md`, `terms.de.md`, `index.de.mdx`, `first-post.de.mdx`, `meta.de.json`
- Criado `pt-br.json` com 466 keys traduzidas (todas com acentuação correta)
- `en.json` mantido como fallback interno (deepmerge via messages.ts)

## Estrutura final `/app/[organizationSlug]/`

```
[organizationSlug]/
├── layout.tsx              # Existente (valida org, prefetch)
├── page.tsx                # Existente (home da org)
├── chatbot/                # Existente (boilerplate)
├── settings/               # Existente (billing, danger, general, members)
├── crm/                    # NOVO
│   ├── layout.tsx
│   ├── chat/page.tsx
│   ├── pipeline/page.tsx
│   ├── agenda/page.tsx
│   ├── leads/page.tsx
│   ├── clientes/page.tsx
│   ├── propostas/page.tsx
│   └── integracoes/page.tsx
└── agents/                 # NOVO
    ├── layout.tsx
    ├── page.tsx
    ├── new/page.tsx
    └── [agentId]/page.tsx
```

## Decisões técnicas

### Rotas `/app/[organizationSlug]/crm/...` em vez de `/o/[orgSlug]/...`
O PRD pedia `/o/[orgSlug]/` mas o middleware do boilerplate (`proxy.ts`) espera `/app/`. Review arquitetural recomendou manter. Decisão confirmada.

### NavBar sem translations (ainda)
Os items do menu agora usam strings hardcoded em pt-BR. Quando formos iterar UI/UX, migramos pra chaves em `pt-br.json` (já existem em `app.menu.*`).

### ComingSoon estilizado
Card com ícone circular, título e subtítulo. Mantém consistência com o design system do boilerplate (Card, Tailwind tokens).

## Arquivos criados

- `apps/web/modules/saas/shared/components/ComingSoon.tsx`
- `apps/web/modules/saas/crm/components/CrmTopbar.tsx`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/crm/layout.tsx`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/crm/{chat,pipeline,agenda,leads,clientes,propostas,integracoes}/page.tsx`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/agents/layout.tsx`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/agents/page.tsx`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/agents/new/page.tsx`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/agents/[agentId]/page.tsx`
- `packages/i18n/translations/pt-br.json` (466 keys)

## Arquivos modificados

- `config/index.ts` — pt-br only + BRL
- `apps/web/modules/saas/shared/components/NavBar.tsx` — novos items + ícones
- `apps/web/modules/saas/shared/components/PageHeader.tsx` — slot children

## Arquivos removidos

- `packages/i18n/translations/de.json`
- `apps/web/content/**/*.de.{mdx,md,json}` (6 arquivos)

## Como testar

```bash
# Build passa
pnpm build

# Tests passam
pnpm test  # 16 passing

# Dev
pnpm dev
# Abrir http://localhost:3000/app/[orgSlug]/crm/pipeline
# Abrir http://localhost:3000/app/[orgSlug]/agents
```

## Pendências para Phase 4

- Implementar Kanban real (Pipeline com dnd-kit)
- Schema Drizzle de Contact, Lead, PipelineStage, LeadActivity
- CRUD de contatos e leads
- Drawer de detalhe do lead

## Gate Humano

- UI base tá feia propositalmente — foco foi estrutura e navegação, não polimento visual
- Você mencionou que é picky com UI e vai iterar depois
- Aguardando aprovação para Phase 4 (CRM Foundation)
