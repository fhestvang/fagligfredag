# Git Workflow for Multi-Agent Development

This document describes our git workflow for parallel development using multiple Claude Code agents.

## Architecture Overview

```
fagligfredag/              # Main repository (orchestration, reviews, merging)
├── data/
│   └── nyc_taxi.duckdb    # SHARED DATABASE - all worktrees use this
├── dbt_project/
├── dlt_pipeline/
└── scripts/

fagligfredag-agent1/       # Worktree 1 - persistent workspace for agent
fagligfredag-agent2/       # Worktree 2 - persistent workspace for agent
```

## Current Status

| Location | Branch | Status |
|----------|--------|--------|
| GitHub | `main` | Remote repository |
| fagligfredag/ | `main` | Synced with remote |
| fagligfredag-agent1/ | `feature/agent1-ready` | Local only (ready for work) |
| fagligfredag-agent2/ | `feature/agent2-ready` | Local only (ready for work) |

**Note:** Worktree branches appear on GitHub only after the first push.

## Key Concepts

### Shared Database
All worktrees share a single DuckDB database located at:
```
c:\Users\FrederikHye-Hestvang\fagligfredag\data\nyc_taxi.duckdb
```

**Important:** DuckDB only allows one write connection at a time. Coordinate writes between agents - don't run `dlt pipeline` and `dbt run` simultaneously from different worktrees.

### Persistent Worktrees, Ephemeral Branches
- **Worktrees** are permanent workspaces (don't delete them)
- **Branches** are temporary units of work (deleted after PR merge)

### GitHub Settings
- `deleteBranchOnMerge: true` - Remote branches are auto-deleted after PR merge
- This keeps the repository clean while worktrees remain intact

## Workflows

### Creating a New Worktree (One-Time Setup)

```powershell
# From the main repository
.\scripts\create_worktree.ps1 -Name "agent1" -Branch "feature/initial-work"
```

This creates:
- Directory: `../fagligfredag-agent1/`
- Virtual environment: `.venv/`
- Branch: `feature/initial-work`

### Starting New Work (After PR Merge)

When a PR is merged, the remote branch is deleted. To start new work:

```bash
# In the worktree directory
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/new-task-name
```

### During Development

```bash
# Make changes, then commit
git add .
git commit -m "Description of changes"

# Push to remote (creates branch if it was deleted)
git push -u origin feature/new-task-name
```

### Creating a Pull Request

```bash
# From the worktree
gh pr create --title "Feature: description" --body "Details..."
```

### After PR is Merged

1. The remote branch is automatically deleted by GitHub
2. The local worktree is unaffected
3. Start new work using the "Starting New Work" workflow above

## Best Practices

### Parallel Work Guidelines

| Safe to do in parallel | Requires coordination |
|------------------------|----------------------|
| Edit different files | Run dlt pipeline |
| Read from database | Run dbt (writes to DB) |
| Write tests | Any DB write operation |
| Code review | |

### Branch Naming

Use descriptive prefixes:
- `feature/` - New functionality
- `fix/` - Bug fixes
- `refactor/` - Code improvements
- `docs/` - Documentation updates

Examples:
- `feature/add-green-taxi-support`
- `fix/dbt-schema-naming`
- `refactor/pipeline-error-handling`

### Commit Messages

Keep commits focused and descriptive:
```
Add support for green taxi data ingestion

- Add taxi_type parameter to pipeline
- Update dbt staging model for new columns
- Add tests for green taxi transformations
```

## Troubleshooting

### "Branch already exists" error
```bash
# Delete the local branch and recreate
git branch -D feature/old-branch
git checkout -b feature/old-branch
```

### Worktree out of sync with main
```bash
git fetch origin
git rebase origin/main
# Or if you prefer merge:
git merge origin/main
```

### Database lock error
Another process is writing to the database. Wait for it to complete or check for:
- Running dlt pipeline in another worktree
- Running dbt in another worktree
- Open DuckDB CLI connections

### Check existing worktrees
```bash
# From any repo directory
git worktree list
```

### Remove a worktree (if needed)
```bash
# From main repository
git worktree remove ../fagligfredag-agent1
```

## Quick Reference

| Task | Command |
|------|---------|
| List worktrees | `git worktree list` |
| Sync with main | `git fetch && git rebase origin/main` |
| New branch | `git checkout -b feature/name` |
| Push new branch | `git push -u origin feature/name` |
| Create PR | `gh pr create` |
| Check PR status | `gh pr status` |
