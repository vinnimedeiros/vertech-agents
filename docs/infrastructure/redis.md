# Redis — Infraestrutura

> **Contexto:** Redis é usado como backend do **BullMQ** (filas de mensagens do agente comercial) a partir da Phase 07A. Também vai servir futuramente pra cache e eventuais rate limiters.
>
> **Status:** Dev local configurado (2026-04-19). **Coolify pendente** — playbook documentado abaixo pra executar na Phase 12/13 quando começar preparação pra deploy real.

---

## Seção 1 — Dev local (ativa agora)

### Pré-requisitos

- **Docker Desktop** rodando na máquina
- Porta `6379` livre (sem outro Redis rodando localmente)

### Subir

```bash
# Na raiz do repo
pnpm redis:start
```

Equivalente a: `docker compose -f docker-compose.dev.yml up -d redis`

### Verificar saúde

```bash
# Ping
pnpm redis:cli ping
# Output esperado: PONG

# Status do container
docker ps --filter name=vertech-redis-dev
# Output esperado: container up (healthy)

# Ver logs ao vivo
pnpm redis:logs
```

### Testar persistência

```bash
# Salvar valor
pnpm redis:cli SET foo bar
# Output: OK

# Parar container
pnpm redis:stop

# Subir de novo
pnpm redis:start

# Ler valor
pnpm redis:cli GET foo
# Output esperado: bar
```

Se retornar `bar`, persistência AOF está funcionando corretamente. Jobs do BullMQ sobrevivem a restarts.

### Conectar a partir do app

A variável `REDIS_URL` em `.env.local` já aponta pra instância dev:

```env
REDIS_URL="redis://localhost:6379"
```

Código TypeScript conecta via `ioredis`:

```typescript
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // requisito do BullMQ
});
```

### Parar / remover

```bash
# Parar (mantém volume de dados)
pnpm redis:stop

# Remover container + volume (APAGA TUDO — cuidado)
docker compose -f docker-compose.dev.yml down -v
```

### Configuração atual

Definido em `docker-compose.dev.yml`:

| Parâmetro | Valor |
|---|---|
| Imagem | `redis:7-alpine` |
| Nome do container | `vertech-redis-dev` |
| Porta (bind) | `127.0.0.1:6379` — **só localhost**, nunca rede externa |
| Volume | `vertech-redis-data` (nomeado, persistente) |
| Persistência | AOF `everysec` (trade-off entre durabilidade e performance) |
| Memória máx | `512mb` |
| Política memória | `noeviction` (BullMQ requer — não descartar jobs automaticamente) |
| Restart | `unless-stopped` (sobe automático ao reiniciar Docker) |
| Health check | `redis-cli ping` a cada 10s |

### Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Cannot connect to Docker daemon` | Docker Desktop não está rodando | Abrir Docker Desktop |
| `bind: address already in use` | Outro Redis ocupando porta 6379 | `docker ps \| grep 6379` e parar o conflitante |
| `Connection refused` ao conectar do app | Container subiu mas ainda em health check | Aguardar ~10s ou conferir `pnpm redis:logs` |
| BullMQ dá erro `ERR value is not a valid integer` | Versão antiga do Redis | Confirmar `redis:7-alpine` (não `redis:6` ou `redis:5`) |

---

## Seção 2 — Coolify (playbook futuro)

> ⚠️ **NÃO EXECUTAR AGORA.** Este playbook é pra ser seguido quando chegar a fase de preparação pra deploy real — estimado Phase 12/13 ou quando o Vinni sinalizar.
>
> Em 2026-04-19, Vinni decidiu: "deixa redis no coolify só na hora que for configurar coolify mais pro final e agora a gente faz em dev via docker".

### Pré-requisitos pro dia do deploy

- VPS rodando Coolify (self-hosted)
- Domínio configurado
- Acesso admin ao dashboard Coolify

### Passo a passo (estimado 20-30 min)

#### 1. Criar Redis Service no Coolify

No dashboard Coolify:

1. `Projects` → selecionar projeto `vertech-agents`
2. `+ New Resource` → `Service` → `Redis`
3. Configurar:
   - **Name:** `redis`
   - **Image:** `redis:7-alpine`
   - **Port (internal):** `6379`
   - **Public port:** **NÃO marcar** — Redis fica só na rede interna
   - **Volume:** criar volume `redis-data` → mount em `/data`
   - **Health check:** deixar default (Coolify detecta `redis-cli ping`)
   - **Restart policy:** `unless-stopped`

#### 2. Configurar persistência AOF

Em `Environment Variables` do service Redis:
```
REDIS_ARGS=--appendonly yes --appendfsync everysec --maxmemory 1gb --maxmemory-policy noeviction
```

(ou editar diretamente o comando do container pra incluir essas flags)

#### 3. Conectar o app ao Redis

Na aplicação `vertech-agents-web` no Coolify:

1. `Environment Variables`
2. Adicionar:
   ```
   REDIS_URL=redis://redis:6379
   ```
   (onde `redis` é o service name criado no passo 1 — Coolify resolve via DNS interno)
3. **Redeploy** do app

#### 4. Verificar conectividade

```bash
# Via SSH no servidor Coolify
docker exec -it vertech-agents-web sh
wget -O- redis://redis:6379/ping  # ou usar cliente Redis
```

Ou via logs da aplicação: `BullMQ connected to Redis` deve aparecer sem erros.

#### 5. Backup strategy

- **Snapshot AOF:** já habilitado (arquivo em `/data/appendonly.aof` no volume)
- **Backup do volume:** configurar no Coolify `Backups` pra snapshot diário do volume `redis-data`
- **Retenção:** 7 dias mínimo, 30 dias ideal

#### 6. Monitoramento

- Coolify já mostra CPU/RAM do container
- Integração futura: Health Tech Dashboard (Phase 10c) lê `/api/admin/health/redis` e renderiza métricas

### Segurança

- ✅ Redis **nunca** expor porta 6379 publicamente
- ✅ Rede interna Coolify é isolada — só apps do mesmo projeto acessam
- ⚠️ Se precisar de autenticação (multi-tenancy futuro), adicionar flag `--requirepass <senha-forte>` e ajustar `REDIS_URL=redis://:<senha>@redis:6379`

### Migração do dev local pra prod

**Regra:** não migrar dados do dev pra prod. Ambientes isolados. BullMQ jobs de dev são descartáveis — produção começa com fila vazia.

---

## Referências

- [Redis docs oficial](https://redis.io/docs/)
- [BullMQ guide](https://docs.bullmq.io/)
- [Docker Compose reference](https://docs.docker.com/compose/)
- [Coolify Redis service](https://coolify.io/docs/services/redis) *(verificar URL atual na hora do deploy)*

---

*Documento vivo — atualizar conforme phases exigirem Redis pra novos casos de uso (cache, rate limit, session store).*
