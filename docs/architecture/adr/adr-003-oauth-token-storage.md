---
type: adr
id: ADR-003
title: "OAuth Token Storage — Encrypted Column + Env Key"
project: vertech-agents
status: accepted
date: 2026-04-26
tags:
  - project/vertech-agents
  - adr
  - integration
  - security
  - wave-2
---

# ADR-003: OAuth Token Storage — Encrypted Column + Env Key

## Status

Accepted (2026-04-26).

## Contexto

Wave 2 introduz integração Google Calendar (D.2 + D.3 + E.3). OAuth flow gera `access_token` (curta duração, ~1h) e `refresh_token` (longa duração, semanas) por usuário/org. Tokens precisam ficar persistidos pra não pedir consent toda hora. Futuro: outros providers (Outlook, Slack, Meta Ads, Google Ads) seguem mesmo padrão.

Tokens em plaintext no banco = risco crítico. Vazamento de DB dump → atacante usa refresh_token pra acessar Google Calendar de TODOS os clientes.

## Decisão

Tabela `oauth_token` única, multi-provider. Tokens criptografados em coluna com **AES-256-GCM**, chave em env `OAUTH_ENCRYPTION_KEY` (256-bit, gerada via `openssl rand -base64 32`).

### Schema

```typescript
oauth_token:
  id: cuid pk
  organizationId: text fk
  userId: text fk (quem autorizou)
  provider: enum ("google", "microsoft", "meta", "slack" — extensível)
  providerAccountId: text (sub do JWT, identifica conta no provider)
  scope: text (csv de scopes autorizados)
  accessTokenEnc: text (AES-256-GCM ciphertext base64, formato `iv:tag:cipher`)
  refreshTokenEnc: text (idem)
  expiresAt: timestamp
  metadata: jsonb (provider-specific, ex: googleCalendarSyncToken)
  createdAt, updatedAt
  
  unique(organizationId, userId, provider)
  index(organizationId, provider)
```

### Crypto helper

`packages/database/src/crypto/oauth-cipher.ts`:
- `encryptToken(plaintext: string): string` — AES-256-GCM com chave env, retorna `iv:tag:cipher` base64
- `decryptToken(ciphertext: string): string` — reverso
- IV de 12 bytes random por encryption (não reutiliza)

### Rotação de chave

Versionar formato: `v1:iv:tag:cipher`. Quando trocar chave (`OAUTH_ENCRYPTION_KEY_V2`):
- Helper aceita ambas (v1 + v2) na decriptação
- Re-encrypta no próximo write
- Migration script roda em background re-encryptando registros antigos

## Alternativas rejeitadas

### A. Plaintext column
**Rejeitado.** Vazamento de DB = compromisso total clientes Google Calendar. Inaceitável.

### B. Supabase Vault (pgsodium)
**Rejeitado MVP.** Adiciona dependência de extensão Postgres específica + complexidade de migration. Vale considerar pós-comercial 100% se OAuth providers crescerem (>5 providers, multi-region). Hoje overkill.

### C. AWS KMS / GCP KMS externo
**Rejeitado MVP.** Custo + latência (call externa pra cada decrypt). Reservar pra escala enterprise (>10k clientes ativos com OAuth).

### D. Better Auth tabela `account` existente
**Rejeitado.** Better Auth `account` é pra autenticação de login do usuário (Google sign-in pro app). OAuth Calendar é integração outbound (app pede permissão de USAR Google em nome do usuário). Mistura semântica errada. Manter separado evita problemas quando user faz logout no Better Auth (Calendar não deveria desconectar).

## Consequências

### Positivas
- Tokens seguros mesmo em vazamento de DB (atacante precisa do `OAUTH_ENCRYPTION_KEY` env tb)
- Multi-provider extensível (próximo provider só adiciona `provider` enum)
- Rotação de chave possível sem downtime
- Sem dependência externa (KMS/Vault)

### Negativas
- Chave em env = single point of failure. Se vazar, tokens vazam.
  - **Mitigação:** env não vai pro git, Coolify gerencia secrets, rotação trimestral.
- Decrypt em todo refresh OAuth = +5ms latência. Aceitável (refresh é raro).
- Migration de chave manual (script).

## Implementação

| Story | Owner | Output |
|---|---|---|
| D.2 | @data-engineer | Schema + migration + helper crypto |
| D.2 | @dev | Server action `getOAuthToken(orgId, userId, provider)` (decrypt na hora) |
| D.2 | @devops | Variável `OAUTH_ENCRYPTION_KEY` no Coolify (gerar via `openssl rand -base64 32`) |

## Refs

- AES-256-GCM Node.js: https://nodejs.org/api/crypto.html#class-cipher
- Better Auth account model: https://www.better-auth.com/docs/concepts/database
