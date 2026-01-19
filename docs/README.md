# Documentation Index

## Getting Started
- [SETUP.md](SETUP.md) - Installation and quick start guide

## Architecture
- [ARCHITECTURE.md](ARCHITECTURE.md) - System overview and data flow
- [MEDALLION_ARCHITECTURE.md](MEDALLION_ARCHITECTURE.md) - Layer design and materialization strategy
- [MODELS.md](MODELS.md) - dbt models reference

## Development
- [GIT_WORKFLOW.md](GIT_WORKFLOW.md) - Branch strategy and worktrees
- [MULTI_AGENT_WORKFLOW.md](MULTI_AGENT_WORKFLOW.md) - Multi-agent coordination
- [AUTONOMOUS_AGENT_SETUP.md](AUTONOMOUS_AGENT_SETUP.md) - Claude Code configuration

## Operations
- [CI_CD.md](CI_CD.md) - GitHub Actions workflows
- [DEMOS.md](DEMOS.md) - Educational demo scripts

## Additional Resources
- [CLAUDE_CODE_BEST_PRACTICES.md](CLAUDE_CODE_BEST_PRACTICES.md) - AI-assisted development tips
- [PROJECT_IMPROVEMENT_PLAN.md](PROJECT_IMPROVEMENT_PLAN.md) - Future enhancements

## Quick Links

| Task | Command |
|------|---------|
| Install | `.\setup.ps1` |
| Run pipeline | `cd dlt_pipeline && python nyc_taxi_pipeline.py` |
| Build dbt | `cd dbt_project && dbt build` |
| Run tests | `cd dbt_project && dbt test` |
| Generate docs | `cd dbt_project && dbt docs generate` |
