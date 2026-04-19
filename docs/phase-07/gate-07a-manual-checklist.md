# Gate Humano 07A — Checklist pro Vinni (CEO)

> Este documento guia você passo a passo pra validar a **Phase 07A (Mastra Core)** antes de liberar a 07B (UI essencial). Siga em ordem — cada passo depende do anterior.

## Pré-requisitos

- [ ] **Docker Desktop** aberto com Redis rodando (`pnpm redis:start` na raiz)
- [ ] **Dev server** rodando (`pnpm dev` na raiz)
- [ ] **Seu celular pessoal** com WhatsApp, e **outro número** conectado como instância da empresa
- [ ] **WhatsApp da empresa** já conectado no sistema (Phase 06 — pelo menos 1 `whatsapp_instance` com status `connected`)
- [ ] **OPENAI_API_KEY** configurada em `.env.local` (seu key real)

## Passo 1 — Criar agente de teste (seed)

Na raiz do projeto:

```bash
pnpm --filter @repo/database seed:07a
```

**Esperado:**
- Terminal imprime: `[seed] ✅ agente criado: <ID>`
- Anota o `<agentId>` — vai usar nos próximos passos

Se der erro "org CLIENT nao encontrada", você precisa ter pelo menos uma org criada (Phase 02 feita).

## Passo 2 — Listar instâncias WhatsApp

No Supabase SQL Editor (ou pgAdmin):

```sql
SELECT id, "displayName", status
FROM whatsapp_instance
WHERE "organizationId" = '<seu-org-id>';
```

**Esperado:** pelo menos 1 linha com `status = 'connected'`. Anota o `<instanceId>`.

## Passo 3 — Vincular agente ao WhatsApp

```bash
pnpm --filter @repo/database seed:link <agentId> <instanceId>
```

**Esperado:** `[link] ✅ Atendente Comercial Vertech vinculado a instance <instanceId>`

## Passo 4 — Iniciar conversa no WhatsApp

Do **seu celular pessoal**, mande uma mensagem pro número vinculado (a instance da empresa). Qualquer mensagem simples, tipo "Oi".

**Esperado:**
- No terminal do `pnpm dev`, você vê logs de:
  - `[instrumentation] OutboundSender (WhatsApp) registrado`
  - `[instrumentation] agent-invocation worker iniciado inline (dev mode)` (apenas na primeira vez)
  - `[handleIncomingMessage]` processando inbound
- A mensagem aparece no chat da UI em `/app/<orgSlug>/crm/chat`

## Passo 5 — Ligar IA na conversa

Na UI do chat, **copie o ID da conversa** (URL ou inspect). Ou via SQL:

```sql
SELECT id FROM conversation WHERE "contactId" = (
  SELECT id FROM contact WHERE phone = '<seu-numero-sem-@>'
  ORDER BY "createdAt" DESC LIMIT 1
);
```

Então:

```bash
pnpm --filter @repo/database seed:enable-ai <conversationId> <agentId>
```

**Esperado:** `[enable-ai] ✅ conversation <id> com IA habilitada`

## Passo 6 — Mandar mensagem e esperar resposta do agente

Do celular, mande outra mensagem — tipo "Quais produtos vocês vendem?"

**Esperado:**
- [ ] Terminal mostra `[agent-invocation-worker] job <id> completed`
- [ ] Status da mensagem inbound passa por: `QUEUED` → `PROCESSING` → `SENT`
- [ ] Em 2-10s, **agente responde no seu WhatsApp** em português coerente
- [ ] Resposta é curta (1-3 frases, estilo WhatsApp), sem inventar preços
- [ ] Agente se apresenta naturalmente (não diz que é IA, a menos que você pergunte)

Teste: verifique via SQL que outbound message existe com status SENT:
```sql
SELECT id, "senderType", "senderName", status, text
FROM message
WHERE "conversationId" = '<conversationId>'
ORDER BY "createdAt" DESC
LIMIT 5;
```

## Passo 7 — Testar memória entre mensagens

Mande **segunda mensagem** na mesma conversa — tipo "Me fale sobre isso com mais detalhes".

**Esperado:**
- Agente responde referenciando o contexto da primeira mensagem
- Não pede pra você repetir o que já disse
- Conversa tem fluxo natural

## Passo 8 — Health endpoints

Abra no navegador (logado como superadmin Vinni):

```
http://localhost:3000/admin/health
```

**Esperado:**
- Página renderiza com 4 cards: queue, mastra, redis, database
- Todos com status **healthy** (verde)
- Métricas aparecem quando você expande

Teste também via `curl`:
```bash
curl -H "Cookie: $(cat ~/.cookies-vertech)" http://localhost:3000/api/admin/health/queue
```

## Passo 9 — Teste de robustez (restart do worker)

1. Mande uma mensagem do celular
2. Imediatamente no terminal: `Ctrl+C` no `pnpm dev`, então rode `pnpm dev` de novo
3. **Esperado:** worker puxa o job da fila persistida e processa — agente responde mesmo após restart

## Veredito

Se todos os passos acima deram certo, **07A está APROVADA**.

**Próximo passo:** liberar 07B (UI essencial — lista de agentes + 6 abas de edição).

Se algum passo falhou, anota qual e chama o @dev (Neo) pra investigar antes de prosseguir.

---

**Checkpoint pós-aprovação:**
- [ ] Commit do CHANGELOG-phase-07a.md (@dev faz)
- [ ] Sinal pra @sm iniciar stories 07B
