---
type: guide
title: "Google Cloud Console — Setup OAuth Calendar"
project: vertech-agents
tags:
  - project/vertech-agents
  - guide
  - integration/google
  - wave-2
date: 2026-04-26
status: ready-to-use
---

# Google Cloud Console — Setup OAuth Calendar

> [!info] Quando fazer
> Pré-requisito Wave 2 stories D.3 + E.3 (sync Google Calendar). Pode rodar assíncrono enquanto squad LMAS toca outras stories. Total estimado: ~10 min teu tempo.

## O que vai conseguir

Credenciais OAuth 2.0 que permitem o Vertech Agents:
- Pedir permissão pro usuário acessar Google Calendar dele
- Criar/editar/deletar eventos no calendar do usuário
- Receber notificação quando algo muda no calendar (webhook)
- Renovar acesso automaticamente (refresh token)

## Pré-requisitos

- Conta Google (qualquer, pessoal ou Workspace)
- Cartão de crédito vinculado (Google exige mas Calendar API tem free tier generoso, não cobra nada no nosso uso)

## Passo 1. Criar projeto no Google Cloud

1. Acessa https://console.cloud.google.com
2. Topo da tela tem dropdown de projeto. Clica → "Novo projeto" / "New Project"
3. Nome: `vertech-agents-prod` (ou o que preferir)
4. Organização: deixa "Sem organização" se for pessoal
5. Clica **Criar**
6. Espera ~30s. Volta no dropdown topo e seleciona o projeto novo

## Passo 2. Ativar Google Calendar API

1. Menu hambúrguer ☰ (canto superior esquerdo) → **APIs & Services** → **Library**
2. Busca **Google Calendar API**
3. Clica no resultado
4. Clica botão **Enable** / **Ativar**
5. Espera ~10s

## Passo 3. Configurar OAuth Consent Screen

1. Menu ☰ → **APIs & Services** → **OAuth consent screen**
2. Tipo de usuário: **External** (a não ser que tenha Google Workspace org)
3. Clica **Create**
4. Preenche:
   - **App name:** `Vertech Agents`
   - **User support email:** teu email
   - **App logo:** opcional, pode pular agora
   - **App domain:** deixa vazio por enquanto (preencher quando colocar domínio prod)
   - **Developer contact information:** teu email
5. Clica **Save and Continue**
6. **Scopes:** clica **Add or Remove Scopes** → marca:
   - `.../auth/calendar` (See, edit, share, and permanently delete all the calendars)
   - `.../auth/calendar.events` (View and edit events on all your calendars)
   - `userinfo.email` + `userinfo.profile` (já vêm marcados normalmente)
7. **Update** → **Save and Continue**
8. **Test users:** adiciona teu próprio email como teste. Quando tiver mais usuários, adiciona aqui também (até 100 antes de publicar).
9. **Save and Continue** → **Back to Dashboard**

> [!tip] Modo de teste vs produção
> Por enquanto fica em **Testing**. Suporta até 100 usuários teste. Quando for pra produção real (cliente externo usando), publica e Google pede verificação (~ 1-2 semanas processo). Por agora, deixa em testing.

## Passo 4. Criar OAuth Client ID

1. Menu ☰ → **APIs & Services** → **Credentials**
2. Topo: **+ Create Credentials** → **OAuth client ID**
3. **Application type:** Web application
4. **Name:** `Vertech Agents Web`
5. **Authorized JavaScript origins:**
   - Dev: `http://localhost:3000`
   - Prod: `https://app.vertech.cloud` (ou domínio que você tem)
6. **Authorized redirect URIs:**
   - Dev: `http://localhost:3000/api/auth/google/callback`
   - Prod: `https://app.vertech.cloud/api/auth/google/callback`
7. Clica **Create**
8. Aparece modal com **Client ID** e **Client Secret**. **COPIA OS DOIS.** Vou usar.

## Passo 5. Webhook Push (opcional, recomendado)

Pra receber notificação em tempo real quando usuário edita evento no Google Calendar (em vez de fazer polling):

1. Mesma tela **Credentials** → **+ Create Credentials** → **Domain verification**
2. Adiciona domínio prod (ex: `app.vertech.cloud`)
3. Faz verificação (TXT record DNS ou meta tag HTML — Google explica)

> [!warning] Webhook precisa HTTPS
> Push notifications do Google Calendar **só** funcionam em URL HTTPS válida com certificado real (não self-signed). Em dev, usar **polling** (já está no plano fallback). Em prod com Coolify + Let's Encrypt funciona normal.

## Passo 6. Me passar os valores

Cola aqui no chat assim:

```
GOOGLE_OAUTH_CLIENT_ID=<copiado do passo 4>
GOOGLE_OAUTH_CLIENT_SECRET=<copiado do passo 4>
GOOGLE_OAUTH_REDIRECT_URI_DEV=http://localhost:3000/api/auth/google/callback
GOOGLE_OAUTH_REDIRECT_URI_PROD=https://app.vertech.cloud/api/auth/google/callback
```

Ou, se preferir, edita você mesmo o `.env.local` na raiz do repo. Squad LMAS configura o resto.

## O que NÃO precisa fazer agora

- Não precisa **publicar** (publish) o OAuth consent — fica em testing
- Não precisa adicionar billing card específico (Calendar API free tier cobre)
- Não precisa criar service account (usamos OAuth user, não SA)

## Quando rodar

Pode ser AGORA (10 min) ou DEPOIS quando squad chegar em D.3/E.3. Mantém em paralelo. Se não tiver feito ainda quando chegarmos lá, aviso e paro pra esperar.

## Riscos / pegadinhas comuns

| Pegadinha | Sintoma | Solução |
|---|---|---|
| Esqueceu redirect URI | OAuth retorna `redirect_uri_mismatch` | Adicionar URI exata em **Credentials** |
| Esqueceu de adicionar test user | Usuário vê tela "App não verificada" + bloqueia | Adicionar email em **OAuth consent screen** → Test users |
| Trocou client secret | Refresh token antigo deixa funcionar | Re-fazer OAuth flow do zero |
| Webhook expira em 1 semana | Notificações param de chegar | Renovar channel via cron 6 dias após criar |

## Refs externas

- Calendar API docs: https://developers.google.com/calendar/api/guides/overview
- OAuth scopes: https://developers.google.com/identity/protocols/oauth2/scopes#calendar
- Webhook setup: https://developers.google.com/calendar/api/guides/push
