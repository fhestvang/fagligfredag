# NYC Taxi Analytics Platform

## Project Overview
Modern data engineering platform using dlt (data load tool) for ingestion and dbt for transformations, with Power BI for analytics.

## Tech Stack
- **Ingestion**: dlt (Python) → DuckDB
- **Transformation**: dbt-duckdb
- **Analytics**: Power BI with MCP server integration
- **Source Control**: Git with worktree-based multi-agent development

## Architecture

```
NYC TLC Parquet Files (S3)
        ↓
    dlt Pipeline (Python)
        ↓
    DuckDB (nyc_taxi.duckdb)
        ↓
    dbt Transformations
        ↓
┌───────────────────────────────────────┐
│  raw → staging → intermediate → marts │
└───────────────────────────────────────┘
        ↓
    Power BI (via MCP)
```

## Data Model (Kimball Star Schema)

### Dimensions
- `dim_date` - Date spine 2020-2030
- `dim_time` - 1,440 rows (minute granularity)
- `dim_location` - NYC TLC zone IDs
- `dim_payment_type` - Payment methods (seed)
- `dim_rate_code` - Rate codes (seed)
- `dim_vendor` - Taxi vendors (seed)

### Facts
- `fct_trips` - Atomic grain, incremental loading

## Key Directories

| Path | Purpose |
|------|---------|
| `dlt_pipeline/` | dlt ingestion scripts |
| `dbt_project/` | dbt models, seeds, macros |
| `data/` | DuckDB database files |
| `.claude/` | Claude Code configuration |

## Development Workflow

### Multi-Agent Setup
We use git worktrees for parallel development:
- `fagligfredag/` - Main branch
- `fagligfredag-agent1/` - Feature work
- `fagligfredag-agent2/` - Feature work

### Running dbt
```bash
cd dbt_project
# Use the venv Python to run dbt
../.venv/Scripts/python.exe -c "from dbt.cli.main import cli; cli()" run --profiles-dir .
```

### Common Commands
- `dbt build` - Run seeds, models, and tests
- `dbt run --select fct_trips` - Run specific model
- `dbt test` - Run all tests

## Code Standards

### SQL (dbt)
- Use CTEs for readability
- Prefix staging models with `stg_`
- Prefix intermediate models with `int_`
- Use `{{ ref() }}` for model references
- Add tests for all primary keys (unique, not_null)

### Python (dlt)
- Use type hints
- Document pipeline configurations
- Handle schema evolution gracefully

## Important Notes

1. **Database Path**: Single shared DuckDB at `data/nyc_taxi.duckdb`
2. **Incremental Loading**: `fct_trips` uses merge strategy
3. **Column Names**: dlt normalizes names (e.g., `VendorID` → `vendor_id`)

## See Also
- @docs/GIT_WORKFLOW.md - Git worktree documentation
- @dbt_project/models/marts/core/_core__models.yml - Dimension/fact documentation
