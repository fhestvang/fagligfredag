# Layer Architecture & Materialization

## dbt Layer Conventions

| Layer | Purpose | Naming | Default Materialization |
|-------|---------|--------|------------------------|
| **Raw** | 1:1 source copy | `raw_<entity>` | View |
| **Staging** | Clean, rename, type | `stg_<source>__<entity>` | View |
| **Intermediate** | Business logic, joins | `int_<entity>_<verb>` | View |
| **Marts** | Dimensional model | `dim_<entity>`, `fct_<process>` | Table/Incremental |

## Layer Decision Framework

| Layers | When to Use |
|--------|-------------|
| **2** (staging → marts) | Simple, single source |
| **3** (staging → intermediate → marts) | Standard, multiple sources |
| **4** (raw → staging → intermediate → marts) | Audit requirements |

### When to Add Intermediate Layer
- Joining 4+ staging models
- Complex business logic shared across marts
- Re-graining operations (changing granularity)
- Need testable checkpoint

### When to Skip Intermediate
- Simple 1-2 table joins
- Logic only used once
- Mart is self-explanatory

## Materialization Strategy

### The Golden Rule
> "Start with views → tables when queries slow → incremental when builds slow"

### Decision Matrix

| Scenario | Materialization | Why |
|----------|-----------------|-----|
| Small source, rarely queried | **View** | No storage, always fresh |
| Large source (>100M rows) | **Table** | Avoids repeated scans |
| Complex joins, multiple consumers | **Table** | Compute once |
| Large fact, append-mostly | **Incremental** | Fast builds |
| Small dimension, static | **View** or **Table** | Simple |
| Reusable logic, few consumers | **Ephemeral** | Inline CTE |

### View vs Table Trade-offs

| Aspect | View | Table |
|--------|------|-------|
| Storage | None | Full copy |
| Build time | Instant | Must compute |
| Query time | Recomputes | Pre-computed |
| Freshness | Always current | Stale until rebuild |

### When Views Fail
- Complex joins/aggregations recompute every query
- Large source data scanned repeatedly
- Multiple downstream models trigger N recomputations
- BI tools query directly (users wait)

### Warehouse-Specific Guidance

| Warehouse | View Tolerance | Notes |
|-----------|---------------|-------|
| Snowflake | High | Distributed, caches well |
| BigQuery | High | Serverless, slots scale |
| DuckDB | Medium | Single-node, tables earlier |
| Postgres | Low | Views can be slow |

## Recommended Configuration

```yaml
# dbt_project.yml
models:
  project_name:
    raw:
      +materialized: view
    staging:
      +materialized: view        # Or table if >100M rows
    intermediate:
      +materialized: view        # Or table if complex
    marts:
      +materialized: table
      core:
        fct_*:
          +materialized: incremental
          +incremental_strategy: merge
```

## Medallion Architecture Alignment

| Medallion | dbt Layer | Materialization |
|-----------|-----------|-----------------|
| Bronze | raw/ or source() | View |
| Silver | staging/ + intermediate/ | View |
| Gold | marts/ | Table/Incremental |

## Project Structure

```
dbt_project/
├── models/
│   ├── raw/              # Optional: 1:1 source copies
│   ├── staging/          # Clean, rename, type
│   │   ├── stg_source__entity.sql
│   │   └── _stg__models.yml
│   ├── intermediate/     # Business logic
│   │   ├── int_entity_enriched.sql
│   │   └── _int__models.yml
│   └── marts/
│       ├── core/         # Dimensional model
│       │   ├── dim_*.sql
│       │   ├── fct_*.sql
│       │   └── _core__models.yml
│       └── aggregates/   # Pre-computed summaries
├── snapshots/            # SCD Type 2
├── seeds/                # Static reference data
└── macros/
```
