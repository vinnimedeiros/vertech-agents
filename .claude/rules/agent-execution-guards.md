# Agent Execution Guards — Systemic Quality Rules

## Purpose

Three cross-agent rules that prevent silent quality degradation. These rules apply to ALL agents, ALL domains, ALL commands.

---

## Rule 1: Context-Load (Pre-Read Obrigatório)

**MUST — All Agents**

Antes de executar qualquer task principal, o agente DEVE carregar contexto do projeto:

### Passo 0: Resolucao de Projeto (Multi-Project Mode)

**ANTES de qualquer leitura**, o agente DEVE resolver qual projeto esta ativo:

```
SE projects/ existe (multi-project mode):
  1. Verificar se o usuario JA mencionou o projeto nesta conversa
  2. Se SIM → usar esse projeto como raiz de docs
  3. Se NAO → perguntar: "Qual projeto? (lmas/clawin/i5x)"
  4. Armazenar no contexto: "Projeto ativo: {id}"
  5. Raiz de docs = projects/{id}/
  6. Code path = ler de projects/{id}/.project.yaml → code_path

SENAO (legacy single-project):
  Raiz de docs = docs/
```

**IMPORTANTE:** O projeto ativo vive no CONTEXTO DA CONVERSA, NAO em arquivo.
Duas sessoes simultaneas podem trabalhar em projetos diferentes sem conflito.

### O que ler (em ordem de prioridade):

1. **Pipeline Status** — `{raiz}/pipeline-status.yaml` (se existir) → saber em que fase cada setor esta, bridges pendentes, proxima acao
2. **Project Context** — `{raiz}/project-context.yaml` (se existir) → identidade, objetivos, stack, user profile
3. **Risk Register** — `{raiz}/risk-register.yaml` (se existir) → debugs resolvidos e riscos ativos (NAO repetir erros)
4. **PRD** — `{raiz}/prd/` ou `docs/prd*.md` (se existir) → entender o produto, publico, proposta de valor
5. **Stories concluidas** — `{raiz}/stories/` com status Done/Ready for Review → entender o que ja foi construido
6. **Architecture docs** — `{raiz}/architecture/` (se existir) → entender stack e decisoes tecnicas
7. **Context files do setor ativo** — `{raiz}/brand-dna.yaml`, `{raiz}/icp.yaml`, `{raiz}/business-model.yaml` etc (ler SOMENTE os relevantes para o setor do agente)
8. **Project CLAUDE.md** — `{raiz}/CLAUDE.md` (se existir) → convencoes especificas do projeto

### Quando aplicar:

| Situacao | Context-Load obrigatorio? |
|----------|--------------------------|
| Primeira task do agente na sessao | SIM — resolver projeto + ler PRD + stories |
| Tasks subsequentes na mesma sessao | NAO — contexto ja carregado |
| Mudanca de dominio (dev → marketing) | SIM — recarregar com foco no novo dominio |
| Produto existente + task de design/marketing | SIM — ler codigo/app existente tambem |
| **Troca de projeto na mesma sessao** | **SIM — recarregar TUDO do novo projeto** |

### Como aplicar:

O agente NAO precisa ler todos os arquivos. Deve:
1. **Resolver o projeto ativo** (Passo 0)
2. **Ler pipeline-status.yaml** (se existir) — saber onde cada setor esta, qual o proximo stage, bridges pendentes
3. **Ler risk-register.yaml** (se existir) — scanning rapido de debugs resolvidos e riscos ativos
4. Ler o project CLAUDE.md (se existir) — stack, convencoes, code_path
5. Ler o PRD (se existir) — scanning rapido de features e publico
6. Ler context files do SEU setor — ex: @kamala le brand-dna.yaml, @mifune le business-model.yaml, @dev le nfrs.yaml
7. Se a task envolve UI/design/marketing → verificar o que o produto ja tem

### Output esperado:

Antes de iniciar a task, o agente declara em 2-3 linhas:
```
📋 Projeto: [nome] | Contexto carregado: [N features], publico [Y], stack [Z].
📊 Pipeline: brand [{status}] | design [{status}] | dev [{status}] | marketing [{status}] | business [{status}]
⚠️ Riscos ativos: [N] | Debugs registrados: [N]
🌉 Bridges pendentes: [lista ou "nenhum"]
```

Se pipeline-status.yaml nao existir:
```
📋 Projeto: [nome] | Sem pipeline-status — projeto sem artifact system configurado.
```

Se nao encontrar docs de contexto:
```
📋 Projeto: [nome] | Nenhum contexto encontrado. Prosseguindo com informacoes fornecidas.
```

---

## Rule 2: Pipeline-Suggest (Sugestão de Próximo Step)

**MUST — All Agents**

Após completar qualquer command que aparece como step em `workflow-chains.yaml`, o agente DEVE sugerir o próximo step do pipeline.

### Como funciona:

1. Agente completa command/stage
2. Agente consulta fontes de pipeline na seguinte PRIORIDADE:
   - **Prioridade 1:** `sector-stages.yaml` (artifact system) → Se o stage aparece aqui, usar formato artifact-driven com artefatos produzidos/esperados
   - **Prioridade 2:** `workflow-chains.yaml` (chains legados) → Fallback para commands que nao estao no sector-stages
3. Se encontrou → identifica o proximo step
4. Sugere ao usuario (NAO auto-executa)

### Formato da sugestão:

```
✅ [task concluída]
📋 Artefato produzido: projects/{projeto}/artifacts/{setor}/{stage}.md

💡 Próximo step no pipeline [{pipeline-name}]:
   → Copie: /LMAS:agents:{agent}
   → Comando: *{command}
   📋 Artefato esperado: projects/{projeto}/artifacts/{setor}/{próximo-stage}.md
   🌉 Bridge: {bridge-id} (status: {pending|validated})
   Prosseguir? (sim / pular / ver pipeline completo)
```

### Formato ALTERNATIVO para handoff cross-setor (bridges):

Quando o próximo step está em OUTRO setor, incluir informação do bridge contract:

```
✅ [task concluída] — Setor {setor} stage {stage} COMPLETE
📋 Artefato produzido: projects/{projeto}/artifacts/{setor}/{stage}.md

🌉 BRIDGE CROSS-SETOR: {setor-origem} → {setor-destino}
   Contrato: projects/{projeto}/bridges/BRIDGE-{origem}-to-{destino}.yaml
   Status: {pending|validated|blocked}

   → Copie: /LMAS:agents:{agent-destino}
   → Artefato de entrada: projects/{projeto}/artifacts/{setor}/{stage}.md
   → Artefato esperado: projects/{projeto}/artifacts/{setor-destino}/{stage-destino}.md
   Prosseguir? (sim / pular / ver pipeline completo)
```

### Pipeline-Status Update (MUST — em TODA fase):

Ao completar QUALQUER stage (com ou sem bridge), o agente DEVE atualizar `pipeline-status.yaml`:
1. Mover o stage concluido para `sectors.{setor}.done[]`
2. Definir `sectors.{setor}.current` como proximo stage (ou null se setor completo)
3. Se setor completo → definir `sectors.{setor}.status: complete`
4. Adicionar entrada no `session_log[]` com: session_id, date, agent, stage_completed, artifacts_produced, next_action

### Regras:

- **NUNCA auto-executar** o próximo step — sempre perguntar
- **Tier-check ANTES de sugerir** — verificar se o próximo agente está disponível no tier atual:
  - Se **disponível** → sugerir normalmente
  - Se **premium indisponível** → NÃO mencionar o agente premium. Sugerir direto o workaround free (conforme graceful-degradation.md). Ex: em vez de "→ @copywriter *write-copy", sugerir "→ Você pode escrever o copy usando as guidelines acima, ou Morpheus pode ajudar"
  - Se **step marcado optional: true** no workflow E agente indisponível → pular silenciosamente para o próximo step disponível
- Se o usuário disser "pular" → perguntar se quer ver o step seguinte
- Se o usuário disser "ver pipeline" → mostrar todos os steps restantes (marcando indisponíveis com ⚠️)
- Se o command NÃO aparece em nenhum workflow → não sugerir nada (comportamento normal)
- Se o workflow tem **conditional steps** (ex: Spec Pipeline pula steps para SIMPLE class) → respeitar as condições, não sugerir steps que seriam pulados

### Exceção:

Commands utilitários (`*help`, `*status`, `*guide`, `*kb`) NUNCA acionam pipeline-suggest.

---

## Rule 3: Scope Guard (Proteção de Escopo)

**MUST — All Agents**

Quando um agente está prestes a produzir output que pertence ao escopo exclusivo de outro agente, ele DEVE parar e sugerir delegação.

### Mapa de escopo (o que cada agente PRODUZ exclusivamente):

| Output | Dono exclusivo | Outros agentes DEVEM delegar |
|--------|---------------|------------------------------|
| Copy de marketing (headlines, CTAs, body text persuasivo, landing page copy) | @copywriter | @sati, @dev, @pm, qualquer outro |
| Keywords, SEO audit, schema markup | @seo | @copywriter, @content-strategist |
| Database schemas, migrations, RLS | @data-engineer | @dev, @architect |
| Git push, PRs, releases | @devops | TODOS |
| Content strategy, editorial calendar | @content-strategist | @copywriter, @seo |
| Architecture decisions, ADRs | @architect | @dev, @pm |
| Story creation | @sm | @pm, @dev |
| Story validation | @po | @sm, @dev |
| Brand positioning, naming, identity, archetype | @kamala | @copywriter, @content-strategist, @marketing-chief |
| Business strategy, offers, pricing, business model | @mifune | @traffic-manager, @analyst, @pm |
| Brand narrative, storytelling, manifestos | @bugs | @copywriter, @content-strategist, @kamala |
| Advisory counsel, board recommendations | @hamann | @mifune, @analyst |
| Budget allocation, paid media campaigns | @traffic-manager | @marketing-chief (budget approval migrated to @mifune) |

### Como funciona:

1. Agente está executando task e percebe que precisa produzir output de outro escopo
2. Agente PARA e informa:
   ```
   ⚠️ Isso é escopo do @{agent} ({persona}). Quer que eu acione?
   ```
3. Se usuário aceita → handoff com contexto
4. Se usuário recusa → agente pode produzir output básico com disclaimer:
   ```
   ⚠️ Copy gerado como placeholder — recomendo revisão pelo @copywriter para versão final.
   ```

### Quando NÃO aplicar:

- Agente premium indisponível no free tier → produzir output com disclaimer
- Morpheus executando diretamente (`*task`, `*exec`) → Morpheus pode executar qualquer recurso
- Output é trivial (ex: label de botão "Salvar") → não delegar por um botão
- Urgência explícita do usuário ("faz tudo agora, sem delegação")
- Agent Authority já cobre a operação (ex: git push já bloqueado → scope guard não precisa duplicar)

### Critério de "output não-trivial":

Se o output envolve mais de 3 linhas de texto persuasivo, estratégia de conteúdo, decisão técnica de dados, ou qualquer item listado na tabela acima → scope guard ativa.

### Distinção: Copy de Marketing vs UI Microcopy

| Tipo | Exemplos | Scope Guard? |
|------|----------|-------------|
| **Copy de marketing** | Headlines de landing page, CTAs persuasivos, body text de conversão, email copy, ad copy | SIM → @copywriter |
| **UI microcopy** | Labels de botão ("Salvar", "Cancelar"), error messages técnicas, tooltips, placeholders de input, breadcrumbs | NÃO → agente atual pode escrever |
| **Zona cinza** | Onboarding text, empty states, notification messages (> 2 linhas persuasivas) | SIM se persuasivo, NÃO se funcional |

**Regra prática:** Se o texto existe para **convencer** o usuário a agir → @copywriter. Se existe para **informar** o usuário sobre estado/ação → agente atual.

---

## Interação entre as 3 regras

```
Sessão inicia
  → Rule 1: Context-Load (ler projeto)

Agente executa command
  → Rule 3: Scope Guard (verificar se output é do meu escopo)
  → Se não → sugerir delegação

Agente completa command
  → Rule 2: Pipeline-Suggest (verificar workflow-chains.yaml)
  → Se encontrou → sugerir próximo step
```

---

## Resolução de Conflitos com Regras Existentes

### Context-Load vs Checkpoint Protocol
- **Checkpoint** atualiza docs APÓS ação (escrita)
- **Context-Load** lê docs ANTES de task (leitura)
- **Resolução:** Sem conflito real. Context-Load roda uma vez por sessão (primeira task). Checkpoint atualiza inline após cada ação. Se o mesmo agente continua na sessão, não relê.

### Scope Guard vs Agent Authority
- **Agent Authority** bloqueia OPERAÇÕES (git push, PR, releases)
- **Scope Guard** bloqueia OUTPUTS (copy, schemas, ADRs)
- **Resolução:** Complementares. Scope Guard NÃO se aplica onde Agent Authority já cobre. Não há cascata dupla — se Authority já bloqueia, Scope Guard não ativa.

### Pipeline-Suggest vs Graceful Degradation
- **Pipeline-Suggest** sugere próximo step
- **Graceful Degradation** pula steps premium silenciosamente
- **Resolução:** Pipeline-Suggest faz tier-check ANTES de sugerir. Se premium indisponível, sugere workaround free diretamente. Nunca menciona agente premium indisponível.

---

## Rule 4: Bridge Validation (Protecao de Handoff Cross-Setor)

**MUST — All Agents**

Quando um agente completa uma fase que tem bridge para outro setor, ele DEVE validar o contrato antes de sugerir handoff.

### Como funciona:

1. Agente completa fase (ex: @kamala completa brand/4-identity)
2. Agente verifica `pipeline-status.yaml` → bridges[] para encontrar bridge de saida
3. Se bridge existe → ler contrato em `projects/{id}/bridges/BRIDGE-{x}-to-{y}.yaml`
4. Verificar: `provider_delivers` → os artifacts/campos listados existem e estao preenchidos?
5. Se SIM → bridge status = `validated`. Sugerir handoff com confianca.
6. Se NAO → bridge status = `blocked`. Informar o que falta ANTES de sugerir handoff.

### Formato quando bridge VALIDATED:

```
✅ Fase {stage} completa.
🌉 Bridge {bridge-id}: VALIDATED — contrato atendido.
   → Copie: /LMAS:agents:{agent-destino}
   📋 Artefato de entrada pronto: {artifact path}
```

### Formato quando bridge BLOCKED:

```
✅ Fase {stage} completa.
🌉 Bridge {bridge-id}: BLOCKED — contrato NAO atendido.
   ❌ Campos faltando no artefato de origem:
     - {campo 1}
     - {campo 2}
   → Completar campos antes de prosseguir para {setor-destino}.
```

### Quando NAO aplicar:

- Fase sem bridge de saida → nao validar (comportamento normal)
- Bridge com `critical: false` no sector-stages.yaml → WARNING em vez de BLOCK
- Usuario explicitamente diz "pular validacao" → registrar override no session_log
- Contrato de bridge ainda nao criado → WARNING: "Bridge sem contrato definido"

### Atualizacao do pipeline-status:

Apos validacao (positiva ou negativa), o agente DEVE atualizar `pipeline-status.yaml`:

```yaml
bridges:
  - id: BRIDGE-brand-to-design
    status: validated  # ou blocked
    validated_at: "2026-03-28"
    validated_by: kamala
```

---

## Obrigatoriedade

Estas regras (1-4) são **MUST** para todos os agentes, incluindo Morpheus. A única exceção é quando o usuário **explicitamente** pede para ignorar (ex: "faz tudo sem delegar").
