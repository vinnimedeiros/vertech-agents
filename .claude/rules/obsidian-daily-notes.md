---
paths:
  - "daily-notes/**"
  - "framework/daily-notes/**"
---
# Daily Notes Protocol — Obsidian Integration

## Rule (SHOULD — All Agents)

Daily notes sao o diario do projeto. Agentes podem CONSULTAR daily notes para contexto mas NUNCA ESCREVER conteudo reflexivo nelas.

## O que agentes PODEM fazer com daily notes

### Consultar (via CLI)
```bash
# Ler daily note de hoje
obs daily:read

# Buscar em daily notes
obs search query="decisao" path="daily-notes"
```

### Registrar fatos (via CLI)
Agentes podem APPEND fatos objetivos (nao reflexoes):
```bash
# Registrar acao realizada
obs daily:append content="- [@dev] Story 5.3 implementada, status → InProgress"

# Registrar decisao
obs daily:append content="- [@architect] ADR-8 criado: escolha de Supabase para auth"

# Registrar checkpoint
obs daily:append content="- [@checkpoint] Sessao encerrada. Proximos passos: QA gate story 5.3"
```

### Formato do registro

Em modo single-project:
```
- [@{agent}] {acao objetiva}
```

Em modo multi-project:
```
- [@{agent}][{projeto}] {acao objetiva}
```

Exemplos multi-project:
```
- [@dev][clawin] Story CW-3.1 implementada, status → InProgress
- [@architect][i5x] ADR-1 criado: escolha de Supabase para auth
- [@checkpoint][lmas] Sessao encerrada. Proximos passos: QA gate
```

## O que agentes NAO podem fazer

- Escrever reflexoes, opinioes ou insights (isso e do humano)
- Deletar ou modificar conteudo existente de daily notes
- Criar daily notes (o humano cria via Ctrl+N ou template)

## Quando usar daily notes vs checkpoint

| Informacao | Onde registrar |
|-----------|---------------|
| Acao realizada agora | Daily note (append) |
| Status geral do projeto | PROJECT-CHECKPOINT.md |
| Decisao arquitetural | ADR + daily note (registro) |
| Reflexao pessoal | Daily note (humano escreve) |
| Progresso de story | Story file + checkpoint |
