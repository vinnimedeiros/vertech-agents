# AI Studio V3 — Wireframes & Design System

**Decisão:** Dark theme Linear-style. Fonte Inter/Geist. Accent verde lime (#a3e635) sutil em CTAs. Background #0a0a0a profundo. Borders #1a1a1a (1px).

## Tokens de design

```css
--bg-primary: #0a0a0a       /* canvas geral */
--bg-elevated: #0f0f0f      /* cards */
--bg-elevated-2: #141414    /* properties panel, sidebar */
--bg-hover: #1a1a1a
--border: #1f1f1f
--border-strong: #2a2a2a

--text-primary: #fafafa
--text-secondary: #a1a1a1
--text-muted: #737373

--accent: #a3e635           /* verde lime, CTAs */
--accent-fg: #0a0a0a
--accent-soft: #a3e63520    /* tint pra badges */

--status-active: #22c55e
--status-sandbox: #eab308
--status-paused: #737373
--status-draft: #6366f1
--status-error: #ef4444

--role-supervisor: #a3e635
--role-analyst: #06b6d4
--role-campaigns: #f97316
--role-assistant: #a78bfa

--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px

--font-display: "Geist", "Inter", system-ui
--font-mono: "Geist Mono", "JetBrains Mono", monospace
```

## Layout shell — `/ai-studio/*`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Vertech Workspace                          [Search] [👤 Vinni]│  ← top bar app (fora do AI Studio shell)
├─────┬───────────────────────────────────────────────────────────────────┤
│  ☰  │                                                                   │
│ ⌂   │                                                                   │
│ 👥  │                  CONTEÚDO DA ÁREA AI STUDIO                       │
│ 📊  │                                                                   │
│ ✨  │  ← AI Studio item destacado (active)                              │
│ 📅  │                                                                   │
│ ⚙   │                                                                   │
│     │                                                                   │
└─────┴───────────────────────────────────────────────────────────────────┘
```

Sidebar Vertech mantém estilo atual. Item "Agentes" renomeia pra "**AI Studio**" com ícone `Sparkles` (✨).

---

## Área 1 — Casa dos TIMES (`/ai-studio`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AI Studio                                                                │
│ Times de IA gerenciados por essa agência                                 │
│                                                                          │
│ [Active 1] [Sandbox 0] [Paused 0] [Draft 0]      [+ Criar TIME (Master)]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────┐  ┌─────────────────────────┐               │
│  │ 🟢 Active               │  │ 🟡 Sandbox              │               │
│  │                         │  │                         │               │
│  │  ●●●●  TIME Comercial   │  │  ●●●○  TIME Comercial   │               │
│  │        Vertech Demo     │  │        Cliente XYZ      │               │
│  │                         │  │                         │               │
│  │  Camila SDR             │  │  Pedro Closer           │               │
│  │  Atendente do TIME      │  │  Em testes              │               │
│  │                         │  │                         │               │
│  │  📥 47 leads hoje       │  │  📥 0 leads             │               │
│  │  📊 68% qualificação    │  │  📊 — qualificação      │               │
│  │  👤 3 handoffs          │  │  👤 0 handoffs          │               │
│  │                         │  │                         │               │
│  │  [Abrir Construtor →]   │  │  [Abrir Construtor →]   │               │
│  └─────────────────────────┘  └─────────────────────────┘               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Anatomia do TeamCard:**
- Status badge canto superior esquerdo (cor por status)
- Avatar grupal: 4 dots representando os 4 agents (preenchidos = configurado)
- Nome do TIME (h3 bold)
- Nome visível ao lead + role do supervisor (h5 muted)
- Métricas em linha (3 chips com ícone)
- CTA primário "Abrir Construtor →"

**Empty state (zero TIMES):**
- Ilustração SVG simples (4 círculos conectados)
- Título: "Nenhum TIME configurado"
- Subtítulo: "Master Agency cria o primeiro TIME. Aguarde o setup pela equipe Vertech."
- Sem CTA pra agências cliente. Master Agency vê CTA "+ Criar TIME".

**Filtros:** Tabs no topo por status (Active / Sandbox / Paused / Draft) com count.

---

## Área 2 — Construtor do TIME (`/ai-studio/teams/[teamId]`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AI Studio › TIME Comercial Vertech Demo  [🟢 Active]   [Inspetor ↗] [Save]│
│                                          [Sandbox ⚪] [Active ⚫]         │
├──────────┬──────────────────────────────────────────────────────────────┤
│          │                                                              │
│ Etapa 1  │                                                              │
│ Persona  │            ┌──────────────────────────┐                     │
│ ✓        │            │ ✨ Camila Santos (Atend) │                     │
│          │            │ ─────────────────────────│                     │
│ Etapa 2  │            │ Atendente comercial      │                     │
│ Tools    │            │ humanizada, foca em      │                     │
│          │            │ qualificação SDR.        │                     │
│ Etapa 3  │            │                          │                     │
│ Deploy   │            │ 🔧 11   📚 5   ⚙ 3      │                     │
│          │            └──────────┬───────────────┘                     │
│          │                       │                                     │
│          │           ┌───────────┼───────────┬─────────────┐           │
│          │           │           │           │             │           │
│          │  ┌────────▼─────┐ ┌───▼────────┐ ┌▼────────────┐           │
│          │  │ 📊 Analista  │ │ 🚀 Camp.   │ │ 🤝 Assist.  │           │
│          │  │ ─────────────│ │ ───────────│ │ ────────────│           │
│          │  │ Inteligência │ │ Disparos   │ │ Ponte humano│           │
│          │  │ comercial.   │ │ em massa.  │ │ via grupo.  │           │
│          │  │              │ │            │ │             │           │
│          │  │ 🔧 4         │ │ 🔧 2       │ │ 🔧 1        │           │
│          │  └──────────────┘ └────────────┘ └─────────────┘           │
│          │                                                              │
│          │                              ┌─ + ─┐                        │
│          │                              │     │  ← Add agent (V4+)     │
│          │                              └─────┘                        │
│          │                                                              │
└──────────┴──────────────────────────────────────────────────────────────┘
```

**Anatomia:**
- **Top bar:** breadcrumb (AI Studio › nome do TIME) + status badge + 2 toggles (Sandbox/Active mutuamente exclusivos) + Inspetor (↗ abre nova aba) + Save
- **Sidebar etapas (esquerda):** 3 etapas verticais, checkmark quando completa, número quando ativa, badge cinza quando bloqueada
- **Canvas (centro):**
  - Card supervisor topo (verde lime stroke quando active, expandido)
  - Edges tracejados conectam supervisor → 3 sub-agents
  - Cada card sub-agent: ícone role + nome + descrição curta + counts (tools, docs, configs)
  - "+ Add agent" tracejado V4+ disabled em V3 com tooltip "Disponível em versão futura"
- **Click num card** → drill-in pra Editor do Agente (área 3)
- **Click no Brand Voice top bar** → opens inline panel embaixo da topbar com form

**Etapa 1 (Persona) ativa:**
- Painel inline aparece embaixo da topbar (NÃO sheet lateral)
- Form Brand Voice: Nome visível, Tom (radio), Formalidade, Humor, Empatia, Regras invioláveis (textarea)
- Botão "Aplicar a todos agentes do TIME"

**Etapa 2 (Tools) ativa:**
- Canvas fica de fundo
- Card de cada agente expande mostrando tools habilitadas com switches
- Categorias: Pipeline / Agenda / Conhecimento / Comunicação / Handoff
- Tooltip explicativo em cada tool em linguagem CEO

**Etapa 3 (Deploy) ativa:**
- Checklist de validações
- ✓ Brand Voice configurada
- ✓ Tools habilitadas no supervisor
- ✗ WhatsApp instance vinculada (link "Conectar")
- ✗ Sandbox testado pelo menos 1x (link "Testar")
- Botão "Ativar TIME" desabilitado até checklist completo

---

## Área 3 — Editor do Agente (`/ai-studio/teams/[teamId]/agents/[agentId]`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AI Studio › TIME Comercial › Camila (Atendente)              [Save]     │
├──────────┬──────────────────────────────┬───────────────────────────────┤
│          │                              │                               │
│ Persona  │                              │ Modelo                        │
│ ●        │       ╔══════════════╗       │ ─────                         │
│          │       ║              ║       │ openai/gpt-4.1-mini  ▼        │
│ Modelo   │       ║   👩 Camila  ║       │ Temperatura ▓▓▓▓▒░ 0.7        │
│          │       ║   Santos     ║       │ Max steps        10           │
│ Memória  │       ║              ║       │                               │
│          │       ║  Atendente   ║       │ Memória                       │
│ Modos    │       ║              ║       │ ─────                         │
│          │       ╚══════════════╝       │ Últimas mensagens     30      │
│ Tools    │                              │ Recall semântico ON           │
│          │       Tom: Informal          │   Top K              5        │
│ Deploy   │       Humor: Leve            │ Working memory ON             │
│          │       Empatia: Alta          │   Schema: Lead Profile        │
│          │                              │ Observational ON              │
│          │  ┌─────────────────────┐     │   Modelo: gemini-2.5-flash   │
│          │  │ Tools habilitadas   │     │                               │
│          │  │ ─────────────────── │     │ Modos                         │
│          │  │ ✓ criarLead         │     │ ─────                         │
│          │  │ ✓ moverLeadStage    │     │ ● SDR (atual)                 │
│          │  │ ✓ atualizarLead     │     │ ○ Closer                      │
│          │  │ ... (8 mais)        │     │ ○ Pós-venda                   │
│          │  └─────────────────────┘     │                               │
│          │                              │ Voz / TTS                     │
│          │                              │ ─────                         │
│          │                              │ Desabilitada      [Habilitar] │
│          │                              │                               │
├──────────┴──────────────────────────────┴───────────────────────────────┤
│ ▼ Chat colaborador                       │ ▼ Logs ao vivo (sandbox)     │
│ ─────────────────────                    │ ─────────────────────────    │
│ Você: Adicionar empatia mais alta no    │ 14:32 [USER] "oi tudo bem?"  │
│       primeiro contato                   │ 14:32 [TOOL] verHistorico... │
│ Arq: Ajustei. Quer ver preview?         │ 14:32 [AGENT] "oi! tudo bem,"│
│ [Type to talk to Architect...]          │ 14:32 [SCORE] tone 0.94      │
└──────────────────────────────────────────┴──────────────────────────────┘
```

**Anatomia:**
- **Top bar:** breadcrumb + Save (sem toggle Active aqui — fica na área 2)
- **Sidebar nav (esquerda):** etapas verticais Persona / Modelo / Memória / Modos / Tools / Deploy. Ativo destacado.
- **Canvas central:** card Persona grande (avatar gerado, nome, role, brand voice resumido). Embaixo lista compacta de tools habilitadas.
- **Properties panel direita (~360px):** accordions colapsáveis por seção. Cada accordion mostra preview compacto fechado, edit completo aberto.
- **Bottom split (collapsible):** Chat colaborador esquerda + Logs ao vivo direita. Cada um colapsável independente. Quando ambos ocultos, canvas usa altura total.

**Sidebar nav etapas:**
- ● Persona (radio active) ← clicada
- ○ Modelo
- ○ Memória
- ○ Modos
- ○ Tools
- ○ Deploy

**Properties panel sections (accordions):**
1. Modelo (sempre aberto por padrão)
2. Memória
3. Modos
4. Tools (link "Editar lista completa →" abre fullscreen)
5. Voz / TTS
6. Avançado (colapsado, scorers, anti-patterns, exemplos)

**Chat colaborador:**
- Reusa M2-02 sandbox playground
- requestContext flag `mode: collaborator` → agente ajuda a editar config dele
- Mensagens persistem em thread separada por sessionId

**Logs ao vivo:**
- Server-Sent Events do sandbox runtime
- Cada step do agente mostra timestamp + tipo + payload
- Cores: USER (cinza), AGENT (lime), TOOL (cyan), SCORE (yellow)
- Botão "Pause" / "Clear" / "Filter"

---

## Área 4 — Inspetor (Mastra Studio em aba externa)

UI Vertech: botão "Inspetor ↗" no top bar do Construtor (área 2). Click abre `/ai-studio/teams/[teamId]/inspector` que retorna 302 pra Mastra Studio em :4111.

Não há UI nossa pra isso. Mastra Studio nativo cuida.

---

## Componentes shadcn-ui necessários

| Componente | Já tem? | Uso |
|---|---|---|
| `Card` | ✓ | TeamCard, MemberNode |
| `Badge` | ✓ | StatusBadge, MetricChip |
| `Button` | ✓ | CTAs, toggles |
| `Tabs` | ✓ | Filters área 1 |
| `Accordion` | ✓ | Properties panel |
| `Switch` | ✓ | Tools toggle |
| `Slider` | ✓ | Temperatura |
| `Select` | ✓ | Modelo dropdown |
| `Avatar` | ✓ | Agent avatars |
| `Tooltip` | ✓ | Tools explicações |
| `Toast (Sonner)` | ✓ | Save/error feedbacks |
| `ScrollArea` | ✓ | Properties panel scroll |
| `Separator` | ✓ | Section dividers |
| `Skeleton` | ✓ | Loading states |
| **React Flow** | ✗ | Canvas área 2 (instalar `reactflow` ou `@xyflow/react`) |

## Estados especiais

### Loading
- TeamCard: Skeleton 3 chips + skeleton avatar
- Canvas área 2: Skeleton supervisor + 3 sub-agents placeholder
- Properties panel: Skeleton accordions

### Empty
- Casa: ilustração + texto explicativo (não-Master Agency)
- Construtor: TIME novo sem agents — primeiro card vazio com onboarding inline
- Editor: agent novo — wizard rápido inline (3 perguntas) → preenche defaults

### Error
- Card com border vermelha + ícone + mensagem
- Toast Sonner pra erros de save
- Página 404 customizada se `teamId` não existe

## Acessibilidade

- Foco keyboard navegável (tab order: sidebar → topbar → canvas → properties)
- ARIA labels em ícones
- Contraste mínimo 4.5:1 (texto secondary vs bg)
- Tooltips com delay 500ms
- ESC fecha painéis colapsáveis

## Animações

- Transições 200ms ease-in-out por padrão
- Properties panel slide-in 300ms
- Cards hover: subtle elevation (shadow-sm)
- Edge connections no canvas: dashed-flow animation
- Status badges: pulse sutil quando "live" (Active)

## Mobile

V3 desktop-first. Mobile = experiência reduzida:
- Casa: cards stack vertical
- Construtor: canvas read-only, edição bloqueada com mensagem "abra no desktop"
- Editor: idem
- Sandbox/chat: funciona normal (pode ser usado mobile)

V4+ resolve responsivo completo.
