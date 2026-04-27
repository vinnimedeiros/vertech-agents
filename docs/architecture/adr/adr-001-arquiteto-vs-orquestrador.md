---
type: adr
id: ADR-001
title: "Limite de responsabilidade entre Arquiteto e Orquestrador"
status: accepted
date: 2026-04-19
project: vertech-agents
tags:
  - project/vertech-agents
  - architecture/agents
  - phase/09
  - phase/10
decision: Arquiteto constrói e evolui estruturalmente. Orquestrador opera em tempo real.
author: Morgan (@pm) sob direção estratégica de Vinni (CEO)
---

# ADR-001. Limite de responsabilidade entre Arquiteto e Orquestrador

## Contexto

O Vertech Agents possui dois agentes Mastra internos que NÃO conversam com leads, só com o usuário proprietário: o **Arquiteto** (Phase 09) e o **Orquestrador** (Phase 10).

A versão inicial do roadmap (2026-04-17) permitia ao Orquestrador executar operações de edição estrutural sobre agentes em produção (`updateAgentPersona`, `updateAgentBusinessContext`, `enableAgentTool`, `disableAgentTool`, `createAgent`). Em paralelo, o Arquiteto criava o agente em sessão draft e depois "devolvia" o agente pro Orquestrador operar.

Durante a reformatação estratégica de 2026-04-19 (após pesquisa competitiva do Mercado Agentes via Playwright e conversa com Vinni), ficou clara uma ambiguidade: **quem é o parceiro do usuário quando ele precisa evoluir o agente já publicado?**

Exemplo real trazido pelo Vinni:
> "Meu cliente adicionou 2 novos serviços no portfólio e precisa atualizar o agente comercial dele. Ele tem que conversar com alguma IA no sistema que já tenha contexto total da construção que foi feita do agente dele."

Duas respostas possíveis:
- **Orquestrador** (como estava no vault original): ele tem tools de edição de agente, resolveria.
- **Arquiteto** (nova proposta): ele tem o contexto da construção, mantém histórico da sessão e dos artefatos gerados, consegue aplicar mudanças estruturais coerentes.

## Decisão

**O Arquiteto é dono de todas as operações de construção e evolução estrutural do agente.**
**O Orquestrador é dono de todas as operações de uso diário e intervenção em tempo real.**

### Matriz de responsabilidade

| Operação | Dono | Justificativa |
|---|---|---|
| Criar agente do zero (primeira vez) | Arquiteto | Ele conduz o fluxo de 4 etapas. |
| Adicionar serviços/produtos ao portfólio do agente | Arquiteto | Mexe em knowledge base + business context + possivelmente prompt. |
| Mudar persona (tom, formalidade, humor, empatia) | Arquiteto | Mudança estrutural, gera nova versão. |
| Adicionar/remover capability do agente | Arquiteto | Mudança de tools habilitadas, muda o Flow Diagram. |
| Reescrever regras invioláveis | Arquiteto | Core behavior, exige raciocínio sobre conflitos com capabilities. |
| Instalar novo template comercial (SPIN, AIDA, Objeção) | Arquiteto | Preset de fábrica aplicado ao prompt. |
| Mudar voz TTS ou política de áudio | Arquiteto | Config estrutural da persona. |
| Trocar modelo/provider do agente | Arquiteto | Decisão de construção, envolve custo e capacidade. |
| Ativar/pausar/arquivar agente | Orquestrador | Operação de uso diário. |
| Mover lead no pipeline | Orquestrador | Operação sobre dado, não sobre agente. |
| Renomear stage de pipeline | Orquestrador | Operação de config operacional. |
| Intervir em conversa ao vivo (assumir atendimento) | Orquestrador | Tempo real com lead. |
| Enviar mensagem manual pelo chat | Orquestrador | Operação de canal. |
| Ajustar branding (cores, logo) | Orquestrador | Operação de workspace. |
| Criar evento na agenda | Orquestrador | Operação de calendar. |
| Consultar audit log, desfazer ação | Orquestrador | Meta-operação sobre histórico. |
| Vincular/desvincular instância WhatsApp ao agente | Orquestrador | Operação de canal, não muda o agente. |

### Princípio de diferenciação

- **Arquiteto:** responde a "**como esse agente deve ser?**". Mantém memória longa da sessão de construção. Fala em artefatos (perfil de negócio, blueprint, knowledge base). Gera **novas versões** do agente a cada mudança aplicada.
- **Orquestrador:** responde a "**o que fazer agora na operação?**". Mantém memória curta de contexto de tela. Fala em tool calls diretos (mover lead, atualizar stage). **Não gera versão** de agente.

## Consequências

### Positivas

1. **Usuário sempre sabe com quem falar.** "Quero evoluir meu agente" → Arquiteto. "Quero operar" → Orquestrador.
2. **Arquiteto mantém histórico íntegro.** A mesma IA que criou o agente é quem o evolui, preservando contexto de decisões passadas.
3. **Versionamento claro.** Toda mudança feita pelo Arquiteto gera entrada em `agent_version` com author "architect", permitindo rollback.
4. **Orquestrador fica mais seguro.** Sem poder de mudar comportamento estrutural, reduz superfície de ataque via prompt injection.
5. **Tools separadas por registry** (`architectTools` vs `orchestratorTools`) mantém isolamento Mastra limpo.

### Negativas

1. **Redundância aparente.** Usuário pode achar estranho "pra mudar persona, vou no Arquiteto; pra mover lead, no Orquestrador". **Mitigação:** UX deixa claro via painel contextual ("chat com o Arquiteto" aparece quando estou em `/agents/*`; "chat com o Orquestrador" aparece no resto da app).
2. **Custo maior de LLM.** Dois agentes distintos com memória própria. **Mitigação:** Arquiteto usa modelo forte (`openai/gpt-4o`), Orquestrador pode usar modelo mais leve (`openai/gpt-4.1-mini`) pra operações repetitivas.
3. **Exige disciplina nas tools.** Tentação de adicionar `updateAgentPersona` no `orchestratorTools` por conveniência. **Mitigação:** este ADR é o guardião. Toda PR que adiciona tool em registry errado deve ser rejeitada.

### Impactos no roadmap

- **Phase 09 (Arquiteto)** expande escopo: além de criar, também evolui agente publicado via "Chat de Evolução".
- **Phase 10 (Orquestrador)** reduz escopo: remove tools `updateAgentPersona`, `updateAgentBusinessContext`, `setAgentConversationStyle`, `enableAgentTool`, `disableAgentTool`, `setAgentModel`, `createAgent`.
- **Phase 08 (Tools)** ajusta registries: essas tools migram de `orchestratorTools` pra `architectTools`. O Orquestrador mantém só tools de operação.
- **Paridade 1:1 com UI (Configurabilidade Tripla)**: toda config do agente que existe no Painel de Refino (07B-v2) tem tool correspondente em `architectTools`, não em `orchestratorTools`.

## Quando revisitar

Reavaliar este ADR se:
- Usuários reportarem consistentemente confusão sobre "com quem falar".
- Uso real mostrar que >70% das conversas com Orquestrador são pedidos de mudança estrutural que ele nega.
- Nova fase do produto introduzir um terceiro agente interno que muda o equilíbrio.

## Referências

- `.claude/projects/.../memory/feedback_configurabilidade_tripla.md` — paridade 1:1 UI/tools
- `C:\Users\Vinni Medeiros\Matrix\Matrix\projects\Vertech-agents\phases\phase-09-agent-builder.md` — escopo original do Arquiteto
- `C:\Users\Vinni Medeiros\Matrix\Matrix\projects\Vertech-agents\phases\phase-10-orchestrator.md` — escopo original do Orquestrador
- `docs/research/mercado-agentes-assistant-flow.md` — pesquisa que inspirou a reformatação
