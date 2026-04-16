# Agent Authority — Detailed Rules

## Delegation Matrix

### @devops (Operator) — EXCLUSIVE Authority

| Operation | Exclusive? | Other Agents |
|-----------|-----------|--------------|
| `git push` / `git push --force` | YES | BLOCKED |
| `gh pr create` / `gh pr merge` | YES | BLOCKED |
| MCP add/remove/configure | YES | BLOCKED |
| CI/CD pipeline management | YES | BLOCKED |
| Release management | YES | BLOCKED |

### @pm (Trinity) — Epic Orchestration

| Operation | Exclusive? | Delegated From |
|-----------|-----------|---------------|
| `*execute-epic` | YES | — |
| `*create-epic` | YES | — |
| EPIC-{ID}-EXECUTION.yaml management | YES | — |
| Requirements gathering | YES | — |
| Spec writing (spec pipeline) | YES | — |

### @po (Keymaker) — Story Validation

| Operation | Exclusive? | Details |
|-----------|-----------|---------|
| `*validate-story-draft` | YES | 10-point checklist |
| Story context tracking in epics | YES | — |
| Epic context management | YES | — |
| Backlog prioritization | YES | — |

### @sm (Niobe) — Story Creation

| Operation | Exclusive? | Details |
|-----------|-----------|---------|
| `*draft` / `*create-story` | YES | From epic/PRD |
| Story template selection | YES | — |

### @dev (Neo) — Implementation

| Allowed | Blocked |
|---------|---------|
| `git add`, `git commit`, `git status` | `git push` (delegate to @devops) |
| `git branch`, `git checkout`, `git merge` (local) | `gh pr create/merge` (delegate to @devops) |
| `git stash`, `git diff`, `git log` | MCP management |
| Story file updates (File List, checkboxes) | Story file updates (AC, scope, title) |

### @architect (Architect) — Design Authority

| Owns | Delegates To |
|------|-------------|
| System architecture decisions | — |
| Technology selection | — |
| High-level data architecture | @data-engineer (detailed DDL) |
| Integration patterns | @data-engineer (query optimization) |
| Complexity assessment | — |

### @data-engineer (Dozer) — Database

| Owns (delegated from @architect) | Does NOT Own |
|----------------------------------|-------------|
| Schema design (detailed DDL) | System architecture |
| Query optimization | Application code |
| RLS policies implementation | Git operations |
| Index strategy execution | Frontend/UI |
| Migration planning & execution | — |

### @lmas-master — Framework Governance

| Capability | Details |
|-----------|---------|
| Execute ANY task directly | No restrictions |
| Framework governance | Constitutional enforcement |
| Override agent boundaries | When necessary for framework health |

### @traffic-manager (Merovingian) — Paid Media & Performance (BUSINESS DOMAIN)

| Operation | Exclusive? | Details |
|-----------|-----------|---------|
| `*budget-allocation` | YES | Budget allocation decisions |
| `*campaign-plan` | YES | Campaign planning and strategy |
| `*roi-report` | YES | ROI analysis and reporting |
| `*meta-strategy` | YES | Meta/Instagram Ads strategy |
| `*google-strategy` | YES | Google Ads strategy |
| `*youtube-strategy` | YES | YouTube Ads strategy |
| `*scale-campaign` | YES | Campaign scaling |
| Budget approval > R$1.000 | Shared with @mifune | Mifune approves ROI projection, Merovingian executes |

**Domain:** Migrated from marketing to business in v5.4.0.
**Cross-domain:** Available in marketing for Campaign Pipeline.
**Authority split:** @mifune approves business strategy (ROI, model), Merovingian approves campaign execution (targeting, budget, platform).

### @kamala (Kamala) — Brand Creation (BRAND DOMAIN)

| Operation | Exclusive? | Details |
|-----------|-----------|---------|
| `*create-positioning` | YES | Brand positioning strategy |
| `*generate-names` | YES | Brand naming and evaluation |
| `*map-archetype` | YES | Brand archetype mapping |
| `*build-identity` | YES | Brand identity system |
| `*brand-audit-strategic` | YES | Strategic brand audit |

### @mifune (Mifune) — Business Strategy (BUSINESS DOMAIN)

| Operation | Exclusive? | Details |
|-----------|-----------|---------|
| `*create-offer` | YES | Offer creation and design |
| `*set-pricing` | YES | Pricing strategy |
| `*business-model` | YES | Revenue model architecture |
| `*audit-business` | YES | Business diagnostic |
| Budget approval > R$1.000 | YES | Migrated from @marketing-chief |

### @hamann (Hamann) — Strategic Counsel (BUSINESS DOMAIN)

| Operation | Exclusive? | Details |
|-----------|-----------|---------|
| `*convene-board` | YES | Advisory board sessions |
| `*seek-counsel` | YES | Strategic counsel facilitation |
| Advisory verdicts | YES | Board recommendations |

### @bugs (Bugs) — Storytelling (BRAND DOMAIN)

| Operation | Exclusive? | Details |
|-----------|-----------|---------|
| `*build-narrative` | YES | Brand narrative creation |
| `*write-manifesto` | YES | Movement manifesto |
| Story structure analysis | YES | Narrative arc assessment |

## Cross-Agent Delegation Patterns

### Git Push Flow
```
ANY agent → @devops *push
```

### Schema Design Flow
```
@architect (decides technology) → @data-engineer (implements DDL)
```

### Story Flow
```
@sm *draft → @po *validate → @dev *develop → @qa *qa-gate → @devops *push
```

### Epic Flow
```
@pm *create-epic → @pm *execute-epic → @sm *draft (per story)
```

### Brand Creation Flow
```
@kamala *create-positioning → @kamala *build-identity → @bugs *build-narrative → @ux-design-expert *logo-brief
```

### Business Strategy Flow
```
@hamann *seek-counsel → @mifune *create-offer → @mifune *set-pricing → @traffic-manager *campaign-plan
```

### Offer-to-Market Flow
```
@mifune *create-offer → @kamala *create-positioning → @copywriter *write-landing-copy → @traffic-manager *campaign-plan
```

## Inter-Domain Conflict Resolution

When decisions cross domain boundaries:

1. **brand > marketing** for tone, identity, and visual guidelines — Kamala's brand decisions override Lock's marketing preferences
2. **business > marketing** for budget and ROI decisions — Mifune's business strategy overrides marketing campaign preferences
3. **software-dev > all** for technical viability — Aria's architecture decisions constrain all domains
4. **Conflicts between domain chiefs** → Escalate to @lmas-master (Morpheus mediates)
5. **Cross-domain agents** follow the authority of the domain where they're currently operating

## Escalation Rules

1. Agent cannot complete task → Escalate to @lmas-master
2. Quality gate fails → Return to @dev with specific feedback
3. Constitutional violation detected → BLOCK, require fix before proceed
4. Agent boundary conflict → @lmas-master mediates
5. Inter-domain conflict → Domain hierarchy (brand > marketing, business > marketing, software-dev > all) or @lmas-master
