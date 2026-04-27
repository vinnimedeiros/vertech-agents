---
type: guide
title: "Mercado Agentes — Síntese Comparativa 1.0 vs 2.0 + Recomendações Vertech V3"
project: vertech-agents
tags:
  - project/vertech-agents
  - research/competitor
  - mercado-agentes
  - vision-v3
  - decision-document
date: 2026-04-25
author: Morpheus
status: completo
related:
  - "[[mercado-agentes-1.0-manual-flow]]"
  - "[[mercado-agentes-2.0-manual-flow]]"
  - "[[mercado-agentes-assistant-flow]]"
  - "[[project_vision_v3_produto]]"
supersedes_decisions_in:
  - "[[mercado-agentes-assistant-flow]] (4 decisões pendentes de 2026-04-19)"
---

# Mercado Agentes — Síntese Comparativa + Recomendações Vertech V3

> [!info] Contexto
> 3 dias de pesquisa Playwright em `app.mercadoagentes.com` (04-19, 04-25). Cobertura:
> - **Agentes 1.0 com Assistente** (4 etapas IA-driven) — `mercado-agentes-assistant-flow.md`
> - **Agentes 1.0 Manual** (wizard 7 etapas + Hub completo) — `mercado-agentes-1.0-manual-flow.md`
> - **Agentes 2.0 Manual** (canvas drag-drop + 12 abas config) — `mercado-agentes-2.0-manual-flow.md`
>
> Total: ~50 telas mapeadas, 2 agentes criados (Dra. Camila 1.0 + Dra. Sofia 2.0).

---

## Sumário

1. [Resumo executivo — os 3 produtos](#1-resumo-executivo)
2. [Comparativa por dimensão (1.0 vs 2.0)](#2-comparativa-por-dimensão)
3. [Vertech V3 vs Mercado — 5 dimensões estratégicas](#3-vertech-v3-vs-mercado)
4. [Decisões pendentes pra Vinni — 12 perguntas](#4-decisões-pendentes-pra-vinni)
5. [Roadmap absorção pro Vertech V3](#5-roadmap-absorção)
6. [Update das 4 decisões pendentes de 04-19](#6-update-das-4-decisões-pendentes-de-04-19)

---

## 1. Resumo executivo

| Produto | Filosofia | Público | Pontos fortes | Pontos fracos |
|---------|-----------|---------|---------------|---------------|
| **MA 1.0 Assistente** | IA gera blueprint via chat IA | CEO leigo / setup rápido | 4 etapas curtas, mini-PRD estruturado, IA preenche tudo | Single-turn IA, sem refinamento profundo |
| **MA 1.0 Manual** | Wizard determinístico 7 etapas + templates | Operador agência intermediário | Templates por vertical, schema de funções, Modo Avançado por etapa | Hardcoded GPT-4.1-MINI, BC 3MB ridícula, descontinuado |
| **MA 2.0 Manual** | Canvas drag-drop + 12 abas config | Operador técnico | Multi-provider (12 modelos), humanização modular, cofre keys, frameworks vendas | BETA, sem template, sem versionamento, learning curve |

**MA está em transição clara: 1.0 morre, 2.0 é o futuro deles.** Mas 2.0 ainda tem buracos importantes (sem template, sem multi-agente, sem Analista).

---

## 2. Comparativa por dimensão

### A. Onboarding & Criação

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| Modal inicial | 2 modos (Etapas vs Prompt livre) | 2 modos (Zero vs Assistente IA) |
| Templates iniciais | **12 templates / 6 categorias** + Em Branco | **Nenhum template** (só "Criar com Assistente" cobre) |
| Campos modal abertura | Foto+Nome+Função+Gênero+Área+Personalidade (7+) | **Apenas Nome + Função** (2) |
| Friction onboarding | Alta (wizard começa com seleção template) | Baixa (canvas vazio em 2 cliques) |

### B. Builder

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| Estrutura | Wizard linear 7 etapas | Canvas visual drag-drop |
| Etapa Identidade | Form com campos | Aba dentro do painel Configurações Avançadas |
| Fluxo conversacional | Lista vertical de 6+ etapas (template define) | Canvas com nodes Início + Fim + drag de componentes |
| Tools/Funções | 9 fixas (toggle individual + schema configurável + metadata custom) | 21 componentes (7 Ações + 4 Condições + 10 Capacidades) |
| Modo avançado | Toggle Básico/Avançado por etapa | Canvas é "avançado" por natureza |
| Roteador de intenções | "Fluxos Especiais" lista escondida no Modo Avançado | **Roteador Inteligente como componente visual** |
| Preview | Etapa 7 ultra-minimalista (só "está pronto") | Preview de Identidade live na aba Identidade |
| Versionamento | Badge V.1 visível no card | Apenas identidade do agente, sem v1/v2 explícito |

### C. Identidade

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| Foto | Upload file (JPG/PNG/GIF, max 1MB) | URL externa (string) |
| Tom/Linguagem | Estilo (4 checkboxes) + Regras Fundamentais (4) na Etapa 2 | **4 cards radio Tom (Formal/Profissional/Amigável/Casual)** |
| Gênero | Combobox (Masculino/Feminino) | **3 cards (Masculino/Feminino/Neutro)** |
| Personalidade | 10 checkboxes sem limite | **20 traços com limite max 3** |
| Tom desacoplado de Personalidade | Não (tudo em "Personalidade") | **SIM (Tom registrado separado de Traços)** |
| Preview live | Não | **SIM (card live)** |

### D. Modelo IA

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| Providers | **OpenAI hardcoded** (GPT-4.1-MINI badge no Hub) | **3 providers (OpenAI / Anthropic / Google AI)** |
| Modelos disponíveis | 1 (GPT-4.1-MINI) | **12** (6 OpenAI + 3 Claude + 3 Gemini) |
| Temperatura | Não exposta | **Slider semântico (Preciso/Balanceado/Criativo)** |
| Max tokens | Não exposto | Input numérico (default 4096) |
| API Key | Por agente, dialog "Configurar API Key" no toggle ativar | **Cofre criptografado (max 10) + reusável entre agentes + opção Cofre OU Chave direta inline** |

### E. Comportamento & Humanização

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| Regras gerais | Etapa 2: Estilo + Palavras evitar/preferir CSV | **Aba Comportamento: regras free-text + chips sugeridos clicáveis** |
| Atendimento Humano | Função na Etapa 5 (toggle) | Subseção dedicada em Comportamento |
| Humanização | Etapa 6: 6 micro-interações com checkbox + textarea | **8 módulos prompt toggleable + sub-config rica** |
| Quebra de mensagens | Tag manual `[[break]]` no prompt | **Divisor de Mensagens automatizado** (max msgs + max chars/msg + delay com Auto smart calc) |
| Emojis | Lista CSV em micro-interação | **Probabilidade % + max emojis/resposta com sliders** |
| Erros de digitação | Não tem | **Toggle "Simular erros ocasionais"** (default off) |
| Tom Descontraído | Implícito em Estilo | Módulo dedicado |
| Filtro Anti-Robô | Implícito em Palavras Proibidas | **Módulo dedicado com exemplos** ("Prezado(a)", "Estou à disposição") |

### F. Vendas & Negócio

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| Frameworks de venda | Não tem | **SPIN Selling + Upsell + Cross-sell** (toggle off default) |
| Catálogo Produtos | Hub > Conteúdo > Produtos (RAG dedicado) | Não capturada (presumido similar) |
| Pipeline integration | Toggle "Conectar no CRM" + "Conectar Cliente" por função | Capacidade "Captura de Lead" + "Coletar Dado" salva no CRM |

### G. Integrações nativas

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| Email | Função "Atendimento Humano" só transfere | **Capacidade "Leitor de Email" Gmail nativa** |
| Planilhas | Não tem | **Capacidade "Leitor de Planilha" Google Sheets nativa** |
| Análise mídia | Toggle global na Etapa 5 | **Capacidade "Análise de Mídia" granular** |
| WhatsApp | Único canal (na Etapa 5 indireto) | **Componente Ações "WhatsApp"** + Capacidade |

### H. Hub pós-criação (1.0 capturado, 2.0 presumido)

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| Tabs Hub | 3 (Início + Conteúdo▾ + Ferramentas▾) | Provável similar |
| Stats dashboard | 3 cards (Mensagens / Produtos / BC) + badge modelo + badge versão | Provável similar |
| BC limite | **3 arquivos × 1MB** (PDF/DOCX/CSV/XLS/XLSX) | Não capturado |
| BC compartilhada | SIM (entre agentes da org) | Provável similar (Cofre é precedente) |
| Playground | Exige agente ATIVO + API Key | Não testado |
| Automação | 5 itens (Automações / Follow-up Leads / Mensagens Horário / Follow-ups Clientes / Templates) | Não capturado |
| Versão de modelo | "GPT-4.1-MINI" hardcoded badge | Configurável (12 modelos) |

### I. Multi-tenancy & White Label

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| Sidebar | Sidebar fixa esquerda 8 seções, com Subcontas + Implementações | Mesma sidebar (compartilhada) |
| Modelo agência | "White Label Plus" badge no plano | Mesmo |
| Treinamentos pro cliente | Módulo dedicado "Meus Treinamentos / Gerenciar Treinamentos" | Mesmo |
| Cliente final | Acesso via Subcontas | Mesmo |

### J. Pricing & Modelo

| Dimensão | 1.0 | 2.0 |
|----------|-----|-----|
| API Key | BYOK (cliente paga OpenAI direto) | BYOK + Cofre centralizado |
| Modelo | Assinatura plataforma + tokens BYOK | Mesmo |
| Status produto | Descontinuação anunciada | BETA recém saída |

---

## 3. Vertech V3 vs Mercado

Vertech V3 (TIME 4 agentes, ver `project_vision_v3_produto.md`) propõe arquitetura fundamentalmente diferente. Comparativa estratégica:

### Dimensão 1 — Arquitetura de agentes

| Aspecto | Mercado (1.0+2.0) | Vertech V3 |
|---------|-------------------|-----------|
| Modelo | **Single-agent** com tools | **TIME 4 agentes** (Atendente + Assistente + Analista + Campanhas) com identidade unificada |
| Handoff | Tool "Atendimento Humano" → transfere pra humano | Tool `pedirHumano` → Assistente em grupo WhatsApp + handoff entre agentes IA |
| Inteligência | Apenas execução (responder, agendar) | **Analista de Inteligência** silencioso lendo pipeline + propondo ações |
| Coordenação | N/A (single-agent) | Identidade unificada, 3 modos contextuais (SDR/closer/pós-venda) |

**Veredicto:** Vertech V3 é **2 níveis acima** em arquitetura. Mercado vende 1 agente, Vertech vende um TIME comercial.

### Dimensão 2 — Memória e RAG

| Aspecto | Mercado | Vertech V3 |
|---------|---------|-----------|
| RAG knowledge marca | SIM (BC 3MB) | RAG-1 pgvector (50+ arquivos × 10MB+) |
| RAG memória do lead | **Não tem** | RAG-2 (todas conversas anteriores indexadas semanticamente) |
| RAG análise da base | **Não tem** | RAG-3 (queries tipo "quem mencionou preço alto últimas 4 semanas") |

**Veredicto:** Vertech V3 tem **3 RAGs** vs 1 do Mercado. Diferencial massivo.

### Dimensão 3 — Disparos & Reativação

| Aspecto | Mercado | Vertech V3 |
|---------|---------|-----------|
| Disparos em massa | Hub > Ferramentas: 5 itens (Automações, Follow-up Leads, Mensagens Horário, Follow-ups Clientes, Templates) | **Agente de Campanhas dedicado** com queue BullMQ + delay 30s±10s + opt-out + circuit breaker |
| Reativação base parada | Não tem feature dedicada | **Onboarding crítico:** sync 5k contatos WhatsApp + Campanha de descoberta + segmentação rica em 2-3 semanas |
| Inteligência de campanha | N/A | Analista propõe → operador aprova → execução automatizada |

**Veredicto:** Mercado tem ferramentas básicas. Vertech V3 tem **núcleo de disparos automatizado com IA na decisão**.

### Dimensão 4 — Configuração & UX

| Aspecto | Mercado 1.0 | Mercado 2.0 | Vertech V3 |
|---------|-------------|-------------|-----------|
| Wizard | 7 etapas determinístico | Canvas drag-drop | **2 modos: Wizard (CEO) + Canvas (operador)** |
| Templates | 12 verticais | Nenhum | **10+ verticais (Saúde, Imóveis, E-com, Info-produto, SaaS, Liberais, Fitness, Pet, Auto, Education)** |
| Multi-provider | OpenAI hardcoded | 3 providers / 12 modelos | **Multi-provider via Mastra + default Claude** |
| Cofre keys | Por agente | Cofre 10 chaves | **Cofre + namespace por org** |
| Tom + Personalidade | Funde tudo (10 checkboxes) | Desacopla (4 Tom + 20 Traços max 3) | **Replica padrão 2.0** |
| Humanização | 6 micro-interações simples | 8 módulos com sub-config rica | **Replica + extende** (incluir voice tone calibration) |
| Frameworks vendas | N/A | SPIN + Upsell + Cross-sell | **Replica + frameworks BR (NEAT, BANT, MEDDIC) + customizáveis por vertical** |

### Dimensão 5 — Visualização & Sandbox

| Aspecto | Mercado | Vertech V3 |
|---------|---------|-----------|
| Flow Diagram | Canvas (2.0) — fluxo de UM agente | **Flow Diagram do TIME** (4 agentes + tools + relacionamentos + bridges) |
| Sandbox de teste | Playground (exige ATIVO + API Key) | **Sandbox real** (lead simulado conversa, tools criam side effects em pipeline sandbox real, agenda sandbox real, sem precisar conectar WhatsApp produção) |

**Veredicto:** Vertech V3 tem **Flow Diagram do TIME** (não de UM agente) + **Sandbox sem ativar**. Diferencial crítico de UX.

---

## 4. Decisões fechadas (12 perguntas resolvidas em 2026-04-25)

> [!success] Status
> Todas 12 decisões batidas em sessão de 2026-04-25 com Vinni + análise independente (`analise-independente-construtor.md`).

### Categoria A — Modelo de negócio

**Q1. Modelo de tokens?** ✅ **BYOK puro com herança em cascata**
- Cada camada (Super Admin / Master / Agency) usa própria chave OpenAI configurada
- Cliente HERDA automaticamente da camada acima ao criar workspace
- Cliente final NUNCA vê campo de chave (a não ser que agência libere explicitamente)
- Agência pode trocar chave por cliente específico nas configurações daquele cliente
- **Razão:** modelo agência B2B2B onde negociação é por uso do sistema/whitelabel/assinatura, não por tokens

**Q2. Pay-per-use vs plano fixo?** ✅ **Resolvido pela Q1** (Vertech não cobra tokens, cobra uso do sistema)

### Categoria B — Tecnologia

**Q3. Multi-provider?** ✅ **SIM, replicar Mercado 2.0** — 3 providers / 12 modelos
- Default: **GPT-4.1-mini** (não Claude Sonnet, decisão Vinni)
- OpenAI 6 + Anthropic 3 (Haiku/Sonnet/Opus 4.5) + Google AI 3 (Gemini 2.5)
- Stack: Mastra abstrai providers

**Q4. Sintaxe placeholders padrão?** ✅ **`{{variavel}}` Mustache universal**
- Mercado tem 3 sintaxes inconsistentes (`{{horario_atendimento}}`, `[agentName]`, `[name@]`)
- Vertech adota UMA sintaxe = `{{var}}` em TODOS os pontos do produto
- Razões: padrão da indústria (Handlebars, Jinja, Liquid), LLMs respeitam mais, devs/operadores entendem na hora, sem conflito com markdown
- Exemplo: `Olá {{lead.nome}}, sou {{agente.nome}} da {{empresa.nome}}!`

**Q5. Limite de Base de Conhecimento?** ✅ **50 arquivos × 10MB cada**
- Formato amplo: PDF, DOCX, CSV, XLS, TXT, MD, JSON, HTML + OCR de scanned
- BC compartilhada por organização (múltiplos agentes acessam mesma BC)

### Categoria C — UX

**Q6. Construtor — pattern final?** ✅ **Wizard guiado primário + Canvas opt-in pro Modo Avançado + IA copilot reativo**
- **INVERTE Opção B** (canvas primário) por recomendação da análise independente
- Razão central: user real (CEO agência tech-savvy NÃO-dev) opera wizard com fluência, não canvas. Pesquisa em 15+ plataformas mostra canvas-em-branco = 80% abandono em non-dev mesmo "tech-savvy". Lindy 4.9/5 G2 vence com wizard+templates. Mercado 2.0 precisou criar "Criar com Assistente" pra resgatar leigo do canvas.

**Especificação concreta:**

Modal entrada — 3 caminhos:
- **[A] Importar briefing** (recomendado pra agência com cliente): cola/upload briefing pronto, IA preenche wizard, user revisa cada seção
- **[B] Começar do zero c/ guia** (DEFAULT, recomendado pra leigo): wizard 7 etapas com smart defaults por vertical
- **[C] Modo Avançado canvas** (operador experiente): canvas drag-drop com TIME pré-populado + 12 abas Configurações Avançadas

Wizard primário — 7 etapas em camadas:
1. **Identidade do TIME** — nome unificado + avatar + tom (4 cards) + traços (max 3 de 20) + gênero (3 incl Neutro) + preview live
2. **Negócio** — vertical (10+ templates) + proposta valor + oferta + ticket + horário + região
3. **Persona e ICP** — buyer persona + ICP empresa + top 3 dores + top 5 objeções (chips sugeridos)
4. **Conhecimento (RAG-1)** — upload arquivos (50 × 10MB) + URLs + FAQs estruturadas
5. **Os 4 papéis do TIME** — aba por agente (Atendente / Assistente / Analista / Campanhas), cada um com tools liga/desliga + 3 modos contextuais (Atendente) + gatilhos (Assistente) + cadência (Analista) + delays (Campanhas)
6. **Comportamento + Humanização** — regras (chips clicáveis + free-text) + 8 módulos humanização (replicar Mercado 2.0) + frameworks venda opcional
7. **Sandbox + Publicar** — preview do TIME + Flow Diagram visual + sandbox interativo (lead simulado) + checklist publicar

Canvas como camada opt-in:
- React Flow com 4 nodes-agentes pré-populados em layout TIME (NÃO vazio)
- Click no node abre painel direito com config completa
- Roteador Inteligente como componente visual entre agentes
- Read-only no wizard, editável aqui

IA copilot — reativo, não proativo:
- Botões pontuais: "Pré-preencher essa seção c/ IA", "Sugerir 5 regras", "Gerar copy campanha", "Escrever prompt de etapa"
- NÃO chat aberto sempre lateral (causa hallucination + perda controle)

Padrão briefing 12 campos obrigatórios (extrai do `analise-independente-construtor.md` seção 1.2):
1. Nome negócio + setor + sub-vertical / 2. Proposta valor / 3. Oferta + ticket / 4. ICP / 5. Top 3 dores / 6. Top 5 objeções / 7. Pipeline + critérios / 8. Tom comunicação / 9. Restrições legais/éticas / 10. Critério transferência humano / 11. Horário + região / 12. Fontes BC

**Q7. Templates por vertical?** ✅ **10+ templates verticais** + Em Branco
- Cobrir: Saúde, Imóveis, E-com, Info-produto, SaaS, Liberais (advogado/contador), Fitness, Pet, Auto, Education
- Sem templates = exclui leigo absoluto (validado por Mercado 2.0 que removeu e teve que criar Assistente IA pra cobrir)

**Q8. Tom desacoplado de Personalidade?** ✅ **Desacoplar (estilo 2.0)**
- Tom (4 cards: Formal/Profissional/Amigável/Casual)
- Traços (20 opções, max 3)
- Brand Voice (3ª camada com calibração de marca)

**Q9. Humanização modular?** ✅ **Replicar pattern 2.0 + extender**
- 8 módulos prompt toggleable + sub-config rica (probabilidade %, max chars, delay smart)
- Adicionar módulos novos: Voice Tone Calibration por marca, Cultural Adaptation regional BR

### Categoria D — Diferenciação V3

**Q10. Flow Diagram do TIME?** ✅ **SIM** (depende da resolução Q6 — agora confirmada)
- Renderizado read-only no resumo (etapa 7) e editável no Modo Avançado (Canvas)
- 4 agentes como nodes principais com cores distintas
- Tools como sub-pins por agente
- Bridges entre agentes (handoffs e gatilhos)
- Conexão com sistemas externos (WhatsApp, CRM, Agenda, BC)

**Q11. Sandbox real?** ✅ **SIM**
- Lead simulado, pipeline sandbox real, agenda sandbox real, tools com side effects controlados
- ATENÇÃO: análise independente alerta que é Phase inteira (não checkbox) — escopo restrito (1 vertical primeiro, ex: consultório) recomendado

**Q12. Frameworks de vendas?** ✅ **SPIN + Upsell + Cross-sell + NEAT + BANT + MEDDIC + GAP Selling**
- Toggle off default
- Permitir custom por vertical/cliente

---

## 4.5. Alertas críticos da análise independente (URGENTES)

> [!danger] 3 riscos não óbvios identificados (`analise-independente-construtor.md` seção 6)

### R1. Meta baniu chatbots gerais no WhatsApp em 15/jan/2026 ← RISCO EXISTENCIAL
- ChatGPT e Perplexity já saíram
- Janela exceção = "automação business-focused" (booking, confirmação) — Vertech V3 está nessa zona MAS Atendente generalista + Analista propondo + Campanhas em massa = zona cinza
- Baileys (que Vertech usa) é não-oficial, high-to-critical ban risk independente do termo Meta
- Brasil teve briga regulatória (CADE ordenou suspender, Meta ganhou apelação 23/jan/2026) — situação volátil
- **Ação necessária:** advogado especialista revisa risco regulatório + arquitetura preparada pra trocar Baileys → BSP oficial (Twilio/360dialog/Z-API) sem retrabalho de 6 meses. Camada de abstração de canal já no Phase 06.5

### R2. Multi-agente em produção falha 41-86% (estudo MAST 2025)
- 36.9% das falhas em coordination breakdown — fundamental do paradigma, não contornável só com bom design
- 4 agentes ainda em zona segura mas tese "4 sempre coordenados" merece validação
- **Ação necessária:** POC com 4 agentes reais antes de comprometer arquitetura final. Critério mensurável: "se 3 coordenam >70% sucesso em sandbox, escala pra 4. Se cair pra 50%, recua pra 2." Considerar fallback "single agent com 3 modos contextuais" (80% do valor)
- LangSmith/Langfuse desde dia 1 pra observability multi-agente

### R3. Sandbox real é Phase inteira, não checkbox
- Pipeline sandbox real (DB tables paralelas? feature flag? tenant separado?) + agenda sandbox real + WhatsApp simulado + métricas separadas + reset programático + ban prevention garantida tecnicamente
- Mercado Agentes não fez isso por algum motivo (custo alto)
- **Ação necessária:** Phase Sandbox com escopo bem definido (1 vertical primeiro, ex: consultório), não tentar paridade total. Evolução gradual.

### Pontos cegos adicionais

- **Modelo agência B2B2B** = ciclo longo + dependência de poucos contratos. Vertech precisa playbook de retention de agência (NPS, account management dedicado, certificação). Modelar 3 cenários (5/15/30 agências em ano 1) com churn 5%/10%/20%
- **CEO tech-savvy não-dev** = TAM real estimado 10-20% das agências BR. Validar ICP exato em 5-10 entrevistas reais antes de PRD final
- **Reativação 5k contatos** = espada 2 gumes. Anti-bloqueio sério (delay variável + opt-out + circuit breaker + alertas reputation score) precisa ser feature CORE, não polish
- **Camadas 1/2/3** triplicam UI + risco inconsistência. Pesquisa mostra Botpress/Voiceflow tentaram e abandonaram Camada 3. **Recomendação: começar com 2 camadas (Básica wizard + Avançada canvas), Camada 3 dev mode adia pra pós-PMF**
- **Tools nativas vs marketplace custom** — decidir agora. Faltam Gmail/Sheets/Calendar/HubSpot/Pipedrive nativas

---

## 5. Roadmap absorção

### Phase 09 wizard atual (congelada)
**Decisão:** reciclar parcialmente em **Phase 09-v3 Wizard** com refactor:
- Manter pattern de seleção template + analyze + plan (validado)
- Adicionar pattern Mercado 2.0: 2 modos (Zero/Assistente) na entrada
- Templates expandidos (10+ verticais)

### Phase 07C Flow Diagram (renovar escopo)
**Decisão:** ampliar escopo pra **Flow Diagram do TIME**, não só do agente:
- Renderizar 4 agentes (Atendente / Assistente / Analista / Campanhas) como nodes
- Tools como sub-nodes
- Bridges entre agentes
- Roteador de intenções visual

### Phase 08-alpha RAG (já alinhado)
**Decisão:** estender pra **3 RAGs**:
- RAG-1 Knowledge da Marca (existe)
- RAG-2 Memória do Lead (novo, namespacing por contactId)
- RAG-3 Análise da Base (novo, namespacing por org + temporal)

### Phase 10 Orquestrador (renovar)
**Decisão:** focar em **coordenação multi-agente** (não só um orquestrador único):
- Identidade unificada com 3 modos
- Handoff entre agentes IA
- Tool `pedirHumano` → Assistente em grupo

### Phase 12 Pagamentos + Phase nova: Cofre & Multi-Provider
**Decisão criar Phase nova "Configurações Avançadas":**
- Cofre criptografado de API Keys (max 20 por org)
- Multi-provider via Mastra (5 LLM minimum)
- Painel Configurações Avançadas com 12+ abas (estilo Mercado 2.0)

### Phase nova: Sandbox Real
**Decisão:** criar **Phase Sandbox** (alta prioridade, antes de Phase 12):
- Lead simulado dialogando
- Pipeline sandbox real
- Agenda sandbox real
- Toggle ON/OFF por agente

### Phase nova: Humanização & Vendas
**Decisão:** criar **Phase Humanização**:
- 8+ módulos prompt (replicar Mercado 2.0)
- Divisor de Mensagens com delay smart auto
- Emojis com probabilidade %
- Frameworks vendas SPIN/NEAT/BANT/MEDDIC/GAP

---

## 6. Update das 4 decisões pendentes de 04-19

Ver `mercado-agentes-assistant-flow.md` seção 10. Resolução agora:

### Decisão 1 — 07B continua como está?
**Antes:** dúvida se manter as 6 abas como edição manual pós-criação.
**Agora:** **NÃO** — refatorar 07B pra **Hub estilo Mercado** (3 tabs: Início + Conteúdo▾ + Ferramentas▾) + painel **Configurações Avançadas** com 12 abas (estilo Mercado 2.0).

### Decisão 2 — Adiantar Phase 09?
**Antes:** dúvida se Arquiteto vira ponto de entrada primário.
**Agora:** **SIM** — Phase 09 é o coração da experiência. Mas reformatar:
- Modal entrada com 2 modos (Wizard CEO leigo / Canvas operador)
- Wizard estilo 1.0 + Assistente IA opt-in
- Canvas estilo 2.0 com Flow Diagram do TIME

### Decisão 3 — Flow Diagram preview no Arquiteto?
**Antes:** dúvida se exige adiantar parte da 07C.
**Agora:** **SIM** — Flow Diagram é diferencial estratégico. Adiantar Phase 07C Flow Diagram do TIME pra antes do MVP final.

### Decisão 4 — Sandbox de teste durante criação?
**Antes:** dúvida se exige adiantar parte de Phase 08 (tools).
**Agora:** **SIM** — Sandbox real é diferencial massivo vs Mercado (que exige BYOK + ativar agente). Criar Phase Sandbox dedicada com prioridade alta. Lead simulado + pipeline sandbox + agenda sandbox.

---

## Conclusão executiva

> [!success] Vertech V3 supera Mercado em 5 dimensões
> 1. **Arquitetura:** TIME 4 agentes vs single-agent
> 2. **Inteligência:** Analista Comercial + 3 RAGs vs RAG único
> 3. **Disparos:** Agente Campanhas dedicado com IA na decisão vs ferramentas básicas
> 4. **Onboarding:** Reativação base 5k contatos como feature crítica vs ausente
> 5. **UX:** Sandbox real sem ativar + Flow Diagram do TIME vs Playground exige BYOK

> [!tip] Vertech V3 absorve 20+ patterns do Mercado 2.0
> Multi-provider, cofre keys, Tom desacoplado, Humanização modular, Comportamento via chips, Frameworks vendas, Roteador visual, Capacidades high-level, Temperatura semântica, Preview live, etc.

> [!warning] Vertech V3 deve cobrir 14 buracos do Mercado
> BC 3MB ridícula, sem multi-agente, sem RAG por lead, sem Analista, sintaxes inconsistentes, etapa final minimalista, BYOK obrigatório, Saúde sem CRM, sem versionamento decente, etc.

**Diagnóstico:** Mercado é referência válida pra UX patterns + UX components, mas Vertech V3 joga **outro jogo** (TIME comercial vs agente único). Não é "Vertech faz o que Mercado faz mas melhor". É **"Vertech vende uma categoria diferente de produto"** (TIME de IA vs agente IA).

**Próximo passo executivo:**
1. Vinni revisa este doc + responde 12 perguntas estratégicas
2. Atualizar `project_vision_v3_produto.md` com decisões fechadas
3. Refazer roadmap das phases (Phase 09 v3 + Phase 07C ampliada + 3 phases novas: Configurações Avançadas, Sandbox, Humanização)
4. Decisão go/no-go por phase nova
