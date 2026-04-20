---
type: guide
title: "Phase 09 — UI Spec: Arquiteto Construtor"
project: vertech-agents
tags:
  - project/vertech-agents
  - phase/09
  - design/ui-spec
  - owner/ux-design-expert
---

# Phase 09 — UI Spec: Arquiteto Construtor

> **Autora:** `@ux-design-expert` (Sati)
> **Data:** 2026-04-19
> **Status:** Primeira versão, aguarda validação humana do Vinni em 3 dilemas críticos (seção 2)
> **Consumido por:** `@architect` (tech spec), `@sm` (stories), `@dev` (implementação)
> **Supersedes:** nenhum (greenfield da Phase 09)

## 1. Contexto

Este documento é a **fonte única de verdade visual** da Phase 09 (Arquiteto Construtor) do Vertech Agents. Materializa o PRD v2 § 4 em wireframes, states, componentes e tokens.

### 1.1 Princípios norteadores

Quatro princípios guiaram cada decisão:

1. **Originalidade.** A UI não pode parecer com Mercado Agentes (Vinni, regra MUST). Referência de LÓGICA extraída, referência VISUAL não. Paralelo estético mais próximo: claude.ai (chat full) + Linear (cards densos) + Raycast (composer polido).
2. **Respiro.** Chat é sobre foco. Uma coluna, conteúdo centralizado, margem generosa. Sem painéis permanentes competindo por atenção (regra feedback_no_side_drawers.md).
3. **Artefato como protagonista.** Cada etapa culmina num artefato tangível (card inline). É a manifestação visível de "IA criou algo que eu posso tocar". Três ações possíveis, nenhuma ambiguidade.
4. **Progresso invisível mas presente.** Status-bar fino no topo (4 etapas) orienta sem interromper. Sem wizard engessado, sem stepper pesado.

### 1.2 Layout primário: qual pattern foi escolhido

Single-pane chat-first com largura contida (max-w 760px), centralizado na viewport, fundo neutro dos lados. Composer sticky no rodapé, nunca flutuante. Mensagens empilham, scroll vertical suave (com âncora no final ao chegar nova mensagem).

> **Porque NÃO split 50/50 como no vault original:** a visão do Vinni de 2026-04-19 é clara: "quero uma tela tipo chat do Claude", "não quero copiar Mercado Agentes". Split polui visão, duplica foco, obriga olho a pular entre dois lados. Chat full é calma. Preview só quando necessário (etapa Criação final), como card inline, não como coluna fixa.

## 2. Dilemas visuais e resoluções propostas

> **Leia primeiro, Vinni.** Três decisões visuais críticas onde o PRD v2 deixou espaço para interpretação. Proponho resolução, explico o trade-off, e marco o item com status. Recomendações são a base do resto do documento. Se você quiser reverter alguma, volto e ajusto a spec.

### Dilema 1. Slide-in panel vs Dialog centralizado vs Inline expansion

**Contexto.** O PRD v2 § 4.2.3 diz que `[Refinar artefato]` abre "painel deslizante da direita 400px wide". A memória do projeto (`feedback_no_side_drawers.md`) proíbe side drawers: "nada no produto abre em Sheet lateral".

**Trade-off.** Painel deslizante é clássico, familiar, acomoda formulários longos. Mas quebra regra MUST.

**Opções:**

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| **A. Inline expansion** | Card de artefato cresce em altura; formulário aparece embaixo do conteúdo atual | Respeita a regra, fluxo linear, zero modal | Formulários longos empurram tudo pra baixo, pode ficar claustrofóbico |
| **B. Dialog centralizado** | Modal sobre o chat, fundo escurecido, formulário dentro | Respeita a regra, foco máximo, familiar | Quebra o "continuum" do chat, obriga fechar pra ver mensagens |
| **C. Híbrido** | Inline pra formulários curtos (até 4-5 campos), Dialog pra formulários longos (6+ campos) | Melhor UX caso a caso | Mais código, mais variantes |

**Recomendação: C. Híbrido** com matriz de decisão abaixo.

| Artefato | Campos | Pattern |
|---|---|---|
| Perfil do Negócio (Ideação) | 5 (nome, resumo, serviços, público, objetivo) | Inline expansion |
| Blueprint do Agente (Planejamento) | 12+ (persona 4 eixos, técnicas, emojis, voz, capabilities) | Dialog centralizado |
| Base de Conhecimento (Conhecimento) | 3 (lista de docs + notas adicionais) | Inline expansion |
| Resumo final (Criação) | Read-only, sem editar | N/A, direto pro botão Criar |

**Status:** ✅ Aprovado por Vinni em 2026-04-19. Padrão híbrido travado (inline pra 3-5 campos, Dialog centralizado pra 6+).

### Dilema 2. Largura do chat em desktop

**Contexto.** Chat full em telas grandes (1920px) fica horrível se usar 100% width. Claude usa 768px, ChatGPT 720px, Raycast 560px.

**Opções:**

| Opção | Width max | Quando |
|---|---|---|
| **A. 560px apertado (Raycast)** | 560px | Focado, mensagens curtas |
| **B. 720px médio (ChatGPT)** | 720px | Balanço |
| **C. 800px espaçoso (Claude)** | 800px | Conteúdo rico, cards de artefato bem exibidos |

**Recomendação: C. 800px.** Os cards de artefato têm conteúdo denso (tabelas pequenas, listas, seções). Em 720px eles ficam apertados. 800px centralizado em telas grandes deixa respiro generoso nas laterais sem parecer vazio.

**Aplicação em mobile:** 100% width com padding lateral de 16px.

**Status:** Resolvido pela Sati.

### Dilema 3. Status-bar fino (4 etapas) sempre visível ou só quando ativo?

**Contexto.** PRD v2 menciona "status-bar fino opcional". Duas forças: orientação (usuário não se perde) vs ruído (mais 1 elemento na tela).

**Opções:**

| Opção | Comportamento |
|---|---|
| **A. Sempre visível** | Toda a sessão mostra 4 etapas no topo, atualizando check-verde |
| **B. Só em transição** | Aparece por 3s quando etapa muda, some depois |
| **C. Opcional (toggle)** | User controla via botão "mostrar progresso" |

**Recomendação: A. Sempre visível, minimalista.** Altura 28px, fundo `bg-muted/40`, texto 11px muted, check verde 12px. Remove dúvida do usuário sem gritar. Linha de separação sutil com o chat abaixo.

**Status:** Resolvido pela Sati.

### Dilema 4. Grid de templates (7 cards): 4x2 ou 3x3 ou outro?

**Contexto.** 6 verticais + 1 Personalizado = 7 cards. Divisões ímpares sempre geram "card solitário".

**Opções:**

| Opção | Layout | Resultado |
|---|---|---|
| **A. 4 + 3** | 4 em cima, 3 embaixo (Personalizado centralizado) | Personalizado destacado por posição |
| **B. 3 + 3 + 1** | Personalizado sozinho embaixo, borda dashed | Personalizado destacado por estilo |
| **C. 7 em linha** | Scroll horizontal em desktop | Hostil em telas grandes |

**Recomendação: A. 4 + 3 com Personalizado à direita da segunda fila.** Personalizado tem estilo `border-dashed` + ícone `✨` pra diferenciar sem precisar de isolamento. Mobile (2 colunas): 3+3+1 naturalmente, Personalizado fica sozinho na última linha (OK nesse caso, efeito "card especial").

**Status:** Resolvido pela Sati.

### Dilema 5. Botão de gravação de voz no composer

**Contexto.** Mockup do PRD v2 mostra `[🎤]` no composer. Isso é **voice input do usuário** (gravação pro Arquiteto entender por áudio), NÃO TTS do agente (que é config diferente, aba Voz no Painel de Refino).

**Opções:**

| Opção | Decisão |
|---|---|
| **A. Incluir em Phase 09 MVP** | Usuário grava mensagem de voz → Whisper transcreve → Arquiteto lê como texto |
| **B. Deixar pra futura versão** | MVP só texto e anexo |

**Recomendação: B. Deixar pra futura versão.** Razões: (a) voice input é complexidade adicional (streaming, waveform, transcrição) sem impacto direto na jornada crítica de criar agente; (b) simplifica MVP; (c) não bloqueia adicionar depois; (d) mantém foco no diferencial central (upload + artefatos + chat). Botão de voz fica pra Phase 09.5 ou quando tiver demanda explícita.

**Status:** Resolvido pela Sati. Composer MVP: textarea + anexo + enviar.

### Dilema 6. Mobile: bottom sheet ou fullscreen pra painel de refino?

**Contexto.** No desktop o refino longo abre Dialog centralizado (Dilema 1-C). Em mobile, Dialog fica apertado.

**Opções:**

| Opção | Resultado |
|---|---|
| **A. Bottom sheet (90% altura)** | Desliza de baixo, cobre quase tudo, drag handle visível |
| **B. Fullscreen** | Cobre tudo, botão voltar no topo |

**Recomendação: A. Bottom sheet.** Pattern mobile-native, menos disruptivo que fullscreen, permite o usuário ver parcialmente o chat atrás (sensação de "tô voltando já"). Componente shadcn `Sheet` com `side="bottom"`.

Nota técnica: shadcn `Sheet` é genérico, Dilema 1 banned Sheet lateral mas Sheet bottom em mobile é pattern modern universal, não side drawer. Pedi confirmação explícita pro Vinni na próxima revisão.

**Status:** Resolvido pela Sati, pendente validação em uso.

---

## 3. Tela de boas-vindas (`/app/[orgSlug]/agents`)

### 3.1 Quando mostrar

Rota raiz de agentes. Dois estados:

- **Estado vazio (nenhum agente, nenhum rascunho):** hero dominante, grid de templates protagonista.
- **Estado com agentes:** hero comprimido (só CTA + 1 linha de subtítulo), grid ainda visível, seções "Rascunhos" e "Agentes criados" preenchidas.

### 3.2 Wireframe desktop (estado vazio)

```
┌──────────────────────────────────────────────────────────────┐
│ [sidebar app]                                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              ╭─────────────────────────────╮                 │
│              │                             │                 │
│              │   Crie seu primeiro         │                 │
│              │   agente comercial          │                 │
│              │   em 15 minutos             │                 │
│              │                             │                 │
│              │   O Arquiteto conduz a      │                 │
│              │   conversa. Você aprova     │                 │
│              │   cada etapa e publica.     │                 │
│              │                             │                 │
│              │  [ ✨ Criar com o Arquiteto] │                 │
│              │                             │                 │
│              ╰─────────────────────────────╯                 │
│                                                              │
│       ─── ou comece com um template pronto ───               │
│                                                              │
│       ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│       │ 🏥   │ │ 🛒   │ │ 🏠   │ │ 💼   │                  │
│       │Clínica│ │E-com.│ │Imob. │ │Info. │                  │
│       │       │ │      │ │      │ │produ │                  │
│       └──────┘ └──────┘ └──────┘ └──────┘                  │
│                                                              │
│       ┌──────┐ ┌──────┐      ┌ ✨ ─ ┐                       │
│       │ ⚙️   │ │ 🍽️   │      │ Per- │                       │
│       │SaaS  │ │Serv. │      │sonali│                       │
│       │      │ │Locais│      │zado  │                       │
│       └──────┘ └──────┘      └ ─ ─ ─┘                       │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Elementos:

- **Hero central:** max-w 640px, centralizado, espaço generoso de 64px em todas direções.
- **Título:** text-4xl font-semibold, 2 linhas.
- **Subtítulo:** text-base text-muted-foreground, max-w 480px.
- **CTA primary:** `Button size="lg"` com ícone ✨ (Sparkles). Padding 24px horizontal, 12px vertical.
- **Divisor "ou comece com um template pronto":** separador com texto interno em text-xs muted.
- **Grid:** 4 colunas com gap 16px, cards quadrados 160px. Mobile: 2 colunas.
- **Card Personalizado:** `border-dashed border-muted-foreground/30`, ícone ✨. Hover: `border-primary` + scale leve.

### 3.3 Wireframe desktop (estado com agentes)

```
┌──────────────────────────────────────────────────────────────┐
│ Agentes                                                      │
│ Agentes comerciais criados pelo Arquiteto                    │
│                               [ ✨ Criar novo agente ]        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ▾ Rascunhos em andamento (2)                                 │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ [avatar]  Sofia (Clínica Odontológica)              │   │
│   │           Etapa Planejamento • há 3 horas           │   │
│   │                                       [ Continuar ] │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ [avatar]  Amanda (Imobiliária)                      │   │
│   │           Etapa Ideação • ontem, 14:20              │   │
│   │                                       [ Continuar ] │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│ ─────────────────────────────────────────────────────────────│
│                                                              │
│ ▾ Agentes publicados (3)                                     │
│                                                              │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│   │ [avatar 48]│ │ [avatar 48]│ │ [avatar 48]│              │
│   │ Atendente  │ │ SDR Matutino│ │ Qualificador│              │
│   │ Comercial  │ │ SDR        │ │ Noturno    │              │
│   │ [ACTIVE]   │ │ [DRAFT]    │ │ [PAUSED]   │              │
│   │ GPT-4.1m   │ │ Claude Hk5 │ │ GPT-4.1m   │              │
│   │ 📱 Vertech │ │ Sem WA     │ │ 📱 Vert. 2 │              │
│   └────────────┘ └────────────┘ └────────────┘              │
│                                                              │
│ ─────────────────────────────────────────────────────────────│
│                                                              │
│ ▸ Começar do zero com um template (colapsada por default)    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Notas:

- **Hero comprimido:** `PageHeader` padrão com botão primary à direita. Título "Agentes" + subtítulo breve.
- **Seções colapsáveis:** `Accordion` do shadcn. Rascunhos expandido por default (tem ação pendente), Publicados expandido por default (tem utilidade recorrente), Templates colapsada (usuário já sabe onde tem).
- **Card de rascunho:** linha horizontal com avatar + nome + meta (etapa + tempo) + CTA Continuar. Hover: `bg-muted/30`. Click no nome ou CTA leva pra `/agents/new?session={sessionId}`.
- **Card de agente publicado:** mantém anatomia do card da 07B v1 (já especificado em `docs/phase-07/ui-spec-07b-agent-detail.md § 6.2`). Reaproveitar.
- **Limite visual:** máximo 6 rascunhos e 6 publicados por seção; acima abre `Ver todos (N)` com página de listagem.

### 3.4 Anatomia do card de template

```
┌──────────────┐
│              │
│     🏥       │  ← ícone 48px, centralizado
│              │
│   Clínica    │  ← label text-base font-medium
│              │
│  Odontologia,│  ← micro-copy text-xs muted (2 linhas)
│  estética,   │
│  veterinária │
│              │
└──────────────┘
```

Estados:

| Estado | Visual |
|---|---|
| Default | `bg-card border border-border`, sombra 0 |
| Hover | `border-primary/50`, scale leve (`transform: scale(1.02)`), transição 150ms |
| Selecionado (ao clicar) | `border-primary border-2`, `bg-primary/5`, loading inicia e navega |
| Disabled | `opacity-50 cursor-not-allowed`, tooltip "em breve" |

Conteúdo por template:

| Template | Ícone | Label | Micro-copy |
|---|---|---|---|
| Clínica | 🏥 | Clínica | Odontologia, estética, veterinária |
| E-commerce | 🛒 | E-commerce | Lojas online, moda, acessórios |
| Imobiliária | 🏠 | Imobiliária | Venda, aluguel, corretagem |
| Infoprodutor | 💼 | Infoprodutor | Cursos, coaching, mentoria |
| SaaS | ⚙️ | SaaS | Software, automação, B2B |
| Serviços Locais | 🍽️ | Serviços locais | Restaurante, salão, oficina |
| Personalizado | ✨ | Personalizado | Monte do zero com o Arquiteto |

Click no card navega pra `/agents/new?template={id}`.

### 3.5 Mobile (estado vazio)

```
┌──────────────────────────┐
│ [← menu]  Agentes        │
├──────────────────────────┤
│                          │
│   Crie seu primeiro      │
│   agente comercial       │
│   em 15 minutos          │
│                          │
│   O Arquiteto conduz a   │
│   conversa. Você aprova  │
│   cada etapa.            │
│                          │
│  [✨ Criar com Arquit.]   │
│                          │
│  ───── ou template ─────  │
│                          │
│  ┌────────┐ ┌────────┐   │
│  │ 🏥     │ │ 🛒     │   │
│  │ Clínica│ │E-com.  │   │
│  └────────┘ └────────┘   │
│                          │
│  ┌────────┐ ┌────────┐   │
│  │ 🏠     │ │ 💼     │   │
│  │ Imobi. │ │Info.pr │   │
│  └────────┘ └────────┘   │
│                          │
│  ┌────────┐ ┌────────┐   │
│  │ ⚙️     │ │ 🍽️     │   │
│  │ SaaS   │ │Serv.L. │   │
│  └────────┘ └────────┘   │
│                          │
│    ┌ ─ ─ ─ ─ ─ ┐         │
│    │ ✨ Persona│         │
│    │   lizado  │         │
│    └ ─ ─ ─ ─ ─ ┘         │
│                          │
└──────────────────────────┘
```

Breakpoints:
- Desktop (`lg:` ≥ 1024px): layout grid 4 colunas.
- Tablet (`md:` 768-1023px): layout grid 3 colunas, hero comprimido.
- Mobile (<768px): layout grid 2 colunas, hero empilhado com texto menor.

## 4. Tela de chat do Arquiteto (`/app/[orgSlug]/agents/new`)

### 4.1 Rotas e parâmetros

| URL | Uso |
|---|---|
| `/agents/new?template={id}` | Nova sessão a partir de template selecionado |
| `/agents/new?session={sessionId}` | Retomar sessão em andamento |
| `/agents/new` (sem params) | Redireciona pra `/agents` (tela de boas-vindas) |

### 4.2 Layout geral

Single-pane verticalmente dividido em 3 zonas:

```
┌──────────────────────────────────────────────────────────────┐
│ Header fino (altura 48px)                                    │  ← zona 1
├──────────────────────────────────────────────────────────────┤
│ Status-bar etapas (altura 28px)                              │  ← zona 2
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              Área de mensagens (scroll vertical)             │
│              max-w 800px centralizado                        │  ← zona 3
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Composer sticky (min-height 80px, expansível até 240px)      │  ← zona 4
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Header (zona 1)

```
┌──────────────────────────────────────────────────────────────┐
│ [←]  Clínica ▸ Novo agente            [Salvar e sair]       │
└──────────────────────────────────────────────────────────────┘
```

Elementos da esquerda pra direita:

| Elemento | Comportamento |
|---|---|
| `[←]` Botão voltar | Se `form.isDirty`: `AlertDialog` "Você tem mudanças não salvas. Sair agora volta pra `/agents` e descarta." / "Salvar rascunho e sair". Se não dirty: navega direto. |
| Breadcrumb `Template ▸ Novo agente` | Label do template atual (ex: "Clínica") + "Novo agente". Clicando no template volta pra `/agents`. |
| `[Salvar e sair]` | Salva sessão em `agent_creation_session` com `status: 'draft'` e navega pra `/agents`. |

Visual:

- Altura 48px fixa.
- `border-b` sutil.
- Texto do breadcrumb 14px, cor foreground; separador `▸` muted.
- Botões `variant="ghost"` pra icon button e `variant="outline"` pra Salvar e sair.

### 4.4 Status-bar de etapas (zona 2)

```
┌──────────────────────────────────────────────────────────────┐
│ ✓ Ideação    ●  Planejamento    ○  Conhecimento    ○  Criação│
└──────────────────────────────────────────────────────────────┘
```

Comportamento:

- Sempre visível desde o início da sessão.
- Estado de cada etapa:
  - **Pendente** (`○`): círculo oco muted
  - **Ativa** (`●`): círculo preenchido primary + texto primary font-medium
  - **Concluída** (`✓`): check verde
- Altura 28px, padding vertical 6px.
- Separadores entre etapas: traço fino horizontal (8px wide).
- Não clicável (não permite "pular" etapas; controle é do Arquiteto).
- Opacity geral: 85% (sutil, não protagonista).

Em mobile:

```
┌──────────────────────────────┐
│ ✓ ● ○ ○    Planejamento (2/4)│
└──────────────────────────────┘
```

Mostra só os dots + label da etapa atual com contagem. Economiza espaço.

### 4.5 Área de mensagens (zona 3)

Scroll vertical. Container `max-w-[800px] mx-auto` com `px-6`. Altura flex-1 entre status-bar e composer.

**Scroll behavior:** âncora automática no final quando mensagem nova chega (se user estava no fundo). Se user scrollou pra cima, não força âncora (pill flutuante "↓ Nova mensagem" aparece).

**Padding inferior extra:** 48px antes do composer (mensagens nunca ficam "coladas" no composer).

**Estado vazio (primeira mensagem do Arquiteto ao abrir template):**

```
                    [avatar arquiteto]
                    Oi! Eu sou o Arquiteto. Vou
                    te ajudar a construir o agente
                    comercial da sua clínica. Começo
                    com algumas perguntas pra entender
                    o contexto. Tudo bem?

                    Pra começar: me conta um pouco
                    sobre a clínica. Quantos profis-
                    sionais, quais tratamentos princi-
                    pais, e como vocês atendem hoje?
```

Mensagem rica, humana, clara sobre o que vai acontecer. Sem emoji forçado.

**Estado "Arquiteto pensando":**

```
                    [avatar arquiteto]
                    [●●● shimmer animado]
```

3 dots com animação `pulse` escalonada (200ms de offset entre cada). Dura o tempo do stream do LLM + 300ms pra suavizar.

**Estado "upload em processamento":**

```
                          ┌────────────────┐
                          │ 📄 catalogo.pdf│  ← mini-card dentro da
                          │ 2.1MB • proc.. │      mensagem do usuário
                          │ [●●● enviando] │
                          └────────────────┘
                                  [Você]
```

Cor do mini-card: `bg-muted` com borda. Ícone do arquivo por tipo (PDF vermelho, DOCX azul, CSV verde, imagem gradient).

### 4.6 Anatomia das bolhas (bubbles)

**Mensagem do Arquiteto:**

```
[avatar 32px]
Texto da mensagem do Arquiteto. Margem esquerda
leve (avatar fora do container de texto), largura
max 680px dentro da area de mensagens.

 ▸ Lista pode aparecer
 ▸ Cards de artefato aparecem aqui (seção 5)
```

- Avatar 32px redondo, canto superior esquerdo. Imagem fixa do Arquiteto (design: logo Vertech minimalista ou ícone abstrato. Pedir arte ou usar placeholder genérico com initials "A").
- Texto em `text-foreground`, line-height 1.6, font-size 15px.
- Max width 680px (respira dentro do container 800px).
- Sem bubble colorida. Só texto alinhado à esquerda, com espaço superior ao avatar.
- Entre mensagens do Arquiteto seguidas: avatar aparece só na primeira; demais ficam com offset visual.

**Mensagem do usuário:**

```
                                  Texto da mensagem
                                  do usuário, alinhado
                                  à direita, bolha sutil
                                  com bg-muted.
                                          [Você]
```

- Sem avatar, label "Você" em text-xs muted embaixo à direita.
- Bubble com `bg-muted/60`, `rounded-2xl`, padding 12px 16px.
- Max width 520px alinhado à direita.
- Se mensagem tem anexos, anexos ficam acima do texto na mesma bubble.

**Justificativa do assimetria de estilos:** o Arquiteto "fala como pessoa" (texto puro), o usuário "se comunica" (bubble). Espelha claude.ai — tenta remover a sensação de "chat robô".

### 4.7 Composer (zona 4)

```
┌──────────────────────────────────────────────────────────────┐
│ [📎]                                                          │
│  Digite sua mensagem...                                      │
│                                            [ ↑ Enviar ]      │
└──────────────────────────────────────────────────────────────┘
```

Anatomia:

| Elemento | Comportamento |
|---|---|
| Container | `max-w-800px mx-auto`, alinhado com área de mensagens acima. Border-top sutil. |
| Botão anexo `[📎]` (Paperclip) | Abre `DropdownMenu` com 3 opções: Arquivo, Imagem, Link de site |
| Textarea | `rows={1}` inicial, auto-expand até `rows={8}`. Placeholder: "Digite sua mensagem..." |
| Botão enviar `[↑]` (ArrowUp) | `variant="default"`, `size="icon"`. Disabled quando textarea vazia. Hover highlight. |
| Atalhos | Enter = enviar. Shift+Enter = quebra linha. Cmd/Ctrl+K = abrir menu anexo. |

Padding: 16px em todos os lados. Sticky no bottom via `position: sticky; bottom: 0`.

### 4.8 Menu de anexo (DropdownMenu do `[📎]`)

```
┌────────────────────────────┐
│ 📄  Arquivo                │
│     PDF, DOCX, CSV, XLSX,  │
│     TXT (max 10MB cada)    │
├────────────────────────────┤
│ 🖼️  Imagem                 │
│     PNG, JPG (max 5MB)     │
├────────────────────────────┤
│ 🔗  Link de site           │
│     Cole URL, Arquiteto    │
│     faz fetch do conteúdo  │
└────────────────────────────┘
```

Cada item tem ícone + label + descrição em 2 linhas.

Seleção:
- Arquivo/Imagem: abre `<input type="file" accept="..." multiple />`
- Link: abre `Dialog` pequeno com input de URL + botão "Anexar"

Múltiplos arquivos por mensagem permitidos (até 5). Após selecionar, mini-cards aparecem acima do textarea (ver seção 5.2 do composer).

### 4.9 Composer com anexos pending (antes de enviar)

```
┌──────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────┐                             │
│ │ 📄 catalogo. │ │ 🖼️ foto.jpg  │                             │
│ │    pdf       │ │    1.2MB [X] │                             │
│ │    2.1MB [X] │ └──────────────┘                             │
│ └──────────────┘                                              │
│                                                               │
│ [📎]                                                           │
│  Quer que eu processe esses materiais?                        │
│                                            [ ↑ Enviar ]       │
└──────────────────────────────────────────────────────────────┘
```

Mini-cards de anexo pending:

- `bg-muted/50`, borda, padding 8px.
- Ícone do tipo + nome truncado + tamanho + botão `[X]` remover.
- Gap 8px entre mini-cards.
- Max 5 por mensagem (se tentar adicionar 6º: toast "Máximo 5 anexos por mensagem").

## 5. Card de artefato inline

### 5.1 Anatomia básica

```
┌──────────────────────────────────────────────────────────┐
│ 📋  Perfil do Negócio                                    │
│ ─────────────────────                                     │
│                                                          │
│ Clínica Odontológica Sorriso (odontologia premium)       │
│                                                          │
│ Resumo: clínica premium com 4 dentistas, foco em         │
│ estética e implantes. Atende classe A/B em SP capital.   │
│ Ticket médio R$3k.                                       │
│                                                          │
│ Serviços: clareamento, lentes, implantes, prótese,       │
│ avaliação inicial.                                       │
│                                                          │
│ Público: 30-50 anos, conscientes de saúde bucal,         │
│ buscam estética com know-how técnico.                    │
│                                                          │
│ Objetivo do agente: qualificar leads do Instagram,       │
│ agendar avaliação gratuita, reduzir no-show.             │
│                                                          │
│ ────────────────────────────────────────────────         │
│ [✏️ Refinar]  [💬 Alterar no chat]  [✓ Aprovar]           │
└──────────────────────────────────────────────────────────┘
```

Visual:

- `bg-card`, `border border-border`, `rounded-lg`, padding 20px.
- Max width 640px (menor que bolha pra criar destaque visual dentro da mensagem).
- Título: `font-semibold text-base` com emoji embutido (sem duplicar icon fora).
- Divisor do título: `border-b border-border` com margem 12px.
- Conteúdo: `text-sm`, line-height 1.6, seções separadas por parágrafo.
- Footer de ações: `border-t border-border mt-4 pt-3`, flex justify-between ou gap-2.

### 5.2 Os 3 botões (ações do artefato)

| Botão | Ícone | Comportamento |
|---|---|---|
| `Refinar` | Pencil | Abre inline expansion ou Dialog (ver Dilema 1-C). Formulário editável. |
| `Alterar no chat` | MessageSquare | Fecha qualquer painel aberto, foca composer, insere placeholder sugestivo: "O que gostaria de ajustar neste artefato?". User digita → Arquiteto chama tool `refineArtifact(id, instruction)` → card é regenerado. |
| `Aprovar` | Check | Trava artefato (estado readonly). Arquiteto envia próxima mensagem avançando pra etapa seguinte. |

Aspecto dos botões:

- `Refinar`: `Button variant="outline" size="sm"` com ícone esquerdo.
- `Alterar no chat`: `Button variant="ghost" size="sm"`.
- `Aprovar`: `Button variant="default" size="sm"` (primary, destaque).

Keyboard: quando card está focado (Tab), atalhos:
- `R` = Refinar
- `C` = Alterar no chat
- `A` = Aprovar

### 5.3 Estado "aprovado" (readonly)

```
┌──────────────────────────────────────────────────────────┐
│ 📋  Perfil do Negócio                            ✓       │
│ ─────────────────────                                     │
│                                                          │
│ [conteúdo igual, 70% opacity]                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Sem botões de ação.
- Check verde 16px no canto superior direito.
- Conteúdo com `opacity-70` (indicando "este é o passado, segue o fluxo").
- Hover suave revela conteúdo em 100% opacity (read still happens).
- Card mantém `border`, sem destaque primary.

### 5.4 Estado "regenerando" (após clicar Alterar no chat)

```
┌──────────────────────────────────────────────────────────┐
│ 📋  Perfil do Negócio                       [regenerando]│
│ ─────────────────────                                     │
│                                                          │
│ [●●● shimmer horizontal]                                 │
│ [●●● shimmer horizontal]                                 │
│ [●●● shimmer horizontal]                                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Label `[regenerando]` em text-xs muted com pulsação.
- Conteúdo substituído por 3-5 linhas shimmer animadas.
- Dura o tempo do stream do LLM regenerando.

### 5.5 Os 4 artefatos (conteúdo por etapa)

Usa caso "Clínica Odontológica Sorriso" como exemplo consistente em todos.

#### 5.5.1 Artefato 1: Perfil do Negócio (Ideação)

Já exemplificado em § 5.1. Campos:

- **Nome do negócio** (string, 80 chars max)
- **Resumo executivo** (textarea, 400 chars max)
- **Serviços/produtos** (lista editável de strings)
- **Público-alvo** (textarea, 200 chars max)
- **Objetivo do agente** (textarea, 300 chars max)

#### 5.5.2 Artefato 2: Blueprint do Agente (Planejamento)

```
┌──────────────────────────────────────────────────────────┐
│ 📋  Blueprint do Agente                                  │
│ ─────────────────────                                     │
│                                                          │
│ Nome: Sofia                                              │
│ Gênero: Feminino                                         │
│                                                          │
│ Persona:                                                 │
│   • Tom: caloroso-profissional (70/100)                  │
│   • Formalidade: balanceada (55/100)                     │
│   • Humor: leve, raro (30/100)                           │
│   • Empatia: alta (80/100)                               │
│   • Anti-patterns: nunca falar como robô, não inventar   │
│     preços, não usar gírias (SP classe A/B)              │
│                                                          │
│ Técnicas comerciais:                                     │
│   ✓ Rapport (criar conexão antes de vender)              │
│   ✓ SPIN soft (diagnóstico consultivo)                   │
│   ✓ Objeção de preço (reframe valor)                     │
│                                                          │
│ Emojis: curadoria                                        │
│   • Usar: 👋 😊 ✨ (saudação, celebração, agendamento)    │
│   • Evitar: mensagens de preço, objeção, reclamação      │
│                                                          │
│ Voz TTS: desativada                                      │
│                                                          │
│ Capabilities:                                            │
│   ✓ Qualificação em 4 perguntas                          │
│   ✓ Agendamento de avaliação                             │
│   ✓ FAQ odontológico                                     │
│   ✓ Handoff (preço específico, urgência médica)          │
│                                                          │
│ ────────────────────────────────────────────────         │
│ [✏️ Refinar]  [💬 Alterar no chat]  [✓ Aprovar]           │
└──────────────────────────────────────────────────────────┘
```

Este é o artefato **maior**. Acima do limite de 5 campos, então abre **Dialog centralizado** no Refinar (ver Dilema 1-C).

Campos editáveis no Dialog:
- Nome e gênero (section "Identidade")
- 4 sliders de persona (section "Personalidade")
- TagList de anti-patterns (section "Anti-patterns")
- Multi-select de técnicas comerciais (section "Técnicas", com intensidade soft/balanced/aggressive por técnica)
- Config de emojis completa (section "Emojis", com modo/usage rules)
- Config de voz (section "Voz", toggle + provider + voice ID + política)
- Multi-select de capabilities (section "Capabilities")

#### 5.5.3 Artefato 3: Base de Conhecimento (Conhecimento)

```
┌──────────────────────────────────────────────────────────┐
│ 📋  Base de Conhecimento                                 │
│ ─────────────────────                                     │
│                                                          │
│ Documentos indexados (3):                                │
│   ✓ catalogo-sorriso-2025.pdf (12 páginas)               │
│   ✓ horarios-e-precos.xlsx (3 abas)                      │
│   ✓ https://clinicasorriso.com.br (8 páginas)            │
│                                                          │
│ Conhecimento adicional capturado:                        │
│   • Urgências: dor forte, trauma dental                  │
│   • Horário: seg-sex 8h-18h, sáb 8h-12h                  │
│   • Convênios: sem convênio, parcelamento 12x            │
│                                                          │
│ ────────────────────────────────────────────────         │
│ [✏️ Refinar]  [💬 Alterar no chat]  [✓ Aprovar]           │
└──────────────────────────────────────────────────────────┘
```

Refinar abre inline expansion (3 campos, baixa complexidade):
- Lista de documentos (pode adicionar/remover)
- Upload de novo documento
- Textarea pra notas adicionais

#### 5.5.4 Artefato 4: Resumo Final (Criação)

Aparece APENAS na etapa Criação. Consolida os 3 anteriores em visualização compacta read-only.

```
┌──────────────────────────────────────────────────────────┐
│ 📋  Resumo Final                                         │
│ ─────────────────                                        │
│                                                          │
│ ✨ Sofia                                                  │
│ Consultora de tratamentos odontológicos                  │
│                                                          │
│ ▸ Negócio: Clínica Sorriso (odontologia premium SP)     │
│ ▸ Persona: calorosa-profissional, balanceada             │
│ ▸ Técnicas: Rapport + SPIN + Objeção de preço            │
│ ▸ Emojis: curadoria (👋 😊 ✨)                            │
│ ▸ Voz: desativada                                        │
│ ▸ Capabilities: qualificação, agenda, FAQ, handoff       │
│ ▸ Conhecimento: 3 documentos indexados                   │
│                                                          │
└──────────────────────────────────────────────────────────┘

Acima deste card, abaixo do Resumo, aparece o preview do Flow
Diagram (seção 8 desta spec).
```

Sem botões de ação no card de Resumo Final. Os botões de ação estão embaixo do Flow Diagram preview.

### 5.6 Placement do card dentro da mensagem do Arquiteto

```
[avatar arquiteto]
Beleza, estruturei tudo o que coletamos sobre a clínica.
Dá uma olhada e me diz se captei certo:

┌──────────────────────────────────────────────────────────┐
│ 📋  Perfil do Negócio                                    │
│ ... conteúdo ...                                         │
│ [✏️ Refinar]  [💬 Alterar no chat]  [✓ Aprovar]           │
└──────────────────────────────────────────────────────────┘

Pode ajustar qualquer coisa clicando em Refinar, ou me
contar no chat o que mudar. Se estiver bom, só aprovar e
partimos pra próxima etapa.
```

Mensagem do Arquiteto sempre TEM texto antes e depois do card, contextualizando:
- Texto antes: "preparei X, dá uma olhada"
- Card
- Texto depois: instrução de como proceder

## 6. Painel de refino (inline expansion OU Dialog centralizado)

### 6.1 Quando cada pattern

Conforme Dilema 1-C:

| Artefato | Pattern |
|---|---|
| Perfil do Negócio (5 campos) | **Inline expansion** |
| Base de Conhecimento (3 campos) | **Inline expansion** |
| Blueprint do Agente (12+ campos) | **Dialog centralizado** |

### 6.2 Inline expansion (para artefatos simples)

Ao clicar `[Refinar]`, o card cresce em altura e substitui conteúdo readonly por formulário editável:

```
┌──────────────────────────────────────────────────────────┐
│ 📋  Perfil do Negócio                                    │
│ ─────────────────────                                     │
│                                                          │
│ ┌─ Nome do negócio ─────────────────────────────────┐    │
│ │ Clínica Odontológica Sorriso                      │    │
│ └───────────────────────────────────────────────────┘    │
│                                                          │
│ ┌─ Resumo executivo ────────────────────────────────┐    │
│ │ Clínica premium com 4 dentistas, foco em estétic. │    │
│ │ a e implantes. Atende classe A/B em SP capital.   │    │
│ │                                          127/400  │    │
│ └───────────────────────────────────────────────────┘    │
│                                                          │
│ ┌─ Serviços/produtos ───────────────────────────────┐    │
│ │ ✕ clareamento                                     │    │
│ │ ✕ lentes                                          │    │
│ │ ✕ implantes                                       │    │
│ │ ✕ prótese                                         │    │
│ │ ✕ avaliação                                       │    │
│ │ + adicionar                                       │    │
│ └───────────────────────────────────────────────────┘    │
│                                                          │
│ ┌─ Público-alvo ────────────────────────────────────┐    │
│ │ 30-50 anos, conscientes de saúde bucal...         │    │
│ │                                          98/200  │    │
│ └───────────────────────────────────────────────────┘    │
│                                                          │
│ ┌─ Objetivo do agente ──────────────────────────────┐    │
│ │ Qualificar leads do Instagram, agendar avaliação  │    │
│ │ gratuita, reduzir no-show.                        │    │
│ │                                          88/300  │    │
│ └───────────────────────────────────────────────────┘    │
│                                                          │
│ ────────────────────────────────────────────────         │
│                          [Cancelar]   [Salvar alterações] │
└──────────────────────────────────────────────────────────┘
```

Comportamento:

- Transição de altura suave (300ms ease-out).
- Chat fica pausado (scroll vertical travado até fechar).
- Botão `Cancelar` volta ao readonly sem salvar.
- Botão `Salvar alterações` envia `updateArtifact(id, data)` → Arquiteto recebe → envia mensagem de confirmação ("Anotei, mudei o resumo e adicionei X serviço") → card volta ao readonly atualizado.

### 6.3 Dialog centralizado (para Blueprint)

Ao clicar `[Refinar]` no Blueprint:

```
┌──────────────────────────────────────────────────────────────┐
│ [chat escurecido com overlay de 60% opacity]                 │
│                                                              │
│   ╭─────────────────────────────────────────────────────╮   │
│   │ Refinar Blueprint do Agente                     [X] │   │
│   │ ────────────────────────                            │   │
│   │                                                     │   │
│   │ ▸ Identidade                                        │   │
│   │   Nome: [Sofia                      ]               │   │
│   │   Gênero: ( ) Feminino  ( ) Masculino               │   │
│   │                                                     │   │
│   │ ▸ Personalidade                                     │   │
│   │   Tom         [══════●═══] 70/100 Caloroso          │   │
│   │   Formalidade [═════●════] 55/100 Balanceada        │   │
│   │   Humor       [══●═══════] 30/100 Raro              │   │
│   │   Empatia     [═══════●══] 80/100 Alta              │   │
│   │                                                     │   │
│   │ ▸ Anti-patterns                                     │   │
│   │   ✕ nunca falar como robô                           │   │
│   │   ✕ não inventar preços                             │   │
│   │   ✕ não usar gírias (SP classe A/B)                 │   │
│   │   + adicionar                                       │   │
│   │                                                     │   │
│   │ ▸ Técnicas comerciais                               │   │
│   │   ☑ Rapport          [soft ▼]                       │   │
│   │   ☑ SPIN             [soft ▼]                       │   │
│   │   ☐ AIDA                                            │   │
│   │   ☐ PAS                                             │   │
│   │   ☑ Objeção de preço [balanced ▼]                   │   │
│   │   ☐ Follow-up caloroso                              │   │
│   │                                                     │   │
│   │ ▸ Emojis                                            │   │
│   │   Modo: ( ) Nenhum  (●) Curadoria  ( ) Livre        │   │
│   │   Emojis permitidos: 👋 😊 ✨ [+ adicionar]          │   │
│   │   Usar em: ☑ Saudação ☑ Celebração ☑ Agendamento   │   │
│   │   Evitar em: ☑ Preço ☑ Objeção ☑ Reclamação        │   │
│   │                                                     │   │
│   │ ▸ Voz                                               │   │
│   │   [ ] Habilitar voz (TTS)                           │   │
│   │   (demais campos desabilitados até ativar)          │   │
│   │                                                     │   │
│   │ ▸ Capabilities                                      │   │
│   │   ☑ Qualificação                                    │   │
│   │   ☑ Agendamento                                     │   │
│   │   ☑ FAQ                                             │   │
│   │   ☑ Handoff humano                                  │   │
│   │   ☐ Follow-up automático                            │   │
│   │                                                     │   │
│   │ ──────────────────────────────────────────────      │   │
│   │                 [Cancelar]   [Salvar alterações]    │   │
│   ╰─────────────────────────────────────────────────────╯   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Especificações:

- Dialog max-w 720px, max-h 85vh com scroll interno.
- Seções colapsáveis (▸ indica colapsado, ▾ expandido). Todas abertas por default na primeira abertura.
- `Cancelar` (ghost, esquerda) e `Salvar alterações` (primary, direita) fixos no footer do Dialog.
- Escape fecha = Cancelar.
- Click fora fecha = Cancelar.
- Component shadcn: `Dialog`.

### 6.4 Mobile: bottom sheet pra Dialog, fullscreen pra inline

Em mobile:

- **Inline expansion** vira modal fullscreen (card de artefato full-screen, texto preenche tela, botões sticky no bottom).
- **Dialog centralizado** vira `Sheet side="bottom"` com `max-h 90vh`, drag handle visível no topo.

## 7. Composer com upload inline (detalhado)

### 7.1 Estados do composer

| Estado | Visual |
|---|---|
| **Idle** | Textarea vazia + botão anexo + botão enviar disabled |
| **Typing** | Textarea com texto, botão enviar habilitado primary |
| **Com anexos pending** | Mini-cards acima, textarea abaixo, botão enviar habilitado |
| **Enviando** | Textarea + anexos disabled, botão enviar vira spinner |
| **Bloqueado (upload em processamento)** | Textarea disabled com label "Aguardando processar anexos..." |

### 7.2 Tipos de anexo suportados

| Tipo | Formatos | Max tamanho | Max por mensagem |
|---|---|---|---|
| Arquivo | PDF, DOCX, CSV, XLSX, TXT | 10MB cada | 5 |
| Imagem | PNG, JPG, WEBP | 5MB cada | 5 |
| Link de site | URL válida (https://) | N/A | 3 |

Total de anexos combinados por mensagem: máximo 5.

### 7.3 Fluxo de upload

1. User clica `[📎]` → dropdown abre → escolhe tipo.
2. Input nativo de arquivo abre ou Dialog de URL.
3. Arquivo selecionado → mini-card aparece no composer com spinner "fazendo upload..."
4. Upload completa → spinner some, mini-card fica com estado "pronto pra enviar".
5. User adiciona mais arquivos ou digita mensagem.
6. User clica `[↑ Enviar]` → mensagem enviada com anexos.
7. Backend dispara ingest em background. Usuário vê mini-cards dentro da mensagem enviada com estado "processando" (spinner animado nos mini-cards).
8. Quando ingest completa, mini-cards atualizam pra "indexado" (check verde, sem disrupção no chat).
9. Arquiteto recebe evento `documentReady(docId)` e menciona no próximo turn ("recebi o catálogo, vou usar").

### 7.4 Preview do link de site

Quando user anexa URL, mini-card mostra:

```
┌──────────────────────────────────┐
│ 🔗 Clínica Sorriso               │
│    clinicasorriso.com.br         │
│    Processando... (6 páginas)    │
└──────────────────────────────────┘
```

Após fetch: favicon + título da página + URL + quantidade de páginas scrapadas.

### 7.5 Errors de upload

Falhas de upload ou ingest mostram mini-card com estado error:

```
┌──────────────────────────────────┐
│ 📄 catalogo-antigo.pdf    [retry]│
│    Erro: PDF corrompido          │
│    [remover]                     │
└──────────────────────────────────┘
```

User pode tentar de novo (retry) ou remover. Se não resolver, Arquiteto menciona no próximo turn ("não consegui processar o PDF X, tem outra fonte?").

## 8. Preview do Flow Diagram (etapa Criação)

### 8.1 Quando aparece

Exclusivamente na etapa Criação (etapa 4 de 4), dentro de uma mensagem do Arquiteto logo após o Resumo Final.

### 8.2 Wireframe

```
[avatar arquiteto]
Tudo pronto. Esse é o Flow Diagram do que a Sofia vai fazer:

┌──────────────────────────────────────────────────────────┐
│                                                          │
│                    [ Orquestrador ]                      │  ← dim, placeholder
│                          │                               │
│                    [ Sofia avatar+nome ]                 │  ← card central, destaque
│                    ┌─────┼─────┐                         │
│                    │     │     │                         │
│                    ▼     ▼     ▼     ▼        ▼          │
│            ┌───────┐ ┌───────┐ ┌───────┐ ┌────────┐     │
│            │Quali- │ │Agenda │ │ FAQ   │ │Handoff │     │
│            │ficaç. │ │mento  │ │       │ │        │     │
│            └───┬───┘ └───┬───┘ └───┬───┘ └────────┘     │
│                │         │         │                    │
│                ▼         ▼         ▼                    │
│            ┌───────┐ ┌───────┐ ┌───────┐                │
│            │ tool  │ │ tool  │ │ tool  │                │
│            │move…  │ │sched… │ │search…│                │
│            └───────┘ └───────┘ └───────┘                │
│                                                          │
│                     [ Fim da conversa ]                  │
└──────────────────────────────────────────────────────────┘

Se quiser ajustar qualquer coisa do diagrama, avise no chat.
Senão, clique abaixo pra criar a Sofia de verdade. Depois de
criada, ela fica disponível pra você refinar qualquer detalhe.

                   [ ✨ Criar agente Sofia ]
```

### 8.3 Especificação visual do diagrama

- Container `bg-muted/20 border rounded-lg`, padding 24px.
- Max width: igual ao card de artefato (640px).
- React Flow read-only (`nodesDraggable={false}`, `nodesConnectable={false}`, `elementsSelectable={false}`).
- Layout: `dagre` top-down, espaçamento 40px horizontal, 60px vertical.
- Nodes:
  - **Orquestrador**: card dim (`opacity-40`), placeholder, label "Orquestrador" + ícone ⚙️. Tooltip: "Entrará em Phase 10".
  - **Agente (Sofia)**: card central destacado, avatar 32px + nome + `role`. Borda primary.
  - **Categorias** (Qualificação, Agendamento, FAQ, Handoff, Follow-up se ativas): cards menores, borda primary/40, background primary/5.
  - **Tools** (folhas): menores ainda, label da tool, cinza claro.
- Edges: linhas finas (`stroke-muted-foreground/30`), sem setas terminais (minimalista).
- Animação: ao renderizar, nodes entram com `fade-in + slide-up` em stagger (100ms entre cada). Edges desenhadas após nodes aparecerem.
- Fim da conversa: node terminal simples "Fim", pequeno, dim.

### 8.4 Botão "Criar agente"

- `Button size="lg" variant="default"` com ícone ✨ Sparkles.
- Centralizado embaixo do Flow Diagram.
- Estados:
  - Idle: "✨ Criar agente {nome}"
  - Loading: "Criando..." com spinner (tempo típico 2-5s durante transação atômica)
  - Success: redireciona pra `/agents/[agentId]` (Painel de Refino v2) com toast "Agente Sofia criado com sucesso"
  - Error: Dialog com mensagem de erro + botão "Tentar novamente"

## 9. Responsividade (breakpoints)

| Breakpoint | Width | Ajustes |
|---|---|---|
| Desktop | ≥ 1024px (`lg:`) | Layout conforme specs; chat max-w 800px centralizado |
| Tablet | 768-1023px (`md:`) | Hero comprimido, grid 3 cols, composer altera botões |
| Mobile | < 768px | Tudo empilhado, fullscreen pra inline expansion, bottom sheet pra Dialog |

Bullet específicos por tela:

### 9.1 Tela de boas-vindas

- Desktop: hero central 640px, grid 4 cols
- Tablet: hero 520px, grid 3 cols
- Mobile: hero 100% com padding 24px, grid 2 cols, Personalizado sozinho na última linha

### 9.2 Tela de chat

- Desktop: max-w 800px centralizado, laterais vazias (cor bg-background)
- Tablet: 100% width com padding 32px lateral
- Mobile: 100% width com padding 16px lateral, status-bar compacta, composer botões menores

### 9.3 Cards de artefato

- Desktop: max-w 640px
- Tablet: 100% da largura da bolha
- Mobile: 100% da largura da bolha (que é full width)

### 9.4 Flow Diagram preview

- Desktop: 640px (fit)
- Tablet: 100% com scroll horizontal se precisar
- Mobile: 100% com scroll horizontal (é inevitável em tela pequena)

## 10. Estados especiais

### 10.1 Sessão retomada (user volta dias depois)

Ao abrir `/agents/new?session={sessionId}`:

1. Spinner central "Retomando sessão..."
2. Chat carrega histórico de mensagens (scroll no final).
3. Primeira mensagem nova do Arquiteto ao topo do chat depois do histórico:

```
[avatar arquiteto]
Olá! Estávamos criando a Sofia pra Clínica Sorriso. Você
parou na etapa Planejamento, já aprovamos o Perfil do Negócio.
Quer continuar de onde paramos ou revisar o que já temos?

[ ↪ Continuar planejamento ]   [ 🔍 Revisar tudo ]
```

Dois botões quick-action:
- `Continuar planejamento`: foca no composer, Arquiteto faz próxima pergunta.
- `Revisar tudo`: scroll pro topo do chat, mostra todos os artefatos aprovados.

### 10.2 Erro na publicação (transação atômica falhou)

Após clicar "Criar agente Sofia":

```
[avatar arquiteto]
Ops, tive um problema salvando a Sofia no banco. O erro foi:
"Conexão perdida durante a transação". Seus dados estão
seguros no rascunho.

Vamos tentar de novo?

                         [ Tentar criar novamente ]
```

Retry chama `publishAgentFromSession(sessionId)` de novo. Se falhar 3x seguidas, Arquiteto escala: "Vou pedir ajuda ao time técnico. Anote o código `ERR-{sessionId}` pra enviarmos suporte."

### 10.3 Limite de caracteres atingido (textarea)

Composer tem limite soft de 4000 chars por mensagem (o Arquiteto processa bem até lá, acima pode confundir).

Estados:
- 0-3500 chars: sem indicador
- 3500-3900: contador aparece: "3500/4000" em muted
- 3900-4000: contador em warning (amber)
- 4000+: contador em destructive red, botão enviar disabled, tooltip "Mensagem muito longa, divide em partes"

### 10.4 Offline / erro de rede

Badge discreto no header:

```
┌──────────────────────────────────────────────────────────────┐
│ [←] Clínica ▸ Novo agente    [● Offline]    [Salvar e sair] │
└──────────────────────────────────────────────────────────────┘
```

- Badge vermelho pulsante.
- Composer disabled com label "Sem conexão. Suas mensagens vão ser enviadas quando voltar."
- Mensagens digitadas offline ficam em queue local (localStorage) e enviam quando reconectar.
- Toast ao reconectar: "Conexão restaurada. Enviando 2 mensagens pendentes..."

### 10.5 Rate limit (se usuário mandar muitas mensagens rápido)

- Limite: 10 mensagens/min por session.
- Ao atingir: toast warning "Você está falando muito rápido. O Arquiteto precisa de tempo pra processar. Tente novamente em alguns segundos."
- Composer fica disabled por 5s com countdown visual.

## 11. Componentes novos (catálogo pra Aria)

Componentes a serem criados pela Phase 09. Pattern de localização: `apps/web/modules/saas/agents/architect/*`.

| Componente | Arquivo sugerido | Deps shadcn | Props chave |
|---|---|---|---|
| `ArchitectWelcomeHero` | `components/welcome/Hero.tsx` | Button | `hasAgents: boolean` (compact vs full) |
| `TemplateGrid` | `components/welcome/TemplateGrid.tsx` | Card | `templates: Template[]`, `onSelect(id)` |
| `TemplateCard` | `components/welcome/TemplateCard.tsx` | Card | `template: Template`, `isCustom?: boolean` |
| `SessionHistoryAccordion` | `components/welcome/SessionHistory.tsx` | Accordion, Badge | `drafts: Session[]`, `agents: Agent[]` |
| `ArchitectHeader` | `components/chat/Header.tsx` | Button, AlertDialog | `templateName: string`, `onExit()` |
| `StatusBar` | `components/chat/StatusBar.tsx` | — | `currentStage: Stage`, `completedStages: Stage[]` |
| `ArchitectChat` | `components/chat/Chat.tsx` | — | `sessionId: string`, uses useChat from AI SDK |
| `ArchitectMessage` | `components/chat/Message.tsx` | — | `message: Message`, `isAssistant: boolean` |
| `ArchitectComposer` | `components/chat/Composer.tsx` | Textarea, Button, DropdownMenu | `onSend(text, attachments)`, `disabled` |
| `AttachmentMenu` | `components/chat/AttachmentMenu.tsx` | DropdownMenu | `onAttachFile()`, `onAttachImage()`, `onAttachLink()` |
| `AttachmentPendingCard` | `components/chat/AttachmentPending.tsx` | — | `file: PendingAttachment`, `onRemove()` |
| `AttachmentMessageCard` | `components/chat/AttachmentMessage.tsx` | — | `attachment: MessageAttachment` (inside sent message) |
| `ArtifactCard` | `components/artifacts/ArtifactCard.tsx` | Button | `artifact: Artifact`, `onRefine()`, `onChatChange()`, `onApprove()` |
| `ArtifactInlineRefinement` | `components/artifacts/InlineRefinement.tsx` | Form fields | `artifact`, `onSave(data)`, `onCancel()` |
| `ArtifactDialogRefinement` | `components/artifacts/DialogRefinement.tsx` | Dialog, Form | `artifact`, `open`, `onOpenChange`, `onSave(data)` |
| `BlueprintRefinementForm` | `components/artifacts/BlueprintForm.tsx` | Slider, Select, RadioGroup, Checkbox, Input | `initialData`, `onChange` |
| `PersonaSliderField` | `components/artifacts/PersonaSlider.tsx` | Slider | `label`, `value`, `onChange`, `leftLabel`, `rightLabel` |
| `TagListField` | `components/forms/TagList.tsx` (reusar de 07B-v1) | Input, Badge | `tags: string[]`, `onChange` |
| `EmojiConfigField` | `components/artifacts/EmojiConfig.tsx` | RadioGroup, Checkbox | `config: EmojiConfig`, `onChange` |
| `VoiceConfigField` | `components/artifacts/VoiceConfig.tsx` | Switch, Select, RadioGroup, Checkbox | `config: VoiceConfig`, `onChange` |
| `TechniqueMultiSelect` | `components/artifacts/TechniqueSelect.tsx` | Checkbox, Select (per technique) | `selected`, `onChange` |
| `FlowDiagramPreview` | `components/diagram/Preview.tsx` | React Flow (a adicionar) | `agentConfig`, readonly |
| `CreateAgentCTA` | `components/diagram/CreateCTA.tsx` | Button | `onCreate()`, `loading` |

Total: ~22 componentes novos.

## 12. Tokens de design (shadcn + Tailwind existentes)

Reutilizar integralmente. Sem criar tokens novos nesta phase. Referência:

### 12.1 Componentes shadcn já instalados

Confirmado em 07B-v1 + necessários aqui:

- `Button` (variants: default, outline, ghost, secondary, destructive)
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- `AlertDialog` (pra exit confirmations)
- `Sheet side="bottom"` (pra mobile bottom sheet)
- `Accordion` (pra welcome sections)
- `DropdownMenu` (pra attachment menu)
- `Input`, `Textarea`, `Label`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
- `Slider` (pra personality fields)
- `RadioGroup`, `RadioGroupItem`
- `Checkbox`
- `Switch` (pra voice enable toggle)
- `Badge` (pra status labels)
- `Separator`
- `Tooltip`
- `Skeleton` (pra loading states)

### 12.2 Componentes shadcn a adicionar na Phase 09

| Componente | Por quê |
|---|---|
| `command` | Pra keyboard shortcuts (Cmd+K abre attachment menu) |
| `toast` (se não instalado) | Pra feedback de upload, erros, rate limit |

### 12.3 Lucide icons usados

Listagem completa:

`ArrowLeft`, `ArrowUp` (send), `Paperclip`, `FileText`, `Image`, `Link`, `X` (close), `Check`, `Pencil` (refine), `MessageSquare` (chat change), `Sparkles` (wand), `CheckCircle2` (approved), `AlertCircle` (error), `Wifi`, `WifiOff`, `Loader2` (spinning), `ChevronDown` (accordion), `ChevronRight` (sections), `Stethoscope` (clinical), `ShoppingCart` (e-commerce), `Home` (real estate), `Briefcase` (info product), `Cog` (SaaS), `Utensils` (local services).

Emojis como fallback dos ícones visuais de template (caso o designer prefira ícones coloridos): 🏥 🛒 🏠 💼 ⚙️ 🍽️ ✨. Proponho usar os emojis (visualmente mais ricos e amigáveis pro CEO). Aria decide técnica final com Neo.

### 12.4 Cores do tema

Só tokens existentes:
- `bg-background` (fundo principal)
- `bg-card` (cards, artefatos)
- `bg-muted` (bubbles do usuário, fundos secundários)
- `bg-muted-foreground` (textos secundários)
- `text-foreground` / `text-muted-foreground`
- `border-border` (separadores)
- `primary` / `primary-foreground` (CTAs, indicators)
- `destructive` (errors)
- `amber-500` / `amber-600` (warnings, check verde uses `green-500`)

Sem cor custom. Dark mode herda automático via CSS variables.

## 13. Acessibilidade

- Teclado completo: Tab navega no chat, cards, composer, botões. Enter envia mensagem, Shift+Enter quebra linha.
- Cards de artefato: atalhos R/C/A documentados (ver § 5.2).
- Focus visible: herda do tema (`ring-2 ring-ring`).
- ARIA:
  - Status-bar: `role="status"` + `aria-live="polite"` pra anunciar mudanças de etapa.
  - Cards de artefato: `role="article"` com `aria-labelledby` apontando pro título.
  - Composer: Textarea com `aria-label="Mensagem para o Arquiteto"`.
  - Botões: `aria-label` descritivo em todos (especialmente ícones sem label).
- Screen reader: mensagens do Arquiteto anunciadas assim que stream finaliza; mensagens do usuário anunciadas ao enviar.
- Contraste: WCAG AA mínimo (tokens já atendem).
- Reduced motion: respeitar `prefers-reduced-motion` em animações (shimmer, slide transitions, fade-in de diagrama).

## 14. Translations (pt-BR)

Adicionar em `apps/web/modules/i18n/translations/pt-BR.json` sob namespace `architect`:

```json
{
  "architect": {
    "welcome": {
      "hero": {
        "titleEmpty": "Crie seu primeiro agente comercial em 15 minutos",
        "subtitleEmpty": "O Arquiteto conduz a conversa. Você aprova cada etapa e publica.",
        "titleWithAgents": "Agentes",
        "subtitleWithAgents": "Agentes comerciais criados pelo Arquiteto",
        "ctaCreate": "Criar com o Arquiteto",
        "ctaCreateShort": "Criar novo agente"
      },
      "divider": "ou comece com um template pronto",
      "dividerWithAgents": "Começar do zero com um template",
      "templates": {
        "clinical": { "label": "Clínica", "description": "Odontologia, estética, veterinária" },
        "ecommerce": { "label": "E-commerce", "description": "Lojas online, moda, acessórios" },
        "realEstate": { "label": "Imobiliária", "description": "Venda, aluguel, corretagem" },
        "infoProduct": { "label": "Infoprodutor", "description": "Cursos, coaching, mentoria" },
        "saas": { "label": "SaaS", "description": "Software, automação, B2B" },
        "localServices": { "label": "Serviços locais", "description": "Restaurante, salão, oficina" },
        "custom": { "label": "Personalizado", "description": "Monte do zero com o Arquiteto" }
      },
      "sections": {
        "drafts": { "title": "Rascunhos em andamento", "empty": "Nenhum rascunho em andamento." },
        "agents": { "title": "Agentes publicados", "empty": "Nenhum agente publicado ainda." }
      },
      "draftCard": {
        "continueAction": "Continuar",
        "stageLabel": "Etapa {stage}",
        "timeRelative": {
          "minutesAgo": "há {n} minuto(s)",
          "hoursAgo": "há {n} hora(s)",
          "yesterday": "ontem, {time}",
          "daysAgo": "há {n} dias"
        }
      }
    },
    "chat": {
      "header": {
        "breadcrumbSeparator": "▸",
        "newAgent": "Novo agente",
        "saveExit": "Salvar e sair",
        "exitConfirm": {
          "title": "Sair sem publicar?",
          "description": "Seu rascunho fica salvo. Você pode continuar depois em Agentes.",
          "stayAction": "Continuar aqui",
          "exitAction": "Salvar rascunho e sair"
        }
      },
      "statusBar": {
        "stages": {
          "ideation": "Ideação",
          "planning": "Planejamento",
          "knowledge": "Conhecimento",
          "creation": "Criação"
        },
        "mobileLabel": "{stage} ({current}/{total})"
      },
      "composer": {
        "placeholder": "Digite sua mensagem...",
        "placeholderBlocked": "Aguardando processar anexos...",
        "placeholderOffline": "Sem conexão. Suas mensagens vão ser enviadas quando voltar.",
        "sendAction": "Enviar",
        "attachMenu": {
          "file": { "label": "Arquivo", "description": "PDF, DOCX, CSV, XLSX, TXT (até 10MB cada)" },
          "image": { "label": "Imagem", "description": "PNG, JPG (até 5MB)" },
          "link": { "label": "Link de site", "description": "Cole uma URL, o Arquiteto faz a leitura" }
        },
        "charCount": "{n}/{max}"
      },
      "states": {
        "thinking": "pensando",
        "regenerating": "regenerando",
        "uploading": "enviando",
        "processing": "processando",
        "indexed": "indexado"
      }
    },
    "artifacts": {
      "actions": {
        "refine": "Refinar",
        "changeInChat": "Alterar no chat",
        "approve": "Aprovar"
      },
      "states": {
        "approved": "aprovado",
        "regenerating": "regenerando"
      },
      "titles": {
        "businessProfile": "Perfil do Negócio",
        "agentBlueprint": "Blueprint do Agente",
        "knowledgeBase": "Base de Conhecimento",
        "finalSummary": "Resumo Final"
      },
      "refinementDialog": {
        "title": "Refinar {artifactName}",
        "cancel": "Cancelar",
        "save": "Salvar alterações"
      }
    },
    "creation": {
      "flowDiagram": {
        "title": "Flow Diagram do seu agente",
        "orchestratorLabel": "Orquestrador",
        "orchestratorTooltip": "Entrará em Phase 10",
        "endLabel": "Fim da conversa"
      },
      "createAction": "Criar agente {name}",
      "creating": "Criando...",
      "createSuccess": "Agente {name} criado com sucesso",
      "createError": {
        "title": "Erro ao criar agente",
        "messageGeneric": "Ops, tive um problema salvando. Seus dados estão seguros no rascunho.",
        "retry": "Tentar novamente"
      }
    },
    "errors": {
      "offline": "Offline",
      "rateLimit": "Você está falando muito rápido. O Arquiteto precisa de tempo pra processar. Tente novamente em alguns segundos.",
      "attachmentTooLarge": "Arquivo muito grande. Limite de {max}MB.",
      "attachmentTooMany": "Máximo 5 anexos por mensagem.",
      "attachmentInvalidType": "Tipo de arquivo não suportado.",
      "messageTooLong": "Mensagem muito longa, divide em partes."
    }
  }
}
```

## 15. Fora do escopo desta spec (adiado)

Delimitar com clareza pra Aria não expandir escopo:

- ❌ **Chat de Evolução pós-criação** (agente já publicado recebendo updates conversacionais). Phase 07B-v2.
- ❌ **Sandbox de teste** (conversa simulada com persona de lead). Phase 07B-v2.
- ❌ **Flow Diagram interativo** (arrastar nodes, expandir tools). Phase 07C.
- ❌ **Voice input do usuário** (gravar áudio pro Arquiteto). Phase 09.5 ou futuro.
- ❌ **Template library editável pelo Master** (white label adicionar novos verticais). Phase 13 (Whitelabel).
- ❌ **Biblioteca de técnicas comerciais extensível** (Master adiciona SPIN Advanced, Challenger etc). Phase 13.
- ❌ **Refinar TAG de emoji por contexto com AI** (user digita "feliz mas não infantil" e AI sugere emojis). Futuro.
- ❌ **Versionamento durante criação** (user volta 3 etapas, reformata). Fora do MVP, pular etapa depois aprovar é OK.

## 16. Handoff pro próximo agente

Este documento é consumido por:

### 16.1 `@architect` (Aria) — tech spec

Aria recebe esta UI spec + PRD v2 e produz `docs/phase-09/tech-spec-arquiteto.md` contendo:

1. **Instructions template do Arquiteto** (prompt-engineering do agente Mastra).
2. **Working memory structure**: JSON schema do checklist adaptativo interno.
3. **Tool signatures completas** das `architectTools` (Zod input/output, error cases).
4. **RAG chunk strategy**: fixed-size vs semantic-aware, overlap, embedding model final.
5. **Decisão @mastra/rag vs adapter próprio**: baseada em pesquisa do Link.
6. **Transação atômica de publicação**: sequência SQL, rollback paths.
7. **Migração vector store de rascunho pra RAG oficial**: mecanismo técnico.
8. **Streaming e back-pressure**: como o composer não deixa usuário enviar 2x enquanto LLM stream.
9. **Session persistence**: schema + frequência de auto-save + reconnect logic.
10. **Rate limiting no composer**: implementação (middleware ou client-side?).

### 16.2 `@analyst` (Link) — pesquisa em paralelo

Link pesquisa via context7 (simultâneo ao Aria):

- Mastra Memory com working memory estruturada (patterns, limitações)
- `@mastra/rag` versão atual + chunks strategies suportadas
- ElevenLabs Node SDK (pra voice TTS em Phase 07B-v2, reservar research cedo)
- pgvector com Drizzle ORM best practices
- React Flow read-only performance (>50 nodes em diagrama)

Entrega: `docs/phase-09/research-dependencies.md`

### 16.3 `@data-engineer` (Dozer) — migrations

Dozer produz migrations de Phase 08-alpha (pré-requisito de Phase 09):

- Habilitar pgvector (via MCP Supabase)
- Schema `knowledge_documents` + `knowledge_chunks` (com vector column via raw SQL)
- Schema `agent_creation_session`
- Adicionar campos novos em `agent` (`emojiConfig`, `voice`, `salesTechniques`, `antiPatterns`, `conversationExamples`)
- RLS policies pra todas as tabelas
- Indexes HNSW pros embeddings

### 16.4 `@sm` (Niobe) — stories

Após Aria + Link + Dozer entregarem, Niobe quebra em stories. Estimativa baseada nesta spec:

- **Phase 08-alpha**: ~5 stories (pgvector, rag infra, architectTools subset pra Phase 09, session table, document storage integration)
- **Phase 09**: ~10 stories
  - 09.1 Tela de boas-vindas + grid de templates
  - 09.2 Session history accordion + retomada de sessão
  - 09.3 Shell do chat (header + status-bar + area de mensagens)
  - 09.4 Composer com textarea expansível + keyboard shortcuts
  - 09.5 Attachment menu + upload flow + mini-cards
  - 09.6 ArtifactCard base + 3 actions
  - 09.7 ArtifactInlineRefinement (Perfil + Base de Conhecimento)
  - 09.8 ArtifactDialogRefinement (Blueprint, dialog completo)
  - 09.9 FlowDiagramPreview + botão Criar + transação atômica
  - 09.10 Estados especiais (offline, rate limit, retomada, erros) + Quality Gate

Gate humano Vinni entre cada story.

### 16.5 Dilemas ainda pendentes de Vinni (leitura rápida)

- Dilema 1: confirmar o pattern híbrido inline + Dialog (§ 2).
- Dilema 2-6: resolvidos pela Sati, aguardam só feedback se houver reversão.

## 17. Decisões travadas aqui (não renegociar nas stories)

1. Single-pane chat-first (sem split 50/50).
2. Width max 800px no desktop.
3. Status-bar fino sempre visível (28px, minimalista).
4. Grid 4+3 pra templates (Personalizado último, dashed).
5. Emojis como ícones de template (não Lucide). Sem ilustrações custom.
6. Refinar híbrido (inline pra 3-5 campos, Dialog pra 6+).
7. Mobile bottom sheet pra refino longo.
8. Sem voice input do usuário em Phase 09 MVP.
9. Reuso de TagList da 07B-v1 e todos os form components existentes.
10. Preview do Flow Diagram só aparece na etapa Criação (não antes).

## 18. Decisões adiadas pra Phase 07B-v2 ou depois

- Chat de Evolução pós-publicação (07B-v2)
- Sandbox de teste (07B-v2)
- Edição de config via Orquestrador (ADR-001 bloqueia, não acontece)
- Undo granular dentro da sessão de criação (não vejo necessidade, pular etapa já aprovada é rara)
- Colaboração multi-user na mesma sessão (fora do escopo)
- Histórico de versões do Blueprint durante a criação (fora do escopo, só após publicação)

---

*Assinado: Sati (@ux-design-expert), 2026-04-19. Empathizer nurturing the user journey from empty state to published agent, one artifact at a time.* 🎨
