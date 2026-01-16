# Project Instructions for Claude Code

## Core Principles

- Never use emojis in code, commits, or documentation
- Be concise - engineers scan, they don't read novels
- Prefer examples over explanations
- Front-load critical information

## Commit Style

- Use conventional commits: `type(scope): subject`
- Imperative mood ("Add feature" not "Added feature")
- No Co-Authored-By lines unless explicitly requested
- Keep messages under 72 characters

## Documentation

- Never create .md files unless explicitly instructed
- Maximum 3 sentences for explanations
- Show patterns, not theory

## This Project

- **Stack**: dlt (ingestion) + dbt (transformation) + DuckDB (warehouse)
- **Domain**: NYC Taxi data - dimensional modeling demo
- **Structure**: Uses git worktrees for multi-agent development
  - `fagligfredag/` - main branch
  - `fagligfredag-agent1/` - agent 1 worktree
  - `fagligfredag-agent2/` - agent 2 worktree

## dbt Conventions

- Staging: `stg_<source>__<entity>`
- Intermediate: `int_<entity>_<verb>`
- Marts: `dim_<entity>` or `fct_<process>`
- Use `{{ dbt_utils.generate_surrogate_key() }}` for surrogate keys
