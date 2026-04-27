---
type: guide
title: "Pesquisa: Fluxo Criar com Assistente (Mercado Agentes) — referência pra Arquiteto do Vertech"
project: vertech-agents
tags:
  - project/vertech-agents
  - research/competitor
  - phase/09
  - agent/architect
---

# Pesquisa: Fluxo "Criar com Assistente" — Mercado Agentes

**Fonte:** https://app.mercadoagentes.com/agents-flow
**Data coleta:** 2026-04-19
**Autor:** Neo (@dev) via Playwright MCP
**Duração sessão:** ~12 minutos, fluxo end-to-end completo até agente criado

> Vinni já usou o Mercado Agentes em operação com um sócio. O produto está em produção e consolidado, com o módulo "Agentes 2.0" em Beta. Esta feature de criação via assistente é recente e foi a inspiração pro Arquiteto do Vertech (Phase 09). Objetivo: entender o fluxo 100%, extrair o que vale replicar, identificar o que podemos otimizar. **A UI deles não é referência visual (a nossa é melhor).** A referência é a LÓGICA.

## 1. Estrutura da plataforma (contexto)

Menu lateral em 10 seções:

| Seção | Itens |
|---|---|
| Topo | Meu plano (White Label Plus), Dashboard |
| ATENDIMENTO | Central de Atendimento |
| AGENTES | Meus Agentes, Criar Agente, **Agentes 2.0 (NOVO)** |
| APPS & INTEGRAÇÕES | Canais, Integrações |
| APRENDIZADO | Vídeos Tutoriais |
| GESTÃO COMERCIAL | Agenda, Base de Clientes, Pipeline CRM |
| MINHA ORGANIZAÇÃO | Organização, Subcontas, Implementações, Usuários, Métricas |
| FINANCEIRO | Meu Plano, Faturamento, Minhas Assinaturas |
| SUPORTE | Suporte Clientes, Suporte Plataforma |
| TREINAMENTOS | Meus Treinamentos, Gerenciar Treinamentos |
| CONFIGURAÇÕES | Minha Empresa, Configurações Globais |

Observações importantes:
- "Agentes 2.0" existe em paralelo à UI antiga ("Criar Agente"). Versão nova é **Beta** explícito com header de aviso.
- Plataforma tem white label, CRM próprio, base de clientes, agenda integrada.

## 2. Ponto de entrada

Rota: `/agents-flow`. Lista de agentes existentes como cards (avatar, nome, categoria, status Inativo/Ativo, ações). Botão primary "+ Novo Agente".

Ao clicar em "Novo Agente" → `/agents-flow/canvas` abre **canvas visual vazio** (com nodes Início → Novo Agente → Fim) e um dialog de escolha:

| Modo | Descrição | Badge |
|---|---|---|
| **Criar do Zero** | Monte seu agente manualmente no canvas visual, com controle total sobre cada componente. | — |
| **Criar com Assistente** | A IA entende seu negócio e cria o agente completo em minutos. Ideal para quem está começando. | **Recomendado** |

O canvas atrás do dialog mostra o vocabulário da plataforma:

**Abas de componentes:** Ações / Condições / Capacidades

**Ações disponíveis** (arrastar pro canvas):

| Componente | Descrição |
|---|---|
| Mensagem com IA | Resposta gerada por IA |
| Mensagem | Resposta pré-definida (texto fixo) |
| API | Chamar API externa |
| Coletar Dado | Coletar e salvar no CRM |
| WhatsApp | Enviar WhatsApp |
| Email | Enviar Email |
| Enviar mídia | Enviar mídia da galeria |

Dica permanente no rodapé do canvas: "Arraste componentes • Clique para configurar • Botão direito para excluir".

## 3. Assistente de Criação: 4 etapas

Dialog modal com progress bar visual (4 ícones + labels):

```
[●] Idealização  ──  [○] Planejamento  ──  [○] Conhecimento  ──  [○] Criação
```

Steps ficam com check verde quando concluídos. No rodapé fixo: `Criar manualmente` (ghost, volta pro canvas vazio) + `Próximo →` (primary, só ativa quando etapa está completa).

---

### Etapa 1: Idealização

**Heading:** "Conte-nos sobre seu negócio"
**Subtítulo:** "Selecione o tipo e responda as perguntas. A IA vai analisar e preparar tudo para você."

#### 1.1 Tipo de negócio

Radiogroup de 8 tiles visuais (ícone temático + label):
Clínica, Restaurante, Salão de Beleza, Automotivo, Imobiliária, E-commerce, Educação, Outro.

A escolha é **determinante**: só após escolher, o resto do form é revelado (perguntas específicas do vertical).

#### 1.2 Gênero do assistente

Aparece logo após seleção do tipo. Pergunta: "Como o assistente deve se apresentar?"
Radiogroup 2 opções: **Feminino / Masculino**.

> Padrão que **valida a decisão da 07B.3** do Vertech (só 2 opções, sem "Neutro").

#### 1.3 Perguntas curadas por vertical (checkboxes)

Lista de 7 perguntas **específicas pro vertical** escolhido. Pro caso "Imobiliária":

1. Quais tipos de imóveis vocês trabalham?
2. Quais regiões de atuação?
3. Como funciona o atendimento de novos leads hoje?
4. Como são agendadas as visitas aos imóveis?
5. Oferecem assessoria em financiamento?
6. Trabalham com aluguel, venda ou ambos?
7. Quantos corretores na equipe?

Cada checkbox **expande inline** ao ser marcada, revelando um textarea com:
- Placeholder contextualizado específico por pergunta (ex: "Ex: Apartamentos, casas, comerciais, terrenos...")
- Contador de caracteres `N/X` por pergunta
- Aviso: "Quanto mais perguntas responder, mais preciso será seu agente. Limite de 10.000 caracteres divididos entre as perguntas selecionadas."
- **Limite dinâmico:** 10.000 chars totais se redistribuem entre quantas perguntas forem marcadas (ex: 4 selecionadas = 2.500 cada; 1 selecionada = 10.000).

Progress bar dinâmica em cima da lista: `N de X respondidas (Y%)`.

Mínimo pra avançar: **3 perguntas respondidas**. Botão "Gerar Análise" disabled até lá (label do próprio botão informa o mínimo).

#### 1.4 Informações adicionais (opcional)

Textarea livre abaixo das checkboxes, placeholder "Qualquer informação extra sobre o seu negócio que possa ajudar..."

#### 1.5 Análise gerada (IA)

Após clicar "Gerar Análise" (botão vira "Analisando..." com spinner, ~10-20s), a IA devolve um **mini-PRD do agente** estruturado assim:

- **Título curto** do negócio (ex: "Imobiliária São Paulo Premium")
- **Resumo executivo** em 1 parágrafo denso: contexto + principal dor + objetivo do agente
- **Serviços identificados** (lista de ~7 bullets)
- **Objetivos do agente** (lista de ~6 bullets)
- **Identidade sugerida em 3 cards:**
  - Nome sugerido (ex: "Amanda")
  - Função (ex: "Consultora Digital de Imóveis")
  - Tom de voz (ex: "friendly")

Dois botões:
- **Refinar** — expande textarea inline "O que gostaria de ajustar?" + botão "Aplicar refinamento". Placeholder contextualizado ("Ex: O horário é das 8h às 18h, também atendemos emergências...")
- **Aprovar e continuar** — avança pra etapa 2

Comportamento do Refinar testado: aceita pedidos narrativos ("Remova X", "Adicione Y") e a IA **reescreve a análise** incorporando as mudanças. Ex: removeu "urgência sutil" e reescreveu o bloco, adicionou serviço novo na lista, ajustou resumo.

Após aprovar → alert verde "Análise aprovada. Avance para o próximo passo." + botão Próximo ativa.

---

### Etapa 2: Planejamento

**Heading:** "Plano do seu agente"
**Subtítulo:** "A IA preparou um plano personalizado. Revise e aprove."

Antes da tela aparecer: processing screen "A IA está planejando seu agente... Analisando as melhores capacidades para o seu negócio" (~20-40s).

#### 2.1 Blocos narrativos numerados

IA gera 6-7 blocos narrativos com heading + parágrafo descritivo denso (3-5 linhas cada). Cada bloco descreve uma capability/comportamento do agente com nível de detalhe alto. Exemplos coletados:

1. **Identidade e Personalidade da Amanda** — Amanda será sua consultora digital de imóveis, com tom amigável e profissional. Ela se apresenta naturalmente como parte da equipe (nunca como robô), demonstra empatia genuína e usa conhecimento profundo do mercado imobiliário de SP e Litoral Norte para criar rapport.

2. **Atendimento 24/7 com Qualificação Inteligente** — Amanda responde em menos de 2 minutos, 24 horas por dia. Ela conduz uma conversa consultiva em etapas: entende o perfil do imóvel desejado (tipo, região, dormitórios), qualifica financeiramente (orçamento, prazo, finalidade) e identifica sinais de prioridade antes de apresentar opções.

3. **Apresentação Consultiva de Imóveis** — Após qualificação completa, Amanda apresenta 2-3 imóveis do portfólio alinhados ao perfil. [resto...]

4. **Agendamento Automático de Visitas** — Amanda propõe 3 opções de data/horário disponíveis (seg-sáb 9h-19h), evita conflitos consultando a agenda dos corretores, coleta dados completos e confirma o agendamento.

5. **Follow-up Automático Pós-Visita** — (adicionado via Ajustar) Amanda envia mensagem automaticamente 24h após cada visita realizada, perguntando como foi a experiência [...]

6. **Captura Estruturada de Leads Qualificados** — [...]

7. **Base de Conhecimento Imobiliário** — [...]

#### 2.2 Configuração técnica

Seção "Configuração técnica" abaixo dos blocos, exibe em duas colunas:

- **Capacidades:** lista de chips (no caso testado: Agendamento, Captura de Dados, Perguntas Frequentes)
- **Intenções detectadas:** lista (vazia no caso)

Nota opcional abaixo: "Este plano recomenda uma base de conhecimento (FAQ)" (amarelo/warning).

#### 2.3 Ações

- **Ajustar** — mesmo padrão do Refinar (textarea + placeholder contextual "Ex: Não preciso de agendamento, foque mais em FAQ e captura de leads..." + botão "Aplicar ajuste"). Aceita ações como "remova X do bloco N", "adicione um novo bloco Y". A IA reescreve blocos afetados e adiciona/remove conforme pedido.
- **Aprovar plano** — avança pra etapa 3. Alert verde "Plano aprovado."

---

### Etapa 3: Conhecimento

**Heading:** "Base de Conhecimento"
**Subtítulo:** "Uma base de conhecimento ajuda o agente a responder com informações específicas do seu negócio."

Dois cards de escolha:

| Opção | Descrição | Ação |
|---|---|---|
| **Tenho um arquivo** | Envie um CSV, PDF, DOCX, XLSX ou TXT com informações do seu negócio | Abre file picker nativo |
| **Vou adicionar depois** | Você pode adicionar a base de conhecimento a qualquer momento após criar o agente | Marca como "pular" |

Footer: Voltar | Próximo. Próximo só ativa após escolher uma das opções.

> Etapa curta e opcional. Não força upload. Comportamento pragmático.

---

### Etapa 4: Criação

**Heading:** "Tudo pronto!"
**Subtítulo:** "Finalize a criação do seu agente inteligente"

Card "Resumo da criação" com:
- **Agente:** Amanda
- **Função:** Consultora Digital de Imóveis
- **Tom:** Amigável
- **Capacidades:** bullets (Agendamento, Captura de Dados, Perguntas Frequentes)

Botão único centralizado: **Criar Agente** (primary grande)
Footer: Voltar

Ao clicar → processing → tela final:

### Sucesso

Ícone check verde grande + texto:
> **Agente criado com sucesso!**
> Amanda está pronto para ser configurado.
> Baixe o guia para saber os próximos passos.

Dois botões:
- **Baixar Guia** (ghost) — presumo baixa PDF com orientações
- **Abrir no Canvas →** (primary) — navega pra `/agents-flow/canvas/{agentId}` com o flow já montado

## 4. Canvas gerado automaticamente (output final)

O Assistente **monta automaticamente um fluxo visual completo** no canvas. Nodes capturados do agente "Amanda":

| # | Node | Tipo | Observação |
|---|---|---|---|
| 1 | Início | sistema | Entry point |
| 2 | Saudação | **Ação** | Primeira resposta ao lead |
| 3 | Qualificação: Perfil do Imóvel | **Ação** | Coleta tipo, região, dormitórios |
| 4 | Qualificação: Financeira e Prazo | **Ação** | Coleta orçamento, prazo |
| 5 | Apresentação de Opções | **Ação** | Mostra 2-3 imóveis |
| 6 | Roteador de Intenções | **Condição** | 2 rotas + fallback: `scheduling`, `data_collection`, `Fallback` |
| 7 | Agendamento | **Capacidade** | Branch scheduling |
| 8 | Captura de Lead | **Capacidade** | Branch data_collection |
| 9 | FAQ | **Capacidade** | Branch fallback |
| 10 | Fim | sistema | Exit point |

**Observações importantes:**
- Os blocos narrativos da etapa 2 foram **materializados em Ações no canvas** (blocos conceituais viraram nodes concretos)
- As "Capacidades" listadas na config técnica viraram **nodes capacidade** distintos de Ação
- Um **Roteador de Intenções** foi criado automaticamente com rotas + fallback, implementando lógica de decisão
- O fluxo tem **branching real** (não é linear)

## 5. Padrões de UX extraídos (o que replicar)

Ordenado por valor percebido pro Vertech:

### 5.1 Progress bar de 4 etapas com states visuais

Check verde quando concluído, ativo destacado, futuro em cinza. Navegação linear com Voltar/Próximo.

### 5.2 Limite total de caracteres que se redistribui entre perguntas marcadas

10.000 chars no pool, dividido pelo número de checkboxes ativas. Incentiva responder mais perguntas sem penalidade.

### 5.3 Checkbox expandível inline com placeholder contextual

Cada pergunta tem placeholder próprio curado. Melhor que um formulário fixo de N textareas.

### 5.4 "Refinar / Ajustar" como segunda IA turn em cada etapa

Após IA gerar análise/plano, textarea aparece com prompt do tipo "O que gostaria de ajustar?" e placeholder específico. Segunda chamada reescreve o output. Permite iteração sem reiniciar.

### 5.5 Etapa 1 (Idealização) gera mini-PRD estruturado, não prompt solto

Título + Resumo + Serviços (lista) + Objetivos (lista) + Identidade (3 cards). Formato fixo que facilita revisão.

### 5.6 Etapa 2 (Planejamento) gera blocos narrativos densos em vez de configs técnicas

Cada capability é 1 parágrafo rico, não 10 switches. O parágrafo contém o "comportamento esperado" em linguagem natural. Mais fácil ler e ajustar do que tunning fino.

### 5.7 Materialização visual automática no canvas ao final

O output do assistente não é só texto: é um flow diagram operável com 10 nodes conectados, branches e fallback. O user pode continuar editando visualmente depois.

### 5.8 Gênero só Feminino/Masculino

Decisão deles bate com a nossa 07B.3. Confirma que Neutro era excesso.

### 5.9 Beta visível + botão "Ler Recomendações" sempre visível

Comunicação honesta de que a feature está evoluindo. Abaixa a expectativa e convida feedback.

### 5.10 Opção "Vou adicionar depois" em cada etapa opcional

Etapa 3 (Conhecimento) não força upload. Deixa agente viável sem base de conhecimento, adiciona depois. Pragma alta.

## 6. O que podemos OTIMIZAR no Vertech

### 6.1 Verticais predefinidos (8 opções fixas)

Eles fixaram 8 verticais. Isso amarra. **Nossa oportunidade:**
- Permitir vertical customizado mesmo sem "Outro" genérico
- Biblioteca de templates por vertical editável pelo Master Partner (white label)
- 5 verticais built-in iniciais + template library extensível (já no nosso roadmap do produto direction)

### 6.2 Perguntas por vertical são hardcoded

Eles têm 7 perguntas fixas por vertical. **Nossa oportunidade:**
- Banco de perguntas por vertical editável
- Master/Agency podem adicionar/remover perguntas pro seu nicho
- IA pode sugerir perguntas adicionais baseadas no contexto (segunda round conversacional)

### 6.3 Refinar limitado a 1 textarea single-turn

Cada etapa tem só 1 rodada de refinamento. **Nossa oportunidade:**
- Conversa **multi-turn real** com o Arquiteto (chat completo em cada etapa, não só single input)
- Arquiteto faz perguntas de volta pra esclarecer ambiguidade antes de refinar
- Histórico da conversa fica visível e navegável

### 6.4 Etapa 3 (Conhecimento) é binária

"Tenho arquivo" ou "Pula". **Nossa oportunidade:**
- Múltiplas fontes: arquivo, URL do site, FAQ existente, cole texto direto
- Extração automática de FAQs a partir de site/conversas históricas do WhatsApp (Phase 08 RAG)

### 6.5 Tom de voz é string solta ("friendly")

Não é configurável granularmente. **Nossa oportunidade:**
- Manter o pattern da nossa 07B.4 (4 eixos: Tom/Formalidade/Humor/Empatia) com enums discretos
- Permitir ajuste pós-criação sem reiniciar o assistente

### 6.6 Blocos narrativos são densos (parágrafos de 3-5 linhas)

Fica prolixo, difícil escanear. **Nossa oportunidade:**
- Título + bullet points curtos + "Ver descrição detalhada" expansível
- Ícone visual por capability (já existe no output do canvas, levar pra etapa 2)

### 6.7 Roteador de Intenções fica escondido na config técnica da etapa 2

Usuário só vê o Roteador depois que o agente é criado. **Nossa oportunidade:**
- Mostrar visualmente as intenções e rotas JÁ na etapa 2 (preview do flow diagram)
- Permitir ajustar intenções no texto antes de aprovar

### 6.8 Canvas final é auto-gerado mas não explicável

10 nodes aparecem, mas usuário não sabe por que cada um existe. **Nossa oportunidade:**
- Cada node do canvas tem tooltip "Gerado a partir do bloco X da etapa de planejamento"
- Botão "Explicar esta etapa" em cada node chama IA pra justificar

### 6.9 Zero preview de conversa durante a criação

O user só vê a Amanda funcionando depois de criar e abrir no WhatsApp. **Nossa oportunidade:**
- **Sandbox de teste no meio do fluxo** — após etapa 2, botão "Conversar com a Amanda" abre chat simulado onde user testa a persona
- Pode ajustar em tempo real baseado em como a Amanda respondeu no teste

### 6.10 Sem versionamento do rascunho

Se user fechar e voltar, rascunho pode estar perdido. **Nossa oportunidade:**
- Auto-save do rascunho em cada etapa
- "Continuar de onde parei" na lista de agentes

## 7. Mapeamento pro Vertech (sugestão de reestruturação)

### Proposta: Arquiteto do Vertech (Phase 09) = conversa multi-turn + 4 fases claras

Substituir o fluxo de "form em 4 etapas" por **conversa guiada** onde o Arquiteto (agente nosso) conduz naturalmente. A conversa internamente tem estados que correspondem às 4 fases, mas o user só vê chat.

**Fase 1 — Contexto** (equivale à Idealização deles)
- Arquiteto pergunta vertical (radio mesmo, rápido)
- Arquiteto faz 3-7 perguntas guiadas (uma por vez, multi-turn)
- Gera mini-PRD estruturado (reusar formato deles)
- "Quer ajustar algo?" → loop até user aprovar

**Fase 2 — Capabilities** (equivale ao Planejamento)
- Arquiteto propõe blocos de comportamento
- User pode pedir "remova X", "adicione Y" em conversa natural
- **Preview visual** do flow diagram em tempo real ao lado da conversa
- "Testar conversa" abre sandbox com a Amanda atual

**Fase 3 — Conhecimento**
- Upload de arquivo, URL do site, extração do WhatsApp histórico, ou pula
- Múltiplas fontes combinadas

**Fase 4 — Publicação**
- Resumo final + vincular WhatsApp + ativar
- "Abrir no Canvas" pra edição visual manual (07C entrega o canvas)

### Implicações pra nossa roadmap

- **Phase 07B** (UI com 6 abas) **continua relevante** pra edição manual pós-criação. NÃO joga fora.
- **Phase 07C** (Flow Diagram) vira **mais crítica**: precisa existir antes do Arquiteto ser útil (user precisa ver o flow gerado e editar).
- **Phase 09** (Arquiteto) ganha subfases detalhadas baseadas nessa pesquisa.
- **Phase 08** (Tools + RAG) pode ter story específica de "extrair FAQ de WhatsApp histórico" baseada na lacuna 6.4.

## 8. Screenshots coletados

Salvos em `.playwright-mcp/` (diretório temporário do Playwright MCP, copiar pros assets se quiser preservar):

| # | Arquivo | Conteúdo |
|---|---|---|
| 01 | `mercado-agentes-01-idealizacao.png` | Tela inicial com 8 verticais |
| 02 | `mercado-agentes-02-idealizacao-preenchida.png` | 4 checkboxes marcadas + textareas preenchidas + Infos adicionais |
| 03 | `mercado-agentes-03-analise-processando.png` | Botão "Analisando..." com spinner |
| 04 | `mercado-agentes-04-analise-gerada.png` | Mini-PRD da Imobiliária SP Premium |
| 05 | `mercado-agentes-05-apos-refinamento.png` | Análise após aplicar refinamento |
| 06 | `mercado-agentes-06-planejamento.png` | Etapa 2 com 6 blocos narrativos |
| 07 | `mercado-agentes-07-planejamento-ajustado.png` | Etapa 2 com 7 blocos (follow-up adicionado) |
| 08 | `mercado-agentes-08-conhecimento.png` | Etapa 3 com 2 opções |
| 09 | `mercado-agentes-09-criacao-resumo.png` | Etapa 4 resumo final |
| 10 | `mercado-agentes-10-agente-criado.png` | Sucesso + Baixar Guia/Abrir Canvas |
| 11 | `mercado-agentes-11-canvas-final.png` | Canvas com 10 nodes auto-gerados |

## 9. Agente criado (resultado de teste)

- **URL:** `/agents-flow/canvas/473f7688-1f8a-4af1-9b17-8f2db235d7c8`
- **Nome:** Amanda
- **Função:** Consultora Digital de Imóveis
- **Tom:** Amigável
- **Vertical:** Imobiliária
- **Gênero:** Feminino
- **Capacidades:** Agendamento, Captura de Dados, FAQ
- **Canvas:** 10 nodes (5 Ações + 1 Condição/Roteador + 3 Capacidades + Início + Fim)

## 10. Conclusão e próximo passo

O fluxo do Mercado Agentes **funciona** e a lógica de 4 etapas com IA+refinamento é sólida. Tem buracos claros (single-turn, sem preview, etapas rígidas) que são nossa chance de superar.

**Minha recomendação pro próximo passo:**

Antes de seguir pra 07C ou pra começar a Phase 09, sentar contigo pra decidir:

1. **Reformatação da 07B?** Manter as 6 abas como estão (edição manual pós-criação) ou repensar?
2. **Adiantar Phase 09?** O Arquiteto se torna o ponto de entrada primário. A UI manual de edição vira secundária.
3. **Preview do flow no meio do assistente?** Isso muda a arquitetura (Flow Diagram da 07C tem que vir antes do Arquiteto).
4. **Sandbox de teste durante criação?** Exige Phase 08 (tools) parcialmente adiantada.

Aguardo tua decisão estratégica.

---

*Pesquisa concluída por Neo (@dev) via Playwright MCP em 2026-04-19.*
