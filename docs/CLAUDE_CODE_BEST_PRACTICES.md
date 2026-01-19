# Claude Code Best Practices Guide

A comprehensive guide for setting up Claude Code projects at scale, synthesized from industry resources and community patterns.

---

## Sources Researched

| Resource | Focus |
|----------|-------|
| [Agent Resources (agr)](https://github.com/kasperjunge/agent-resources) | Package manager for Claude Code skills |
| [Claude Code Templates](https://github.com/davila7/claude-code-templates) | 100+ pre-built templates |
| [OpenCode](https://opencode.ai/) | Open-source alternative with AGENTS.md pattern |
| [Codebuff](https://github.com/CodebuffAI/codebuff) | Multi-agent architecture patterns |
| [Awesome Claude Code Subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | 100+ specialized agents |
| [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code) | Curated skills, hooks, commands |
| [Claude Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) | Technical skill architecture |
| [Anthropic Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) | Official patterns |

---

## Project Structure

### Recommended Layout

```
project/
├── .claude/
│   ├── CLAUDE.md              # Project-wide instructions (always loaded)
│   ├── settings.json          # Shared settings (commit this)
│   ├── settings.local.json    # Personal settings (gitignore)
│   │
│   ├── skills/                # Model-invoked capabilities
│   │   ├── data-modeling/
│   │   │   ├── SKILL.md       # Main skill file
│   │   │   ├── reference.md   # Progressive disclosure
│   │   │   └── scripts/       # Helper scripts
│   │   └── code-review/
│   │       └── SKILL.md
│   │
│   ├── commands/              # User-invoked slash commands
│   │   ├── commit.md          # /commit
│   │   ├── pr.md              # /pr
│   │   └── build.md           # /build
│   │
│   ├── agents/                # Subagents for task delegation
│   │   ├── dbt-runner.md
│   │   ├── data-modeler.md
│   │   └── code-reviewer.md
│   │
│   ├── rules/                 # Domain-specific standards
│   │   ├── dbt-standards.md
│   │   ├── sql-style.md
│   │   └── git-workflow.md
│   │
│   └── hooks/                 # Lifecycle automation
│       ├── pre-commit.ps1
│       └── post-build.ps1
│
├── docs/
│   ├── architecture/          # ADRs, design docs
│   └── guides/                # How-to documentation
│
└── agr.toml                   # Agent Resources dependencies (optional)
```

### Key Directories Explained

| Directory | Purpose | Triggered By |
|-----------|---------|--------------|
| `skills/` | Domain knowledge, auto-applied | Claude matches description |
| `commands/` | Reusable prompts | User types `/command` |
| `agents/` | Task delegation with isolation | Claude or explicit call |
| `rules/` | Standards always in context | Every conversation |
| `hooks/` | Scripts on tool events | Tool lifecycle |

---

## Skills vs Commands vs Agents

### When to Use Each

| Use Case | Mechanism | Example |
|----------|-----------|---------|
| Domain expertise auto-applied | **Skill** | Dimensional modeling knowledge |
| User-triggered workflow | **Command** | `/commit`, `/pr`, `/build` |
| Isolated task execution | **Agent** | Run dbt in separate context |
| Always-on standards | **Rules** | SQL style guide |
| Automated validation | **Hook** | Lint on pre-commit |

### Skills Architecture

Skills are **prompt-based context modifiers**, not executable code. They work through:

1. **Discovery** - Claude loads skill names/descriptions at startup
2. **Activation** - When request matches description, Claude asks to use it
3. **Execution** - Claude follows instructions, loads referenced files

**SKILL.md Structure:**
```yaml
---
name: data-modeling
description: Design dimensional models using Kimball methodology. Use when discussing facts, dimensions, star schemas, or data warehouse design.
allowed-tools: Read, Grep, Glob
---

# Data Modeling

## Instructions
1. Always declare the grain first
2. Use surrogate keys for dimensions
3. Denormalize - no snowflaking

## References
For Kimball's rules, see [reference.md](reference.md)
For dbt patterns, see [dbt-patterns.md](dbt-patterns.md)
```

**Best Practices:**
- Keep SKILL.md under 500 lines
- Use progressive disclosure (link to reference files)
- Write specific descriptions with trigger words
- Only request tools you actually need

### Commands Architecture

Commands are user-invoked via `/command-name`:

```yaml
---
name: build
description: Run full dbt build with seeds, models, and tests
allowed-tools: Bash
---

# Build Command

Run the following sequence:
1. `dbt seed --profiles-dir .`
2. `dbt run --profiles-dir .`
3. `dbt test --profiles-dir .`

Report any failures with file paths and error messages.
```

### Agents Architecture

Agents run in **isolated context windows** for task delegation:

```yaml
---
name: dbt-runner
description: Execute and debug dbt operations
context: fork
agent: general-purpose
skills: dbt-standards
allowed-tools: Bash, Read, Grep
---

# dbt Runner Agent

You are a dbt execution specialist. Your job is to:
1. Run dbt commands
2. Parse errors
3. Suggest fixes

## Context
- Working directory: `dbt_project/`
- Database: DuckDB at `data/nyc_taxi.duckdb`
```

---

## Agent Categories (Scale Pattern)

For enterprise-scale projects, organize agents by domain:

| Category | Agents | Purpose |
|----------|--------|---------|
| **Core Dev** | api-designer, backend-dev, frontend-dev | Primary development |
| **Infrastructure** | devops, kubernetes, database-admin | Platform work |
| **Quality** | code-reviewer, security-auditor, test-engineer | Quality assurance |
| **Data** | data-engineer, data-modeler, ml-engineer | Data/AI work |
| **Meta** | workflow-orchestrator, multi-agent-coordinator | Orchestration |

---

## Configuration Patterns

### CLAUDE.md (Always Loaded)

Keep concise - this loads every conversation:

```markdown
# Project Name

## Tech Stack
- dbt + DuckDB
- Python (dlt)
- Power BI

## Key Directories
- `dbt_project/` - Transformations
- `dlt_pipeline/` - Ingestion
- `data/` - Database

## Standards
- SQL: snake_case, CTEs
- Git: conventional commits
- No emojis

## See Also
- @.claude/rules/dbt-standards.md
- @docs/architecture/
```

### settings.json (Shared)

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(dbt:*)",
      "Bash(python:*)"
    ],
    "deny": [
      "Read(**/.env)",
      "Read(**/secrets.*)"
    ]
  }
}
```

### settings.local.json (Personal, Gitignored)

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "WebFetch",
      "WebSearch"
    ]
  }
}
```

---

## Progressive Disclosure Pattern

Don't dump everything into context. Load on demand:

```
skill/
├── SKILL.md           # Overview, navigation (< 500 lines)
├── reference.md       # Loaded when Claude needs details
├── examples.md        # Loaded for specific examples
├── advanced.md        # Loaded for edge cases
└── scripts/
    └── validate.py    # Executed, not loaded into context
```

In SKILL.md:
```markdown
For complete Kimball rules, see [reference.md](reference.md)
For dbt implementation patterns, see [dbt-patterns.md](dbt-patterns.md)
```

Claude uses `Read` tool to load these only when needed.

---

## Multi-Agent Patterns

### Orchestration Approaches

**1. Sequential Chain**
```
User Request → Planner Agent → Implementation Agent → Review Agent → Done
```

**2. Parallel Execution**
```
User Request → Orchestrator → [Agent A, Agent B, Agent C] → Merge Results
```

**3. Hierarchical**
```
Lead Agent
├── Frontend Agent
├── Backend Agent
└── Database Agent
```

### Context Isolation Benefits

Each subagent maintains independent context:
- Prevents task contamination
- Reduces token consumption
- Enables parallel work
- Granular tool permissions

---

## Hooks for Automation

### Pre-Tool Hooks

Run before a tool executes:

```powershell
# hooks/pre-commit.ps1
# Runs before git commit

# Lint SQL files
dbt compile --profiles-dir dbt_project

# Check for secrets
if (Select-String -Path "*.sql" -Pattern "password|secret|api_key") {
    Write-Error "Potential secrets detected"
    exit 1
}
```

### Post-Tool Hooks

Run after tool completes:

```powershell
# hooks/post-build.ps1
# Runs after dbt build

# Generate docs
dbt docs generate --profiles-dir dbt_project

# Notify
Write-Host "Build complete. Docs regenerated."
```

---

## Package Management (agr)

Use [Agent Resources](https://github.com/kasperjunge/agent-resources) for reusable skills:

### Install Skills
```bash
agr add kasperjunge/dbt-expert
agr add username/data-modeling
```

### Track Dependencies
```toml
# agr.toml
[dependencies]
dbt-expert = "kasperjunge/dbt-expert"
data-modeling = "username/data-modeling"
```

### Sync Team Setup
```bash
agr sync  # Installs all dependencies from agr.toml
```

---

## Testing & Verification

### Agent Loop Pattern

1. **Gather context** - Search, read relevant files
2. **Take action** - Execute task
3. **Verify work** - Run tests, lint, review
4. **Iterate** - Fix issues, repeat

### Verification Methods

| Method | Use For |
|--------|---------|
| Rules-based (linting) | Code style, syntax |
| Test execution | Functional correctness |
| LLM judging | Quality, clarity |
| Screenshots | Visual verification |

---

## Anti-Patterns to Avoid

### Structure Anti-Patterns
1. **Monolithic CLAUDE.md** - Dumping everything in one file
2. **No progressive disclosure** - Loading entire docs into context
3. **Overlapping skills** - Ambiguous descriptions causing conflicts
4. **Hardcoded paths** - Use `{baseDir}` for portability

### Permission Anti-Patterns
1. **Allow all tools** - Request only what's needed
2. **No deny rules** - Always deny sensitive files
3. **Shared local settings** - Keep personal settings gitignored

### Skill Anti-Patterns
1. **Vague descriptions** - "Helps with code" vs specific triggers
2. **Embedded documentation** - Link to reference files instead
3. **No examples** - Always include concrete examples

---

## Checklist: Production-Ready Setup

### Project Structure
- [ ] `.claude/CLAUDE.md` with concise project overview
- [ ] `.claude/settings.json` with shared permissions
- [ ] `.claude/settings.local.json` in `.gitignore`
- [ ] Skills organized in `.claude/skills/`
- [ ] Commands in `.claude/commands/`
- [ ] Agents in `.claude/agents/`
- [ ] Rules in `.claude/rules/`

### Skills
- [ ] Each skill has specific description with trigger words
- [ ] SKILL.md files under 500 lines
- [ ] Progressive disclosure via linked files
- [ ] Only necessary tools in `allowed-tools`

### Security
- [ ] Sensitive files in deny rules
- [ ] No hardcoded secrets
- [ ] API keys via environment variables

### Documentation
- [ ] Architecture decisions documented
- [ ] Skill/command/agent purposes clear
- [ ] Team onboarding guide

### Automation
- [ ] Pre-commit hooks for validation
- [ ] Post-build hooks for notifications
- [ ] agr.toml for dependency tracking

---

## Applying to This Project

### Current State
```
.claude/
├── CLAUDE.md           ✓
├── settings.json       ✓
├── settings.local.json ✓
├── agents/             ✓ (6 agents)
├── commands/           ✓ (11 commands)
├── hooks/              ✓ (2 hooks)
└── rules/              ✓ (3 rules)
```

### Recommended Additions

1. **Convert commands to skills** where auto-invocation makes sense
   - `dimensional-modeller.md` → `skills/dimensional-modeling/SKILL.md`

2. **Add progressive disclosure**
   - Split large command files into SKILL.md + reference.md

3. **Create meta-agents**
   - Workflow orchestrator for complex multi-step tasks
   - Error coordinator for debugging pipelines

4. **Add agr.toml** for sharing skills across projects

5. **Enhance hooks**
   - Pre-build: validate SQL
   - Post-build: update docs
   - Pre-commit: check for secrets

---

## References

- [Claude Code Official Docs](https://code.claude.com/docs)
- [Agent Resources (agr)](https://github.com/kasperjunge/agent-resources)
- [Claude Code Templates](https://github.com/davila7/claude-code-templates)
- [OpenCode](https://opencode.ai/)
- [Codebuff](https://github.com/CodebuffAI/codebuff)
- [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code)
- [Awesome Claude Code Subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- [Claude Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Anthropic Agent SDK Guide](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
