---
type: guide
title: "Phase 07B — UI Spec: Detalhe do Agente (6 abas)"
project: vertech-agents
tags:
  - project/vertech-agents
  - phase/07b
  - design/ui-spec
  - owner/ux-design-expert
---

# Phase 07B — UI Spec: Detalhe do Agente

> **Autor:** `@ux-design-expert` (Sati)
> **Data:** 2026-04-19
> **Status:** Aprovado por Vinni (layout sidenav confirmado)
> **Consumido por:** stories 07B.1 a 07B.8 (River @sm → Neo @dev)

## 1. Contexto

Esta spec define o **shell visual e pattern de interação** do detalhe do agente, referência direta pras 6 abas implementadas nas stories 07B.3 a 07B.8. A decisão arquitetural crítica: **menu lateral vertical** com rotas próprias por aba, herdando pattern já estabelecido em `/settings/*` da organização.

### Por que sidenav (e não tabs horizontais)

1. **Consistência visual** — `/app/[orgSlug]/settings/*` já usa esse pattern (`SettingsMenu.tsx`). Reutilizar mantém o produto coeso.
2. **URL bookmarkable** — cada aba tem rota própria; link compartilhável direto.
3. **Performance e simplicidade** — cada rota carrega só seu próprio data + form state, sem estado global cross-aba.
4. **Mobile** — o pattern existente vira tabs horizontais roladas em telas pequenas (já suportado via `lg:` breakpoint no `SettingsMenu`).

## 2. Rotas

| Rota | Story | Conteúdo |
|---|---|---|
| `/app/[orgSlug]/agents` | 07B.1 | Lista de agentes da org (grid de cards) + botão Novo agente |
| `/app/[orgSlug]/agents/new` | 07B.1 | Form MVP de criação (nome + role + modelo) → cria DRAFT → redireciona pro detalhe |
| `/app/[orgSlug]/agents/[agentId]` | 07B.2 + 07B.3 | Shell + aba **Identidade** (default) |
| `/app/[orgSlug]/agents/[agentId]/persona` | 07B.4 | Aba **Persona** |
| `/app/[orgSlug]/agents/[agentId]/business` | 07B.5 | Aba **Negócio** |
| `/app/[orgSlug]/agents/[agentId]/conversation` | 07B.6 | Aba **Conversas** |
| `/app/[orgSlug]/agents/[agentId]/model` | 07B.7 | Aba **Modelo** |
| `/app/[orgSlug]/agents/[agentId]/whatsapp` | 07B.8 | Aba **WhatsApp** |

**Nota:** rotas placeholders já existem em `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/agents/{page,new/page,[agentId]/page}.tsx`. As 5 rotas das outras abas são novas.

**Desvio em relação ao spec Phase 07 original:** o design doc sugeria `/settings/{aba}` como subpath. Escolhi subpath curto (`/persona`, `/business` etc) porque:
- Mais conciso
- URL lida como substantivo ("estou na persona do agente X")
- A palavra "settings" dentro do detalhe do agente é redundante (já está em "detalhe do agente")

## 3. Shell layout (story 07B.2)

### 3.1 Estrutura visual

```
┌──────────────────────────────────────────────────────────────┐
│  PageHeader                                                  │
│  ┌──────────┐ Atendente Comercial Vertech       [Ativo ▼]   │
│  │  avatar  │ Atendimento comercial • GPT-4.1-mini           │
│  │  96px    │                        [Duplicar] [Arquivar]   │
│  └──────────┘                                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Menu lateral      │     Conteúdo da aba ativa               │
│  ───────────       │     ─────────────────────               │
│  Identidade  ←     │                                         │
│  Persona           │     [form fields da aba]                │
│  Negócio           │                                         │
│  Conversas         │                                         │
│  Modelo            │                                         │
│  WhatsApp          │                                         │
│                    │                                         │
│                    │  ┌──── dirty state banner ────────────┐ │
│                    │  │ ● 2 mudanças não salvas            │ │
│                    │  │           [ Descartar ] [ Salvar ] │ │
│                    │  └────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Grid responsivo

- **Desktop (`lg:`, ≥1024px):** grid de duas colunas `grid-cols-[240px_1fr]`. Menu lateral de 240px fixo, conteúdo flexível.
- **Tablet/mobile (<1024px):** flex-col. Menu vira lista horizontal rolável (`overflow-x-auto`) com borda inferior no item ativo (pattern `SettingsMenu` existente).

### 3.3 Arquivos a criar (shell)

| Arquivo | Propósito |
|---|---|
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/agents/[agentId]/layout.tsx` | Layout compartilhado: busca agent por ID, render header + menu + `{children}` |
| `apps/web/modules/saas/agents/components/AgentDetailHeader.tsx` | Header: avatar + nome editável inline + status badge + ações |
| `apps/web/modules/saas/agents/components/AgentSettingsMenu.tsx` | Menu lateral (adapta `SettingsMenu.tsx` — pode ser cópia ajustada ou reuso) |
| `apps/web/modules/saas/agents/components/DirtyStateBanner.tsx` | Banner + botões Salvar/Descartar. Client component |
| `apps/web/modules/saas/agents/lib/use-agent-form.ts` | Hook comum pras 6 abas (react-hook-form + zod + dirty tracking + submit) |
| `apps/web/modules/saas/agents/lib/server.ts` | `getAgentById(id)` cacheado, visibilidade respeitando org |
| `apps/web/modules/saas/agents/lib/actions.ts` | Server actions: `updateAgentIdentity`, `updateAgentPersona`, ..., `toggleAgentStatus`, `archiveAgent`, `duplicateAgent` |

### 3.4 Header — anatomia

**Elementos (da esquerda pra direita):**

| Elemento | Interação |
|---|---|
| Avatar (96px, rounded-full) | Read-only no header. Upload é na aba Identidade |
| Nome do agente (H2, ~28px, bold) | Click vira `Input` inline — Enter salva, Esc descarta, blur salva |
| Linha secundária: `{role} • {modelo_label}` (text-muted, text-sm) | Read-only. "modelo_label" é texto curto tipo "GPT-4.1 mini" ou "Claude Haiku 4.5" |
| Badge de status | `DRAFT` (cinza) / `ACTIVE` (verde) / `PAUSED` (amarelo) / `ARCHIVED` (vermelho suave). Click abre dropdown com ações |
| Dropdown de status | Itens: "Ativar" / "Pausar" / "Arquivar" (com confirmação via AlertDialog) |
| Ações secundárias (à direita, ícones) | "Duplicar" (ícone `Copy` → cria cópia em DRAFT → redireciona); "Voltar pra lista" (ícone `ArrowLeft`) |

**Regras de comportamento:**
- Não ativar agente se `name`, `role`, `model` estão vazios → toast de erro explicativo
- Arquivar pede confirmação: "Tem certeza? O agente some da lista (ainda recuperável via SQL)"
- Inline edit do nome usa servaction `updateAgentIdentity` (mesma da aba Identidade — paridade 1:1)

### 3.5 Menu lateral — anatomia

6 itens verticais, ordem fixa:

| # | Label | Ícone (lucide) | Path suffix |
|---|---|---|---|
| 1 | Identidade | `UserIcon` | `/` (raiz do detalhe) |
| 2 | Persona | `SparklesIcon` | `/persona` |
| 3 | Negócio | `BriefcaseIcon` | `/business` |
| 4 | Conversas | `MessageSquareIcon` | `/conversation` |
| 5 | Modelo | `CpuIcon` | `/model` |
| 6 | WhatsApp | `PhoneIcon` | `/whatsapp` |

**Item ativo:**
- Borda esquerda 2px primary (`border-l-2 border-primary`)
- Texto `font-bold text-foreground`
- Resto: `border-l-2 border-transparent text-foreground/70`

**Click:** `Link` do Next (`next/link`) — navegação normal, sem client state.

## 4. Dirty state banner (padrão das 6 abas)

### 4.1 Quando aparece

O banner aparece **no rodapé do conteúdo da aba** (sticky no bottom da área de scroll) quando `form.formState.isDirty === true`.

### 4.2 Anatomia

```
┌────────────────────────────────────────────────────────────┐
│ ● 2 mudanças não salvas               [Descartar] [Salvar] │
└────────────────────────────────────────────────────────────┘
```

- **Bullet** animado (pulsação suave usando `animate-pulse` do Tailwind, cor `primary`)
- **Texto:** "N mudança não salva" (singular) ou "N mudanças não salvas" (plural). N = `Object.keys(form.formState.dirtyFields).length`
- **Descartar:** `Button variant="ghost"` → reset do form pra valores iniciais
- **Salvar:** `Button variant="primary"` → submit. Estado disabled se `!isDirty || isSubmitting`. Spinner + texto "Salvando..." quando submitting

**Comportamento:**
- Fundo: `bg-card` com `border-t-2 border-primary/20`
- Sticky: `sticky bottom-0 z-10`
- Padding: `px-6 py-3`
- Hidden em mobile se o form é curto? **Não** — sempre visível. Em mobile escala pra fullwidth.

### 4.3 Auto-save: DESLIGADO

Conforme design spec Phase 07 original: auto-save evita publicação acidental de config mal terminada. Fica explícito. Salvar é **intencional**.

### 4.4 Navegação bloqueada quando dirty

**Bonus UX (opcional mas recomendado na 07B.2):** se `isDirty && user tenta sair da rota`, mostra `AlertDialog`:

```
Você tem mudanças não salvas.

Sair vai perder essas mudanças.

[Cancelar]    [Sair mesmo assim]
```

Implementação: `useBeforeUnload` custom hook + intercept do `Link` click (ou `router.events`, dependendo da versão do Next).

## 5. Pattern comum das 6 abas

### 5.1 Layout interno da aba

```tsx
// Pseudocódigo comum a todas as abas
<div className="flex flex-col gap-6 px-6 py-6 lg:px-8">
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Seção 1: Identificação clara do que essa aba faz */}
      <div className="mb-6">
        <h3 className="font-semibold text-lg">{tabTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{tabDescription}</p>
      </div>

      {/* Campos (ver por aba na seção 7) */}
      <div className="grid gap-6 max-w-2xl">
        {/* Fields */}
      </div>
    </form>
  </Form>

  {/* Banner sticky no bottom */}
  <DirtyStateBanner form={form} />
</div>
```

### 5.2 Container de largura

- **Formulários têm `max-w-2xl`** (672px) pra manter legibilidade. Sidenav já corta 240px, então o conteúdo respira.
- **Exceções:** aba Persona (sliders) e Modelo (sliders) podem usar `max-w-xl` pra concentrar controles finos.

### 5.3 Spacing entre campos

- Gap vertical entre campos: `gap-6` (24px)
- Gap dentro de um FormItem (label + input + description): `gap-1.5`
- Gap entre seções agrupadas (ex: "Identidade básica" e "Avatar"): `gap-10` com `<Separator />` opcional

### 5.4 Estado "salvando"

Quando submit em andamento:
- Todos os inputs: `disabled={isSubmitting}`
- Botão Salvar: spinner + texto "Salvando..."
- Após sucesso: toast `"{aba} atualizada"`, form resetado pros novos valores (`reset(newData, { keepDirty: false })`)
- Após erro: toast destructive com mensagem, form mantém dirty pro user tentar de novo

### 5.5 Estado "empty" / "first load"

Não existe estado empty — o agente já foi criado com defaults no form MVP da 07B.1. Todas as abas recebem `agent` completo via prop/query.

## 6. Tela de lista (story 07B.1)

### 6.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│ PageHeader                                                   │
│ Agentes — Agentes de IA que atendem seus leads no WhatsApp   │
│                                           [ + Novo agente ]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│ │ [avatar 48px]  │  │ [avatar 48px]  │  │ [avatar 48px]  │   │
│ │ Atendente      │  │ SDR Matinal    │  │ Qualificador   │   │
│ │ Comercial      │  │ SDR            │  │ Nocturno       │   │
│ │ [ACTIVE]       │  │ [DRAFT]        │  │ [PAUSED]       │   │
│ │ GPT-4.1-mini   │  │ Claude Haiku   │  │ GPT-4.1-mini   │   │
│ │ 📱 Vertech     │  │ Sem WhatsApp   │  │ 📱 Vertech 2   │   │
│ │ v3             │  │ v1             │  │ v2             │   │
│ │            ⋯   │  │            ⋯   │  │            ⋯   │   │
│ └────────────────┘  └────────────────┘  └────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Card do agente

**Dimensões:** grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`. Card: `Card` do shadcn com `p-4`.

**Conteúdo do card (top → bottom):**

| Elemento | Tipo |
|---|---|
| Avatar 48px + Nome (bold, truncate) | Row top |
| Role (text-sm, muted, truncate) | Abaixo do nome |
| Status badge | Inline no meio |
| Modelo (text-xs, muted) | Abaixo do status |
| WhatsApp vinculado (ícone `PhoneIcon` + nome ou "Sem WhatsApp") | Linha |
| Versão (text-xs, muted, ex: "v3") | Canto inferior esquerdo |
| Dropdown `⋯` | Canto inferior direito |

**Click no card (não no dropdown):** navega pra `/agents/[agentId]` (aba Identidade).

**Dropdown `⋯` (`DropdownMenu` do shadcn):**
- Ver detalhe
- Duplicar
- Ativar / Pausar (conforme status atual)
- Arquivar (com confirmação)

### 6.3 Estado empty (primeira vez)

Mantém o `ComingSoon` atual **mas com texto atualizado**:

```
[SparklesIcon grande]
Seus agentes aparecerão aqui

Crie seu primeiro agente comercial com o formulário rápido.

[ + Criar agente ]  (botão primary centralizado)
```

Click no botão → `/agents/new` (mesma rota do botão do header).

### 6.4 Botão "Novo agente" — form MVP

Substitui o `ComingSoon` atual em `/agents/new`. O "Arquiteto" (Phase 09) é a versão final — pra 07B entregamos form simples:

**Campos:**
| Label | Tipo | Validação | Default |
|---|---|---|---|
| Nome | `Input` | obrigatório, 2-80 chars | vazio |
| Função | `Input` | opcional, max 80 chars, placeholder "Atendimento comercial" | vazio |
| Modelo | `Select` | obrigatório | `openai/gpt-4.1-mini` |

**Modelo dropdown (lista curada em 07B.1, reaproveitada em 07B.7):**
```
OpenAI
  • GPT-4.1 mini — openai/gpt-4.1-mini (recomendado)
  • GPT-4.1 — openai/gpt-4.1
  • GPT-4o mini — openai/gpt-4o-mini
Anthropic
  • Claude Haiku 4.5 — anthropic/claude-haiku-4-5
  • Claude Sonnet 4.6 — anthropic/claude-sonnet-4-6
```

**Submit:** cria agente em `status: DRAFT`, `organizationId: {org_atual}`, defaults pra tudo mais. Redireciona pra `/agents/[novoId]`.

**Layout:** Card centralizado `max-w-lg`, dois botões no rodapé (`Cancelar` → `/agents`, `Criar agente` → submit).

## 7. Spec detalhado por aba

> Para cada aba: (1) campos e tipos, (2) validação zod, (3) comportamento especial, (4) server action.

### 7.1 Aba Identidade (story 07B.3)

**Route:** `/agents/[agentId]` (raiz do detalhe, default).

**Campos:**

| Label | Field | Tipo UI | Validação |
|---|---|---|---|
| Nome | `name` | `Input` | obrigatório, 2-80 chars |
| Função | `role` | `Input` | opcional, max 80 chars |
| Avatar | `avatarUrl` | `AvatarUpload` custom | opcional, URL ou upload → bucket `avatars`, crop 1:1, max 2MB |
| Gênero | `gender` | `RadioGroup` (3 opções) | `FEMININE` / `MASCULINE` / `NEUTRAL` |
| Descrição | `description` | `Textarea` (4 rows) | opcional, max 500 chars |

**Bloco Avatar:** usar `AvatarUpload` pattern já existente em `apps/web/modules/saas/settings/components/UserAvatarUpload.tsx` (adapta pra agente, mesmo bucket).

**Gênero:** `RadioGroup` do shadcn — **precisa instalar** via CLI (`pnpm dlx shadcn-ui@latest add radio-group`) ou via MCP `shadcn`. Labels: "Feminino", "Masculino", "Neutro".

**Server action:** `updateAgentIdentity({ agentId, name, role, avatarUrl, gender, description })` → `revalidatePath('/app/[orgSlug]/agents/[agentId]', 'layout')`.

**Paridade 1:1:** `orchestratorTools.updateAgentIdentity` (Phase 10 — placeholder por enquanto).

### 7.2 Aba Persona (story 07B.4)

**Route:** `/agents/[agentId]/persona`.

**Campos:**

| Label | Field | Tipo UI | Validação |
|---|---|---|---|
| Tom | `personality.tone` | `Slider` 0-100 c/ labels | default 50 |
| Formalidade | `personality.formality` | `Slider` 0-100 c/ labels | default 50 |
| Humor | `personality.humor` | `Slider` 0-100 c/ labels | default 30 |
| Empatia | `personality.empathyLevel` | `Slider` 0-100 c/ labels | default 70 |
| Regras invioláveis | `personality.inviolableRules` | `TagList` custom (input + add/remove) | opcional, array de strings max 80 chars cada, até 20 items |

**Labels dos sliders (extremos):**

| Slider | 0 | 100 |
|---|---|---|
| Tom | Sério | Descontraído |
| Formalidade | Informal (tu/você, gírias) | Formal (senhor/senhora) |
| Humor | Seco | Bem-humorado |
| Empatia | Objetivo | Acolhedor |

**Valor atual do slider:** mostrar texto curto abaixo: "Descontraído (72%)" — calculado do valor.

**TagList inviolable rules:** `Input` + botão `Add` (ou Enter) → chip removível. Cada chip tem `X` pequeno. Ex: "Nunca prometer preços sem consultar humano".

**Preview ao vivo (opcional em 07B.4, mover pra 07C se apertar):** Card pequeno com mensagem de exemplo (hardcoded tipo "Cliente: 'Quanto custa?'") mostrando como agente responderia com o tom atual.

**Server action:** `updateAgentPersona({ agentId, personality })` onde `personality` é JSONB completo.

**Zod schema:**
```typescript
const personalitySchema = z.object({
  tone: z.number().int().min(0).max(100),
  formality: z.number().int().min(0).max(100),
  humor: z.number().int().min(0).max(100),
  empathyLevel: z.number().int().min(0).max(100),
  inviolableRules: z.array(z.string().min(1).max(80)).max(20),
});
```

### 7.3 Aba Negócio (story 07B.5)

**Route:** `/agents/[agentId]/business`.

**Campos:**

| Label | Field | Tipo UI | Validação |
|---|---|---|---|
| Indústria | `businessContext.industry` | `Input` | opcional, max 80 chars |
| Produtos/serviços | `businessContext.products` | `Textarea` (6 rows) | opcional, max 2000 chars |
| Política de preços | `businessContext.pricing` | `Textarea` (3 rows) | opcional, max 500 chars |
| Políticas | `businessContext.policies` | `Textarea` (4 rows) | opcional, max 1000 chars |

**Helper text em cada campo** (abaixo do input, muted, text-xs):
- Indústria: "Ex: Soluções empresariais, SaaS B2B, Consultoria financeira"
- Produtos/serviços: "Liste o que o agente pode oferecer. Ex: 'Plataforma de gestão — planos Basic, Pro e Enterprise'"
- Política de preços: "Como o agente trata perguntas sobre valor. Ex: 'Sob consulta — nunca inventar valores específicos'"
- Políticas: "Regras importantes do negócio. Ex: 'LGPD-compliant; respeitar opt-out; disclaimer obrigatório em primeira mensagem'"

**Server action:** `updateAgentBusinessContext({ agentId, businessContext })`.

### 7.4 Aba Conversas (story 07B.6)

**Route:** `/agents/[agentId]/conversation`.

**Campos:**

| Label | Field | Tipo UI | Validação |
|---|---|---|---|
| Saudação padrão | `conversationStyle.greeting` | `Textarea` (2 rows) | opcional, max 300 chars |
| Perguntas de qualificação | `conversationStyle.qualificationQuestions` | `TagList` (lista ordenada editável) | array, max 10 items, 200 chars cada |
| Tratamento de objeções | `conversationStyle.objectionHandling` | `Textarea` (4 rows) | opcional, max 1000 chars |
| Handoff pra humano | `conversationStyle.handoffTriggers` | `TagList` | array, max 10 items, 150 chars cada |

**TagList ordenada das perguntas:** cada item é um card pequeno (row) com handle de drag (opcional em 07B) + input inline + X. Em 07B pode começar sem drag — só add/remove ordenado por inserção.

**Helper text em handoff triggers:**
> "O agente transfere pra humano quando qualquer um desses casos acontecer. Ex: 'cliente pedir humano', 'pergunta sobre valor específico que não está nas políticas', 'situação emocional delicada'"

**Server action:** `updateAgentConversationStyle({ agentId, conversationStyle })`.

### 7.5 Aba Modelo (story 07B.7)

**Route:** `/agents/[agentId]/model`.

**Campos:**

| Label | Field | Tipo UI | Validação |
|---|---|---|---|
| Provider | — (derivado do modelo) | `RadioGroup` 2 opções | OpenAI / Anthropic |
| Modelo | `model` | `Select` (filtrado por provider) | obrigatório, enum curado |
| Temperatura | `temperature` | `Slider` 0-2 step 0.1 | default 0.7 |
| Máximo de passos | `maxSteps` | `Slider` 1-20 step 1 | default 10 |

**Provider é derivado de `model`:** ao mudar provider, `model` é setado pro primeiro da lista daquele provider. Fisicamente só `model` é persistido — provider é UI-only.

**Select de modelo:**
- Agrupado visualmente (OpenAI tem ícone, Anthropic tem ícone)
- Filtrado conforme radio selecionado
- Lista idêntica à da 07B.1 (mesma fonte: `packages/ai/src/models.ts` — arquivo a criar em 07B.7)

**Sliders labels extremos:**

| Slider | 0 | 2 (temp) / 20 (steps) |
|---|---|---|
| Temperatura | Preciso (0.0) | Criativo (2.0) |
| Máximo de passos | 1 passo | 20 passos |

**Valor visível ao lado do slider:** "0.7" e "10" em texto.

**Helper text:**
- Temperatura: "Quanto maior, mais variadas e criativas as respostas. Quanto menor, mais direto e previsível."
- Máximo de passos: "Quantas tools o agente pode encadear numa mesma resposta (deixe em 10 na dúvida)."

**Server action:** `updateAgentModel({ agentId, model, temperature, maxSteps })`.

### 7.6 Aba WhatsApp (story 07B.8)

**Route:** `/agents/[agentId]/whatsapp`.

**Campos:**

| Label | Field | Tipo UI | Validação |
|---|---|---|---|
| Instância vinculada | `whatsappInstanceId` | `Select` + preview | opcional, FK to instâncias da org |

**Estado não vinculado:**

```
┌─────────────────────────────────────────────────────────┐
│ 📱  Este agente não está vinculado a nenhuma instância. │
│                                                         │
│  Selecione uma instância pra começar a receber          │
│  mensagens:                                             │
│                                                         │
│  [Select: escolher instância...      ▼]                 │
│                                                         │
│  → Gerenciar instâncias em Integrações                  │
└─────────────────────────────────────────────────────────┘
```

**Estado vinculado:**

```
┌─────────────────────────────────────────────────────────┐
│ 📱  Vinculado a: Vertech Comercial                      │
│     +55 11 98765-4321                                   │
│     Conectada • 827 contatos                            │
│                                                         │
│  [ Desvincular ]  [ Trocar instância ]                  │
└─────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Select lista só instâncias com `status === 'CONNECTED'` + as **sem agente vinculado** (uma instância não pode estar com 2 agentes). Se o agente atual já tem instância, ela também aparece.
- **Desvincular:** `AlertDialog` de confirmação. Action `unlinkAgentFromWhatsApp({ agentId })`.
- **Trocar instância:** abre modal com lista atual, action `linkAgentToWhatsApp({ agentId, whatsappInstanceId })`.

**Link "→ Gerenciar instâncias em Integrações":** `Link` pra `/app/[orgSlug]/crm/integracoes`.

**Server actions:** `linkAgentToWhatsApp({ agentId, whatsappInstanceId })` / `unlinkAgentFromWhatsApp({ agentId })`.

## 8. Estados globais

### 8.1 Loading (SSR)

Cada rota é server component → usa Suspense boundary no `layout.tsx` do detalhe. Skeleton inicial:

```
[Avatar skeleton 96px]  [3 linhas text skeleton]    [badge skeleton]
───────────────────────────────────────────────────────────────────
[menu skeleton 6 items]  │  [4 form fields skeleton]
```

### 8.2 Error boundary

Se `getAgentById` falha ou agent não existe:
- Retorna `notFound()` do Next → mostra a page 404 padrão
- Se erro inesperado → `error.tsx` da rota com botão "Tentar de novo"

### 8.3 Agente arquivado

Se `status === 'ARCHIVED'`:
- Banner no topo do header (acima do nome): "Este agente está arquivado. Desarquive pra editar." `[Desarquivar]`
- Todos os campos das abas ficam `disabled`
- Dropdown de status mostra só "Desarquivar"

### 8.4 Sem permissão (role member sem admin)

Stock RLS do Supabase já bloqueia `UPDATE`. Na UI, se `!isAdminOrOwner`:
- Todos os campos ficam `disabled`
- Dirty state banner não aparece
- Header mostra badge `Read-only` ao invés de dropdown de status

## 9. Acessibilidade

- **Teclado:** toda ação do header e menu lateral navegável por Tab. `Enter`/`Space` ativa botões. `Esc` fecha dialogs.
- **Labels:** todos inputs com `<FormLabel>` visível (não usar só placeholder).
- **ARIA:** `RadioGroup` do shadcn/Radix já traz. Sliders com `aria-label` descritivo.
- **Contraste:** WCAG AA — usar tokens do tema (`foreground`, `muted-foreground`, `primary`). Não hardcodar cores.
- **Focus visible:** herda do tema — `focus-visible:ring-2 focus-visible:ring-ring`.
- **Screen reader:** nome do agente + aba ativa lidos no header da rota (`<h1>` com sr-only se precisar reforçar).

## 10. Componentes shadcn a adicionar

Antes de 07B.3, @dev precisa adicionar:

| Componente | Comando | Usado em |
|---|---|---|
| `radio-group` | `pnpm dlx shadcn-ui@latest add radio-group` | 07B.3 (gênero), 07B.7 (provider) |
| `alert-dialog` | (já instalado ✓) | 07B.2 (arquivar), 07B.8 (desvincular) |
| `slider` | (já instalado ✓) | 07B.4, 07B.7 |

## 11. Translations (pt-BR)

Adicionar em `apps/web/modules/i18n/translations/pt-BR.json` sob namespace `agents`:

```json
{
  "agents": {
    "list": {
      "title": "Agentes",
      "subtitle": "Agentes de IA que atendem seus leads no WhatsApp",
      "newButton": "Novo agente",
      "empty": {
        "title": "Seus agentes aparecerão aqui",
        "description": "Crie seu primeiro agente comercial com o formulário rápido.",
        "cta": "Criar agente"
      }
    },
    "new": {
      "title": "Novo agente",
      "subtitle": "Configure o básico — você edita os detalhes depois",
      "fields": {
        "name": "Nome",
        "role": "Função",
        "model": "Modelo"
      },
      "cancel": "Cancelar",
      "submit": "Criar agente"
    },
    "detail": {
      "tabs": {
        "identity": "Identidade",
        "persona": "Persona",
        "business": "Negócio",
        "conversation": "Conversas",
        "model": "Modelo",
        "whatsapp": "WhatsApp"
      },
      "status": {
        "draft": "Rascunho",
        "active": "Ativo",
        "paused": "Pausado",
        "archived": "Arquivado"
      },
      "actions": {
        "duplicate": "Duplicar",
        "archive": "Arquivar",
        "activate": "Ativar",
        "pause": "Pausar",
        "unarchive": "Desarquivar"
      },
      "dirtyBanner": {
        "one": "{count} mudança não salva",
        "other": "{count} mudanças não salvas",
        "discard": "Descartar",
        "save": "Salvar",
        "saving": "Salvando..."
      }
    }
  }
}
```

(Detalhes por aba serão adicionados pelas stories 07B.3-07B.8 conforme cada @dev implementa.)

## 12. Handoff

Este spec é consumido por:

- **River (@sm)** pra drafting das 8 stories (07B.1 a 07B.8). Cada story linka `docs/phase-07/ui-spec-07b-agent-detail.md#seção-X` pra seu escopo específico.
- **Neo (@dev)** pra implementar cada story seguindo o pattern comum.
- **Oracle (@qa)** pra gate visual — checklist no gate humano 07B compara UI entregue com esse spec.

**Decisões travadas aqui** que as stories NÃO devem renegociar:
1. Sidenav vertical (não tabs horizontais)
2. Rotas separadas por aba (não estado client-side)
3. Auto-save OFF (salvar é intencional)
4. Dirty state banner sticky no bottom
5. `max-w-2xl` pro form (legibilidade)
6. Paridade 1:1 entre server actions e tools do Orquestrador (Configurabilidade Tripla)

**Decisões adiadas pra 07C** (não entra em 07B):
- Flow Diagram (React Flow)
- Audit/undo por aba
- Preview ao vivo (aba Persona)
- Drag-reorder em TagLists
- Aba Versões
- Presets/templates

---

*Assinado: Sati (@ux-design-expert), 2026-04-19*
