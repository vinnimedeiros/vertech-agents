---
paths:
  - "docs/**"
  - "framework/**"
  - "inbox/**"
  - "dashboards/**"
  - "projects/**/stories/**"
  - "projects/**/prd/**"
  - "projects/**/architecture/**"
---
# Obsidian Format Guard — Agentes Obsidian-Aware

## Rule (MUST — All Agents)

Todos os artefatos Markdown criados por agentes DEVEM seguir o formato Obsidian para aparecerem corretamente no vault.

## Frontmatter Obrigatorio

Todo arquivo `.md` criado em `docs/`, `inbox/`, `dashboards/`, `framework/` DEVE ter frontmatter YAML:

```yaml
---
type: {tipo}        # OBRIGATORIO: story|adr|prd|guide|dashboard|agent|squad|workflow|moc|checkpoint
title: "{titulo}"   # OBRIGATORIO: titulo descritivo
project: {id}       # OBRIGATORIO em projects/: lmas|clawin|i5x (omitir em framework/)
tags:                # OBRIGATORIO: pelo menos 1 tag
  - project/{id}    # Tag de projeto (em artefatos dentro de projects/)
  - {tag1}
---
```

**Campo `project`:** Obrigatorio para artefatos dentro de `projects/`. Opcional para artefatos em `framework/`, `dashboards/`, `docs/` (globais). A tag `project/{id}` permite queries cross-project via Dataview.

### Frontmatter por Tipo

| Tipo | Campos obrigatorios | Campos opcionais |
|------|-------------------|-----------------|
| **story** | type, id, title, status, epic, tags | priority, agent, branch, created, completed |
| **adr** | type, id, title, status, date, tags | decision, supersedes, impacts, author |
| **prd** | type, title, version, status, tags | author, audience |
| **dashboard** | type, title, tags | - |
| **agent** | type, id, persona, domain, tags | icon |
| **squad** | type, id, tags | agents (count) |
| **workflow** | type, id, tags | - |

### Status validos para stories
`Draft` | `Ready` | `InProgress` | `InReview` | `Done`

### Status validos para ADRs
`proposed` | `accepted` | `deprecated` | `superseded`

## Links entre Notas

### Formato primario: Markdown links padrao
```markdown
Conforme decidido no [ADR-7](../architecture/adr/adr-auth.md)...
```

### Formato complementar: Wikilinks (para graph view)
```markdown
Conforme decidido no [[adr-auth|ADR-7]]...
```

**Regra:** Sempre usar texto legivel. O conteudo DEVE fazer sentido sem o Obsidian — lido no terminal, GitHub, ou qualquer editor.

## Daily Notes — Zona Sagrada

Agentes podem LER arquivos em `daily-notes/` mas NUNCA ESCREVER neles. Daily notes sao exclusivas do humano.

## Inbox

Notas rapidas criadas por agentes que nao tem destino claro devem ir para `inbox/`. O usuario ou Morpheus categoriza depois.

## Checkpoint

Ao atualizar `docs/PROJECT-CHECKPOINT.md`, incluir frontmatter:
```yaml
---
type: checkpoint
last_updated: {data}
active_story: "{id}"
active_agent: {agent}
---
```

## Canvas

Ao iniciar um workflow, verificar se existe canvas correspondente em `canvas/`. Se nao existir, o agente pode criar um `.canvas` (JSON Canvas) como referencia visual estatica.

## Embeds

Prefixar qualquer wikilink com `!` para embutir conteudo inline:

```markdown
![[Nota]]                              Embutir nota inteira
![[Nota#Heading]]                      Embutir secao especifica
![[imagem.png]]                        Embutir imagem
![[imagem.png|300]]                    Embutir imagem com largura
![[documento.pdf#page=3]]              Embutir pagina de PDF
![[audio.mp3]]                         Embutir audio
![[video.mp4]]                         Embutir video
```

Agentes DEVEM usar embeds para referenciar artefatos visuais (diagramas, screenshots, logos) em vez de descrever textualmente.

## Callouts

Usar callouts para destacar informacao importante:

```markdown
> [!note]
> Informacao neutra.

> [!warning] Titulo customizado
> Alerta com titulo.

> [!tip]- Colapsado por padrao
> Callout colapsavel (- fechado, + aberto).
```

Tipos comuns: `note`, `tip`, `warning`, `info`, `example`, `quote`, `bug`, `danger`, `success`, `failure`, `question`, `abstract`, `todo`.

Agentes DEVEM usar callouts para: decisoes importantes (`> [!decision]`), riscos (`> [!warning]`), proximos passos (`> [!todo]`), exemplos (`> [!example]`).

## Block References

Adicionar ID a qualquer paragrafo para referencia direta:

```markdown
Este paragrafo pode ser linkado. ^meu-block-id

[[Nota#^meu-block-id]]                 Link para block especifico
![[Nota#^meu-block-id]]                Embed de block especifico
```

Para listas e quotes, colocar o block ID numa linha separada apos o bloco.

## Tags Aninhadas

Tags suportam hierarquia via `/`:

```markdown
#project/lmas                          Tag aninhada
#status/in-progress                    Tag com hierarquia
#domain/brand/positioning              Multiplos niveis
```

Agentes DEVEM usar tags aninhadas em vez de tags planas quando ha hierarquia natural (ex: `#project/lmas` em vez de `#lmas`).

## Aliases e cssclasses

Aliases permitem nomes alternativos para link suggestions:

```yaml
---
aliases:
  - Nome Alternativo
  - Abreviacao
cssclasses:
  - wide-page
  - no-inline-title
---
```

## Obsidian Bases (.base files)

Bases sao database views NATIVAS do Obsidian (substitui Dataview):

```yaml
# arquivo: dashboard.base
filters:
  and:
    - 'tags contains "project/lmas"'
    - 'type == "story"'
formulas:
  days_open: '(now() - created).days'
views:
  - type: table
    name: "Stories Ativas"
    order:
      - file.name
      - status
      - formula.days_open
    groupBy:
      property: status
      direction: ASC
```

Tipos de view: `table`, `cards`, `list`, `map`.

Agentes PODEM criar `.base` files para dashboards em vez de depender de Dataview queries.

## JSON Canvas (.canvas files)

Canvas seguem a spec JSON Canvas 1.0:

```json
{
  "nodes": [
    {
      "id": "abc123def456",
      "type": "text",
      "x": 0, "y": 0,
      "width": 400, "height": 200,
      "text": "# Conteudo da nota"
    },
    {
      "id": "xyz789ghi012",
      "type": "file",
      "x": 500, "y": 0,
      "width": 400, "height": 200,
      "file": "path/to/note.md"
    }
  ],
  "edges": [
    {
      "id": "edge001",
      "fromNode": "abc123def456",
      "toNode": "xyz789ghi012",
      "label": "depende de"
    }
  ]
}
```

Tipos de node: `text` (markdown), `file` (nota), `link` (URL), `group` (agrupamento).
IDs DEVEM ser hex de 16 caracteres, unicos.
Posicoes em pixels — deixar 50-100px de espaco entre nodes.

## Obrigatoriedade

Esta rule e MUST para todos os agentes. Artefatos sem frontmatter sao considerados incompletos.
