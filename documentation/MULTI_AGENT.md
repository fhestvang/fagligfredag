# Multi-Agent Development with Git Worktrees

This guide explains how to run multiple Claude Code instances (or developers) working on different branches simultaneously.

## Overview

Git worktrees allow multiple branches to be checked out at the same time in separate directories. Each worktree gets:
- Its own branch checkout
- Isolated virtual environment
- Separate database file (DuckDB only allows one connection)
- Independent build artifacts

## Quick Start

### Create a New Worktree

```powershell
# From the main repo directory
.\scripts\create_worktree.ps1 -Name "feature-api" -Branch "feature/api-endpoints"
```

This creates:
```
C:\Users\...\fagligfredag-feature-api\
├── .venv\              # Isolated Python environment
├── data\
│   └── nyc_taxi.duckdb # Copy of database
├── dbt_project\
├── dlt_pipeline\
└── ...
```

### Work in the Worktree

```powershell
cd ..\fagligfredag-feature-api
.\.venv\Scripts\Activate.ps1

# Run dlt pipeline
python dlt_pipeline\nyc_taxi_pipeline.py

# Run dbt
cd dbt_project
python -c "from dbt.cli.main import cli; cli()" run
```

### Remove a Worktree

```powershell
# From the main repo
.\scripts\remove_worktree.ps1 -Name "feature-api"

# Force remove (discards uncommitted changes)
.\scripts\remove_worktree.ps1 -Name "feature-api" -Force
```

## Workflow Example

### Scenario: Two agents working in parallel

**Agent 1** works on API endpoints:
```powershell
.\scripts\create_worktree.ps1 -Name "api" -Branch "feature/api-endpoints"
cd ..\fagligfredag-api
# ... make changes, commit, push, create PR
```

**Agent 2** works on tests:
```powershell
.\scripts\create_worktree.ps1 -Name "tests" -Branch "feature/add-tests"
cd ..\fagligfredag-tests
# ... make changes, commit, push, create PR
```

Both can run pipelines simultaneously without database lock conflicts.

## Directory Structure

```
Parent Directory\
├── fagligfredag\                    # Main worktree (main branch)
│   ├── .git\                        # Shared git repository
│   ├── .venv\
│   └── data\nyc_taxi.duckdb
│
├── fagligfredag-feature-api\        # Worktree 1
│   ├── .venv\                       # Own environment
│   └── data\nyc_taxi.duckdb         # Own database
│
└── fagligfredag-feature-tests\      # Worktree 2
    ├── .venv\                       # Own environment
    └── data\nyc_taxi.duckdb         # Own database
```

## Key Isolation Points

| Component | Isolated? | Notes |
|-----------|-----------|-------|
| Git branch | Yes | Each worktree has its own branch |
| Virtual environment | Yes | Created per worktree |
| DuckDB database | Yes | Copied on worktree creation |
| dbt target/ | Yes | Build artifacts are local |
| dlt pipelines | Yes | Pipeline state is local |
| Source code | Shared | Changes tracked by git |

## Commands Reference

### List All Worktrees
```powershell
git worktree list
```

### Manual Worktree Creation
```powershell
# Create with existing branch
git worktree add ..\fagligfredag-mybranch mybranch

# Create with new branch
git worktree add -b feature/new ..\fagligfredag-new
```

### Manual Cleanup
```powershell
git worktree remove ..\fagligfredag-mybranch
git worktree prune  # Clean stale references
```

## Environment Variables

The dlt pipeline supports `DUCKDB_PATH` environment variable to override the database location:

```powershell
$env:DUCKDB_PATH = "C:\custom\path\mydb.duckdb"
python dlt_pipeline\nyc_taxi_pipeline.py
```

## Best Practices

1. **Commit frequently** - Worktrees share the git repository, so commits are visible across all
2. **Use descriptive names** - Name worktrees after the feature/branch
3. **Clean up when done** - Remove worktrees after merging PRs
4. **Don't share databases** - Each worktree should have its own DuckDB file
5. **Coordinate on shared branches** - If two agents work on the same branch, use separate worktrees and pull/push frequently
