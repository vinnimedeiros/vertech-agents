# Reference Format Standard — Smith F8

## Formato Padrao

Todas as referencias entre artefatos, context files e entries usam o formato:

```
ref:{tipo}:{caminho}#{ancora}
```

## Tipos

| Tipo | Uso | Exemplo |
|------|-----|---------|
| `context` | Arquivo de contexto do projeto | `ref:context:brand-dna.yaml#archetype` |
| `artifact` | Artefato de fase | `ref:artifact:artifacts/brand/2-positioning.md` |
| `adr` | Architecture Decision Record | `ref:adr:architecture/adr/adr-001-supabase.md` |
| `entry` | Entrada no risk-register | `ref:entry:risk-register.yaml#DBG-3` |
| `bridge` | Contrato de bridge | `ref:bridge:bridges/BRIDGE-brand-to-design.yaml` |
| `template` | Template do artifact system | `ref:template:artifact-system/phase-artifact-tmpl.md` |
| `stage` | Stage no sector map | `ref:stage:brand/2-positioning` |

## Regras

1. Caminhos sao RELATIVOS a `projects/{id}/`
2. Ancora (`#`) e opcional — aponta para campo especifico dentro do arquivo
3. Se o arquivo referenciado nao existe, artefato e marcado como INCOMPLETE
4. Agentes DEVEM resolver refs antes de agir (ler o arquivo linkado)
