---
type: guide
title: "Análise Independente — Construtor Vertech V3 (Q6)"
project: vertech-agents
tags:
  - project/vertech-agents
  - research/independent
  - benchmark
  - vision-v3
  - decision-document
date: 2026-04-25
author: Analista independente (Morpheus em modo neutro)
status: completo
related:
  - "[[mercado-agentes-sintese-comparativa]]"
  - "[[project_vision_v3_produto]]"
---

# Análise Independente do Construtor Vertech V3

> [!info] Escopo
> Análise sem viés sobre a decisão Q6 (qual pattern de construtor adotar) com base em pesquisa web ampla (15+ plataformas), padrões de UX/UI de 2025-2026, riscos arquiteturais e modelo de negócio. Não defende nenhuma plataforma específica.

> [!warning] Ordem de leitura
> Pular pra **Seção 5 (Recomendação)** se quiser a resposta direta. Seções 1-4 são fundamentação. Seção 6 traz riscos não óbvios.

---

## Sumário executivo (100 palavras)

A inclinação do Vinni (Opção B canvas primário com IA copilot e wizard mode colapsável) **não é a melhor escolha pra Vertech V3**. A recomendação é inversa: **wizard determinístico em camadas como entrada padrão, com opção opt-in pra Canvas no Modo Avançado**. Razão central: o user real (CEO de agência tech-savvy mas não-dev) não opera canvas drag-drop com fluência sob pressão de venda, e o produto vende um TIME (não fluxos), portanto canvas como primário aumenta cognitive load sem retorno proporcional. Mais importante: 3 riscos não óbvios (ban WhatsApp em jan/2026, falha 41-86% multi-agent em produção, complexidade Camadas 1/2/3) merecem atenção urgente antes da Q6.

---

## 1. Padrão ouro de briefing pra agentes IA comerciais

### 1.1 O que profissionais sêniores coletam (não só plataformas)

Cruzando frameworks de discovery B2B (HubSpot, SPIN, MEDDIC, NEAT, BANT) com padrões de briefing de agências de marketing/CRM, o briefing fundamental pra construir agente comercial cobre 8 blocos:

| Bloco | Por quê |
|-------|---------|
| **A. Identidade e Marca** | DNA do agente — voz, tom, valores, do/don't, posicionamento |
| **B. Negócio** | Modelo, oferta, ticket, ciclo, sazonalidade, regiões |
| **C. ICP (Ideal Customer Profile)** | Empresa-alvo: firmographics + technographics + sinais de compra |
| **D. Persona/Buyer** | Pessoa dentro: dor, motivação, objeção, vocabulário, gatilhos |
| **E. Pipeline e Processo** | Etapas atuais, critérios de avanço, tempo médio, quem aprova |
| **F. Conhecimento Operacional** | FAQ, política de preços, condições, scripts atuais, restrições legais |
| **G. Sistemas e Integrações** | Onde dados vivem (CRM, agenda, planilha), quem alimenta, frequência |
| **H. Critérios de Sucesso** | KPI primário + secundário, baseline atual, meta, prazo |

### 1.2 Campos obrigatórios mínimos (cobertura de 80% dos casos)

Baseado no que agências sérias fazem em discovery (1-3 reuniões antes de qualquer build), os campos não-negociáveis:

| # | Campo | Tipo | Obrigatório? |
|---|-------|------|--------------|
| 1 | Nome do negócio + setor + sub-vertical | text | sim |
| 2 | Proposta de valor (1 frase) | text | sim |
| 3 | Oferta principal + ticket médio | text + number | sim |
| 4 | Público-alvo principal (1 ICP) | text estruturado | sim |
| 5 | Top 3 dores que o produto resolve | array text | sim |
| 6 | Top 5 objeções que clientes levantam | array text | sim |
| 7 | Etapas atuais do pipeline + critério de avanço | tabela | sim |
| 8 | Tom de comunicação (Formal/Profissional/Amigável/Casual) | enum | sim |
| 9 | Restrições legais/éticas (o que NÃO falar) | array text | sim |
| 10 | Critério de transferência pra humano | array text | sim |
| 11 | Horário comercial + região | structured | sim |
| 12 | Fontes de conhecimento (BC: arquivos, links, FAQs) | upload | sim |

### 1.3 Campos opcionais por vertical

Verticais com necessidades específicas demandam campos adicionais. Exemplos:

**Saúde** (consultório, clínica): convênios aceitos, especialidades, médicos disponíveis, conduta em emergência, dados sensíveis (LGPD).

**Imobiliário**: tipos de imóvel, regiões cobertas, faixas de preço, financiamento aceito, processo pós-visita.

**Educação/Curso**: turmas/módulos, formas de pagamento, política de cancelamento, perfil de aluno, garantia.

**Info-produto/SaaS**: trial vs demo, preço por plano, suporte, política de reembolso.

**Estética/Beleza**: serviços + duração + valor, profissionais, preparo pré-procedimento, contraindicações.

**Restaurante/Food**: cardápio, delivery zonas, taxa, formas pagamento, tempo médio.

**Pet, Auto, Liberal (advogado/contador), Fitness**: cada um com 5-10 campos verticais.

### 1.4 Padrão de coleta (3 camadas)

Pesquisa em ferramentas como Voiceflow, Botpress, Lindy, Stammer e práticas de agências indica que briefing eficiente segue 3 camadas progressivas:

1. **Quick brief (15-20 campos)** — coletado em 5-10 minutos. Cobre identidade + negócio + persona básica + tom. Suficiente pra gerar agente funcional MVP.
2. **Deep brief (40-60 campos)** — coletado em 30-60 minutos. Adiciona ICP detalhado, processo de venda, objeções, conhecimento. Suficiente pra agente em produção.
3. **Continuous enrichment (sem limite)** — adicionado ao longo do uso. Memória de leads, novos casos, insights de campanha, feedback. Alimenta RAG e refina prompts.

**Insight aplicável ao Vertech V3:** o briefing externo do cliente final (que Vinni mencionou) deve ter formato padronizado equivalente ao "Quick brief" + path opt-in pro "Deep brief". Não inventar do zero, oferecer template versionado por vertical.

---

## 2. Modo guiado vs livre vs híbrido

### 2.1 Mapa de patterns (3 abordagens dominantes)

| Pattern | Descrição | Exemplos | Vence quando |
|---------|-----------|----------|--------------|
| **Wizard guiado** | Passos lineares com smart defaults, validação inline, salvar rascunho | Mercado 1.0, Voiceflow Knowledge tab, Lindy Templates, Stammer setup | User leigo OU tarefa repetitiva OU vertical conhecido OU urgência de resultado |
| **Canvas livre** | Drag-drop nodes, conexões visuais, zoom/mini-map, configuração por nó | Mercado 2.0, Voiceflow Studio, Botpress, LangFlow, Flowise, n8n, Vapi Flow Studio | User técnico OU fluxo customizado OU exploração OU produto único |
| **Híbrido** | Wizard como entrada + canvas como camada avançada (ou vice-versa) | MindStudio (Architect → canvas), Dify (templates → workflow), Sema4 Studio (Runbook NL → studio) | Massa diversa de users (do leigo ao power user) OU produto evolui em complexidade |

### 2.2 O que a literatura UX diz (Nielsen Norman, IxDF, NN/g)

Princípio aplicável: **progressive disclosure**. Mostrar só o necessário no início, revelar complexidade sob demanda. Wizard com steppers é o exemplo canônico (NN/g classifica como "staged disclosure"). Adoption rates mostram que checklists de onboarding em SaaS levantam completion em 20-30%, e wizards bem feitos exploram o "Ikea Effect" (user valoriza o que construiu).

Sobre canvas drag-drop, a literatura indica:

- Não é "no-code" verdadeiro pra leigo. Exige modelo mental de fluxo, nodes, edges, conditional branching. Lindy, MindStudio e Stammer admitem que canvas em branco intimida.
- Plataformas que vencem em "tech-savvy não-dev" (Lindy 4.9/5 G2) usam **templates + wizard guiado**, não canvas vazio.
- Botpress, LangFlow e Flowise são explícitos: melhores pra "developer-first" ou "technical teams". Canvas como entrada exclui leigos.

### 2.3 Para o perfil do user Vertech (CEO agência tech-savvy não-dev)

Esse perfil:
- Conhece IA conceitualmente (sabe o que é prompt, RAG, agente)
- NÃO conhece programação, lógica de fluxo formal, modelagem de estado
- Trabalha sob pressão (agência fecha cliente, precisa entregar setup em dias)
- Tem briefing pré-coletado do cliente (NÃO improvisa)
- Quer resultado bom rápido com possibilidade de ir fundo se precisar

**Implicação:** wizard guiado é a entrada certa pra esse perfil. Canvas como entrada cria atrito desnecessário. Mas canvas precisa existir como camada opcional pra quando o user quiser customizar fluxo (ex: roteador de intenções específico, fluxo especial pra cancelamento, etc).

### 2.4 O que conversational intake (chat-driven) traz vs custa

Vertech V3 tem chat IA copilot na inclinação atual. Análise:

**Ganho:**
- Reduz friction inicial (user descreve em texto livre, IA estrutura)
- Atende user que tem briefing em PDF/áudio e quer "jogar dentro"
- Funciona como fallback quando user não sabe preencher campo X

**Custo:**
- LLM hallucination — IA pode inventar dados que user não disse (Article IV LMAS — No Invention é literalmente sobre isso)
- Single-turn IA gera blueprint raso (Mercado 1.0 Assistente sofre disso — pesquisa anterior do projeto registrou)
- User perde controle/auditoria — não sabe o que IA decidiu vs o que foi explícito
- Latência (cada interação chama LLM)

**Recomendação:** copilot opt-in (botão "preencher esse campo com IA" por campo, ou "gere rascunho dessa seção a partir do meu briefing"), NÃO chat permanente lateral. Vertech Phase 09 já estava nesse caminho com a refatoração wizard.

---

## 3. Benchmark amplo (15+ plataformas)

### 3.1 Tabela comparativa

| Plataforma | Pattern construtor | Multi-agente nativo | Público-alvo | Diferencial principal |
|-----------|-------------------|---------------------|--------------|----------------------|
| **Mercado Agentes 1.0** | Wizard 7 etapas + templates | Não (single agent) | CEO leigo BR | Templates por vertical + Hub completo |
| **Mercado Agentes 2.0** | Canvas + 12 abas config | Não (single agent) | Operador técnico BR | Multi-provider 12 modelos + cofre keys |
| **Voiceflow** | Canvas + Knowledge tab + templates | Limitado (subagents recente) | Conversation designers + dev | Best-in-class visual conv designer + voice |
| **Botpress** | Canvas Flow Editor + Conversational Studio | Sim (multi-agent recent) | Technical teams + dev | 190+ integrações + LLM-agnostic |
| **Dify** | Templates + workflow visual | Sim (workflow-as-agent) | Founders no-code + non-tech | Open-source self-host + RAG built-in |
| **LangFlow** | Canvas Python + LangGraph | Sim (LangGraph) | Python devs | Source code per component + customização |
| **Flowise** | 3 modos: Assistant/Chatflow/Agentflow | Sim (Agentflow) | Node devs + technical | Multi-mode + AgentFlow SDK |
| **n8n** | Canvas workflow + AI nodes | Sim (LangChain integration) | Devs + automation pros | 1500+ integrações + self-host |
| **Make** | Canvas scenarios + Maia AI assistant | Limitado | Operações intermediárias | Visual workflow + cost efficiency |
| **Zapier Agents** | Builder linear + 8000 apps | Não (single agent) | Non-tech business users | Maior catálogo de integrações |
| **Vapi** | Code-first + Flow Studio | Não (single agent) | Voice AI devs | Sub-600ms latency voice + composabilidade |
| **Retell AI** | Drag-drop no-code | Não (single agent) | Sales/support teams | Setup em 3-5 min + voice quality |
| **CrewAI** | Code Python (role-based DSL) | Sim (nativo) | Devs Python | Crews/roles + lowest learning curve |
| **AutoGen** | Code Python (conversational) | Sim (nativo) | Researchers + devs | GroupChat + 5-6x cost de coordenação |
| **LangGraph** | Code Python (state graph) | Sim (nativo) | Devs production-grade | LangSmith observability + checkpointing |
| **Lindy** | Templates + wizard + canvas opcional | Sim (Lindies coordenadas) | Non-tech SMBs Google Workspace | 4.9/5 G2 + email/calendar agents prontos |
| **Relevance AI** | Templates + canvas | Sim (multi-model) | No-code business ops | Multi-LLM + research/data workflows |
| **Stack AI** | Canvas + templates | Sim | Enterprise no-code | Drag-drop com governance enterprise |
| **Sema4.ai** | Studio + Runbooks NL | Sim (enterprise) | Business users enterprise | Runbooks em linguagem natural + Semantic Layer |
| **Stammer** | White-label setup wizard | Não (single agent) | Agências reseller | White-label + reseller pricing |
| **Lety.ai** | Wizard agência | Não | Agências white-label | White-label completo + reseller |
| **MindStudio** | Architect (NL → workflow) + canvas | Sim | Business + non-tech | Architect feature gera workflow de descrição |

### 3.2 Padrões emergentes (o que o mercado convergiu em 2025-2026)

**A. Hybrid entry é o padrão dominante**
A maioria das plataformas line up oferece dois caminhos: (1) wizard/template/AI-assistant pra entrada rápida, (2) canvas/code pra customização profunda. Mercado Agentes 2.0, Voiceflow, Dify, Lindy, MindStudio, Botpress e Flowise seguem esse modelo. Vapi e LangGraph quebram a regra ficando code-first; Zapier quebra ficando linear-only.

**B. Canvas pra non-dev é mito quando vazio**
Múltiplas fontes confirmam: canvas drag-drop só funciona pra non-dev quando vem com templates pré-populados, AI-generation de estrutura inicial ou wizard que monta layout antes do user editar. Canvas em branco = 80% dos non-devs abandonam (referência: Lindy admite isso explicitamente, MindStudio criou Architect pra resolver, Mercado 2.0 criou "Criar com Assistente" pra cobrir).

**C. Multi-agente é arena de devs (ainda)**
CrewAI, AutoGen, LangGraph dominam multi-agente sério em produção. Plataformas no-code multi-agente (Lindy, Relevance, Stack, Sema4) operam em case-use simples (email triage, lead qualification, doc analysis). **Nenhuma plataforma no-code visual entrega TIME comercial coordenado de 4 agentes especializados como Vertech V3 propõe.** Isso é simultaneamente diferencial e risco (ver seção 6).

**D. White-label/agência é categoria estabelecida mas commodity**
Stammer, Lety, BotPenguin, Botsify, Konverso, Insighto, Robofy, Viirtue cobrem white-label. O mercado já maduro (preço em $300-500/mês/agente é referência). Vertech precisa diferencial além de "white-label" — o TIME multi-agente é o diferencial real.

**E. Voice é via separada**
Vapi, Retell, ElevenLabs operam em arena distinta (voice AI). Não competem direto com Vertech V3 (text WhatsApp). Mas voice está entrando em sales agents (Retell tem casos de SDR voice). Possível phase futura pra Vertech.

---

## 4. Avaliação sem viés da Vertech V3

### 4.1 Vertech V3 está na melhor linha possível?

**Sim, estrategicamente. Mas com 3 ajustes urgentes.**

A linha estratégica (TIME comercial multi-agente vendido por agência com 3 RAGs + sandbox real + reativação de base) é defensável e diferenciada. Não há concorrente direto que entregue tudo isso. Mercado Agentes é referência válida pra UX patterns mas joga jogo diferente (single-agent self-serve).

**Ajustes urgentes:**

1. **Validar premissa de "TIME 4 agentes" antes de construir.** Multi-agent em produção tem failure rate 41-86% (estudo MAST 2025). Coordenação cresce 2s de latência a 50 agentes (não-linear). 4 agentes ainda está em zona segura, mas a tese "4 sempre coordenados" merece validação com POC antes de comprometer arquitetura.

2. **Decidir BC compartilhada vs por agente cedo.** Vertech V3 tem 3 RAGs (marca / lead / análise base). Mercado tem 1 só. Multiplicar RAGs por 4 agentes = 12 namespaces. Custo operacional pgvector + decisão de quando indexar/reindexar/expirar precisa estar no PRD, não decidido em runtime.

3. **Resolver risco WhatsApp jan/2026 (ver seção 6).** É urgente.

### 4.2 Riscos da arquitetura V3 (TIME 4 agentes)

**R1. Coordenação não-linear** — cada handoff entre agentes adiciona 100-500ms de latência. 4 agentes em série = 1-2s overhead de coordenação por turno. WhatsApp espera resposta em segundos. Já deita perto do limite.

**R2. Token sprawl** — multi-agente consome 200% mais tokens que single-agent equivalente (estudo MAST). Modelo BYOK ou plano com pool generoso é OBRIGATÓRIO. Se Vertech subsidia tokens, margem evapora rápido.

**R3. Error propagation** — erro do Atendente vira input do Assistente, vira contexto do Analista. Sem checkpoint/state isolation, um agente fora de tom contamina o time.

**R4. Mental model do user** — vender "TIME 4 agentes" como diferencial é poderoso, mas user precisa entender o que cada um faz pra confiar/configurar. UI Flow Diagram ajuda, mas ainda assim é nova categoria. Adoption pode ser mais lento que single-agent (paradoxo do diferencial).

**R5. Debug em produção** — quando algo dá errado (lead reclama, conversion cai), descobrir QUAL agente errou em qual handoff é caro. Observability multi-agente exige LangSmith/OpenLLMetry/Langfuse + UI dedicada. Não está no roadmap explícito.

### 4.3 Pontos cegos da estratégia

**PC1. Modelo agência B2B2B tem ciclo longo + dependência de poucos contratos.**
Vendido por agência = você depende de 5-50 agências pra escalar (não milhares de self-serve). Cada agência leva 3-9 meses pra migrar carteira. CAC alto (educação + setup pago + onboarding técnico). LTV alto se retém, devastador se uma agência maior cancela. Vertech precisa playbook de retention de agência (NPS, account management dedicado, certificação).

**PC2. CEO tech-savvy não-dev é fatia ESTREITA do mercado.**
Não é "qualquer dono de agência". É segmento específico que (a) entende AI conceitualmente, (b) tem time pra setup, (c) tolera complexidade técnica. Estima-se 10-20% das agências de marketing/CRM no Brasil. TAM real é menor que parece. Validar ICP exato em 5-10 entrevistas reais antes de PRD final.

**PC3. Reativação de base 5k contatos é espada de dois gumes.**
É feature de conversão MASSIVA pro cliente final (paga setup em 30 dias). MAS é o uso que mais queima número WhatsApp e pega ban. Se Vertech queima número de cliente em onda 1, perde a conta + reputação na agência + processo civil possível. Anti-bloqueio sério (delay variável + opt-out + circuit breaker + alertas de reputation score) precisa ser feature core, não polish.

**PC4. "Sandbox real" tem complexidade subestimada.**
Pipeline sandbox real, agenda sandbox real, tools com side effects controlados = duplicar metade do produto pra modo sandbox. Custo de implementação alto (estimativa: 1-2 phases inteiras). Vale a pena, mas precisa ser planejado como pillar, não checkbox.

**PC5. 18 tools fundamentais pode ser excesso ou insuficiência conforme vertical.**
Lista atual cobre comercial padrão. Faltam tools verticais críticas: leitor email (Gmail), planilha (Sheets), calendar Google, telefonia (caso voice futuro), pagamento (PIX, AbacatePay já planejado), e-com (catálogo dinâmico), CRM externo (HubSpot, Pipedrive — agência pode ter cliente que já usa um). Decidir agora: tools nativas Vertech vs marketplace de tools custom.

### 4.4 Inclinação Opção B (canvas primário) — análise

**Opção B do Vinni:** Canvas primário + steps colapsam em "wizard mode" + IA copilot drawer + Flow Diagram TIME readonly que vira editável no Modo Avançado.

**Argumentos a favor:**
- Visual aproxima da metáfora de "TIME" (4 nodes coordenados)
- Tem teto alto (operador agência avançado pode ir longe)
- Diferenciação visual vs Mercado 1.0 wizard

**Argumentos contra (mais peso):**
- Canvas como entrada padrão exclui o leigo absoluto que ainda vai usar (CEO agência menor, primeiro cliente)
- Vinni mesmo descreveu user como "tech-savvy NÃO-dev" — não é desenvolvedor que prefere visual a form
- Briefing externo já vem pronto — wizard guiado preenche-rápido beats canvas que exige user pensar estrutura
- Multi-agente coordenado expressa MELHOR em forma de "configuração de papel + relacionamentos" (cada agente tem UMA aba dedicada com tools/RAG/handoffs) do que em canvas onde cada agente vira um cluster de nodes
- Pesquisa mostra: non-dev abandonam canvas em branco, mesmo quando "tech-savvy"
- Mercado 2.0 tem canvas mas precisou criar "Criar com Assistente" pra resgatar o leigo — admissão de que canvas-only não funciona

**Veredicto:** inclinação Opção B é compreensível mas joga contra o user real declarado.

---

## 5. RECOMENDAÇÃO FINAL pra Q6

### Pattern recomendado: **Wizard guiado em camadas + Canvas opt-in pra Modo Avançado**

Inverter a polaridade da Opção B. Não é "canvas primário com wizard mode colapsável". É **"wizard primário com canvas opt-in"**.

### Especificação concreta

#### Entrada — modal de criação (3 caminhos)

```
Como você quer criar o TIME?

[A] Importar briefing                       (recomendado pra agência com cliente)
    Cole/upload briefing pronto. IA preenche wizard.
    Você revisa cada seção e ajusta.

[B] Começar do zero com guia                (recomendado pra leigo absoluto)
    Wizard 7 etapas com smart defaults por vertical.
    Salva rascunho a qualquer momento.

[C] Modo Avançado canvas                    (operador experiente)
    Canvas drag-drop com TIME pré-populado.
    Configurações Avançadas 12 abas estilo Mercado 2.0.
```

Default highlight: **B** (porque cobre maior fatia do TAM real). Badge "recomendado" em A pra agência com briefing.

#### Wizard primário — 7 etapas em camadas

Baseado em insights do Mercado 1.0 + Mercado 2.0 + adaptado pra TIME 4 agentes:

| Etapa | Conteúdo | Camada UI |
|-------|----------|-----------|
| 1. **Identidade do TIME** | Nome unificado + avatar + tom (4 cards) + traços (max 3 de 20) + gênero (3 incl Neutro) + preview live | Básica |
| 2. **Negócio** | Vertical (10+ templates) + proposta valor + oferta + ticket + horário + região | Básica |
| 3. **Persona e ICP** | Buyer persona principal + ICP empresa + top 3 dores + top 5 objeções | Básica + chips sugeridos |
| 4. **Conhecimento (RAG-1)** | Upload arquivos (50 × 10MB) + URLs + FAQs estruturadas | Básica |
| 5. **Os 4 papéis do TIME** | Aba por agente: Atendente / Assistente / Analista / Campanhas. Cada um: tools liga/desliga + 3 modos contextuais (Atendente) + gatilhos (Assistente) + cadência (Analista) + delays (Campanhas) | Básica + Avançado toggle por aba |
| 6. **Comportamento e humanização** | Regras (chips clicáveis + free-text) + 8 módulos humanização (replicar Mercado 2.0) + frameworks venda (SPIN/NEAT/BANT/MEDDIC opcional) | Básica + Avançado |
| 7. **Sandbox + Publicar** | Preview do TIME completo + Flow Diagram visual + sandbox interativo (lead simulado) + checklist publicar | Resumo |

Cada etapa tem:
- **Botão "Pré-preencher com IA"** por seção (copilot opt-in, não chat aberto)
- **Toggle Básico/Avançado** per aba quando aplicável
- **Salvar rascunho** persistente
- **Stepper horizontal** com cor cinza/azul/verde

#### Canvas como camada opt-in

No Modo Avançado (entrada [C] OU toggle "Abrir no Canvas" de qualquer wizard salvo):

- React Flow canvas com 4 nodes-agentes pré-populados em layout TIME (não vazio)
- Cada agente node clicável abre painel direito com config completa (mesmo conteúdo do wizard, mas acessível por nó)
- Roteador Inteligente (intent routing) como componente visual entre agentes
- Fluxos especiais (cancelamento, devolução, etc) como sub-flows
- Read-only no wizard mode, editável aqui

#### Configurações Avançadas (painel separado, sempre acessível)

12+ abas estilo Mercado 2.0 (Identidade detalhada, Modelo IA multi-provider, Cofre API Keys, Galeria Mídias, Integrações, Notificações, Permissões, Versionamento, Auditoria, Sandbox config, Análise/observability).

#### IA copilot — opt-in granular

NÃO chat aberto sempre lateral. Botões pontuais:
- "Pré-preencher essa seção com IA" (por seção do wizard)
- "Sugerir regras de comportamento" (chips + IA gera 5 sugestões contextuais)
- "Gerar copy de campanha" (no agente Campanhas)
- "Escrever prompt de etapa" (no agente Atendente quando user edita prompt manual)

Pattern: **copilot reativo, não proativo**. User pede, IA responde. Reduz hallucination e respeita controle.

#### Flow Diagram do TIME

Renderizado read-only no resumo (etapa 7) e editável no Modo Avançado (Canvas). Mostra:
- 4 agentes como nodes principais com cores distintas
- Tools como sub-pins por agente
- Bridges entre agentes (handoffs e gatilhos)
- Conexão com sistemas externos (WhatsApp, CRM, Agenda, BC)

### Por que isso é melhor que Opção B

1. **Casa com user real** — CEO tech-savvy não-dev opera wizard com fluência, canvas só quando precisa customizar
2. **Briefing externo aproveitado** — caminho [A] importa briefing direto, sem retrabalho
3. **Não exclui poder usuário** — caminho [C] e Modo Avançado entregam canvas completo
4. **Escala da agência** — agência treina time interno em wizard (mais barato), poucos heads em Canvas (operador sênior)
5. **Reduz risco multi-agente** — wizard guia user a configurar handoffs corretos por padrão (templates), em vez de canvas que permite arrastar bagunça
6. **Diferenciação não depende de canvas** — Vertech diferencia em TIME + RAGs + Sandbox + Campanhas, não em forma de UI builder
7. **Pesquisa apoia** — Lindy 4.9/5 G2 com wizard+templates, Mercado 1.0 mais consolidado que 2.0, MindStudio criou Architect pra resgatar leigo do canvas

### O que sair se você ignorar essa recomendação

Se Vinni mantiver Opção B (canvas primário), os tradeoffs:
- Adoption mais lenta no segmento "agência menor + cliente leigo final"
- Risco de canvas-em-branco-paralisia no setup inicial
- Necessidade de "Criar com Assistente" como salvação posterior (igual Mercado 2.0 fez)
- Custo de design/implementação maior (canvas + wizard mode + IA copilot drawer = 3 superfícies competindo)
- Diferenciação visual pode atrair tipo errado de cliente (operador técnico que esperava power tool sem o resto)

---

## 6. Bônus — 5 riscos não óbvios (brutalmente honesto)

### R1. URGENTE: Meta proibiu chatbots de uso geral no WhatsApp Business API a partir de 15/jan/2026

Meta atualizou termos da Business API em out/2025 com vigência jan/2026 banindo "general-purpose AI chatbots". ChatGPT já saiu, Perplexity também. **A janela de exceção é "automação business-focused"** (booking, confirmação de reserva, atualização de pedido). Vertech V3 está nessa zona, MAS:

- Atendente generalista que conversa amplamente sobre o negócio = zona cinza
- Analista propondo campanhas + Campanhas disparando em massa = pode cair em "general purpose" se Meta interpretar restritivo
- Brasil teve briga regulatória (CADE ordenou suspender, Meta ganhou apelação em 23/jan/2026) — situação volátil
- Baileys (que Vertech usa) é não-oficial e tem high-to-critical ban risk independente do termo Meta

**Ação:** advogado especialista revisa risco regulatório + arquitetura preparada pra trocar Baileys → BSP oficial (Twilio, 360dialog, Z-API, etc) sem retrabalho de 6 meses. Talvez camada de abstração de canal já no Phase 06.5. **Esse é o maior risco existencial do projeto e não está visível nas memórias.**

### R2. Multi-agente em produção falha 41-86% (estudo MAST 2025)

A tese "TIME 4 agentes coordenados" sofre risco real de coordenação. Estudo de 1642 traces em 7 frameworks open-source mostrou failure 41-86%, com 36.9% das falhas em coordination breakdown. Não é "dá pra contornar com bom design" — é fundamental do paradigma.

**Mitigação:**
- POC com 4 agentes reais antes de comprometer arquitetura final (1 sprint dedicado)
- LangSmith/Langfuse desde dia 1 pra observability
- Considerar "single agent com modos contextuais" como fallback se coordenação falhar (Atendente único com 3 modos seria 80% do valor)
- Definir critério mensurável: "se 3 agentes coordenam com >70% sucesso em sandbox, escalar pra 4. Se cair pra 50%, recuar pra 2."

### R3. Camadas 1/2/3 (CEO/operador/dev) é trade-off perigoso

A decisão fechada de "3 camadas técnicas" parece elegante mas tem risco:

- Triplica superfície de UI pra manter
- Risco de inconsistência entre camadas (config feita em Camada 2 não reflete em Camada 1, etc)
- Documentação cresce 3x
- Cada camada precisa testes próprios (UI + funcional)

**Pesquisa mostra que plataformas que tentam isso (Botpress, Voiceflow) acabam migrando users técnicos pra code direto e abandonando a "Camada 3" como facade.**

**Mitigação:**
- Começar com 2 camadas (Básica wizard + Avançada canvas/config). Camada 3 dev mode adia pra depois de PMF
- Definir "config canônica" (single source of truth) e cada camada é só uma view dessa config
- Ferramenta tipo JSON Schema editor (Camada 3) só pra debug, não pra build

### R4. Sandbox real exige paridade com produção que vai dobrar custo de feature

"Sandbox real com side effects" significa:
- Pipeline sandbox real (DB tables paralelas? feature flag? tenant separado?)
- Agenda sandbox real (calendar provider que aceita escrita sandbox?)
- WhatsApp simulado (webhook fake + UI de inbox simulada)
- Métricas sandbox separadas
- Reset programático (zera sandbox sem afetar produção)
- Ban prevention (sandbox NUNCA escreve em WA produção real, garantia técnica)

Cada uma dessas tem cost de implementação não-trivial. **Subestimar = entregar "sandbox" que é só mock e cliente descobre só em produção.** Mercado Agentes não fez isso por algum motivo.

**Mitigação:** Phase Sandbox com escopo bem definido (1 vertical primeiro, ex: consultório), não tentar paridade com tudo. Evoluir gradual.

### R5. Modelo de venda agência tem ciclo de pagamento e churn assimétrico

Agência paga setup pesado (R$5-15k) + mensalidade (R$2-5k). Boa margem, mas:

- Setup não-recorrente. Vertech precisa de churn baixo pra LTV positivo
- Agência menor não fecha 5 clientes/mês — fecha 1-3. Velocity baixa
- Quando agência cancela, leva todos clientes finais junto (perde 1, perde 10-50)
- Modelo "self-serve" do Mercado tem churn alto mas volume alto. Modelo agência tem churn baixo mas volume baixo. **Vertech precisa modelar unit economics dos dois antes de decidir mix**
- Risco de "sucesso sufoca" — agência ganha tanto com Vertech que tenta clonar/internalizar (pesquisa mostra Stammer e Lety enfrentando isso)

**Mitigação:**
- Modelar 3 cenários (5/15/30 agências em ano 1) com churn 5%/10%/20%
- Cláusula contratual de não-clonagem + IP
- Self-serve light em paralelo (cliente final pequeno autoatende, agência só supervisiona) pra criar segundo motor de receita

---

## Conclusão executiva

**Q6 — recomendação:** wizard guiado em camadas como entrada padrão + canvas opt-in pro Modo Avançado + IA copilot reativo. Inverte a polaridade da Opção B do Vinni. Casa com user real (tech-savvy não-dev), aproveita briefing externo, reduz risco multi-agente, escala dentro da agência.

**3 alertas críticos antes de continuar:**
1. WhatsApp ban jan/2026 — risco existencial. Validar com advogado + arquitetar abstração de canal AGORA
2. Multi-agente falha 41-86% em produção — POC obrigatório antes de comprometer 4 agentes
3. Sandbox real é phase inteira, não checkbox — escopo restrito (1 vertical) pra começar

**Vertech V3 é estrategicamente boa.** Diferenciação real (TIME + 3 RAGs + sandbox + reativação) defendível. Mas execução depende de gerenciar bem os riscos não óbvios e escolher UX que case com user real, não com aspiração de produto técnico.

---

## Sources

Pesquisa web realizada em 25/04/2026 cobrindo 15+ plataformas e padrões UX. Fontes principais consultadas:

- **Mercado e benchmarks:** Lindy blog, Voiceflow blog, Botpress blog, Toolworthy, AgentBackend, ZenML, Sema4.ai, Stammer, Lety
- **Frameworks code:** GurusUp, DataCamp, Medium Data Science Collective, OpenAgents, PE Collective
- **UX:** Nielsen Norman Group (NN/g), IxDF, Lollypop Design, Mirakl Design, GitLab Design, Userpilot
- **Risco multi-agente:** Maxim AI MAST study, CIO.com, Cribl, Galileo AI, Towards Data Science, Microsoft Azure Architecture
- **Risco WhatsApp:** TechCrunch, Business Standard, ChatbotBuilder AI, Respond.io, Cognativ, Eesel, Kraya AI
- **Mastra/Vercel AI SDK:** Generative.inc, GitHub mastra-ai, Speakeasy, Channel.tel
- **Briefing/discovery:** Pepsales, ZoomInfo Pipeline, Zintlr, MoreBusiness, ManyRequests, Nextiva, HubSpot Sales blog
- **Agências white-label:** Stammer, Lety, BotPenguin, Botsify, Konverso, Insighto, Robofy, Viirtue
