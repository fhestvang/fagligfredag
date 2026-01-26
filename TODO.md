# Project TODO

Priority task list for NYC Taxi Analytics Platform.

---

## Active

Tasks currently in progress.

| Priority | Task | Owner | Status |
|----------|------|-------|--------|
| - | - | - | - |

---

## Backlog

### High Priority

- [ ] **Sync worktrees** - Align agent1/agent2 with main (14+ commits behind)
- [ ] **CI/CD foundation** - Basic dbt build + test on PR
- [ ] **Docker dev environment** - Pre-built image with dlt + dbt

### Medium Priority

- [ ] **Job queue** - Serialize database write operations
- [ ] **State persistence** - SQLite for task tracking
- [ ] **Plan preview** - Show agent intent before code generation
- [ ] **Request templates** - Standard formats for common tasks

### Low Priority

- [ ] **Slack integration** - Bot for natural language requests
- [ ] **Metadata graph** - Model lineage for fast context lookup
- [ ] **Pattern memory** - Learn from merged PRs
- [ ] **Multi-agent delegation** - Specialized sub-agents

### Slide Creator Skill

- [ ] **MVP** - python-pptx wrapper with 3 layouts (title, content, chart)
- [ ] **CLI skill** - `/slides create` command
- [ ] **Template library** - 5+ layouts with brand config
- [ ] **Data binding** - `{{query:...}}` and `{{dbt:...}}` syntax
- [ ] **dbt integration** - Pull data from models directly
- [ ] **Chart rendering** - Auto-generate charts from data
- [ ] **MCP server** - Granular slide operations (Phase 4)

---

## Completed

- [x] Initial CI/CD planning document (archived: docs/archive/PLANNING_CICD_v1.md)
- [x] Persona review of CI/CD plan
- [x] Slide creator skill planning (docs/PLANNING_SLIDE_CREATOR.md)

---

## Notes

- Planning doc archived at: `docs/archive/PLANNING_CICD_v1.md`
- Key insight from personas: Failure handling must be Day 1, not Phase 3
- DuckDB single-writer lock is a blocking constraint for parallel agents
