---
type: guide
title: "Mercado Agentes 2.0 — Flow Manual (Canvas + Configurações Avançadas)"
project: vertech-agents
tags:
  - project/vertech-agents
  - research/competitor
  - mercado-agentes
  - phase-09
  - vision-v3
date: 2026-04-25
author: Morpheus (Playwright + Vinni navegação)
status: completo (canvas 21 componentes + 12 seções config mapeadas)
related:
  - "[[mercado-agentes-1.0-manual-flow]]"
  - "[[mercado-agentes-assistant-flow]]"
  - "[[project_vision_v3_produto]]"
agent_test_id: f3cf2319-774d-436f-82ab-193ba3ca0cf3
agent_test_name: Dra. Sofia 2.0 (Recepcionista)
---

# Mercado Agentes 2.0 — Flow Manual (Canvas Builder)

> [!info] Contexto
> Agentes 2.0 = nova plataforma do Mercado, recém saiu do BETA. Banner persistente: **"Agentes 2.0 — Versão BETA. Estamos aprimorando esta experiência. Seu feedback é essencial!"**
>
> Diferente do 1.0 (wizard 7 etapas determinístico), 2.0 é **canvas drag-drop visual** + painel **Configurações Avançadas** com 12 seções.

---

## Sumário

1. [Lista Meus Agentes 2.0](#1-lista-meus-agentes-20)
2. [Modal "Como deseja criar?"](#2-modal-como-deseja-criar)
3. [Modal "Criar Novo Agente"](#3-modal-criar-novo-agente)
4. [Canvas Builder](#4-canvas-builder)
5. [Componentes — Ações (7)](#5-componentes--ações-7)
6. [Componentes — Condições (4)](#6-componentes--condições-4)
7. [Componentes — Capacidades (10)](#7-componentes--capacidades-10)
8. [Configurações Avançadas — 12 seções](#8-configurações-avançadas--12-seções)
9. [Identidade (mais rica que 1.0)](#9-identidade-mais-rica-que-10)
10. [Modelo IA — Multi-Provider](#10-modelo-ia--multi-provider)
11. [API Keys — Cofre centralizado](#11-api-keys--cofre-centralizado)
12. [Comportamento — regras + chips sugeridos](#12-comportamento)
13. [Humanização — 8 módulos prompt](#13-humanização--8-módulos-prompt)
14. [Técnicas de Vendas — frameworks](#14-técnicas-de-vendas)
15. [Padrões 2.0 pra absorver no Vertech V3](#15-padrões-20-pra-absorver-no-vertech-v3)

---

## 1. Lista Meus Agentes 2.0

**URL:** `/agents-flow`

- Banner BETA + botão "Ler Recomendações"
- Header: "Meus Agentes — Gerencie seus agentes de IA" + botão **+ Novo Agente**
- Busca + Stats: TOTAL / ATIVOS
- Cards mais simples que 1.0: avatar pequeno + nome + categoria "Negócio" + status + 3 actions (edit/copy/delete) — **SEM botão Hub no card** (Hub fica dentro do canvas)

---

## 2. Modal "Como deseja criar?"

Subtitle: "Escolha a forma de criação que melhor se adapta ao seu momento."

| Card | Pitch |
|------|-------|
| **Criar do Zero** | Monte seu agente manualmente no canvas visual, com controle total sobre cada componente |
| **Criar com Assistente** (badge "Recomendado") | A IA entende seu negócio e cria o agente completo em minutos. Ideal para quem está começando |

> [!note] Pesquisa anterior cobriu "Criar com Assistente"
> Ver `mercado-agentes-assistant-flow.md` (2026-04-19). Este doc cobre **Criar do Zero**.

---

## 3. Modal "Criar Novo Agente"

Header: "Vamos configurar as informações básicas do seu agente de IA"

### Apenas 2 campos!

| Campo | Placeholder | Helper |
|-------|-------------|--------|
| Nome do Agente | "Ex: Ana, Dr. Carlos, Assistente Virtual" | Como o agente vai se apresentar aos clientes |
| Cargo / Função | "Ex: Assistente Virtual, Atendente, Recepcionista" | A função que o agente desempenhará no atendimento |

CTA: **Criar e Continuar →** | Link: "Voltar para opções de criação"

> [!tip] Insight — minimalismo radical no onboarding
> 1.0 abre wizard pedindo Foto+Nome+Função+Gênero+Área+Personalidade (7+ campos). 2.0 = só **Nome + Função**. Tudo mais vai pro canvas + Configurações depois. **Reduz friction no onboarding** drasticamente.

---

## 4. Canvas Builder

**URL:** `/agents-flow/canvas/{id}`

### Layout em 3 colunas

| Coluna | Conteúdo |
|--------|----------|
| **Esquerda — Componentes** | 3 tabs (Ações / Condições / Capacidades) com cards drag-drop |
| **Centro — Canvas** | React Flow visual com nodes Início + Fim. Mini-map + zoom controls |
| **Direita — Toolbar** | Save, Play (testar), **Wand (Publicar)** |

### Header do canvas
- Botão voltar
- Input editável: **"Nome do agente"** (Dra. Sofia 2.0)
- 2 botões disabled (provavel undo/redo)
- 3 botões action

### Footer canvas
> "Arraste componentes • Clique para configurar • Botão direito para excluir"

### Estado inicial
2 nodes fixos: **Início** (Novo Agente, ícone play verde) e **Fim** (ícone caixa). User precisa drag-drop componentes entre eles.

### Toast pós-criação (top-right)
✓ "Agente criado! O agente 'Dra. Sofia 2.0' foi criado com sucesso. Agora você pode configurar o fluxo."

> [!tip] Insight — "Configurar = arrastar visualmente"
> Diferente do 1.0 (wizard linear), 2.0 deixa user decidir ESTRUTURA do fluxo (não apenas conteúdo de etapas pré-definidas). Mais poder + mais complexidade.

---

## 5. Componentes — Ações (7)

Tab "Ações" — sub-header "Executar tarefas ⓘ"

| Componente | Descrição |
|------------|-----------|
| ✨ **Mensagem com IA** | Resposta gerada por IA |
| 💬 **Mensagem** | Resposta pré definida |
| 🔌 **API** | Chamar API externa |
| 📊 **Coletar Dado** | Coletar e salvar no CRM |
| 📱 **WhatsApp** | Enviar WhatsApp |
| 📧 **Email** | Enviar Email |
| 🖼️ **Enviar mídia** | Enviar mídia da galeria |

> [!tip] Insight — granularidade prompt
> Distingue **"Mensagem com IA"** (gerada dinamicamente) vs **"Mensagem"** (fixa pré-definida). Permite controle preciso: copy crítico (CTA legal) vs copy adaptável (saudação).

---

## 6. Componentes — Condições (4)

Tab "Condições" — sub-header "Lógica de decisão ⓘ"

| Componente | Descrição |
|------------|-----------|
| 🎯 **Intenção** | Detectar intenção do usuário |
| ⤴️ **Roteador Inteligente** | Rotear por múltiplas intenções |
| 🕐 **Horário** | Verificar horário atual |
| 📊 **Dados** | Verificar dados coletados |

> [!tip] Insight crítico — Roteador Inteligente
> Equivalente direto ao "Fluxos Especiais" do 1.0. **Visual no canvas** (vs lista no 1.0). Bem mais intuitivo. Vertech V3 deve ter este pattern de **roteador visual no Flow Diagram**.

> [!tip] Insight — Condições determinísticas
> "Horário" + "Dados" = condições não-IA (lógica pura). Importante: nem tudo precisa LLM. Vertech V3 deve permitir condicionais determinísticas paralelas a chamadas IA.

---

## 7. Componentes — Capacidades (10)

Tab "Capacidades" — sub-header "O que seu agente pode fazer ⓘ"

| Componente | Descrição |
|------------|-----------|
| 📅 **Agendamento** | Agendar, cancelar e remarcar |
| 📅 **Verificar Disponibilidade** | Consultar horários sem agendar |
| 📅 **Reagendamento** | Remarcar agendamento existente |
| ❌ **Cancelamento** | Cancelar agendamento existente |
| 📚 **Base de Conhecimento** | Responder perguntas frequentes |
| 📋 **Captura de Lead** | Capturar informações do lead |
| 🖼️ **Enviar Mídias** | IA envia mídias da galeria |
| 👁️ **Análise de Mídia** | Analisar imagens e documentos |
| 📧 **Leitor de Email** | Ler, analisar e agir sobre emails do **Gmail** |
| 📊 **Leitor de Planilha** | Analisar e conversar sobre dados do **Google Sheets** |

> [!tip] Insight crítico — Capacidades = tools high-level
> Cada Capacidade é um **componente abstrato** que internamente faz várias things. Ex: "Agendamento" engloba agendar+cancelar+remarcar (que no 1.0 são 4 funções separadas). Vertech V3 deve agrupar por **caso de uso**, não por operação CRUD.

> [!tip] Insight — Integrações Google nativas
> Leitor de Email (**Gmail**) + Leitor de Planilha (**Google Sheets**) são tools nativas. Vertech V3 deve ter integração Google Workspace de fábrica (Gmail + Sheets + Calendar + Drive).

> [!warning] Total: 21 componentes
> 7 Ações + 4 Condições + 10 Capacidades. Vs 9 funções fixas do 1.0. Mais combinatorial mas mais flexível.

---

## 8. Configurações Avançadas — 12 seções

Painel lateral abre via Wand (Publicar) ou via menu separado. Sidenav vertical com 12 tabs:

| # | Tab | Conteúdo principal |
|---|-----|--------|
| 1 | **Identidade** | Nome+Função+Avatar URL + Tom (4) + Gênero (3) + Traços (20, max 3) + Preview live |
| 2 | **Negócio** | Não capturada (provável similar 1.0 Etapa 3) |
| 3 | **Conhecimento** | Não capturada (provável BC + uploads) |
| 4 | **Comportamento** | Regras free-text + chips sugeridos + Atendimento Humano |
| 5 | **Humanização** | Toggle global + 8 módulos prompt |
| 6 | **Modelo IA** ⚠️ (badge incompleto) | Provider (3) + Modelo (12 total) + Temperatura + Max Tokens |
| 7 | **API Keys** | Cofre centralizado (max 10 chaves criptografadas) |
| 8 | **Galeria de Mídias** | Não capturada |
| 9 | **Contatos** | Não capturada |
| 10 | **Integrações** | Não capturada |
| 11 | **Notificações** | Não capturada |
| 12 | **Técnicas de Vendas** | SPIN Selling, Upsell, Cross-sell (toggle off default) |

Header: **"Configurações Avançadas"** + indicador laranja **"(alterações não salvas)"** quando dirty + botão **Salvar** + close X.

---

## 9. Identidade (mais rica que 1.0)

### Identidade Básica
- Nome de Exibição (text)
- Função / Cargo (text)
- URL do Avatar (text, opcional — diferente do 1.0 que usa upload file)

### Tom de Comunicação (4 cards radio)
| Tom | Descrição |
|-----|-----------|
| **Formal** | Linguagem formal e corporativa |
| **Profissional** | Equilíbrio entre formal e amigável |
| **Amigável** | Comunicação próxima e calorosa |
| **Casual** | Informal e descontraído |

### Gênero da Identidade (3 cards radio)
| Gênero | Descrição |
|--------|-----------|
| **Masculino** | Identidade masculina |
| **Feminino** | Identidade feminina |
| **Neutro** | Gênero não especificado ← **inexistente no 1.0** |

### Traços de Personalidade (multi-select, **max 3**)
20 opções (vs 10 no 1.0):
> Empático, Engraçado, Objetivo, Técnico, Acolhedor, Direto, Entusiasta, Calmo, Persuasivo, Profissional, Simpático, Prestativo, Ágil, Atencioso, Organizado, Confiável, Consultivo, Conhecedor, Educado, Analítico

Cada com 1-line descrição.

### Preview da Identidade
Card live com avatar + nome + função + traços selecionados (atualiza em real-time conforme user edita)

> [!tip] Insight — Tom vs Personalidade desacoplado
> 1.0 funde tudo em "Personalidade" (10 opções). 2.0 separa **Tom** (registro linguístico, 4) de **Traços** (personalidade, 20). Mais preciso. Vertech V3 deve copiar.

> [!tip] Insight — Limite explícito 0/3 traços
> Counter "Traços de Personalidade 0/3" + helper "Selecione até 3 traços que definem a personalidade do seu agente. Isso influenciará como ele se comunica e interage com os clientes." Limite educado em vez de checkbox livre.

---

## 10. Modelo IA — Multi-Provider

### Provedor de IA (3 cards radio)
| Provider | # Modelos |
|----------|-----------|
| **OpenAI** ✅ default | 6 modelos |
| **Anthropic** | 3 modelos |
| **Google AI** | 3 modelos |

### Modelos por Provider

**OpenAI (6, parcial captura):** GPT-4, GPT-4.1, GPT-5 Mini, GPT-5, GPT-5.2 + 1 (provável GPT-4o Mini)
- Cada modelo: nome + descrição (ex: "GPT-5 — Modelo mais avançado da OpenAI", "GPT-5 Mini — Versão compacta do GPT-5", "GPT-5.2 — Versão mais recente com melhorias incrementais")

**Anthropic (3):**
- Claude Haiku 4.5
- Claude Sonnet 4.5
- Claude Opus 4

**Google AI (3):**
- Gemini 2.5 Flash
- Gemini 2.5 Pro
- Gemini 2.5 Flash Lite

### Parâmetros
- **Temperatura** (slider colorido, default 0.3): Preciso → Balanceado → Criativo
- **Máximo de Tokens** (input numérico, default 4096)

> [!tip] Insight CRÍTICO — multi-provider nativo
> 1.0 hardcoded GPT-4.1-MINI. 2.0 = **multi-provider real** com 12 modelos. Vertech V3 DEVE ter multi-provider de fábrica (já alinhado com Mastra que abstrai).

> [!tip] Insight — Temperatura como slider semântico
> Não mostra "0.3, 0.7, 1.0" — mostra **Preciso / Balanceado / Criativo** com cor gradiente. Atende leigo. Vertech V3 deve copiar essa apresentação.

---

## 11. API Keys — Cofre centralizado

**Cofre de API Keys** — "Gerencie suas chaves de forma centralizada. As chaves são criptografadas e compartilhadas entre todos os seus agentes."

- Counter: **0/10 chaves** (limite duro 10)
- Botão: **+ Adicionar chave**
- Empty state: "Nenhuma chave cadastrada. Adicione suas API keys para usar nos agentes"

### Modelo IA → API Key (referência ao Cofre)
2 toggles ao escolher provider:
- 🔐 **Cofre** (selecionar chave existente do cofre)
- 🔑 **Chave direta** (paste inline neste agente)

> [!tip] Insight — Cofre criptografado + reusável
> Pattern de **secret manager interno**: chaves cadastradas 1 vez, reusadas por N agentes. Diferente do 1.0 que pedia chave por agente. Vertech V3 deve ter Cofre similar (já planejado com encryption).

---

## 12. Comportamento

### Regras de Comportamento
- "Defina regras que o agente deve seguir durante as conversas. Estas regras ajudam a manter o comportamento consistente e alinhado com os valores do seu negócio."
- Input free-text + botão **+ Adicionar**
- Empty state: "Nenhuma regra adicionada. Adicione regras para orientar o comportamento do agente."

### Sugestões de regras (chips clickable, click adiciona)
- Sempre seja educado e respeitoso
- Não forneça informações médicas específicas
- Confirme os dados antes de agendar
- Não prometa descontos sem autorização
- Encaminhe reclamações para um humano

### Atendimento Humano (subseção)
- "Configure quando e como transferir o atendimento para uma pessoa."
- "Condições de Transferência..."

> [!tip] Insight — chips sugeridos como onboarding
> Pattern **"chips clicáveis vira regras"** = onboarding sem fricção. User não precisa pensar do zero. Vertech V3 deve ter chips contextuais por vertical.

---

## 13. Humanização — 8 módulos prompt

**Humanização de Conversas** (toggle global Ativado default):
> "Transforme respostas robóticas em mensagens naturais estilo WhatsApp"

Counter: **7/8 módulos ativos**

### Módulos de Prompt
> "Estes módulos modificam as instruções da IA para que ela já gere respostas humanizadas desde o início."

| # | Módulo | Default | Descrição |
|---|--------|---------|-----------|
| 1 | **Filtro Anti-Robô** | ✅ | Evita frases corporativas como "Prezado(a)" ou "Estou à disposição" |
| 2 | **Escrita Casual** | ✅ | Usa linguagem informal como "vc", "tb", "pq", "tá" |
| 3 | **Simular erros de digitação ocasionais** | ☐ | Adiciona erros ocasionais para parecer mais natural (não recomendado para todos os casos) |
| 4 | **Tom Descontraído** | ✅ | Mantém um tom amigável e acolhedor, como conversar com um conhecido |
| 5 | **Divisor de Mensagens** | ✅ | Divide respostas longas em múltiplas mensagens curtas |
| 6 | **Emojis Naturais** | ✅ | Adiciona emojis contextuais de forma natural (máximo 1-2 por resposta) |
| 7 | **Fluxo de Conversa** | ✅ | Define pontos de pausa e transições naturais na conversa |
| 8 | (não capturado, scroll mostra mais) | — | — |

### Sub-config — Divisor de Mensagens
- Slider: **Máximo de mensagens** (default 3)
- Slider: **Máx. caracteres/msg** (default 150)
- **Delay por mensagem** (3 sliders 1ª/2ª/3ª msg, default Auto — "calculo inteligente baseado no tamanho da mensagem")

### Sub-config — Emojis Naturais
- Slider: **Probabilidade de emoji** (30% default)
- Slider: **Máx. emojis por resposta** (2 default)

> [!tip] Insight CRÍTICO — Divisor de Mensagens automatizado
> Equivalente moderno + automatizado do `[[break]]` do 1.0. Antes user tinha que escrever `[[break]]` no prompt manualmente. Agora é toggle + max chars + **delay por mensagem com Auto smart calc** baseado em tamanho. ENORME upgrade. Vertech V3 deve copiar (já tinha `[[break]]` na Visão V3).

> [!tip] Insight — Simular erros de digitação
> Toggle peculiar (default off, marcado "não recomendado"). Pra anti-detecção de bot? Decisão polêmica que mostra extremo de humanização. Vertech V3 NÃO precisa, mas registrar como referência.

> [!tip] Insight — Probabilidade de emoji + max
> Probabilidade percentual em vez de boolean. Permite calibrar volume sem desligar. Vertech V3 deve usar pattern similar (slider 0-100% + cap absoluto).

---

## 14. Técnicas de Vendas

Toggle global **Desativado** default.

> "Configure como o agente aborda vendas e sugestões de produtos"

### Empty state
> "Técnicas de Vendas desativadas. Ative as técnicas de vendas para que o agente utilize estratégias como **SPIN Selling, Upsell e Cross-sell** durante as conversas."

> [!tip] Insight CRÍTICO — Frameworks de vendas pré-configurados
> Quando ativo, agente usa **SPIN Selling** (Situação/Problema/Implicação/Necessidade — framework B2B clássico) + **Upsell** + **Cross-sell** integrados ao prompt automaticamente. Vertech V3 (vendido por agência) DEVE ter este pattern de frameworks comerciais selecionáveis.

---

## 15. Padrões 2.0 pra absorver no Vertech V3

### Hard wins do 2.0 (vs 1.0)

1. **Onboarding ultra-simples:** modal com 2 campos (Nome+Função), tudo mais depois.
2. **Canvas drag-drop visual** com 3 categorias semânticas (Ações/Condições/Capacidades).
3. **Roteador Inteligente como componente visual** = intent routing nativo (vs lista escondida no 1.0).
4. **Capacidades = tools high-level** que agrupam operações por caso de uso (não por CRUD).
5. **Multi-provider nativo** (OpenAI/Anthropic/Google) com 12 modelos.
6. **Cofre de API Keys** centralizado e reusável entre agentes.
7. **Tom desacoplado de Personalidade** — Tom (4) = registro linguístico, Traços (20) = personalidade.
8. **Gênero Neutro** como 3ª opção.
9. **Limite explícito 0/3 traços** em vez de checkbox livre.
10. **Preview de Identidade live** durante edição.
11. **Temperatura como slider semântico** (Preciso/Balanceado/Criativo) com cor gradiente — não números crus.
12. **Comportamento via chips sugeridos clicáveis** + free-text — onboarding sem fricção.
13. **Humanização modular com 8 módulos toggleable** + sub-config rica (probabilidade %, max chars, delay smart).
14. **Divisor de Mensagens automatizado** com delay calculado dinamicamente vs `[[break]]` manual do 1.0.
15. **Técnicas de Vendas como frameworks pré-configurados** (SPIN/Upsell/Cross-sell).
16. **Distinção Mensagem com IA vs Mensagem fixa** = controle granular sobre quando usa LLM.
17. **Integrações Google nativas** (Gmail Reader + Sheets Reader) como Capacidades.
18. **Análise de Mídia como Capacidade** (não toggle global como 1.0).
19. **Botão Wand (Publicar)** com validação prévia (dialog "Configuração Incompleta" se faltar Modelo IA).
20. **Indicador "alterações não salvas"** no header do painel — UX clara.

### Buracos do 2.0

1. **Banner BETA persistente** desconforto (passou do beta mas Vinni nota ainda).
2. **Sem template inicial** — usuário enfrenta canvas vazio (o "Criar com Assistente" cobre, mas separado).
3. **Drag-drop pode intimidar** leigo absoluto. 1.0 wizard é mais linear/seguro.
4. **Sem versionamento visível** (só identidade do agente, sem v1/v2 explícito como 1.0).
5. **Sem Preview de fluxo** — só preview de Identidade. Fluxo precisa testar Playground.
6. **Hub não testado** mas provável similar 1.0 (Conteúdo+Ferramentas dropdowns).

---

## Próximos passos

- [ ] Mapear Hub do agente 2.0 (provavelmente `/agents-flow/{id}/hub` ou similar) — não testado
- [ ] Testar Playground 2.0 com API key (Vinni configurou)
- [ ] Drag-drop um componente pra ver painel de configuração de node
- [ ] Comparativa final 1.0 vs 2.0 vs Vertech V3 (próximo doc)
