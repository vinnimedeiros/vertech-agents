---
type: adr
id: ADR-004
title: "Google Calendar Sync — Webhook Push + Polling Fallback"
project: vertech-agents
status: accepted
date: 2026-04-26
tags:
  - project/vertech-agents
  - adr
  - integration/google
  - wave-2
---

# ADR-004: Google Calendar Sync — Webhook Push + Polling Fallback

## Status

Accepted (2026-04-26).

## Contexto

Story D.3 = sync bidirecional Google Calendar:
- **Outbound:** evento criado no Vertech aparece no Google
- **Inbound:** evento criado/editado no Google aparece no Vertech

Google oferece duas mecânicas pra detectar mudanças no calendar do usuário:
1. **Push notifications (webhook)** via Google Calendar Channels API → Google chama nosso endpoint quando algo muda
2. **Polling com sync token** → consultamos periodicamente, sync token traz só os deltas

Push é instantâneo mas exige HTTPS válido + canal expira em 7 dias (Google força renew). Polling é simples mas atrasa (depende intervalo).

## Decisão

**Híbrido: webhook push primário + polling fallback a cada 5 min.**

### Webhook (primário)

- Após OAuth autorizado, criar canal Google: `POST /calendars/{id}/events/watch` com `expiration` 7 dias
- Endpoint: `POST /api/integrations/google/calendar/webhook`
- Headers do Google: `X-Goog-Channel-ID`, `X-Goog-Resource-ID`, `X-Goog-Resource-State`
- Response: 200 imediato (não bloqueia Google)
- Trigger background job: pull eventos modificados via sync token armazenado em `oauth_token.metadata.googleCalendarSyncToken`

### Polling (fallback)

- BullMQ job recurring `google-calendar-sync` a cada 5 min, por org com Calendar conectado
- Mesma lógica: pull deltas via sync token
- Catch-all: se webhook falhar (canal expirou + renew falhou, Google teve outage, tokens invalidaram), polling pega depois

### Renovação de canal

- Webhook channel expira em 7 dias (parameter `expiration`)
- BullMQ job recurring `google-calendar-channel-refresh` a cada 6 dias renova canal antes de expirar
- Se renew falhar 3x → marca `oauth_token.metadata.webhookHealthy = false` e dispara alerta

### Eventos órfãos

- Evento criado direto no Google **antes** de OAuth conectar não tem `vertechEventId`
- Sync inbound importa como `external` (calendar default da org)
- Operador pode "vincular" depois manualmente (futuro V4)

## Alternativas rejeitadas

### A. Polling only (sem webhook)
**Rejeitado.** Atraso de até 5 min pra refletir mudança Google→Vertech ruim em workflow comercial (operador edita evento na call, agente do Atendente não sabe).

### B. Webhook only (sem polling)
**Rejeitado.** Single point of failure. Se canal expirar e renew falhar (auth problem, network blip), perdemos eventos silenciosamente.

### C. Sync via Mastra agent (Atendente cria evento via tool)
**Rejeitado pra D.3.** Agente cria evento, OK. Mas precisa também detectar quando humano edita Google direto. Tool não cobre, sync infra cobre.

### D. Service account ao invés de OAuth user
**Rejeitado.** SA precisaria de domain-wide delegation Google Workspace. Free Gmail (maioria dos clientes pequenos) não tem. OAuth user funciona pra todos.

## Consequências

### Positivas
- UX em tempo real (webhook típico 1-3s)
- Resiliência (polling pega webhook morto)
- Sync token = bandwidth eficiente (só deltas, não full reload)

### Negativas
- Complexidade: 3 BullMQ jobs (sync poll, channel refresh, channel watch on connect)
- Webhook precisa HTTPS → dev local usa só polling (documenta no Vinni)
- Channel refresh failure mode = silêncio se não monitorar. Mitigação: alerta no Health Tech Dashboard quando >3 falhas seguidas.

## Implementação

| Componente | Owner | Story |
|---|---|---|
| Endpoint webhook + handler | @dev | D.3 |
| BullMQ jobs (sync + refresh) | @dev | D.3 |
| Sync token em `oauth_token.metadata` | @data-engineer | D.2 |
| Health alert webhook morto | @dev | D.3 (estende Health Dashboard) |
| Channel watch on OAuth connect | @dev | E.3 |

## Refs

- Push Notifications: https://developers.google.com/calendar/api/guides/push
- Sync via sync token: https://developers.google.com/calendar/api/guides/sync
- Channels API: https://developers.google.com/calendar/api/v3/reference/channels
