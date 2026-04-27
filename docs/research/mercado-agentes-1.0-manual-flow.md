---
type: guide
title: "Mercado Agentes 1.0 — Flow Manual + Hub completo"
project: vertech-agents
tags:
  - project/vertech-agents
  - research/competitor
  - mercado-agentes
  - phase-09
  - vision-v3
date: 2026-04-25
author: Morpheus (Playwright + Vinni navegação)
status: completo (10 telas mapeadas, agente Dra. Camila criado)
related:
  - "[[mercado-agentes-assistant-flow]]"
  - "[[project_vision_v3_produto]]"
agent_test_id: 498
agent_test_name: Dra. Camila (Recepcionista, consultorio)
template_used: Consultório Médico
---

# Mercado Agentes 1.0 — Flow Manual + Hub

> [!info] Contexto
> Pesquisa via Playwright em `app.mercadoagentes.com`. Mapeia **fluxo manual completo** do construtor 1.0 (consolidado, em uso há mais tempo) + Hub pós-criação. Complementa pesquisa `mercado-agentes-assistant-flow.md` (Agentes 2.0 com assistente, 2026-04-19).
>
> **Objetivo:** alimentar Visão V3 (TIME 4 agentes) com referência validada de mercado.

> [!warning] Status do produto deles
> Banner em todas as telas do 1.0: **"Este recurso será descontinuado em breve. Aconselhamos que você comece a criar seus agentes no Agentes 2.0."** Ainda assim 1.0 é o mais consolidado e o que clientes deles usam em produção.

---

## Sumário

1. [Tela de escolha (`/agents/create`)](#1-tela-de-escolha)
2. [Seleção de Template](#2-seleção-de-template)
3. [Etapa 1 — Identidade](#3-etapa-1--identidade)
4. [Etapa 2 — Linguagem](#4-etapa-2--linguagem)
5. [Etapa 3 — Sobre o Negócio](#5-etapa-3--sobre-o-negócio)
6. [Etapa 4 — Como Conversar (Básico + Avançado)](#6-etapa-4--como-conversar)
7. [Etapa 5 — Funções e Capacidades](#7-etapa-5--funções-e-capacidades)
8. [Etapa 6 — Micro-Interações Humanizadas](#8-etapa-6--micro-interações-humanizadas)
9. [Etapa 7 — Final](#9-etapa-7--final)
10. [Lista Meus Agentes](#10-lista-meus-agentes)
11. [Hub — Dashboard do agente](#11-hub--dashboard-do-agente)
12. [Hub > Conteúdo > Treinamento (Base de Conhecimento)](#12-hub--conteúdo--treinamento)
13. [Hub > Conteúdo > Produtos](#13-hub--conteúdo--produtos)
14. [Hub > Ferramentas (8 itens)](#14-hub--ferramentas)
15. [Sidebar global da plataforma](#15-sidebar-global-da-plataforma)
16. [Padrões pra absorver no Vertech V3](#16-padrões-pra-absorver-no-vertech-v3)
17. [Buracos vs oportunidades Vertech](#17-buracos-vs-oportunidades-vertech)
18. [Inconsistências observadas](#18-inconsistências-observadas)

---

## 1. Tela de escolha

**URL:** `/agents/create`

Após click em sidebar **AGENTES → Criar Agente**, abre tela com 2 cards lado a lado:

### Card A — Agente por etapas (PADRÃO)
- **Pitch:** "Controle total! Configure fluxos personalizados, funções especiais, processos de qualificação e automações complexas."
- **Inclui:** Fluxos de conversação customizados / Funções e integrações / Processos de qualificação / Configurações avançadas
- **CTA:** "Criar Agente por etapas"
- **UX:** Wizard 7 etapas determinístico com template opcional.

### Card B — Agente por Prompt
- **Pitch:** "Máxima flexibilidade! Descreva seu agente ideal em texto livre e deixe a IA criar tudo para você de forma automática e personalizada."
- **Ideal pra:** Usuários experientes / Agentes altamente customizados / Criação rápida via IA / Máxima personalização
- **CTA:** "Criar por Prompt"

> [!note] Padrão UX
> 2 caminhos = **determinístico (form) vs IA (texto livre)**. Mesmo tradeoff que Vertech enfrentou em Phase 09 (chat-driven → wizard). Eles oferecem ambos.

---

## 2. Seleção de Template

Após click em "Criar Agente por etapas", abre tela com header **"Identidade do Agente"** + bloco grande **"Escolha um Template para Começar"**.

> [!info] Texto de explicação
> "Selecione um template pré-pronto para preencher automaticamente os campos do agente, ou escolha 'Template em Branco' para começar do zero."

### Opção Personalizada (1)

| Emoji | Nome | Descrição |
|-------|------|-----------|
| 📝 | Template em Branco | Comece do zero com um template vazio |

### Templates Profissionais por Categoria (12 templates em 6 categorias)

UI: accordion 1 categoria expandida por padrão (Saúde). Cada card de template mostra: emoji grande + nome + descrição + tag-slug + count "N etapas" + (opcional) badge "CRM integrado" + botão "Usar Template".

| Categoria | Template | Slug | "Etapas" | CRM integrado |
|-----------|----------|------|----------|---------------|
| 🏥 Saúde e Bem-estar | 🏥 Consultório Médico | `consultorio` | 6 | — |
| 🏥 Saúde e Bem-estar | 💆‍♀️ Clínica de Estética | `estetica` | 6 | — |
| 🏠 Imóveis e Construção | 🏠 SDR Imobiliário | `imobiliaria` | **8** | ✅ |
| 🏠 Imóveis e Construção | 🏗️ Construtora/Incorporadora | `construtora` | 4 | ✅ |
| 💼 Serviços Profissionais | ✂️ Barbearia | `barbearia` | 6 | ✅ |
| 💼 Serviços Profissionais | 💄 Salão de Beleza | `salao_beleza` | 4 | ✅ |
| 🍕 Alimentação e Hospitalidade | 🍕 Restaurante | `restaurante` | 6 | ✅ |
| 🍕 Alimentação e Hospitalidade | ☕ Cafeteria/Padaria | `cafeteria` | 4 | ✅ |
| 🛍️ Varejo e Comércio | 🛍️ Loja/Varejo | `loja` | 4 | ✅ |
| 🛍️ Varejo e Comércio | 💍 Joalheria/Semijoias | `joalheria` | 4 | ✅ |
| 🏢 Secretariado e Administrativo | 👩‍💼 Secretária Executiva | `secretariado` | 6 | ✅ |
| 🏢 Secretariado e Administrativo | 🏢 Escritório Contábil | `contabilidade` | 4 | ✅ |

### Modal de confirmação ao clicar "Usar Template"

Dialog "Confirmar Template" mostra **exatamente o que será preenchido**:

```
Atenção: Este template irá preencher automaticamente os seguintes campos:

Função: Recepcionista
Gênero: feminino
Personalidade: Atenciosa, Profissional, Empática
Área: consultorio
Estilo de linguagem e regras fundamentais
Fluxo de conversa com 6 etapas
Micro-interações pré-configuradas
Informações do negócio como template
```

Botões: Cancelar | Aplicar Template

> [!tip] Insight crítico
> "N etapas" do template = **etapas do fluxo conversacional** (Etapa 4), não do wizard. Wizard tem sempre 7 etapas. Template apenas pré-configura.

> [!warning] Inconsistência: Saúde sem CRM integrado
> 10 dos 12 templates têm badge "CRM integrado". Os 2 da categoria Saúde NÃO têm. Categoria mais antiga não foi atualizada.

> [!warning] Verticais não cobertas
> 6 categorias / 12 templates cobrem: Saúde, Imóveis, Serviços (apenas beleza), Alimentação, Varejo, Administrativo. **Não há templates pra:** Educação/Cursos, Info-produto, SaaS, Profissionais Liberais (advogado, psicólogo), E-commerce digital, Fitness/Academia, Pet, Automotivo. Vertech V3 deve cobrir mais verticais.

---

## 3. Etapa 1 — Identidade

**Stepper:** 7 etapas no topo (Identidade ativa, Linguagem, Sobre o Negócio, Como Conversar, Funções, Interações, Final)

**Header:** "Identidade do Agente" + botão "Alterar Template" (top right) + alert verde "Template aplicado com sucesso! Os campos foram preenchidos automaticamente. Você pode editá-los conforme necessário."

### Campos

| Campo | Tipo | Obrigatório | Pré-populado pelo template (Consultório Médico) | Notas |
|-------|------|-------------|-------------------------------------------------|-------|
| Foto do Perfil | file (JPG/PNG/GIF, max 1MB) | Não | — | Vazio até user fazer upload |
| Nome do Agente | text | ✅ | **Vazio** (user define) | Placeholder: "Ex: Maria Atendimento" |
| Função | text (max 30 chars) | Não | "Recepcionista" | Placeholder: "Ex: secretária, atendente virtual..." |
| Gênero | combobox custom | ✅ | "Feminino" | hidden input `agentGender=feminino` |
| Área de Atuação | combobox custom | ✅ | "Consultório" | hidden input `agentArea=consultorio` |
| Personalidade | multi-checkbox (10 opções) | ✅ | Atenciosa, Empática, Profissional | Sem limite máximo aparente |

### Personalidade — 10 opções fixas

`Atenciosa | Calorosa | Carinhosa | Calma | Divertida | Empática | Energética | Paciente | Positiva | Profissional`

> [!warning] Validação bloqueante
> Clicar "Próximo" sem Nome preenchido dispara dialog **"Campos obrigatórios — Por favor, preencha todos os campos obrigatórios antes de continuar."** + botão OK. Validação feita só ao avançar (não inline).

> [!note] Padrão de versão dual (mobile vs desktop)
> DOM contém **2 versões do form** simultâneas: uma `agent-wizard-mobile-container d-md-none` (oculta em desktop) e a desktop. Quando set programático via JS, react state do form mobile e desktop podem dessincronizar. Nada visível pro user — só causou problema na automação.

---

## 4. Etapa 2 — Linguagem

### Idioma
- Radio: **Identificar Idioma** (default ativo) | **Português Brasil** (BR flag)

### Estilo de Linguagem (heading com paleta icon)

**Opções de Estilo** (multi-checkbox, 4 opções):
- ✅ 👋 Fale como um amigo
- ☐ 🎉 Demonstre empolgação
- ✅ ☀️ Use linguagem leve e natural
- (4ª opção não capturada — provável "Use vocabulário simples")

**Regras Fundamentais** (multi-checkbox, 4 opções):
- ✅ Não usar formatação markdown
- ☐ Use `[[break]]` para quebra de mensagens longas
- ✅ Evite palavras formais
- (4ª opção não capturada)

### Exemplos de Linguagem (info box bilateral)

| ❌ Evitar | ✅ Preferir |
|-----------|-----------|
| "Solicito que informe" | "Me conta aí" |
| "Gostaria de saber" | "Quero saber" |
| "Por gentileza" | "Por favor" |

### Listas tunáveis

| Campo | Pré-populado |
|-------|--------------|
| **Palavras Proibidas** (textarea, helper "Separe por vírgulas") | "Solicito, cordialmente, atenciosamente, prezado" |
| **Palavras Preferidas** (textarea, helper "Separe por vírgulas") | "Perfeito, ótimo, que bom, maravilha, excelente" |

> [!tip] Insight
> Pattern **palavras proibidas/preferidas como string CSV** = simples e direto. Cabe no system prompt. Vertech deveria copiar.

> [!tip] `[[break]]` confirmado
> Confirma uso documentado em `project_vision_v3_produto.md`. Tag operacional padrão de mercado pra dividir mensagens longas em múltiplas WhatsApp messages.

---

## 5. Etapa 3 — Sobre o Negócio

### Informações sobre o Negócio (textarea)
- **Limite:** 1000 caracteres
- Counter live: "188/1000 caracteres. Apenas as informações mais importantes, o restante você poderá treinar seu agente com sua base de conhecimento."
- Pré-populado:
  ```
  Horário de atendimento: Segunda a sexta, das 8h às 18h

  Especialidades disponíveis:
  - Consulta geral
  - Exames preventivos
  - Acompanhamento médico

  *Trabalhamos com os principais convênios*
  ```

### Endereço (textarea)
- Pré-populado: "Rua das Flores, 123 - Centro - São Paulo/SP"

### Formas de Pagamento (multi-checkbox 2 colunas, 7 opções)
`Dinheiro | PIX | Cartão de Débito | Cartão de Crédito | Transferência Bancária | Cheque | Boleto`

Default: **todas DESmarcadas** (mesmo no template).

### Códigos Especiais (info box amarela)

> "Os seguintes códigos se inseridos nas informações serão preenchidos automaticamente pelo sistema:"

| Código | Significado | Botão |
|--------|-------------|-------|
| `{{horario_atendimento}}` | Horários de funcionamento | Inserir |
| `{{tipos_atendimento}}` | Tipos de atendimento, duração e valores | Inserir |

> [!tip] Insight crítico
> **Template variables com `{{}}`** populadas dinamicamente pelo sistema baseadas em config externa (horários, tipos cadastrados em outro lugar). Vertech V3 deve ter pattern similar pra horários da agenda + serviços do CRM.

---

## 6. Etapa 4 — Como Conversar

> Esta é a etapa mais rica do wizard.

**Header:** "Como seu Agente vai Conversar" + toggle **Básico | Avançado** (top right)

### Modo Básico (default)

Alert: "Modo Básico: Configure as conversas de forma simples e intuitiva. Perfeito para quem está começando! 😊"

**Agente Principal** + botão **+ Nova Etapa**

**Lista de etapas conversacionais** (template Consultório Médico = 6 etapas):

| # | Emoji | Nome |
|---|-------|------|
| 1 | 👋 | Recepção Cuidadosa |
| 2 | 🔍 | Tipo de Consulta |
| 3 | ⚡ | Avaliação de Urgência |
| 4 | 📅 | Verificar Disponibilidade |
| 5 | 📋 | Dados do Paciente |
| 6 | ✅ | Confirmação e Orientações |

**Etapa expandida (ex: Recepção Cuidadosa):**
- Drag handle (reordenar)
- Nome editável (input text + emoji)
- Subtitle/descrição: "Saudação acolhedora e identificação do motivo"
- Botão **"Preencher com IA"** (regenera prompt da etapa via IA)
- Textarea principal com **prompt template**:
  > `Olá! Tudo bem? Sou a [agentName], do [businessName]! Como posso cuidar de você hoje?`
- Helper: "Use `[[break]]` para enviar mensagem por partes"
- Slot **"Inserir imagem"** (dropdown "Adicionar uma imagem (opcional)") — anexa imagem à mensagem da etapa
- Botão lixeira (deletar etapa)

### Modo Avançado

Alert: "Modo Avançado: Controle total sobre fluxos e situações especiais. Para usuários experientes."

**Diferenças vs Básico:**
- Header: **"Agente Padrão"** (não "Principal") + 2 botões: **+ Nova Etapa** e **+ Novo Fluxo Especial**
- Cada etapa expandida ganha campo extra: **"Chamar função"** (dropdown, default "Nenhuma") = **tool call por etapa**
- Botão "IA" compacto (em vez de "Preencher com IA")
- Footer: seção **"Fluxos Especiais"** (vazia inicialmente)
  > "Nenhum fluxo especial configurado. Clique em 'Novo Fluxo Especial' para criar fluxos personalizados para situações específicas."

> [!tip] Insight crítico — "Fluxos Especiais"
> Equivalente a **intent routing** (roteador de intenções). Fluxos paralelos pra situações específicas: ex. usuário pede cancelamento → vai pro fluxo especial Cancelamento em vez do principal Agendamento. Pattern essencial pra Vertech V3.

> [!tip] Sintaxe placeholders
> Aqui usa `[agentName]`, `[businessName]` (colchetes simples). Etapa 3 usa `{{horario_atendimento}}` (chaves duplas). Etapa 5 usa `[name@]`, `[data]`, `[hora]`. **3 sintaxes diferentes no mesmo produto.** Inconsistência.

---

## 7. Etapa 5 — Funções e Capacidades

> A etapa-chave operacional.

**Header:** "Funções e Capacidades" + botão **Ver Schemas** (top right, provável export JSON)

### Toggles globais (2)

| Toggle | Default | Descrição |
|--------|---------|-----------|
| 🎯 Habilitar Funções Inteligentes | ✅ | Permite que seu agente execute ações automáticas como agendar, cancelar e muito mais! |
| 👁️ Análise de Imagens e PDFs | ☐ | Permite que o agente analise automaticamente imagens e documentos PDF enviados pelos usuários |

### Construtor de Funções Inteligentes (info box verde)
> "Configure exatamente quais informações cada função deve coletar do cliente. É como montar um quebra-cabeça - escolha apenas as peças que você precisa!"
>
> 💡 Dica: Comece habilitando apenas as funções que você realmente usa. Você pode sempre adicionar mais depois.

### 9 Funções nativas pré-definidas

Cada uma é toggle individual + accordion expandível:

| # | Emoji | Nome | Descrição | Default ativa |
|---|-------|------|-----------|---------------|
| 1 | 📅 | Agendar Atendimento | Agenda um atendimento com as informações necessárias | ✅ |
| 2 | ❌ | Cancelar Atendimento | Cancela agendamentos existentes | ☐ |
| 3 | 🔄 | Reagendar Atendimento | Remarca agendamentos existentes | ☐ |
| 4 | 🔎 | Consultar Atendimentos | Consulta agendamentos existentes | ☐ |
| 5 | 🔍 | Verificar Disponibilidade | Verifica horários disponíveis considerando a duração específica do tipo de atendimento | ☐ |
| 6 | 📊 | Coletar Dados | Coleta informações dos clientes | ☐ |
| 7 | ✅ | Processar Confirmação | Processa confirmação de presença | ☐ |
| 8 | ⭐ | Processar Feedback | Processa avaliação do cliente | ☐ |
| 9 | 👤 | Atendimento Humano | Transfere a conversa para um atendente humano | ☐ |

### Função expandida (ex: Agendar Atendimento)

**"Selecione os campos que o agente deve coletar:"** — 11 campos pré-definidos, cada um toggle + tag tipo (STRING/ENUM) + sub-toggle Campo Obrigatório:

| Campo | Tipo | Default ativo | Obrigatório (default) | Helper |
|-------|------|---------------|----------------------|--------|
| Nome do Cliente | STRING | ✅ | ✅ | Nome completo do cliente |
| Data de Nascimento | STRING | ✅ | ☐ | Data no formato DD-MM-YYYY |
| CPF | STRING | ☐ | — | CPF do paciente (apenas números) |
| Data do Agendamento | STRING | ✅ | ✅ | Data no formato DD-MM-YYYY |
| Horário | STRING | ✅ | ✅ | Horário no formato HH:MM |
| Tipo de Atendimento | STRING | ☐ | — | Tipo de atendimento baseado no que o cliente mencionou |
| Valor | STRING | ☐ | — | Valor do atendimento |
| Status do Pagamento | ENUM | ☐ | — | Opções: pago, pendente |
| Motivo | STRING | ☐ | — | Motivo do agendamento |
| Origem | ENUM | ☐ | — | Opções: cliente_direto, indicação, mídias_sociais |
| Observações | STRING | ✅ | ✅ | Informações adicionais |

> Helper de obrigatório: "Se marcado, o agente SEMPRE pedirá esta informação"

### Campos Personalizados (Metadata)

Botão **+ Adicionar Campo** — extensão livre.

Info box amarela:
> **Formato dos Campos Personalizados:**
> - **Chave:** `nome_do_campo` (sem espaços, use `_` para separar palavras)
> - **Descrição:** Descrição clara do que o campo representa
>
> **Exemplos:**
> - `niche_focus`: "Segmento de negócio do cliente"
> - `volume_atendimento`: "Número aproximado de conversas/dia"
> - `lead_source`: "Principal origem dos leads"

Estado inicial: "Nenhum campo personalizado adicionado. Clique em 'Adicionar Campo' para criar campos de metadata personalizados."

### Toggles de integração (após campos)

| Toggle | Default | Função |
|--------|---------|--------|
| Conectar no CRM | ✅ | Liga o agendamento criado ao CRM nativo da plataforma |
| Conectar Cliente | ✅ | Associa ao registro Cliente (customer record) |

### Resposta do Agente (radio + textarea)

- ☐ Usar resposta automática do sistema
- 🔘 **Resposta Personalizada** (default) + botão IA
  - Textarea: "O que o agente deve responder após agendar atendimento?"
  - Helper: "Use códigos como `[name@]`, `[data]`, `[hora]` para dados dinâmicos"

### Resumo das Suas Funções (footer)
- Lista funções ativas (apenas Agendar Atendimento ativa)
- Stats: "4 campos padrão • 0 personalizados • 4 obrigatórios"

> [!tip] Insight profundo — schema de dados estruturados
> Cada função tem **schema completo** (campos com tipo + obrigatoriedade + descrição). É **JSON Schema simplificado** com UI. Vertech V3 deve copiar este pattern: tools com schema configurável + extensão metadata.

> [!tip] Insight — handoff humano nativo
> Função 9 "Atendimento Humano — Transfere a conversa para um atendente humano" = paralelo direto ao `pedirHumano` da Visão V3. Mercado já tem.

---

## 8. Etapa 6 — Micro-Interações Humanizadas

**Header:** "Micro-Interações Humanizadas"

Alert: "Configure micro-interações para tornar seu agente mais humanizado e natural. Estas configurações aparecerão no final do prompt."

### 6 micro-interações (cada com checkbox + textarea + botão "Preencher com IA")

| # | Nome | Default ativo | Configuração pré-populada |
|---|------|--------------|---------------------------|
| 1 | Conectores Naturais | ✅ | "Perfeito!, Ótimo!, Que bom!, Maravilha!, Entendi!" |
| 2 | Validação Emocional | ✅ | "Compreendo perfeitamente!, Entendo sua necessidade!, Que importante!" |
| 3 | Celebração | ✅ | "Excelente!, Perfeito!, Ótima escolha!, Que bom!" |
| 4 | Upsell Natural | ☐ | (vazio) |
| 5 | Emojis Estratégicos | ✅ | 😊 📅 ⏰ 💙 ❤️ ✨ 🎉 🙏 ⭐ 📋 |
| 6 | Mantra para Cada Resposta | ☐ | (vazio) |

> [!tip] Insight — Modularidade do prompt
> Padrão **mais granular que prompt único**. Mercado separa:
> - **Etapa 2 Linguagem** = regras fundamentais (estilo + palavras evitar/preferir)
> - **Etapa 4 Como Conversar** = fluxo conversacional (etapas + prompts)
> - **Etapa 5 Funções** = tools disponíveis + schemas
> - **Etapa 6 Micro-Interações** = injeção final de humanização (conectores, emojis, etc)
>
> 4 camadas independentes que compõem o system prompt. Vertech V3 deve ter pattern similar.

> [!note] Upsell Natural
> Toggle separado pra cross-sell embutido na conversa. Quando ativo, agente sugere produto/serviço complementar.

> [!note] Mantra para Cada Resposta
> Frase recorrente que agente DEVE incluir em toda resposta (assinatura humanizada). Provavelmente usado pra branding/CTA.

---

## 9. Etapa 7 — Final

**Stepper:** todas 6 etapas anteriores VERDES (concluídas), Final em AZUL (atual)

**Conteúdo:** apenas alert verde:
> 🎉 **Seu agente está pronto!**

**Botões:** Anterior | Salvar Rascunho (top right) | **Criar Agente** (CTA verde)

> [!warning] Etapa 7 ultra-minimalista
> Sem resumo dos campos, sem preview, sem confirmação dos passos anteriores. Só 1 alert + 1 botão. Oportunidade Vertech: tela Final com **resumo completo + preview do agente** antes de publish.

### Modal pós-Criar Agente

Dialog: ✓ **"Agente criado com sucesso!"**
> "Seu agente de IA foi configurado e está pronto para uso."

Botão OK → redireciona pra `/agents` (lista Meus Agentes).

---

## 10. Lista Meus Agentes

**URL:** `/agents`

**Header:** "Meus Agentes" + busca "Buscar agentes..."

**Stats cards** (2 colunas no topo):
- TOTAL: 1
- ATIVOS: 0

### Card do agente (Dra. Camila)

- Avatar (robô azul)
- Top-right: menu kebab (3 dots) + chevron dropdown
- Nome: **Dra. Camila** (+ ícone chave amarela ao lado — provável "API Key necessária")
- Função: Recepcionista
- Badge versão: **v.1**
- CTA principal: botão verde grande **Hub**
- Footer: status (● Inativo) + 4 botões action (toggle ativar | edit | duplicar | deletar)

### Modal "API Key Necessária" ao tentar ativar

Dialog ℹ️:
> **API Key Necessária**
> Você precisa configurar a API Key antes de ativar o agente.

Botão: **Configurar API Key**

> [!tip] Insight CRÍTICO — modelo BYOK
> Mercado Agentes opera com **BYOK (Bring Your Own Key)**: cliente configura própria API Key OpenAI. Cliente paga OpenAI direto + assinatura plataforma. Não é resale de tokens.
>
> **Implicação pro Vertech V3:** decidir modelo —
> - **Resale de tokens** (Vertech compra OpenAI bulk + repassa com markup)
> - **BYOK** (cliente paga OpenAI direto)
> - **Híbrido** (free tier com tokens da Vertech, premium = BYOK)
>
> Modelo afeta pricing, margens e UX onboarding.

---

## 11. Hub — Dashboard do agente

**URL:** `/agents/{id}/hub`

### Header
- Breadcrumb: "Agente — Início › Dashboard"
- Tabs nav (3): **🏠 Início** (ativa) | **📦 Conteúdo ▾** | **❌ Ferramentas ▾**

### Card identidade
- Avatar
- **Dra. Camila** + badge **🔒 INATIVO** (cinza com cadeado) + badge **V1** (azul)
- Subtitle: "Recepcionista • consultorio • Criado em 25/04/2026"
- Status conexão: 📞 **WhatsApp: não conectado** (laranja warning)

### Performance do Agente (3 cards stats)

| Stat | Valor | Sub |
|------|-------|-----|
| 💬 Total de Mensagens | 0 | 0 mensagens hoje |
| 📦 Produtos | 0 | Catálogo disponível |
| 📚 Base de Conhecimento | 0 | Documentos treinados |

Top-right do bloco: badge **GPT-4.1-MINI** (modelo) + badge **V1** (versão)

> [!note] Modelo padrão = GPT-4.1-MINI
> Mercado Agentes usa OpenAI exclusivamente (não Anthropic, não Google). Modelo padrão = mini (mais barato). Vertech precisa decidir qual provider/modelo padrão.

---

## 12. Hub > Conteúdo > Treinamento

**Path:** Hub → Conteúdo (dropdown) → Treinamento

**Header:** "Base de Conhecimento & Treinamento — Gerencie documentos e treine o agente Dra. Camila"

### Sub-tabs (2)
- **Base de Conhecimento** [0/3] (ativa)
- **Treinamento** (não explorada — provável: lista arquivos da BC + seleciona quais usar pra treinar este agente específico)

### Counter + Botão Limpeza Profunda
- "0/3 ARQUIVOS" + botão refresh
- Botão vermelho **Limpeza Profunda** (top right) — destrutivo

### Biblioteca de Documentos (info box verde)
- "Esta é sua biblioteca de documentos para treinamento do seu agente de IA."
- **Tipos aceitos:** PDF, DOCX, CSV, XLS, XLSX
- **Limite:** Máximo 3 arquivos de até 1MB cada
- **Fluxo integrado:** Após carregar, os arquivos podem ser selecionados para treinamento

### Carregar Novos Documentos (drag-drop area)
- "Adicionar Documentos"
- Helper: "Arquivos carregados serão automaticamente selecionados para treinamento"
- Botão **Selecionar Arquivos**
- Footer: "0/3 arquivos • Máximo 1MB por arquivo"

### Empty state
> "Base de conhecimento vazia. Comece carregando documentos para criar uma base de conhecimento rica para seus agentes IA. **Os documentos serão indexados e ficarão disponíveis para seleção durante a criação de novos agentes.**"

> [!warning] Limite ridículo: 3 arquivos × 1MB = 3MB total
> Limitação dura. Vertech V3 deve ter MUITO mais (mínimo 50 arquivos × 10MB cada). Phase 08-alpha já suporta isso via pgvector + chunking.

> [!warning] Tipos limitados
> Sem suporte a TXT, MD, JSON, HTML. Vertech V3 deve aceitar formato amplo (incluindo OCR de scanned PDFs).

> [!tip] Insight crítico — BC é compartilhada por organização
> "Os documentos serão indexados e ficarão disponíveis para seleção durante a criação de novos agentes." → BC NÃO é por agente individual, é **compartilhada por organização**. Múltiplos agentes podem usar a mesma BC. Vertech V3 deve ter este pattern (RAG-1 Knowledge da Marca = compartilhada).

---

## 13. Hub > Conteúdo > Produtos

**Path:** Hub → Conteúdo (dropdown) → Produtos
**URL:** `/agents/{id}/hub#produtos`

**Header:** "Produtos — Catálogo de produtos do agente"

### Actions (3 botões top-right)
- **🌐 Treinar Agente** (provável: indexa catálogo no RAG do agente)
- **📤 Importar** (provável: CSV/XLS bulk)
- **+ Novo Produto** (criar manual)

### Filtros e Busca
- Input: "Buscar produto" (Nome, descrição...)
- Dropdown: "Ordenar por" (Mais recentes default)
- Botão Limpar

### Lista de Produtos
- Counter: "0 PRODUTOS"
- Empty: "Nenhum produto encontrado com os filtros aplicados. Tente ajustar os filtros de busca."

> [!tip] Insight — RAG separado pra produtos
> Catálogo tem **RAG dedicado** (botão "Treinar Agente"). Indexa nome+descrição+preço pra agente recomendar item específico contextualmente. Aplicação: e-commerce, info-produtos, joalheria, etc. Vertech V3 deve considerar pattern similar pra "Catálogo de Serviços" indexado.

---

## 14. Hub > Ferramentas

**Path:** Hub → Ferramentas (dropdown)

Dropdown extenso, **3 grupos, 8 itens:**

### TESTE & VALIDAÇÃO

| Item | Descrição |
|------|-----------|
| ▶️ **Playground** | Teste e valide o agente em tempo real |
| 🔗 **Link WhatsApp** | Gerencie links públicos para conexão WhatsApp |

### AUTOMAÇÃO

| Item | Descrição |
|------|-----------|
| 🤖 **Automações** | Gerencie automações do agente |
| 💬 **Follow-up de Leads** | Configure mensagens automáticas para leads que somem |
| ⏰ **Mensagens por Horário** | Mensagens automáticas em janelas de horário definidas |
| ⏰ **Follow-ups Clientes** | Visualize e gerencie follow-ups agendados de clientes |
| 📩 **Templates** | Gerencie templates de mensagens para automações |

### CONECTIVIDADE

| Item | Descrição |
|------|-----------|
| 🔌 **Integrações** | Conecte o agente com sistemas externos |

### Playground (testado, mas bloqueado)

Tela com header "Playground — Área de testes do agente Dra. Camila".

Estado bloqueado: ⚠️ **Agente Inativo**
> "O agente 'Dra. Camila' precisa estar ativo para realizar testes no Playground. Ative o agente na lista de agentes para começar a testar suas funcionalidades."

Botão: **Gerenciar Agentes** (volta pra `/agents`).

> [!tip] Insight — Playground exige agente ATIVO
> Limitação UX: não dá pra testar em rascunho. Cliente precisa **configurar API Key + ativar agente** antes de qualquer teste. Vertech V3 deve permitir **sandbox de teste sem ativar** (Visão V3 já planeja isso explicitamente).

> [!tip] Insight crítico — Núcleo de automação
> 5 dos 8 itens são de AUTOMAÇÃO (Automações, Follow-up Leads, Mensagens Horário, Follow-ups Clientes, Templates). Mercado entende que **disparos em massa + reativação de base** são core feature, não nice-to-have. Confirma direção da Visão V3 (Agente de Campanhas + Analista propondo campanhas).

---

## 15. Sidebar global da plataforma

Sidebar fixa esquerda, agrupada em 8 seções:

| Seção | Itens |
|-------|-------|
| (top) | Logo + Meu Plano (badge "White Label Plus") + Dashboard |
| **ATENDIMENTO** | Central de Atendimento |
| **AGENTES** | Meus Agentes / Criar Agente / Agentes 2.0 (badge NOVO) |
| **APPS & INTEGRAÇÕES** | Canais / Integrações |
| **APRENDIZADO** | Vídeos Tutoriais |
| **GESTÃO COMERCIAL** | Agenda / Base de Clientes / Pipeline CRM |
| **MINHA ORGANIZAÇÃO** | Organização / Subcontas / Implementações / Usuários / Métricas |
| **FINANCEIRO** | Meu Plano / Faturamento / Minhas Assinaturas |
| **SUPORTE** | Suporte Clientes / Suporte Plataforma |
| **TREINAMENTOS** | Meus Treinamentos / Gerenciar Treinamentos |
| **CONFIGURAÇÕES** | Minha Empresa / Configurações Globais |

> [!tip] Insight — Multi-tenancy via "Subcontas + Implementações"
> Padrão **agência atendendo cliente final**. "Subcontas" = clientes da agência. "Implementações" = projetos de setup. Modelo igual ao da Vertech V3 (Master agencia → orgs cliente). Confirma viabilidade do modelo.

> [!tip] Insight — "Treinamentos" é módulo separado
> "Meus Treinamentos / Gerenciar Treinamentos" = módulo de **educação pra clientes da agência**. White Label inclui conteúdo formativo. Vertech pode oferecer similar.

---

## 16. Padrões pra absorver no Vertech V3

### Hard wins (copiar direto)

1. **2 modos de criação:** wizard determinístico (etapas) + IA (prompt livre). Atender CEO leigo + dev experiente. (Vertech Phase 09 wizard atual atende só metade.)
2. **Templates por vertical com modal de confirmação** — preview do que será preenchido + botão Cancelar. Reduz "ué, mudou tudo".
3. **Funções com schema de dados** — cada tool tem campos tipados + obrigatoriedade configurável + extensão via metadata personalizada (chave + descrição). Pattern operacional, não burocracia.
4. **Modo Básico vs Avançado por etapa** — toggle revela/esconde controle técnico. Atende leigo (Básico) e operador agência (Avançado).
5. **`[[break]]` como tag de quebra de mensagem** — confirmado padrão de mercado. Já mapeado na Visão V3.
6. **Palavras proibidas/preferidas como CSV** — simples, cabe no system prompt.
7. **Micro-interações como camada separada** — conectores, validação, celebração, emojis, mantra. Modular e tunável.
8. **Fluxos Especiais** = roteador de intenções (ex: cancelamento vai pro fluxo dedicado). Vertech V3 precisa.
9. **BC compartilhada por organização** — múltiplos agentes podem usar mesma BC. Vertech V3 RAG-1 já alinhado.
10. **Catálogo de Produtos com RAG dedicado** — agente recomenda item específico contextualmente. Pattern útil pra info-produtos.
11. **Handoff humano como tool nativa** — função "Atendimento Humano" pré-existe. Visão V3 já planeja `pedirHumano`.
12. **Botão "Preencher com IA" em cada campo de prompt** — IA sugere preenchimento contextual. Reduz friction.
13. **Sub-conta + Implementação** — multi-tenancy agência→cliente nativo na sidebar. Vertech já alinhado (Master/Agency/Client).

### Patterns visuais

14. **Stepper horizontal (7 etapas)** com cores: cinza (futura), azul (atual), verde (concluída).
15. **Salvar Rascunho** persistente em todas as etapas (top right).
16. **Card do agente** com avatar grande + nome + função + badge versão + status + 4 ações + CTA Hub.
17. **Hub com 3 tabs nav** (Início + dropdowns Conteúdo/Ferramentas) — não overflow vertical.
18. **3 cards de stats** dashboard centrais (Mensagens / Produtos / BC) — métricas-chave visíveis.

---

## 17. Buracos vs oportunidades Vertech

### Buracos do Mercado Agentes (oportunidades pro Vertech V3)

1. **3 arquivos × 1MB de BC.** Limite duro absurdo. Vertech entrega 50+ arquivos × 10MB+.
2. **Tipos de arquivo limitados** (PDF/DOCX/CSV/XLS/XLSX). Vertech aceita TXT, MD, JSON, HTML, OCR de scanned PDFs.
3. **Etapa Final ultra-minimalista** (só 1 alert + 1 botão). Vertech: tela Final com resumo completo + preview de conversa + botões inline.
4. **Sem sandbox sem ativar.** Cliente precisa BYOK + ativar pra testar. Vertech V3 já planeja sandbox real sem precisar conectar WhatsApp.
5. **3 sintaxes diferentes de placeholder** (`[var]`, `{{var}}`, `[name@]`). Vertech: padronizar 1 sintaxe (recomendo `{{var}}` Mustache).
6. **Categoria Saúde sem CRM integrado.** Inconsistência visível. Vertech: paridade entre todos verticais.
7. **Apenas 6 categorias / 12 templates.** Sem Educação, Info-produto, SaaS, Profissionais Liberais, Fitness, Pet, Automotivo, etc. Vertech V3 cobrir 10+ verticais.
8. **Modelo único OpenAI GPT-4.1-MINI hardcoded** (provável). Vertech V3: multi-provider (Anthropic Claude default, fallback OpenAI/Google).
9. **Tools fixas (9 funções)** — sem extensão por usuário (só adicionar campos a função existente). Vertech V3: marketplace/criação de tools custom.
10. **Sem multi-agente/handoff entre agentes.** "Atendimento Humano" só transfere pra humano, não pra outro agente especializado. Vertech V3 = TIME 4 agentes coordenados.
11. **Sem RAG por lead** (memória profunda do lead). Mercado tem só BC compartilhada + Produtos. Vertech V3 = RAG-2 Memória do Lead.
12. **Sem Analista Comercial** (agente de inteligência sobre pipeline). Mercado tem só execução, sem inteligência sobre base. Vertech V3 = Agente Analista com RAG-3.
13. **Sem visualização de fluxo do TIME** (diagrama). Mercado mostra etapas como lista vertical. Vertech V3 = Flow Diagram visual de relacionamento entre 4 agentes.
14. **Sem versionamento visível além de "v.1"**. Sem histórico, sem rollback, sem A/B testing. Vertech V3 já planeja audit + undo (Phase 07C).

### Diferenciais V3 confirmados

A Visão V3 (TIME 4 agentes) já cobre todos os 14 buracos acima. Mercado Agentes é um produto **single-agent + automação básica** — Vertech V3 é **multi-agent + inteligência comercial**. Diferenciação clara.

---

## 18. Inconsistências observadas

1. **3 sintaxes de placeholders** no mesmo produto (Etapa 3 `{{}}`, Etapa 4 `[]`, Etapa 5 `[name@]`).
2. **Saúde sem CRM integrado** vs outras 5 categorias com.
3. **Mobile container `d-md-none` no DOM** mesmo em desktop. Render duplo causa state desync (problema interno, invisível pro user).
4. **"Próximo" valida só ao clicar** (não inline). Dialog modal bloqueia. Não destaca campo faltante visualmente.
5. **Toggle "Habilitar Funções Inteligentes" global** vs toggles por função. Redundante? Se global desabilitado, todas as funções somem? A confirmar.
6. **Tela seleção template + form ficam no mesmo container.** Após template aplicado, scroll revela form. Sem indicação visual clara da transição.

---

## Próximos passos

- [ ] Mapear **Agentes 2.0 manual** (versão nova, recém saiu do beta) — comparar diferenças
- [ ] Atualizar `mercado-agentes-assistant-flow.md` (pesquisa 2.0 com assistente de 2026-04-19) com cross-references
- [ ] Decidir 4 questões pendentes da pesquisa anterior + novas questões emergidas:
  - Modelo BYOK vs resale tokens
  - Multi-provider (OpenAI/Anthropic/Google) vs single
  - Sintaxe placeholders padrão (`{{}}` recomendado)
  - Limite de BC (recomendado 50 × 10MB)
- [ ] Atualizar Visão V3 com confirmações deste mapeamento (ver `project_vision_v3_produto.md`)
