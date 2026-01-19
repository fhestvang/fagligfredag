# Project Improvement Plan

Based on research from industry resources, here's a prioritized plan to make this project a best-practice template for future data engineering projects.

---

## Current State Assessment

### What We Have

| Component | Status | Files |
|-----------|--------|-------|
| CLAUDE.md | Good | Project overview, concise |
| Settings | Good | Shared + local split |
| Agents | 7 files | dbt-runner, data-modeler, dim-modeler, etc. |
| Commands | 11 files | commit, pr, dbt-build, etc. |
| Rules | 3 files | dbt-standards, power-bi, git-workflow |
| Hooks | 2 files | pre-commit, post-build |
| Skills | Missing | Should migrate key commands |

### What's Missing (RESOLVED)

1. ~~**Skills directory**~~ DONE - `.claude/skills/dimensional-modeling/`
2. ~~**Progressive disclosure**~~ DONE - 7 reference files
3. ~~**Meta-agents**~~ DONE - workflow-orchestrator, error-coordinator
4. ~~**agr.toml**~~ DONE - `.claude/agr.toml`
5. ~~**Scripts directory**~~ DONE - `scripts/` with validators

---

## Phase 1: Skills Migration (High Impact)

Convert auto-invocable commands to skills for better UX.

### Priority 1: Dimensional Modeller → Skill

**Why:** This should auto-trigger when discussing data modeling.

```
.claude/skills/dimensional-modeling/
├── SKILL.md                 # Core instructions (< 500 lines)
├── kimball-rules.md         # 10 essential rules
├── fact-patterns.md         # Fact table patterns
├── dimension-patterns.md    # Dimension patterns
├── scd-guide.md             # Slowly changing dimensions
├── dbt-implementation.md    # dbt-specific patterns
└── anti-patterns.md         # What to avoid
```

**SKILL.md frontmatter:**
```yaml
---
name: dimensional-modeling
description: |
  Design dimensional models using Kimball methodology.
  Auto-applies when discussing: facts, dimensions, star schema,
  data warehouse design, grain, surrogate keys, SCDs, bus matrix.
allowed-tools: Read, Grep, Glob, Write, Edit
---
```

### Priority 2: Architecture Review → Skill

```
.claude/skills/architecture-review/
├── SKILL.md
├── medallion-guide.md       # Layer architecture
├── materialization.md       # View vs table decisions
└── checklist.md             # Review checklist
```

### Priority 3: dbt Standards → Skill

```
.claude/skills/dbt-development/
├── SKILL.md
├── naming-conventions.md
├── testing-patterns.md
└── incremental-guide.md
```

---

## Phase 2: Progressive Disclosure

### Split Large Files

| Current File | Lines | Action |
|--------------|-------|--------|
| `dimensional-modeller.md` | 800+ | Split into skill + 6 reference files |
| `data-modeler.md` agent | 200+ | Keep, but link to skill |

### Pattern to Follow

**SKILL.md (navigation hub):**
```markdown
# Dimensional Modeling

## Quick Reference
[Summary tables and key decisions]

## Deep Dives
- For Kimball's 10 rules, see [kimball-rules.md](kimball-rules.md)
- For fact table patterns, see [fact-patterns.md](fact-patterns.md)
- For SCD strategies, see [scd-guide.md](scd-guide.md)
```

Claude loads reference files only when needed, saving context.

---

## Phase 3: Meta-Agents

### Workflow Orchestrator

For complex multi-step tasks:

```yaml
# .claude/agents/workflow-orchestrator.md
---
name: workflow-orchestrator
description: Coordinate complex workflows across multiple agents
context: fork
agent: general-purpose
---

# Workflow Orchestrator

You coordinate complex tasks by delegating to specialized agents.

## Available Agents
- **dbt-runner**: Execute dbt commands
- **data-modeler**: Design dimensional models
- **code-reviewer**: Review code quality

## Workflow Patterns

### Full Data Pipeline
1. Run dlt ingestion
2. Execute dbt build
3. Validate with dbt test
4. Update Power BI model

### New Dimension Request
1. Analyze requirements (data-modeler)
2. Create staging model (dbt-runner)
3. Create dimension model (dbt-runner)
4. Review and test (code-reviewer)
```

### Error Coordinator

For debugging failures:

```yaml
# .claude/agents/error-coordinator.md
---
name: error-coordinator
description: Debug and resolve pipeline errors
context: fork
skills: dbt-development
---

# Error Coordinator

You specialize in debugging data pipeline errors.

## Error Categories
1. **dbt compilation** - SQL syntax, ref errors
2. **dbt runtime** - Data type mismatches, null violations
3. **dlt ingestion** - Schema drift, connection issues
4. **Power BI** - Refresh failures, relationship errors

## Diagnostic Process
1. Parse error message
2. Identify affected component
3. Check logs and recent changes
4. Propose fix with confidence level
```

---

## Phase 4: Scripts & Automation

### Add Scripts Directory

```
.claude/skills/dimensional-modeling/scripts/
├── validate_grain.py       # Validate fact table grain
├── check_surrogate_keys.py # Verify key patterns
└── generate_bus_matrix.py  # Auto-generate bus matrix
```

### Enhance Hooks

**Pre-build validation:**
```powershell
# hooks/pre-build.ps1
# Validate SQL before build

$errors = @()

# Check for hardcoded dates
$files = Get-ChildItem -Path "dbt_project/models" -Filter "*.sql" -Recurse
foreach ($file in $files) {
    if (Select-String -Path $file -Pattern "'\d{4}-\d{2}-\d{2}'") {
        $errors += "Hardcoded date in $($file.Name)"
    }
}

if ($errors.Count -gt 0) {
    Write-Error ($errors -join "`n")
    exit 1
}
```

**Post-test reporting:**
```powershell
# hooks/post-test.ps1
# Generate test summary after dbt test

$results = Get-Content "dbt_project/target/run_results.json" | ConvertFrom-Json
$passed = ($results.results | Where-Object { $_.status -eq "pass" }).Count
$failed = ($results.results | Where-Object { $_.status -eq "fail" }).Count

Write-Host "Tests: $passed passed, $failed failed"
```

---

## Phase 5: Portability & Sharing

### Add agr.toml

```toml
# agr.toml - Agent Resources dependencies
[project]
name = "nyc-taxi-analytics"
version = "1.0.0"

[dependencies]
# Core skills (to be published)
dimensional-modeling = "fhestvang/dimensional-modeling"
dbt-development = "fhestvang/dbt-development"

# Community skills
# sql-formatter = "community/sql-formatter"
```

### Publish Reusable Skills

After refining, publish skills for reuse:
```bash
# Create skill package
agr init skill dimensional-modeling

# Share via GitHub
# Push to fhestvang/agent-resources repo
```

---

## Implementation Order

| Phase | Effort | Impact | Priority | Status |
|-------|--------|--------|----------|--------|
| 1. Skills Migration | Medium | High | Do First | COMPLETE |
| 2. Progressive Disclosure | Low | Medium | Do Second | COMPLETE |
| 3. Meta-Agents | Medium | Medium | Do Third | COMPLETE |
| 4. Scripts & Automation | Low | Medium | Do Fourth | COMPLETE |
| 5. Portability | Low | High | Do Last | COMPLETE |

---

## All Phases Complete

### Phase 1: Skills Migration
```
.claude/skills/dimensional-modeling/
├── SKILL.md              # Hub file (<100 lines)
├── kimball-rules.md      # 10 essential rules
├── fact-patterns.md      # Transaction, periodic, accumulating
├── dimension-patterns.md # Standard, degenerate, junk, etc.
├── scd-patterns.md       # SCD Types 0-7
├── layer-architecture.md # Layers + materialization
├── anti-patterns.md      # What to avoid
└── scripts/
    └── generate_bus_matrix.py
```

### Phase 2: Progressive Disclosure
- Converted 800+ line command to skill with progressive disclosure
- SKILL.md serves as navigation hub, loads references on demand
- Auto-triggers on: star schema, facts, dimensions, grain, surrogate keys, SCDs, bus matrix, Kimball patterns

### Phase 3: Meta-Agents
- `workflow-orchestrator.md` - Coordinates multi-step workflows
- `error-coordinator.md` - Diagnoses and resolves pipeline errors

### Phase 4: Scripts & Automation
- `scripts/validate_dbt_model.py` - Validates dbt model conventions
- `scripts/bootstrap_project.ps1` - Creates new project from template
- `scripts/generate_bus_matrix.py` - Generates dimensional bus matrix

### Phase 5: Portability
- `.claude/agr.toml` - Agent Resources package manifest
- Documents all skills, commands, agents, rules, scripts

---

## Success Criteria

### Template Quality
- [x] New project can be bootstrapped in < 5 minutes (bootstrap_project.ps1)
- [x] All skills auto-trigger appropriately
- [x] Progressive disclosure keeps context lean
- [x] Agents handle common workflows autonomously

### Documentation
- [x] Each skill/agent has clear purpose documented
- [x] Reference files provide deep knowledge on demand
- [x] Anti-patterns documented to prevent mistakes

### Automation
- [x] Hooks validate before dangerous operations
- [x] Scripts available for common tasks
- [x] Error messages are actionable

---

## Future Enhancements

1. **Add architecture-review skill** - Auto-trigger on architecture discussions
2. **Add dbt-development skill** - Auto-trigger on dbt model discussions
3. **Add Power BI skill** - Auto-trigger on semantic model discussions
4. **Test cross-project portability** - Validate agr.toml with agent-resources
