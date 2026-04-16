---
paths:
  - "daily-notes/**"
  - "docs/**"
  - "framework/**"
  - "inbox/**"
  - "projects/**/stories/**"
---
# Obsidian CLI Usage — Intelligence Layer

## Rule (SHOULD — All Agents)

O Obsidian CLI esta disponivel para consultas rapidas ao vault. Use-o para operacoes que se beneficiam de metadata do Obsidian (backlinks, tags, orphans, properties) em vez de ler arquivos raw.

## Como Executar

O binario esta em:
```bash
"/c/Users/luanf/AppData/Local/Programs/Obsidian/Obsidian.exe" <command> [options]
```

Alias sugerido no bash:
```bash
alias obs='"/c/Users/luanf/AppData/Local/Programs/Obsidian/Obsidian.exe"'
```

## REST API (Preferencial)

A Local REST API roda na porta 27124 quando Obsidian esta aberto:
```bash
curl -s -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" https://localhost:27124/<endpoint>
```

API Key persistida em `~/.bashrc` como `OBSIDIAN_API_KEY`.

## Resolucao de Arquivos (Kepano Spec)

| Parametro | Resolucao | Exemplo |
|-----------|-----------|---------|
| `file=<name>` | Wikilink-style (sem path, sem extensao) | `file="My Note"` |
| `path=<path>` | Path exato a partir da raiz do vault | `path="folder/note.md"` |
| `vault=<name>` | Vault especifico (default: ultimo focado) | `vault="MINHA MATRIX"` |

Sem parametro de arquivo, comandos operam no arquivo ativo.

## Flags Uteis

| Flag | Efeito |
|------|--------|
| `--copy` | Copia resultado para clipboard |
| `silent` | Nao abre o arquivo apos criar/modificar |
| `overwrite` | Sobrescreve se ja existir |
| `total` | Mostra apenas contagem (para listas) |
| `template="X"` | Usa template do Obsidian ao criar |

## Conteudo Multiline

Para conteudo com multiplas linhas, use `\n` para quebras e `\t` para tabs:
```bash
obs create name="Note" content="# Title\n\nParagraph 1\n\n- Item 1\n- Item 2"
```

## Quando Usar CLI vs Read Tool

| Necessidade | Usar CLI | Usar Read Tool |
|-------------|----------|---------------|
| Buscar texto no vault | `search query="X"` | NAO — CLI e mais rapido |
| Ler conteudo de uma nota | NAO — Read e mais completo | `Read file_path` |
| Ver backlinks de uma nota | `backlinks file=X` | NAO — impossivel sem CLI |
| Listar tags | `tags counts sort=count` | NAO — impossivel sem CLI |
| Contar notas orfas | `orphans total` | NAO — impossivel sem CLI |
| Ler/modificar frontmatter | `property:read/set` | Edit tool para mudancas complexas |
| Criar nota rapida | `create name="X" content="Y"` | Write tool para notas longas |
| Adicionar a daily note | `daily:append content="X"` | NAO — CLI e direto |
| Listar tasks | `tasks todo` | Grep para buscas complexas |
| Ver info de arquivo | `file file=X` | Read para conteudo |
| Listar links de saida | `links file=X` | NAO — impossivel sem CLI |
| Links nao resolvidos | `unresolved` | NAO — impossivel sem CLI |

## Comandos Mais Uteis para Agentes

### Context-Load (Rule 1 — Pre-Read)
```bash
# Ver estado geral do vault
obs vault

# Tags mais usadas (entender o projeto)
obs tags counts sort=count

# Notas orfas (gaps de documentacao)
obs orphans total

# Backlinks de um doc (quem referencia isso?)
obs backlinks file="PROJECT-CHECKPOINT"

# Buscar por tema
obs search query="auth" limit=10
```

### Checkpoint Updates
```bash
# Adicionar na daily note
obs daily:append content="- Sessao: implementei story 5.3, status InProgress"

# Ler propriedade de uma nota
obs property:read name="status" file="story-5.3"

# Atualizar propriedade
obs property:set name="status" value="Done" file="story-5.3"
```

### Analise e Qualidade
```bash
# Links quebrados
obs unresolved total

# Dead ends (notas sem links de saida)
obs deadends total

# Outline de uma nota
obs outline file="core-architecture"

# Contar palavras
obs wordcount file="PRD"
```

## Novos Comandos (Obsidian CLI v2+)

### Bases (Database Views Nativas)

```bash
# Criar base file
obsidian create name="dashboard" ext=base content="filters:\n  and:\n    - 'tags contains \"project\"'\nviews:\n  - type: table\n    order:\n      - file.name\n      - status"

# Bases sao .base files — criar via CLI ou Write tool
```

### Plugin Development

```bash
# Recarregar plugin apos mudancas
obsidian plugin:reload id=my-plugin

# Verificar erros do plugin
obsidian dev:errors

# Screenshot programatico
obsidian dev:screenshot path=screenshot.png

# Inspecionar DOM
obsidian dev:dom selector=".workspace-leaf" text

# Inspecionar CSS
obsidian dev:css selector=".workspace-leaf" prop=background-color

# Rodar JavaScript no contexto do app
obsidian eval code="app.vault.getFiles().length"

# Console output (filtrar por nivel)
obsidian dev:console level=error

# Mobile emulation toggle
obsidian dev:mobile on
```

### Operacoes Avancadas

```bash
# Embed de busca (cria search embed na nota)
obsidian search query="tag:#important" limit=20

# Gerenciar tarefas
obsidian tasks daily todo              # Listar todos da daily note
obsidian tasks daily done              # Listar concluidos

# Propriedades em batch
obsidian property:set name="status" value="Done" file="Story-5.3"
obsidian property:read name="status" file="Story-5.3"

# Links de saida de uma nota
obsidian links file="architecture"

# Notas orfas (sem backlinks)
obsidian orphans total

# Links nao resolvidos
obsidian unresolved total
```

## Quando Usar CLI vs Read Tool vs Bases

| Necessidade | Usar CLI | Usar Read | Usar .base |
|-------------|----------|-----------|------------|
| Dashboard de stories por status | NAO | NAO | SIM — .base com filter + table view |
| Ver conteudo de uma nota | NAO | SIM | NAO |
| Buscar texto no vault | SIM | NAO | NAO |
| Agrupar notas por propriedade | NAO | NAO | SIM — .base com groupBy |
| Screenshot do app | SIM | NAO | NAO |
| Debug de plugin | SIM | NAO | NAO |
| Contar palavras | SIM | NAO | NAO |
| Formulas sobre propriedades | NAO | NAO | SIM — .base com formulas |

## Limitacoes

- CLI requer Obsidian aberto (desktop app rodando)
- Busca nao e semantica (apenas texto exato) — para semantica, usar Smart Connections plugin (Fase 4+)
- Nao substitui Read/Write/Edit para manipulacao de conteudo
- Resultados podem ser grandes — usar `limit=N` e `total` para controlar output
