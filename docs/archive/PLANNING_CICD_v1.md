# Planning: AI-Driven CI/CD Workflow

## Vision

Natural language requests → automated code changes → validated deployments → production dashboards.

**Target**: ~20 minutes from idea to production (inspired by Pyne's internal workflow).

## Current State

```
Manual Request → Manual Code → Manual PR → CI Validates → Manual Deploy
     ↓
  Hours/Days
```

## Target State

```
Slack/Chat Request
       ↓
   AI Agent (Claude Code)
   ├── Understands: dlt → dbt → Power BI
   ├── Traces: dashboard → model → source
   └── Full context awareness
       ↓
   Docker Container
   ├── Writes code
   ├── Runs tests
   └── Validates changes
       ↓
   Auto PR Creation
       ↓
   CI/CD Pipeline
   ├── dbt build
   ├── Data quality tests
   └── Power BI validation
       ↓
   Auto-merge (if green)
       ↓
   Production Deploy
       ↓
   ~20 minutes total
```

---

## Architecture Components

### 1. Request Layer (Slack Integration)

**Options to explore:**
- Slack bot with Claude API
- Microsoft Teams webhook (since we use Power BI)
- Custom web interface
- GitHub Issues → trigger workflow

**Request format:**
```
@analytics-bot Add a metric for average trip duration by payment type
```

**Agent parses:**
- Intent: New measure
- Domain: trips + payment
- Affected layers: dbt model? Power BI measure? Both?

---

### 2. Agent Layer (Claude Code + Worktrees)

**Current assets:**
- Git worktrees (`fagligfredag-agent1`, `fagligfredag-agent2`)
- Claude Code with MCP tools
- Full codebase context via CLAUDE.md

**Needed:**
- [ ] Agent orchestration script
- [ ] Request → task mapping
- [ ] Context injection (relevant models, schemas)
- [ ] Worktree assignment logic

**Workflow:**
```python
# Pseudocode
def handle_request(request: str):
    # 1. Parse intent
    intent = parse_request(request)

    # 2. Gather context
    context = get_relevant_context(intent)
    # - Related dbt models
    # - Power BI measures
    # - Source schemas

    # 3. Assign worktree
    worktree = get_available_worktree()

    # 4. Execute in container
    result = run_in_docker(
        worktree=worktree,
        task=intent,
        context=context
    )

    # 5. Create PR if successful
    if result.tests_passed:
        create_pr(worktree, intent)
```

---

### 3. Execution Layer (Docker)

**Why Docker:**
- Isolated environment
- Reproducible builds
- Safe to run AI-generated code
- Easy cleanup

**Container requirements:**
```dockerfile
# Conceptual Dockerfile
FROM python:3.11-slim

# dbt + dlt
RUN pip install dbt-duckdb dlt[duckdb]

# Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Mount points
VOLUME /repo      # Git worktree
VOLUME /data      # Shared DuckDB (read-only for safety?)

# Entrypoint runs agent task
ENTRYPOINT ["python", "run_task.py"]
```

**Safety considerations:**
- [ ] Read-only database access during planning
- [ ] Write access only after test pass
- [ ] Timeout limits
- [ ] Resource constraints

---

### 4. Validation Layer (CI/CD)

**Current CI (GitHub Actions):**
- `.github/workflows/dlt-ci.yml` - Pipeline validation
- `.github/workflows/dbt-ci.yml` - Model testing (to add)

**Validation stages:**

```yaml
# Conceptual workflow
stages:
  - lint:
      - sqlfluff (dbt)
      - ruff (Python)

  - build:
      - dbt deps
      - dbt build --select state:modified+

  - test:
      - dbt test
      - Data quality checks
      - Row count validation

  - validate-bi:
      - Power BI model validation (via MCP)
      - DAX syntax check
      - Relationship integrity

  - deploy:
      - Only on main
      - Auto-merge if all green
```

---

### 5. Power BI Integration (MCP)

**Current capability:**
- MCP server connected to Power BI Desktop/Fabric
- Can read/write measures, columns, relationships

**Automation opportunities:**
- [ ] Create measures from natural language
- [ ] Update dimension attributes
- [ ] Validate model after dbt changes
- [ ] Sync metadata between dbt and Power BI

**Example flow:**
```
Request: "Add average fare per mile metric"
    ↓
Agent determines:
  - dbt: No change needed (columns exist)
  - Power BI: New measure needed
    ↓
Agent creates via MCP:
  DIVIDE([Total Fare Amount], [Total Trip Distance])
    ↓
CI validates:
  - DAX syntax ✓
  - References valid ✓
  - No circular deps ✓
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Docker development environment
- [ ] Basic CI/CD for dbt (`dbt build` on PR)
- [ ] Worktree automation scripts
- [ ] Agent task runner skeleton

### Phase 2: Agent Integration (Week 3-4)
- [ ] Claude Code API integration
- [ ] Request parsing logic
- [ ] Context gathering (model lineage)
- [ ] PR auto-creation

### Phase 3: Validation (Week 5-6)
- [ ] Full test suite in CI
- [ ] Power BI validation via MCP
- [ ] Auto-merge rules
- [ ] Rollback capability

### Phase 4: Request Interface (Week 7-8)
- [ ] Slack/Teams bot
- [ ] Request templates
- [ ] Status notifications
- [ ] Feedback loop

---

## Key Decisions Needed

### 1. Request Interface
| Option | Pros | Cons |
|--------|------|------|
| Slack | Familiar, mobile | Requires bot setup |
| GitHub Issues | Native to workflow | Less conversational |
| Custom UI | Full control | More to build |

### 2. Execution Environment
| Option | Pros | Cons |
|--------|------|------|
| Docker local | Fast, simple | Resource limits |
| GitHub Actions | Scalable, managed | Slower startup |
| Cloud container | Flexible | Cost, complexity |

### 3. Database Access
| Option | Pros | Cons |
|--------|------|------|
| Shared DuckDB | Simple | Write conflicts |
| Copy per task | Isolated | Storage, sync |
| Read replica | Safe reads | Complexity |

### 4. Auto-merge Policy
| Option | When |
|--------|------|
| Always | All tests pass |
| Review required | Schema changes |
| Manual only | Production data |

---

## Success Criteria

1. **Time to production**: < 30 minutes for simple changes
2. **Success rate**: > 80% of requests complete without intervention
3. **Safety**: Zero breaking changes to production
4. **Traceability**: Full audit trail from request to deploy

---

## Open Questions

1. How do we handle requests that span multiple domains (dbt + Power BI)?
2. What's the rollback strategy for bad deployments?
3. How do we train the agent on our specific patterns?
4. Should we start with dbt-only or include Power BI from day 1?
5. How do we handle concurrent requests to the same models?

---

## Next Steps

1. Review this plan together
2. Prioritize Phase 1 tasks
3. Set up Docker development environment
4. Create first automated dbt CI workflow

---

---

## Persona Reviews

Five perspectives critically examining this plan before execution.

---

### 1. The Pragmatic Engineer (Maya)

**Background**: 10 years in data infrastructure, seen many "automation" projects fail.

**Critique**:

> "Your plan has a critical gap: **failure modes**. What happens when the AI writes broken code? You mention 'rollback capability' as a Phase 3 checkbox, but that should be Day 1.
>
> Specific concerns:
> - **DuckDB single-writer lock**: Your shared database will be a bottleneck. Two agents can't run `dbt build` simultaneously. You need a queue or copy-on-write strategy from the start.
> - **20-minute target is fantasy** for anything touching schema changes. dbt build alone can take 5+ minutes on larger models.
> - **Docker startup overhead**: Cold container spin-up + dependency install = 2-3 minutes before any work begins. Pre-built images are essential.
>
> **What's missing**: Circuit breakers. If 3 PRs fail in a row, stop auto-generating until a human investigates."

**Recommendations**:
- [ ] Add failure handling to Phase 1, not Phase 3
- [ ] Implement job queue for database writes
- [ ] Pre-build Docker images with all dependencies
- [ ] Add circuit breaker pattern for repeated failures

---

### 2. The Systems Architect (David)

**Background**: Designs distributed systems, obsessed with decoupling and boundaries.

**Critique**:

> "You're building a monolith disguised as automation. Everything flows through one agent, one database, one repo. This won't scale.
>
> **Architectural red flags**:
> - No clear **contract** between layers. What's the API between 'Request Parser' and 'Agent'? JSON schema? Natural language?
> - **Tight coupling** between dbt and Power BI validation. What if Power BI is down? Does everything stop?
> - **State management** is undefined. Where does the agent store 'I'm working on task X'? What if it crashes mid-task?
>
> Your 'context gathering' step is hand-wavy. How does the agent know which models are relevant? You need a **metadata layer** - a lightweight graph of model dependencies that can be queried without loading everything.
>
> **The real question**: Is this one system or three?
> 1. Request orchestration
> 2. Code generation
> 3. Validation/deployment
>
> They should be separable."

**Recommendations**:
- [ ] Define explicit interfaces between components
- [ ] Add state persistence (Redis? SQLite?)
- [ ] Build metadata/lineage graph as separate service
- [ ] Design for partial failures (Power BI down shouldn't block dbt)

---

### 3. The Futurist (Aisha)

**Background**: AI/ML researcher, thinks in 3-5 year horizons.

**Critique**:

> "You're automating today's workflow. But the workflow itself is about to change.
>
> **Trends you're ignoring**:
> - **Semantic layers** are eating the BI space. In 2 years, will you even need Power BI measures? Or will dbt Semantic Layer + AI query directly?
> - **Multi-modal AI**: Why Slack text? Voice requests, screenshot annotations, even video walkthroughs of 'make it look like this' are coming.
> - **Agent-to-agent**: Your agent works alone. What about an agent that delegates to specialized sub-agents (dbt-agent, bi-agent, test-agent)?
>
> Your plan treats AI as a tool. But soon, AI will be the **primary developer**, with humans as reviewers. Your CI/CD should be designed for that inversion.
>
> **What you should prototype**: A feedback loop where the agent learns from merged PRs. 'Last time you asked for X, we did Y' - pattern memory."

**Recommendations**:
- [ ] Abstract the BI layer (don't hard-code Power BI assumptions)
- [ ] Design request interface to support future modalities
- [ ] Consider multi-agent architecture from the start
- [ ] Add learning/memory component for pattern recognition

---

### 4. The Developer Experience Advocate (Sam)

**Background**: Frontend engineer turned DevRel, obsessed with DX and onboarding.

**Critique**:

> "I read your plan as a new team member. I have no idea how to:
> - Submit a request
> - Know if my request is feasible
> - Debug when something fails
> - Override the automation when I need manual control
>
> **DX gaps**:
> - No **request templates**. 'Add a metric' vs 'change a join' vs 'fix a bug' need different flows.
> - No **status visibility**. Where do I see 'your request is at step 3 of 5'?
> - No **escape hatch**. What if I want to manually edit the AI's PR before merge?
> - No **examples**. Show me 5 real requests and their outcomes.
>
> Your 'Success Criteria' is all system metrics. Where's 'developer satisfaction'? 'Time saved per request'?
>
> **The killer feature you're missing**: Preview. Before the agent writes code, show me what it *plans* to do and let me approve/modify."

**Recommendations**:
- [ ] Create request templates with examples
- [ ] Build status dashboard (or Slack thread updates)
- [ ] Add 'plan preview' step before code generation
- [ ] Define escape hatches for manual intervention
- [ ] Track developer satisfaction, not just system metrics

---

### 5. The Security/Ops Skeptic (Jordan)

**Background**: SRE with security focus, assumes everything will be exploited or fail.

**Critique**:

> "Your plan lets an AI write code that auto-deploys to production. I have concerns.
>
> **Security holes**:
> - **Prompt injection**: 'Add a metric' could contain malicious instructions. How do you sanitize requests?
> - **Credential exposure**: Docker containers need database access. Where are credentials stored? How are they rotated?
> - **Audit trail**: Who approved what? Your plan says 'auto-merge if green' - that's zero human accountability.
>
> **Operational gaps**:
> - No **rate limiting**. What stops someone from flooding the system with requests?
> - No **resource quotas**. A bad query could consume all compute.
> - No **secrets management**. Your Dockerfile shows volumes but no secrets strategy.
> - No **monitoring/alerting**. How do you know the system is healthy?
>
> **The question that keeps me up**: What's the blast radius of a bad auto-merge? One dashboard? All dashboards? Production data corrupted?"

**Recommendations**:
- [ ] Add input sanitization/validation layer
- [ ] Implement proper secrets management (Vault, env injection)
- [ ] Require human approval for schema changes (not just tests passing)
- [ ] Add rate limiting and resource quotas
- [ ] Define blast radius and containment strategies
- [ ] Build monitoring dashboard with alerts

---

## Consolidated Improvements

Based on persona feedback, priority additions to the plan:

### Must-Have (Phase 1)
1. **Failure handling** - Circuit breakers, rollback from Day 1
2. **Job queue** - Serialize database writes
3. **State persistence** - Track task progress
4. **Input validation** - Sanitize requests before agent processing

### Should-Have (Phase 2)
5. **Plan preview** - Show intent before generating code
6. **Status visibility** - Real-time progress in Slack
7. **Escape hatches** - Manual override capabilities
8. **Human approval gates** - Required for schema changes

### Nice-to-Have (Phase 3+)
9. **Metadata graph** - Fast lineage queries
10. **Multi-agent delegation** - Specialized sub-agents
11. **Pattern memory** - Learn from merged PRs
12. **Multi-modal input** - Beyond text requests

---

## Revised Phase 1 Checklist

Based on persona feedback:

- [ ] Docker environment with **pre-built images**
- [ ] CI/CD for dbt with **rollback capability**
- [ ] **Job queue** for serializing database operations
- [ ] **State store** (SQLite) for task tracking
- [ ] **Input validation** layer
- [ ] **Circuit breaker** for repeated failures
- [ ] Basic **monitoring** (logs, error rates)
- [ ] Worktree automation scripts
- [ ] Agent task runner with **failure handling**

---

## References

- Pyne's Slack → Production workflow (inspiration)
- [dbt CI/CD best practices](https://docs.getdbt.com/docs/deploy/continuous-integration)
- Current project: [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)
