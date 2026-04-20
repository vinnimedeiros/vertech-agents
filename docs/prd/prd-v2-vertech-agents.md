---
type: prd
title: "PRD v2 Vertech Agents — Reformatação estratégica (Arquiteto Primeiro)"
version: "2.0"
status: approved
date: 2026-04-19
project: vertech-agents
author: Morgan (@pm) sob direção estratégica de Vinni (CEO)
audience: Equipe LMAS (@ux-design-expert, @architect, @data-engineer, @sm, @dev)
supersedes: "Roadmap inicial de 13 fases (2026-04-16)"
tags:
  - project/vertech-agents
  - prd
  - roadmap/v2
  - phase/07b
  - phase/08
  - phase/09
  - phase/10
---

# PRD v2 Vertech Agents

> **O que mudou em v2:** reformatação estratégica aprovada pelo CEO em 2026-04-19 após pesquisa competitiva do Mercado Agentes. O Arquiteto deixa de ser "Phase 09 no futuro" e vira a **porta de entrada primária** do produto, antes do Painel de Refino manual. Criação de agente passa a ser "IA criando IA", não formulário. Edição pós-criação vira refino granular apoiado pelo mesmo Arquiteto que construiu.

## 1. Visão executiva

### 1.1 Proposta de valor renovada

O Vertech Agents entrega **agentes comerciais inteligentes operando em WhatsApp, criados por IA e refinados granularmente pelo dono do negócio**. O diferencial competitivo não está em "ter chat com IA" (commodity), mas em:

1. **Criar IA com IA.** O usuário conversa com um Arquiteto que faz perguntas guiadas, recebe arquivos e materiais durante a conversa, propõe artefatos refináveis a cada etapa e entrega um agente pronto ao fim. Experiência de 15 minutos que substituiria 3 dias de formulários.
2. **Refino granular pós-criação.** Depois do agente salvo, o dono vê um Flow Diagram visual da construção e pode ajustar qualquer detalhe (tom, técnica comercial, emoji, voz, conhecimento) em painéis organizados. Ou volta a conversar com o mesmo Arquiteto pra evoluir ("adicionei 2 produtos novos") e ele aplica as mudanças com contexto total.
3. **Ultra-personalização agent-native.** Cada config da UI tem tool paritária (Configurabilidade Tripla) acessível por agente e preset. O produto é operado por agentes, não só assistido por eles.

### 1.2 O que a v2 altera em relação à v1

| Área | v1 (2026-04-16) | v2 (2026-04-19) |
|---|---|---|
| Porta de entrada de criação | Formulário simples em `/agents/new` + edição manual em 6 abas | Arquiteto com chat full + grid de templates + artefatos-cards refináveis |
| Ordem das phases | 07B antes de 08, 09 depois | 07B pausado, 08-slice + 09 antecipados, 07B-v2 vem depois |
| Papel da UI de 6 abas | Criação manual pós-MVP | Painel de Refino pós-Arquiteto (não cria, refina) |
| Phase 09 (Arquiteto) | Split 50/50 chat + preview ao vivo | Single-pane chat tipo Claude, artefatos inline, preview Flow Diagram só no fim |
| Phase 10 (Orquestrador) | Tinha tools de edição estrutural de agente | Escopo reduzido a operação. Edição estrutural vai pro Arquiteto (ADR-001) |
| Upload de conhecimento | Etapa fixa pós-criação (Phase 08) | Disponível durante conversa com Arquiteto (vector store de rascunho vira RAG oficial) |
| Features novas | Não previstas | Emojis granulares, técnicas comerciais presets, voz TTS, tom natural calibrável |

### 1.3 Hipóteses centrais (apostas)

- **H1.** Criar agente em 15 minutos via conversa guiada converte melhor que formulário de 30 minutos, mesmo que o resultado final seja equivalente. (Validar com time-to-first-active-agent em beta.)
- **H2.** Upload de materiais durante a conversa reduz abandono na etapa de conhecimento (hoje 40% no Mercado Agentes pula). (Validar com taxa de agentes com RAG ativo.)
- **H3.** Ter o mesmo Arquiteto evoluindo o agente pós-criação (ADR-001) gera menor carga mental que split "quem cria, quem opera". (Validar com NPS de evolução pós-criação.)
- **H4.** Vertech capta demanda real desde dia 1 (não é MVP de teste de mercado). Infra robusta é obrigatória, não incremental. (Reafirma `feedback_escala_desde_dia_1.md`.)

## 2. Pesquisa competitiva consolidada

Documento fonte: `docs/research/mercado-agentes-assistant-flow.md`. Aqui o resumo decisório.

### 2.1 O que o Mercado Agentes faz bem (replicar o conceito, NÃO a UI)

1. Fluxo de 4 etapas com IA + refinamento por etapa.
2. Mini-PRD estruturado na etapa 1 (Título + Resumo + Serviços + Objetivos + Identidade).
3. Blocos narrativos densos na etapa 2 (cada capability = 1 parágrafo rico, não switches).
4. Canvas visual auto-gerado ao final (flow diagram operável).
5. Gênero só Feminino/Masculino (validado).

### 2.2 O que o Mercado Agentes não faz bem (nossa oportunidade)

1. Single-turn por etapa (sem conversa real) → **v2 vai multi-turn adaptativo.**
2. Zero preview visual durante criação → **v2 mostra Flow Diagram só na etapa final (Criação), suficiente e menos poluído.**
3. Etapa Conhecimento binária (arquivo ou pula) → **v2 permite upload durante toda a conversa.**
4. Verticais hardcoded (8 fixos) → **v2 tem biblioteca editável por Master (white label).**
5. Perguntas por vertical hardcoded → **v2 tem banco editável + IA adaptativa.**
6. Tom de voz string solta ("friendly") → **v2 tem persona granular (4 eixos + emojis + técnicas + voz).**
7. Blocos narrativos prolixos → **v2 usa títulos + bullets curtos + expandir detalhes.**
8. Sem sandbox de teste durante criação → **v2 entrega sandbox no Painel de Refino (antes de vincular WhatsApp).**
9. Sem auto-save → **v2 tem `agent_creation_session` com snapshot a cada tool call.**

### 2.3 Decisões estratégicas tomadas (fecha as 4 perguntas da pesquisa)

Perguntas originais em `docs/research/mercado-agentes-assistant-flow.md § 10`. Respostas:

1. **Phase 07B continua?** **Sim, mas repaginada como Painel de Refino**, não criação. Código das 8 stories implementadas (branch `feature/07B.1-agents-list-and-new`) será reaproveitado.
2. **Adiantar Phase 09?** **Sim, prioridade máxima.** Vira foundation.
3. **Flow Diagram no Arquiteto?** **Só no final (etapa Criação).** Mantém chat limpo durante as etapas anteriores. Flow Diagram central (interativo) fica no Painel de Refino.
4. **Sandbox de teste durante criação?** **Não na criação, sim no Refino.** Antes de vincular WhatsApp, usuário testa o agente em sandbox.

## 3. Roadmap v2 (nova ordem das phases)

### 3.1 Visão geral

```
Phases concluídas (não mudam):
01 Foundation ✅
02 Multitenancy ✅
03 + 03E Core UI + Shell v2 ✅
04 + 04E + 04F CRM + Pipeline v2 + Template Library ✅
05 Chat ✅
06 + 06.5 WhatsApp + Contatos ✅
07A Mastra core ✅

Reformatação começa aqui:

┌─────────────────────────────────────────────┐
│ Phase 07B (v1) — PAUSADA                    │
│ Branch: feature/07B.1-agents-list-and-new   │
│ 8 stories implementadas, não pushed          │
│ Código será reaproveitado na 07B-v2          │
└─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Phase 08-alpha — Slice RAG + architectTools │
│ • pgvector habilitado                        │
│ • Ingest/chunk/embed de documentos           │
│ • architectTools (tools do Arquiteto)        │
│ • agent_creation_session table               │
└─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Phase 09 — Arquiteto Construtor              │
│ (foundation do produto)                      │
│ • Tela boas-vindas + grid templates          │
│ • Chat full single-pane tipo Claude          │
│ • 4 etapas via roteiro invisível             │
│ • Artefatos-cards inline com refino          │
│ • Upload durante conversa                    │
│ • Preview Flow Diagram só na Criação final   │
│ • Publicação atômica                         │
└─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Phase 07B-v2 — Painel de Refino              │
│ (pós-criação pelo Arquiteto)                 │
│ • Flow Diagram central (React Flow)          │
│ • 6 abas reaproveitadas de 07B v1            │
│ • Novas abas: Voz, Emojis, Técnicas          │
│ • Chat lateral com Arquiteto (evolução)      │
│ • Sandbox inline (teste antes WhatsApp)      │
└─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Phase 08-beta — Tools comerciais restantes   │
│ • commercialTools (7 tools principais)       │
│ • Tool call logging pra supervisão           │
└─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Phase 07C — Flow Diagram avançado            │
│ • Interatividade completa (expand/collapse)  │
│ • Audit/undo 30d por aba                     │
│ • Diff viewer entre versões                  │
└─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│ Phase 10 — Orquestrador (escopo revisado)   │
│ • Escopo reduzido (ADR-001)                  │
│ • Não edita persona/business/tools de agente │
│ • Só operação: leads, pipeline, chat, agenda │
└─────────────────────────────────────────────┘
                │
                ▼
Phase 10b Supervisor Panel (observability) — mantém
Phase 11 Calendar — mantém
Phase 12 Billing (AbacatePay) — mantém
Phase 13 Whitelabel — mantém
```

### 3.2 Justificativa da reordenação

**Por que 08-alpha vem antes de 09?**
O Arquiteto depende de 3 blocos do 08 pra ser funcional: (a) `architectTools` pra gerar artefatos via tool calls; (b) RAG infra pra upload durante conversa virar conhecimento pesquisável; (c) `agent_creation_session` pra auto-save. Sem esses, o Arquiteto é fachada.

**Por que 09 vem antes de 07B-v2?**
O Painel de Refino opera sobre agentes que **já existem**. Sem o Arquiteto, não há como criar agentes (o formulário simples da 07B-v1 não cobre os novos campos: emojis granulares, técnicas comerciais, voz TTS). Invertendo a ordem criamos dívida imediata.

**Por que 07B-v2 vem antes de 07C?**
07B-v2 entrega o MVP funcional do Painel (Flow Diagram estático + abas editáveis + chat lateral + sandbox). 07C adiciona interatividade avançada (expand/collapse de nodes, diff viewer, undo granular). Separar entrega valor antes sem perder.

**Por que 10 vem depois de 07C?**
Com ADR-001, Orquestrador perde 7 tools de edição estrutural. O registry dele fica focado em operação. Pode ser implementado depois sem bloquear o produto principal (agente criado + refinado + operando em WhatsApp).

### 3.3 Impacto no branch feature/07B.1-agents-list-and-new

Branch atual tem 8 stories implementadas (07B.1-8) que entregam CRUD visual do agente em 6 abas. Este código **NÃO é jogado fora**.

**Estratégia de reaproveitamento:**
- Componentes de forma (`AgentSettingsMenu`, `DirtyStateBanner`, `use-agent-form`, abas Identidade/Persona/Negócio/Conversas/Modelo/WhatsApp) migram pro Painel de Refino (07B-v2) **com adaptações**.
- Rota `/agents/new` muda de "formulário simples" pra "tela de boas-vindas do Arquiteto" (Phase 09).
- Rota `/agents/[agentId]` ganha Flow Diagram central e chat lateral com Arquiteto (Phase 07B-v2).

**Decisão sobre push:** manter branch em hold, sem push nem PR. Quando 09 e 07B-v2 chegarem perto de merge, reformatar branch ou fazer rebase/squash estratégico. Evitar mergear 07B-v1 como está pra não gerar dívida de "tela de criação manual" em produção.

## 4. Phase 09 — Arquiteto Construtor (detalhado)

### 4.1 Escopo e objetivo

Entregar a experiência onde um usuário não-técnico cria um agente comercial completo conversando com o Arquiteto. Ao fim da conversa tem: agente salvo em DRAFT com todas as configs, knowledge base opcional indexada, Flow Diagram visual, pronto pra entrar no Painel de Refino.

**Tempo-alvo:** 10 a 20 minutos do clique no template até o agente salvo.

### 4.2 Superfície de UI

#### 4.2.1 Tela de boas-vindas (`/app/[orgSlug]/agents`)

Substitui a lista de agentes vazia. Quando há agentes, mantém híbrido (boas-vindas no topo + lista embaixo).

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   Criar um agente comercial                                  │
│   em 15 minutos com o Arquiteto                              │
│                                                              │
│              [ + Criar agente com o Arquiteto ]              │
│                                                              │
│   Ou comece com um template:                                 │
│                                                              │
│   ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                   │
│   │ 🏥   │  │ 🛒   │  │ 🏠   │  │ 💼   │                   │
│   │Clínica│  │E-com │  │Imób. │  │Info- │                   │
│   │       │  │      │  │      │  │produ │                   │
│   └──────┘  └──────┘  └──────┘  └──────┘                   │
│                                                              │
│   ┌──────┐  ┌──────┐  ┌──────┐                              │
│   │ ⚙️   │  │ 🍽️   │  │ ✨   │                              │
│   │SaaS  │  │Serv. │  │Person│                              │
│   │      │  │Locais│  │aliz. │                              │
│   └──────┘  └──────┘  └──────┘                              │
│                                                              │
│   ▾ Rascunhos em andamento (2)                               │
│     Amanda (Imobiliária)  •  há 3h   [Continuar]            │
│     Sofia (Clínica Dental) •  ontem  [Continuar]            │
│                                                              │
│   ▾ Agentes criados (3)                                      │
│     [lista de agentes em modo compacto]                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Elementos-chave:
- **Hero** com CTA primary grande "Criar agente com o Arquiteto"
- **Grid de 7 templates** (6 verticais built-in + 1 "Personalizado"). Templates carregam prompts iniciais adaptados, mas o fluxo é o mesmo.
- **Rascunhos em andamento** (colapsável) lista sessões `agent_creation_session` com `status === 'draft'` do user logado.
- **Agentes criados** (colapsável) lista compacta de agentes da org. Click abre Painel de Refino.

#### 4.2.2 Tela de chat do Arquiteto (`/app/[orgSlug]/agents/new?template={id}` ou `/agents/new?session={sessionId}` pra retomar)

Layout single-pane, chat full tipo Claude/ChatGPT. **NÃO** usar split 50/50 como previsto no vault original. Preview visual fica como card inline no chat quando necessário.

```
┌──────────────────────────────────────────────────────────────┐
│  [←]  Novo agente  •  Imobiliária              [Salvar sair]│
│  ───────────────────────────────────────────────────────────│
│                                                              │
│  ░ Ideação ✓  •  Planejamento ●  •  Conhecimento  •  Criação│ ← status-bar fino
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Avatar Arquiteto]                                          │
│  Ótimo! Anotei seus serviços principais. Agora vamos falar  │
│  da persona. Como você imagina o tom de voz da sua agente?  │
│  Mais descontraído, mais formal? Algum exemplo de             │
│  atendimento que você admira?                                │
│                                                              │
│                              [Você] Gostamos de ser          │
│                              calorosos mas profissionais.    │
│                              Tipo o atendimento do Nubank,   │
│                              sabe?                           │
│                                                              │
│  [Avatar Arquiteto]                                          │
│  Perfeito, peguei o vibe. Aqui está a persona que vou       │
│  propor. Pode refinar no card ou me dizer o que ajustar:    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📋 Persona da Amanda                                 │   │
│  │ ──────────────────                                    │   │
│  │ Tom: calorosa-profissional (70% descontração)        │   │
│  │ Formalidade: balanceada (55%)                        │   │
│  │ Emojis: curadoria (pode usar em saudações, celebr-  │   │
│  │   ações; nunca em tópicos sérios ou de preço)        │   │
│  │ Técnicas: Rapport + SPIN (preset soft)               │   │
│  │ ▸ Ver anti-patterns (4)                              │   │
│  │                                                      │   │
│  │ [Refinar artefato]  [Mandar alteração no chat]      │   │
│  │ [Aprovar]                                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  [📎] [🎤] Digite sua mensagem...           [↑ Enviar]       │
└──────────────────────────────────────────────────────────────┘
```

Anatomia:

- **Header:** botão voltar + breadcrumb template + "Salvar e sair" (salva sessão em DRAFT).
- **Status-bar fino opcional:** 4 etapas com check-verde quando concluídas. Não intrusivo, serve pra orientar.
- **Área de mensagens:** bubbles tipo Claude. Mensagens do Arquiteto podem conter **cards de artefato** inline.
- **Card de artefato:** caixa com título + conteúdo compacto + 3 ações (Refinar / Mandar alteração / Aprovar).
- **Composer:** textarea expansível + 2 botões (anexo multi-tipo + gravação de voz opcional) + enviar.

#### 4.2.3 Comportamento dos 3 botões do card de artefato

**[Refinar artefato]**
Abre painel deslizante da direita (slide-in 400px wide) com campos editáveis do artefato em formulário. Ex: se artefato é "Persona", painel tem sliders de tom/formalidade/humor/empatia, select de técnicas, TagList de anti-patterns. Salvar fecha painel e atualiza o card inline. Não reabre conversa, só edita.

**[Mandar alteração no chat]**
Fecha qualquer painel aberto, foca no composer, insere placeholder suave ("Descreva o ajuste…"). Usuário digita em linguagem natural ("deixa mais formal, tipo 40%"). Arquiteto chama tool `refineArtifact(artifactId, instruction)` que regenera o artefato e substitui o card. O usuário vê card antigo "tachado" por 2s e o novo aparece.

**[Aprovar]**
Trava o card (sem ação de edição mais, só visualização), marca etapa como concluída no status-bar, Arquiteto avança pra próxima etapa com mensagem contextual ("Beleza, Amanda está com essa personalidade. Agora vamos para…").

#### 4.2.4 Upload durante conversa

Composer tem botão `[📎]` que abre menu com:
- Enviar arquivo (PDF, DOCX, CSV, XLSX, TXT) — múltiplos
- Enviar imagem (PNG, JPG) — múltiplos
- Enviar link de site (colar URL, Arquiteto faz fetch)

Fluxo em qualquer momento:
1. Usuário anexa arquivo. Mensagem do usuário aparece com mini-card do arquivo.
2. Arquiteto acusa: "Recebi o catálogo de preços, vou usar como referência."
3. Backend dispara ingest em background (já com `knowledgeDocuments.status === 'PROCESSING'`).
4. Na etapa Conhecimento, Arquiteto faz recap: "Aprendi X, Y, Z do catálogo. Falta alguma informação importante sobre os imóveis?"
5. Ao publicar, vector store do rascunho migra pra `knowledgeDocuments` permanentes do agente.

### 4.3 Fluxo narrativo (4 etapas via roteiro invisível)

O Arquiteto não exibe "Etapa 1 de 4" no UI principal. Só o status-bar fino ao topo comunica progresso. Internamente o agente mantém um **checklist adaptativo** no working memory.

#### 4.3.1 Etapa Ideação (2-5 min)

Objetivo: coletar contexto mínimo do negócio.

Campos que o Arquiteto deve preencher no working memory:
- `businessName` (obrigatório)
- `industry` (obrigatório, pré-preenchido do template selecionado)
- `targetAudience` (obrigatório)
- `offering` (obrigatório) — serviços/produtos principais
- `differentiator` (opcional)
- `goalForAgent` (obrigatório) — o que o agente deve fazer (atender, qualificar, vender, agendar)

Comportamento adaptativo:
- Se usuário responde 1 frase cobrindo 3 campos, Arquiteto pula perguntas que ficaram implicitamente respondidas.
- Se usuário responde vago, aprofunda ("me dá um exemplo concreto?").
- Se usuário foge do fluxo (ex: pergunta sobre pricing do Vertech), Arquiteto responde brevemente e volta ("ótimo, anotei. Voltando à sua clínica…").

Artefato gerado ao fim da etapa:

```
📋 Perfil do Negócio
─────────────────
Clínica Odontológica Sorriso (odontologia)

Resumo: clínica premium com 4 dentistas, foco em estética e
implantes. Atende classe A/B em SP capital. Ticket médio R$3k.

Serviços: clareamento, lentes, implantes, prótese, avaliação.

Público: 30-50 anos, conscientes de saúde bucal, buscam
estética mas com know-how técnico.

Objetivo do agente: qualificar leads do Instagram, agendar
avaliação gratuita, reduzir no-show.

[Refinar artefato]  [Mandar alteração no chat]  [Aprovar]
```

#### 4.3.2 Etapa Planejamento (3-7 min)

Objetivo: definir persona, técnicas comerciais, emojis, tom, capabilities, voz.

Sub-perguntas adaptativas:
- Persona: nome, gênero (F/M), tom (4 eixos), anti-patterns.
- Técnicas comerciais: Arquiteto sugere 2-3 presets compatíveis com o vertical ("pra odontologia premium, recomendo Rapport + SPIN soft + Objeção de Preço"). Usuário aceita ou ajusta.
- Emojis: 3 modos (nenhum / curadoria / livre). Se curadoria, quando (saudação, celebração, conquista) e quando não (preço, urgência, reclamação).
- Voz TTS: opcional. Se sim, pergunta provider (ElevenLabs / Qwen auto-hospedado), voice ID, política (sempre áudio / texto / gatilhos específicos).
- Capabilities de alto nível: qualificação, agendamento, FAQ, follow-up, handoff.

Artefato gerado:

```
📋 Blueprint do Agente
─────────────────────
Nome: Sofia
Gênero: Feminino

Persona:
  • Tom: caloroso-profissional (70/100)
  • Formalidade: balanceada (55/100)
  • Humor: leve, raro (30/100)
  • Empatia: alta (80/100)
  • Anti-patterns: nunca falar como robô, não inventar preços,
    nunca usar gírias (SP classe A/B), não abusar de emojis.

Técnicas comerciais aplicadas:
  ✓ Rapport (criar conexão antes de vender)
  ✓ SPIN soft (Situação, Problema, Implicação)
  ✓ Objeção de Preço (tratamento premium vs competidor)

Emojis: curadoria
  • Usar: 👋 😊 ✨ (saudação, celebração, agendamento)
  • Evitar: em mensagens de preço, objeção, reclamação

Voz: desativada

Capabilities:
  ✓ Qualificação em 4 perguntas
  ✓ Agendamento de avaliação
  ✓ FAQ odontológico
  ✓ Handoff para humano (preço específico, urgência médica)

[Refinar artefato]  [Mandar alteração no chat]  [Aprovar]
```

#### 4.3.3 Etapa Conhecimento (1-5 min)

Objetivo: consolidar materiais já subidos durante a conversa + perguntar se falta algo.

Comportamento:
- Se o usuário já subiu arquivos, Arquiteto faz recap do que aprendeu: "Peguei do PDF que vocês fazem clareamento a laser e lentes de contato. Faltam informações sobre…"
- Se nenhum arquivo foi subido, Arquiteto oferece opções: "Quer subir agora um catálogo, tabela de preços, PDF do Instagram? Ou seguimos sem e você sobe depois?"
- Ao final, pergunta 2-3 perguntas de domínio específicas do vertical (ex: pra clínica, "quais são as urgências mais comuns?").

Artefato:

```
📋 Base de Conhecimento
───────────────────────
Documentos:
  ✓ catalogo-sorriso-2025.pdf (12 páginas, indexado)
  ✓ horarios-e-precos.xlsx (3 abas, indexado)
  ✓ https://clinicasorriso.com.br (scrape, 8 páginas)

Conhecimento adicional capturado pelo Arquiteto:
  ✓ Urgências atendidas: dor forte, trauma dental
  ✓ Horário de atendimento: seg-sex 8h-18h, sáb 8h-12h
  ✓ Convênios: sem convênio, pagamento facilitado em até 12x

[Refinar artefato]  [Mandar alteração no chat]  [Aprovar]
```

#### 4.3.4 Etapa Criação (1-3 min)

Objetivo: mostrar resumo consolidado + preview do Flow Diagram + confirmar criação.

Comportamento:
- Arquiteto mostra card "Resumo final" que consolida os 3 artefatos anteriores em visualização compacta.
- Logo abaixo, mostra **preview do Flow Diagram** (React Flow read-only) da estrutura do agente (Orquestrador → Agente → Categorias → Capabilities).
- Botão primary único "Criar agente" → chama tool `publishAgentFromSession(sessionId)`.

Publicação é transação atômica (ver § 4.5).

### 4.4 Features novas detalhadas

#### 4.4.1 Emojis calibráveis granularmente

Campo novo em `agent.personality.emojis`:

```typescript
type EmojiConfig = {
  mode: 'none' | 'curated' | 'free';
  curatedList?: string[];  // se mode=curated, ex: ['👋','😊','✨']
  usageRules?: {
    allowed: ('greeting' | 'celebration' | 'achievement' | 'empathy')[];
    forbidden: ('pricing' | 'objection' | 'complaint' | 'serious_topic')[];
  };
};
```

UI no Painel de Refino: aba Emojis com toggle de modo, picker do Emoji Mart pra curadoria, checkboxes pra usage rules.

Tool paritária (`architectTools`): `setAgentEmojiConfig(sessionId, emojiConfig)`.

Impacto no prompt compilado: builder de instructions gera bloco dinâmico:
```
## Uso de emojis
Modo: curadoria. Emojis permitidos: 👋 😊 ✨.
Use APENAS em: saudação inicial, celebração de agendamento, conquista do lead.
NUNCA use em: mensagens sobre preço, tratamento de objeção, queixas ou reclamações, tópicos sérios de saúde.
```

#### 4.4.2 Técnicas comerciais de fábrica (presets mixáveis)

Presets built-in (Phase 09 entrega 6 iniciais, extensível via `technique_library` table):

| Preset | Descrição | Quando aplicar |
|---|---|---|
| **Rapport** | Criar conexão emocional antes de vender | Default em verticais B2C |
| **SPIN soft** | Situação → Problema → Implicação → Necessidade (versão consultiva) | Vendas de alto ticket, B2B |
| **AIDA** | Atenção → Interesse → Desejo → Ação | E-commerce, ofertas |
| **PAS** | Problema → Agitação → Solução | Infoprodutos, serviços com dor clara |
| **Objeção de Preço** | Reframe valor vs preço | Verticais com ticket alto |
| **Follow-up Caloroso** | Reengajar lead frio sem spam | Horizontal |

Campo novo em `agent.conversationStyle.salesTechniques`:
```typescript
type SalesTechnique = {
  presetId: string;
  intensity: 'soft' | 'balanced' | 'aggressive';
  customNotes?: string;
};

// array em conversationStyle.salesTechniques
```

Tool paritária: `setAgentSalesTechniques(sessionId, techniques)`.

Impacto no prompt: cada técnica ativa injeta um bloco na seção "Framework de vendas" do system prompt.

#### 4.4.3 Voz TTS

Campo novo em `agent.voice`:

```typescript
type VoiceConfig = {
  enabled: boolean;
  provider?: 'elevenlabs' | 'qwen-self-hosted';
  voiceId?: string;
  policy: {
    mode: 'always_text' | 'always_audio' | 'triggered';
    triggers?: ('long_response' | 'positive_emotion' | 'objection_handling' | 'greeting')[];
  };
};
```

UI no Painel de Refino: aba Voz nova com:
- Toggle "Habilitar voz"
- Select provider
- Select voice ID (ou preview player)
- Radio group de política + checkboxes de triggers

Tool paritária: `setAgentVoiceConfig(sessionId, voiceConfig)`.

Impacto no runtime: após LLM gerar resposta, worker decide se converte em áudio:
```typescript
if (agent.voice.enabled && shouldUseAudio(agent.voice.policy, context)) {
  const audioBuffer = await ttsProvider.synthesize(responseText, agent.voice.voiceId);
  await whatsapp.sendVoiceNote(audioBuffer);
} else {
  await whatsapp.sendText(responseText);
}
```

**Decisão de provider:** Phase 09 entrega integração com ElevenLabs (fastest time-to-market). Qwen TTS auto-hospedado fica pra Phase 09.5 ou Phase 10 (reduzir custo variável quando base crescer).

#### 4.4.4 Tom natural calibrável

Expandir `agent.personality` com 2 campos novos:

```typescript
type PersonalityExtended = {
  // Existentes
  tone: number;           // 0-100
  formality: number;      // 0-100
  humor: number;          // 0-100
  empathyLevel: number;   // 0-100
  inviolableRules: string[];

  // Novos
  antiPatterns: string[];       // ex: ['não falar como robô', 'nunca usar travessão']
  conversationExamples?: Array<{
    userMessage: string;
    agentResponse: string;
  }>;                           // few-shot no prompt
};
```

UI no Painel de Refino: aba Persona ganha:
- TagList "Anti-patterns" (reusa TagList já implementada em 07B-v1)
- Seção colapsável "Exemplos de conversa" com UI tipo par pergunta/resposta

Tool paritária: `setAgentAntiPatterns(sessionId, patterns)`, `setAgentConversationExamples(sessionId, examples)`.

### 4.5 Publicação atômica

Ao clicar "Criar agente" na etapa Criação, chama server action `publishAgentFromSession(sessionId)`:

```typescript
// Dentro de db.transaction
1. Criar agent com todos os campos consolidados do session.draftAgent
2. Se session tem knowledgeDocuments em vector store de rascunho:
   - Migrar pra knowledge_documents permanentes com agent.id como scope
   - Chunks mantêm embeddings
3. Criar agent_version inicial (snapshot, createdBy: 'architect', version: 1)
4. Marcar session.status = 'published', session.publishedAgentId = agent.id
5. Emit event: agent.created
6. Log em orchestrator_audit_log: actorType='architect', action='agent_created'
```

Se falhar: rollback, mensagem no chat do Arquiteto ("Tive um erro salvando, vamos tentar de novo?").

Sucesso: redireciona pra `/app/[orgSlug]/agents/[agentId]` (Painel de Refino) com toast e mensagem de boas-vindas em destaque.

### 4.6 Chat de Evolução (pós-criação)

Feature essencial do ADR-001. Implementação:

**No Painel de Refino (07B-v2):** painel lateral direito com chat. Mesmo agente Arquiteto, mas com `requestContext` populado com o `agentId` atual e histórico da sessão de construção original.

Quando usuário abre: Arquiteto cumprimenta com contexto ("Oi, tudo bem? Pronto pra evoluir a Sofia? No que posso ajudar?").

Exemplo de uso (caso real do Vinni):
> Usuário: "Adicionei 2 serviços novos: harmonização facial e botox. Atualiza a Sofia pra saber responder."
> Arquiteto: "Legal, vou anotar. Antes de atualizar, me diz: vocês fazem esses tratamentos internamente ou é parceria? E o range de preço? Também tem alguma imagem ou material sobre esses serviços?"
> [usuário responde / anexa material]
> Arquiteto: "Perfeito. Proponho essa atualização: [gera card de diff mostrando mudanças em offering, knowledge base, conversation style]. Aprovar?"
> Usuário aprova → Arquiteto chama `updateAgentStructurally(agentId, changes)` → cria `agent_version` v2 → emit event → UI do Painel atualiza via Realtime.

Nenhuma edição estrutural passa pelo Orquestrador (ver ADR-001).

## 5. Phase 07B-v2 — Painel de Refino (detalhado)

### 5.1 Escopo

Substitui a 07B-v1 "criação manual". Objetivo: visualização + refino granular do agente criado pelo Arquiteto, antes de vincular WhatsApp.

### 5.2 Superfície de UI

Rota `/app/[orgSlug]/agents/[agentId]` (default). Layout:

```
┌──────────────────────────────────────────────────────────────┐
│ Header (reaproveitado 07B-v1): avatar + nome editável inline │
│ + status badge + ações (Ativar/Pausar/Arquivar/Duplicar)     │
├─────────────┬────────────────────────────────────┬───────────┤
│             │                                    │           │
│  Menu       │   Flow Diagram do agente           │  Chat     │
│  lateral    │   (centro de gravidade visual)     │  Arquit.  │
│             │                                    │  (togg)   │
│  [abaixo]   │                                    │           │
│             ├────────────────────────────────────┤           │
│             │                                    │           │
│             │   [Conteúdo da aba ativa]          │           │
│             │                                    │           │
│             │                                    │           │
│             │                                    │           │
│             ├────────────────────────────────────┤           │
│             │ Dirty state banner (sticky bottom) │           │
└─────────────┴────────────────────────────────────┴───────────┘
```

#### 5.2.1 Menu lateral (reaproveita 07B-v1 com adições)

Abas totais:

| # | Aba | Status em 07B-v2 | Origem |
|---|---|---|---|
| 1 | Identidade | ✅ reaproveita 07B-v1 | `07B.3.story.md` |
| 2 | Persona | ✅ reaproveita 07B-v1 + novos campos (anti-patterns, exemplos) | `07B.4.story.md` |
| 3 | **Emojis** | 🆕 nova aba | Feature 4.4.1 |
| 4 | **Técnicas** | 🆕 nova aba | Feature 4.4.2 |
| 5 | **Voz** | 🆕 nova aba | Feature 4.4.3 |
| 6 | Negócio | ✅ reaproveita 07B-v1 | `07B.5.story.md` |
| 7 | Conversas | ✅ reaproveita 07B-v1 | `07B.6.story.md` |
| 8 | Modelo | ✅ reaproveita 07B-v1 | `07B.7.story.md` |
| 9 | **Conhecimento** | 🆕 nova aba (lista docs + upload) | Depende de 08-alpha |
| 10 | **Sandbox** | 🆕 nova aba (chat de teste) | Feature 5.3 |
| 11 | WhatsApp | ✅ reaproveita 07B-v1 | `07B.8.story.md` |

#### 5.2.2 Flow Diagram central

Hierarquia visual (React Flow) no topo da área de conteúdo (acima da aba ativa):

```
           ┌─────────────┐
           │ Orquestrador│ (placeholder, só visual)
           └──────┬──────┘
                  │
           ┌─────────────┐
           │   Sofia     │ (avatar + nome do agente)
           └──────┬──────┘
           ┌──────┴──────┬──────────┬───────────┐
           ▼             ▼          ▼           ▼
       ┌───────┐    ┌───────┐  ┌───────┐  ┌─────────┐
       │ Qualif│    │Agenda │  │  FAQ  │  │ Handoff │
       └───────┘    └───────┘  └───────┘  └─────────┘
         │              │          │
         ▼              ▼          ▼
        Tools         Tools      Tools
```

Click em categoria funcional → expande/colapsa filhos.
Click em tool específica → abre modal de config (placeholder em 07B-v2 MVP, funcional quando 08-beta entregar).

Em 07B-v2 MVP: Flow Diagram é **read-only** (visualização), animações suaves, hover em node mostra tooltip explicando. Interatividade avançada (arrastar nodes, ligar manualmente) fica pra 07C.

#### 5.2.3 Chat lateral do Arquiteto (toggleable)

Botão `💬 Chat com Arquiteto` no header abre coluna direita (400px). Chat idêntico ao da tela de criação, mas com contexto do agente atual carregado.

Ver § 4.6 pra detalhes do Chat de Evolução.

#### 5.2.4 Aba Sandbox

Aba especial que não edita o agente, só testa. Layout similar ao chat do WhatsApp:

```
┌──────────────────────────────────────────────────────┐
│  Sandbox                                             │
│  ───────                                             │
│  Testa a Sofia antes de vincular ao WhatsApp real.  │
│  Esta conversa não persiste. Nenhum lead recebe msg.│
│                                                      │
│  [Persona do lead simulado: Cliente interessado ▼]  │
│                                                      │
│  ────────────────────────────────────────────────   │
│                                                      │
│  [Você simula lead] Olá, quanto custa um            │
│                     clareamento?                     │
│                                                      │
│        [Sofia] Oi! 👋 Que bom te conhecer!          │
│                Antes de falar de valores, posso     │
│                te perguntar algumas coisinhas…       │
│                                                      │
│  ────────────────────────────────────────────────   │
│  Digite como o lead simulado...           [Enviar] │
└──────────────────────────────────────────────────────┘
```

Comportamento:
- Invoca agente com `requestContext.testMode = true` (não persiste conversa no DB, não chama tools que têm side effects como `moveLeadStage`).
- Mostra tool calls no chat como cards (read-only) pra usuário ver "a Sofia teria chamado a tool X aqui".
- Preset de persona do lead simulado (Cliente interessado / Cliente indeciso / Cliente cético sobre preço).
- Reset a qualquer momento.

### 5.3 Paridade 1:1 de tools (Configurabilidade Tripla)

Toda config do Painel de Refino tem tool paritária em `architectTools`. Exemplos:

| Aba/Campo | Server Action | Tool Arquiteto |
|---|---|---|
| Identidade | `updateAgentIdentity(agentId, {...})` | `setAgentIdentity(agentId, {...})` |
| Persona tom/formalidade | `updateAgentPersona(agentId, {...})` | `setAgentPersona(agentId, {...})` |
| Anti-patterns | `updateAgentAntiPatterns(agentId, [...])` | `setAgentAntiPatterns(agentId, [...])` |
| Emojis | `updateAgentEmojiConfig(agentId, {...})` | `setAgentEmojiConfig(agentId, {...})` |
| Técnicas comerciais | `updateAgentSalesTechniques(agentId, [...])` | `setAgentSalesTechniques(agentId, [...])` |
| Voz | `updateAgentVoiceConfig(agentId, {...})` | `setAgentVoiceConfig(agentId, {...})` |
| Upload de documento | `uploadKnowledgeDocument(agentId, file)` | `ingestDocumentIntoAgent(agentId, fileRef)` |

Regra: qualquer mudança (via UI ou via Arquiteto) gera entry em `agent_version` snapshot. Flow Diagram revalida. Aba correspondente recarrega.

## 6. Schema Drizzle — mudanças v2

### 6.1 Adições à tabela `agent`

```typescript
// packages/database/drizzle/schema/agents.ts
{
  // Existentes mantidos (07A):
  // id, organizationId, name, role, avatarUrl, gender, description,
  // model, temperature, maxSteps, personality (jsonb), businessContext (jsonb),
  // conversationStyle (jsonb), instructions, enabledTools, knowledgeDocIds,
  // status, version, whatsappInstanceId, createdAt, updatedAt, publishedAt

  // Novos v2:
  emojiConfig: jsonb<EmojiConfig>(),
  voice: jsonb<VoiceConfig>(),
  salesTechniques: jsonb<SalesTechnique[]>(),
  antiPatterns: text('anti_patterns').array(),
  conversationExamples: jsonb<ConversationExample[]>(),

  // Campos pra sessão de construção:
  primaryPipelineId: text('primary_pipeline_id'),  // FK pipeline (opcional, só se Arquiteto criou funil junto)
}
```

### 6.2 Nova tabela `agent_creation_session`

```typescript
// packages/database/drizzle/schema/agent_creation_session.ts
agentCreationSession: {
  id: uuid(),
  organizationId: uuid().references(() => organization.id, { onDelete: 'cascade' }),
  userId: uuid().references(() => user.id, { onDelete: 'cascade' }),
  templateId: text(),  // 'clinical'|'ecommerce'|'real_estate'|'info_product'|'saas'|'local_services'|'custom'
  status: pgEnum('draft', 'published', 'abandoned'),

  // Conversa e estado
  messages: jsonb(),           // histórico Mastra
  workingMemory: jsonb(),      // checklist interno do Arquiteto
  draftAgent: jsonb(),         // snapshot em progresso (vira agent ao publish)
  draftKnowledgeDocs: jsonb(), // { docId, fileName, status, chunks[] }

  publishedAgentId: uuid().references(() => agent.id),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp(),
  abandonedAt: timestamp(),  // se usuário saiu sem publicar

  // Índices
  index: ['organizationId', 'status'],
  indexUser: ['userId', 'status'],
}
```

### 6.3 Tabelas RAG (da Phase 08, antecipadas no 08-alpha)

```typescript
knowledgeDocuments: {
  id: uuid(),
  organizationId: uuid(),
  agentId: uuid().references(() => agent.id, { onDelete: 'cascade' }).nullable(),  // null durante sessão de criação
  sessionId: uuid().references(() => agentCreationSession.id, { onDelete: 'set null' }).nullable(),  // set se veio de sessão
  title: text(),
  fileUrl: text(),
  fileType: text(),  // pdf|docx|csv|xlsx|txt|url
  fileSize: integer(),
  status: pgEnum('pending', 'processing', 'ready', 'error'),
  errorMessage: text().nullable(),
  createdAt, updatedAt,
}

knowledgeChunks: {
  id: uuid(),
  documentId: uuid().references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  content: text(),
  // embedding: vector(1536) — via raw SQL migration (pgvector)
  metadata: jsonb(),
  createdAt,
}
```

### 6.4 RLS policies

- `SELECT agent_creation_session`: dono (userId) OU member da org com role admin/owner.
- `INSERT/UPDATE/DELETE agent_creation_session`: dono.
- `SELECT knowledge_documents`: membership na org + (agentId visível OU sessionId do user).
- `INSERT knowledge_documents`: dono da sessão ou admin da org do agente.

**Responsável:** `@data-engineer` executa migrations e RLS na Phase 08-alpha.

## 7. Escopo revisado por phase (resumo executivo)

### 7.1 Phase 08-alpha (slice antecipado)

**Entrega:**
- pgvector habilitado no Postgres (via MCP Supabase)
- Tabelas `knowledge_documents`, `knowledge_chunks`, `agent_creation_session`
- RLS policies
- Package `packages/ai/src/rag/` (ingest, chunk, embed, query)
- Registry `architectTools` com tools principais:
  - `askQuestion(sessionId, question)`, `answerReceived(sessionId, answer)`
  - `generateArtifact(sessionId, artifactType, context)`
  - `refineArtifact(sessionId, artifactId, instruction)`
  - `uploadDocument(sessionId, fileRef)` + `getDocumentKnowledge(sessionId)`
  - `publishAgentFromSession(sessionId)` — transação atômica
  - `updateAgentStructurally(agentId, changes)` — Chat de Evolução

**Fora do escopo (vai pro 08-beta):**
- `commercialTools` (7 tools do agente comercial em runtime)
- Tool call logging estruturado pra supervisão

### 7.2 Phase 09 (Arquiteto Construtor)

**Entrega:**
- Arquiteto Mastra agent (`packages/ai/src/mastra/agents/architect.ts`)
- Builder de instructions adaptativo baseado no template
- UI: tela boas-vindas + grid templates + chat single-pane + composer multi-anexo + status-bar fino + cards de artefato inline + painel deslizante de refino
- 4 etapas via roteiro invisível com checklist interno
- Auto-save a cada tool call (debounce 2s)
- Upload durante conversa + ingest em background
- Publicação atômica com redirect pro Painel de Refino

**Fora do escopo:**
- Chat de Evolução pós-criação (fica em 07B-v2)
- Sandbox de teste (fica em 07B-v2)
- Flow Diagram interativo (Phase 07C)

### 7.3 Phase 07B-v2 (Painel de Refino)

**Entrega:**
- Reaproveitamento de componentes da 07B-v1 (header, menu lateral, dirty banner, form hooks, 6 abas existentes)
- Novas abas: Emojis, Técnicas, Voz, Conhecimento, Sandbox
- Flow Diagram central read-only (React Flow)
- Chat lateral com Arquiteto (Chat de Evolução)
- Sandbox funcional com persona de lead simulada

**Fora do escopo:**
- Flow Diagram interativo (expand/collapse, diff viewer) → Phase 07C
- Undo granular por aba → Phase 07C
- Aba Follow-up (depende de tools Phase 08-beta)

### 7.4 Phase 08-beta (completa Phase 08)

**Entrega:**
- `commercialTools` completo (7 tools)
- Tool call logging (tabela `tool_calls`) pra supervisão
- UI de configuração de tools dentro do Flow Diagram (substitui placeholders)

### 7.5 Phase 07C (Flow Diagram avançado)

**Entrega:**
- Flow Diagram interativo (expand/collapse, animações de tool calls ativas)
- Diff viewer entre versões do agente
- Undo 30d por aba
- Modals funcionais de config de tool a partir de cliques no diagrama

### 7.6 Phase 10 (Orquestrador — escopo reduzido)

**Entrega:**
- Agent Mastra Orquestrador
- `orchestratorTools` SEM tools de edição estrutural de agente (ver ADR-001)
- Painel lateral `OrchestratorColumn` ativado
- Tool call cards streaming
- Glow animado nas bordas durante tool calls
- Event bus → Supabase Realtime → React Query revalidation
- Confirmação de ações destrutivas
- Undo 30d via `orchestrator_audit_log`

**Removido do escopo original:**
- `updateAgentPersona`, `updateAgentBusinessContext`, `setAgentConversationStyle`, `enableAgentTool`, `disableAgentTool`, `setAgentModel`, `createAgent` → migradas pra `architectTools`

## 8. Contratos inter-phases

### 8.1 Migração do vector store do rascunho pra RAG oficial

Durante sessão do Arquiteto, documentos subidos ficam em `knowledge_documents` com `agentId: null, sessionId: {session.id}`.

Ao publicar:
```typescript
await db.transaction(async (tx) => {
  // 1. Cria agent
  const agent = await tx.insert(agents).values(draftAgent).returning();

  // 2. Migra documents: seta agentId, limpa sessionId
  await tx.update(knowledgeDocuments)
    .set({ agentId: agent.id, sessionId: null })
    .where(eq(knowledgeDocuments.sessionId, session.id));

  // 3. (embeddings já existem em knowledge_chunks, referência via documentId mantém)
});
```

Se sessão abandonada: job cron diário limpa `knowledge_documents` órfãos (sessionId não-null + sessão em `abandoned` há mais de 7 dias).

### 8.2 Geração do Flow Diagram

Consumidor: Phase 07B-v2 (read-only) e Phase 07C (interativo).

Fonte de dados: `agent.enabledTools` + estrutura fixa de hierarquia:

```typescript
// packages/ai/src/flow-diagram/generate.ts
function generateFlowDiagram(agent: Agent): FlowDiagramNode[] {
  const root: Node = { id: 'orchestrator', label: 'Orquestrador', type: 'placeholder' };
  const agentNode: Node = { id: agent.id, label: agent.name, type: 'agent', parent: root.id };

  // Categorias funcionais fixas
  const categories = [
    { id: 'qualification', label: 'Qualificação', parent: agentNode.id },
    { id: 'scheduling', label: 'Agendamento', parent: agentNode.id },
    { id: 'faq', label: 'FAQ', parent: agentNode.id },
    { id: 'handoff', label: 'Handoff', parent: agentNode.id },
    { id: 'followup', label: 'Follow-up', parent: agentNode.id },
  ];

  // Mapeia tools habilitadas pra categorias
  const toolNodes = agent.enabledTools.map(toolKey => ({
    id: toolKey,
    label: toolLabel(toolKey),
    type: 'tool',
    parent: categoryForTool(toolKey),
  }));

  return [root, agentNode, ...categories, ...toolNodes];
}
```

### 8.3 Como o Chat de Evolução sabe o contexto da construção

No Painel de Refino, ao abrir chat lateral:

```typescript
const context = {
  agentId: agent.id,
  agentName: agent.name,
  agentSnapshot: agent,  // config completa atual
  originalSession: await getSessionByPublishedAgentId(agent.id),  // null se antigo
  recentVersions: await getAgentVersions(agent.id, { limit: 5 }),
};

// Passado como requestContext pro Arquiteto Mastra
```

Se `originalSession` existe (agente criado pelo Arquiteto): Arquiteto lê as mensagens originais, entende decisões passadas.

Se `originalSession` é null (agente antigo ou criado manualmente): Arquiteto só tem o snapshot. Funciona, mas menos profundo.

## 9. Equipe LMAS por phase reformatada

### 9.1 Phase 08-alpha

| Agente | Tarefas |
|---|---|
| `@analyst` | Confirmar melhor embedding model (OpenAI `text-embedding-3-small` vs alternativa), dimensões vetor, custos. |
| `@architect` | Validar contratos entre `packages/ai/rag`, `packages/ai/mastra/tools/architect`, `agent_creation_session`. Decidir chunk strategy (fixed vs semantic). |
| `@data-engineer` | pgvector habilitar, schema, migrations, RLS. |
| `@sm` | ~5 stories (pgvector, rag infra, architectTools, session table, chat storage integration). |
| `@po` | Validar stories. |
| `@dev` | Implementar. |
| `@qa` | Gate: upload PDF processa em <30s, query retorna top-5 chunks relevantes, session auto-save funciona. |

### 9.2 Phase 09

| Agente | Tarefas |
|---|---|
| `@ux-design-expert` | **Wireframes completos:** tela boas-vindas, grid templates, chat single-pane, cards de artefato, painel deslizante de refino, composer multi-anexo, status-bar fino. Primeiro deliverable antes de qualquer código. |
| `@architect` | Instructions do Arquiteto (template por vertical), lógica do checklist adaptativo, decisão entre working memory estruturada vs conversational. |
| `@analyst` | Pesquisar best practices pra chat agent-driven adaptativo (context7 pra Mastra memory + working memory). |
| `@sm` | ~8 stories (tela boas-vindas, chat shell, composer, upload, cards artefato, painel refino, publicação atômica, session resume). |
| `@po` | Validar stories. |
| `@dev` | Implementar. |
| `@qa` | Gate: criar agente do zero em <20min, upload processa, artefatos geram corretamente, refinar via painel funciona, refinar via chat funciona, publish atômico funciona. |

### 9.3 Phase 07B-v2

| Agente | Tarefas |
|---|---|
| `@ux-design-expert` | Atualizar `docs/phase-07/ui-spec-07b-agent-detail.md` pra v2: Flow Diagram central, chat lateral, aba Sandbox, novas abas (Emojis, Técnicas, Voz, Conhecimento). |
| `@sm` | ~10 stories (reaproveitar 07B-v1 adaptando + 5 abas novas + Flow Diagram read-only + Chat lateral + Sandbox). |
| `@po` | Validar stories. |
| `@dev` | Implementar. |
| `@qa` | Gate: agente criado no 09 abre no Painel, todas as abas carregam config, refino via Chat de Evolução atualiza UI, Sandbox responde sem criar lead real, vincula WhatsApp com sucesso. |

### 9.4 Phases 08-beta, 07C, 10 (mantém responsáveis similares das versões originais)

## 10. Métricas de sucesso v2

### 10.1 Métricas de produto

| Métrica | Baseline | Meta v2 |
|---|---|---|
| Time-to-first-active-agent (clique em Novo → agente vinculado a WhatsApp) | N/A (produto novo) | < 30 min em beta privado |
| Taxa de abandono no Arquiteto (sessão iniciada mas não publicada) | N/A | < 35% |
| Agentes com RAG ativo (pelo menos 1 doc indexado) | N/A | > 60% |
| NPS de evolução pós-criação (pergunta: "você conseguiu atualizar seu agente facilmente?") | N/A | > 50 |

### 10.2 Métricas técnicas

| Métrica | Meta |
|---|---|
| Latência do Arquiteto por turno | p50 < 3s, p95 < 8s |
| Latência de ingest de PDF 10 páginas | p50 < 20s, p95 < 60s |
| Taxa de sucesso de publicação atômica | > 99% |
| Session auto-save latência | p50 < 200ms |

## 11. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Arquiteto via chat falha em seguir roteiro (LLM diverge) | Usuário perde tempo, frustra | Working memory estruturada com checklist, validação em cada tool call, prompt detalhado com exemplos |
| Upload durante conversa trava enquanto ingest está em processamento | Conversa engasga | Ingest em background via BullMQ (já existe de 07A), chat continua fluindo |
| Vector store do rascunho polui DB se usuários abandonam | Storage bloat | Job cron diário limpa órfãos >7 dias |
| Chat de Evolução conflita com Orquestrador (usuário pede mudança estrutural lá) | Confusão + ADR-001 violado | Orquestrador detecta pedido estrutural, responde "pra isso, fale com o Arquiteto em [link]", redireciona |
| Branch 07B-v1 diverge do main | Merge conflict grande | Rebase regular + decisão antecipada de reaproveitamento granular vs restart |
| ElevenLabs cost out of control | Custo variável alto | Rate limit por org + dashboard de custo TTS + fallback pra texto acima de threshold |
| pgvector performance em escala | Query lenta com >10k chunks | Index HNSW + particionamento futuro + métricas de latência em Health Tech |

## 12. Aprovação estratégica

- [x] Arquiteto como foundation (prioridade máxima) — Vinni, 2026-04-19
- [x] UI single-pane tipo Claude, não split 50/50 — Vinni, 2026-04-19
- [x] Upload durante conversa (não só etapa dedicada) — Vinni, 2026-04-19
- [x] ADR-001 (Arquiteto vs Orquestrador) — Vinni, 2026-04-19
- [x] Emojis granulares + Técnicas comerciais + Voz TTS + Tom natural — Vinni, 2026-04-19
- [x] Branch 07B-v1 em hold, reaproveitamento granular — Vinni, 2026-04-19
- [x] Ordem v2: 08-alpha → 09 → 07B-v2 → 08-beta → 07C → 10 → 10b → 11-13 — Morgan @pm, 2026-04-19
- [x] 6 templates built-in iniciais (Clínica, E-commerce, Imobiliária, Infoprodutor, SaaS, Serviços Locais) + Personalizado — Morgan @pm, 2026-04-19

## 13. Próximos passos

Esta spec é consumida em ordem:

1. **`@ux-design-expert` (Sati)** entrega wireframes da Phase 09 (tela boas-vindas + chat do Arquiteto + cards artefato + painel deslizante) antes de qualquer código. Spec de UI deve sair em arquivo `docs/phase-09/ui-spec-arquiteto.md`.
2. **`@architect` (Aria)** consome wireframes + este PRD e produz spec técnica (`docs/phase-09/tech-spec-arquiteto.md`) com: instructions template, working memory structure, tool signatures completas, chunk strategy do RAG, decisão entre @mastra/rag vs adapter próprio sobre pgvector.
3. **`@analyst` (Link)** faz pesquisa paralela pra dependências específicas via context7: Mastra memory com working memory, @mastra/rag versão atual, ElevenLabs Node SDK, pgvector best practices com Drizzle.
4. **`@data-engineer` (Dozer)** escreve migrations da Phase 08-alpha (pgvector, knowledge_documents, knowledge_chunks, agent_creation_session, novos campos em `agent`).
5. **`@sm` (Niobe)** quebra em stories (primeiro 08-alpha, depois 09). Gate humano entre cada story.
6. **`@dev` (Neo)** implementa.
7. **`@qa` (Oracle)** quality gate.
8. **Gate humano Vinni** no fim de 08-alpha e de 09 (antes de seguir pra 07B-v2).
9. **`@devops` (Operator)** consolida push + PRs.

Nenhum código escrito até wireframes aprovados. Documento é lei.

---

*PRD v2 assinado por Morgan (@pm) em 2026-04-19 sob direção estratégica de Vinni (CEO). Supersedes o roadmap inicial de 13 fases de 2026-04-16 no que tange à Phase 07B, 08, 09 e 10. As demais phases (10b, 11, 12, 13) seguem inalteradas.*

*Documento fonte dos ajustes estratégicos: `docs/research/mercado-agentes-assistant-flow.md`, conversa de estratégia 2026-04-19 e memórias em `~/.claude/projects/.../memory/feedback_*`.*
