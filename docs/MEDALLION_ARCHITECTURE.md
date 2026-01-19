# Data Architecture Planning

## Executive Summary

**Decision: Keep current 4-layer structure (raw → staging → intermediate → marts).**

This document captures architectural decisions for dbt layer conventions, materialization strategies, and medallion architecture alignment.

---

## Layer Architecture

### Current Structure

```
models/
├── raw/           # Bronze - 1:1 source copy
├── staging/       # Silver (clean) - type, rename, filter
├── intermediate/  # Silver (enrich) - keys, calculations
└── marts/         # Gold - dimensional model
    └── core/
```

### Medallion Alignment

| dbt Layer | Medallion | Model | Purpose |
|-----------|-----------|-------|---------|
| `raw/` | Bronze | `raw_trips` | Audit trail, source fidelity |
| `staging/` | Silver | `stg_trips` | Clean, type, basic filters |
| `intermediate/` | Silver | `int_trips_enriched` | Keys, derived fields |
| `marts/` | Gold | `dim_*`, `fct_*` | Star schema |

### Industry Context

**dbt Labs recommends 3 layers:** staging → intermediate → marts

**Our deviation:** We keep an explicit `raw/` layer because:
1. Audit trail for debugging source issues
2. Single place to see untransformed data
3. Decouples ingestion (dlt) from transformation logic

**Alternative (standard approach):** Use `source()` directly in staging, no raw models.

---

## Materialization Strategy

### The Golden Rule

> "Start with views → tables when queries slow → incremental when builds slow"

### Decision Matrix

| Scenario | Materialization | Why |
|----------|-----------------|-----|
| Small source, rarely queried | **View** | No storage, always fresh |
| Large source, queried by downstream | **Table** | Avoids recomputation |
| Complex transforms, multiple consumers | **Table** | Compute once |
| Large fact, append-mostly | **Incremental** | Fast builds |
| Small dimension, static | **View** | Simple |
| Reusable logic, few consumers | **Ephemeral** | Inline CTE |

### View vs Table Trade-offs

| Aspect | View | Table |
|--------|------|-------|
| **Storage** | None | Full copy |
| **Build time** | Instant | Must compute |
| **Query time** | Recomputes each query | Pre-computed |
| **Freshness** | Always current | Stale until rebuilt |

### When Views Fail

Views are problematic when:
- Complex joins/aggregations recompute on every query
- Large source data (100M+ rows) scanned repeatedly
- Multiple downstream models trigger N recomputations
- BI tools query directly (users wait)

### DuckDB-Specific Considerations

DuckDB is single-node, so:
- Views on large data hurt more than in distributed warehouses
- Incremental merge strategy works well
- Consider tables earlier than you would in Snowflake/BigQuery

### Project Configuration

```yaml
# dbt_project.yml
models:
  nyc_taxi:
    raw:
      +materialized: view           # Passthrough, no storage
    staging:
      +materialized: view           # Small-medium: view
      # +materialized: table        # Large sources: table
    intermediate:
      +materialized: view           # Simple transforms: view
      # +materialized: table        # Complex joins: table
    marts:
      core:
        +materialized: table        # Dimensions: table
        fct_trips:
          +materialized: incremental
          +unique_key: trip_key
          +incremental_strategy: merge
```

### Layer-by-Layer Recommendations

#### Raw (Bronze)
- **Default:** View
- **Purpose:** 1:1 source copy
- **Switch to table if:** Source is slow to query

#### Staging (Silver - Clean)
- **Default:** View
- **Purpose:** Rename, type cast, basic filters
- **Switch to table if:**
  - Source > 100M rows
  - Multiple downstream models
  - Complex type conversions

#### Intermediate (Silver - Enrich)
- **Default:** View
- **Purpose:** Keys, calculations, business logic
- **Switch to table if:**
  - Heavy joins
  - Multiple downstream consumers
  - Query performance matters

#### Marts (Gold)
- **Dimensions:** Table (small, stable, queried often)
- **Facts:** Incremental (large, append-mostly)
- **Aggregates:** Table (pre-computed summaries)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NYC TLC Parquet (S3)                                           │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │ dlt Pipeline │  Ingestion → DuckDB                           │
│  └─────────────┘                                                │
│         │                                                        │
│         ▼                                                        │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  BRONZE (raw/)                              [VIEW]         ║  │
│  ║  ┌───────────┐                                             ║  │
│  ║  │ raw_trips │  1:1 source copy                            ║  │
│  ║  └───────────┘                                             ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│         │                                                        │
│         ▼                                                        │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  SILVER (staging/ + intermediate/)                         ║  │
│  ║  ┌───────────┐     ┌────────────────────┐                  ║  │
│  ║  │ stg_trips │ ──▶ │ int_trips_enriched │   [VIEW]         ║  │
│  ║  └───────────┘     └────────────────────┘                  ║  │
│  ║   Clean/Type        Surrogate Keys/Calc                    ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│         │                                                        │
│         ▼                                                        │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  GOLD (marts/)                                             ║  │
│  ║  ┌──────────┐ ┌──────────┐ ┌──────────┐   [TABLE]         ║  │
│  ║  │ dim_date │ │ dim_time │ │ dim_*    │                    ║  │
│  ║  └────┬─────┘ └────┬─────┘ └────┬─────┘                    ║  │
│  ║       └────────────┴─────┬──────┘                          ║  │
│  ║                          │                                 ║  │
│  ║                    ┌─────┴─────┐   [INCREMENTAL]           ║  │
│  ║                    │ fct_trips │                           ║  │
│  ║                    └───────────┘                           ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  Power BI   │  Analytics via MCP                             │
│  └─────────────┘                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Quality by Layer

### Bronze (raw/)
- **Filters:** None (preserve everything)
- **Tests:** Source freshness only
- **Purpose:** Debug source issues

### Silver - Staging
- **Filters:** `trip_distance > 0`, `fare_amount > 0`, `total_amount > 0`
- **Tests:** `not_null` on key columns
- **Purpose:** Remove obviously bad records

### Silver - Intermediate
- **Filters:** `pickup_datetime < dropoff_datetime`, duration <= 24 hours
- **Tests:** `unique` on trip_key
- **Purpose:** Business logic validation

### Gold (marts/)
- **Tests:**
  - Primary keys: `unique`, `not_null`
  - Foreign keys: `relationships`
  - Categorical: `accepted_values`
- **Purpose:** BI-ready quality

---

## Intermediate Layer: When to Use

### Use Intermediate When:
- Bringing 4+ concepts together for a mart
- Complex business logic shared across marts
- Re-graining operations (fan out/collapse)
- Easier debugging needed

### Skip Intermediate When:
- Simple 1-2 join marts
- Logic used by only one downstream model
- Mart is understandable at a glance

### Our Decision
Keep `int_trips_enriched` because:
1. Separates key generation from mart
2. Testable intermediate state
3. Could support multiple fact tables later

---

## Folder Naming

### Options Considered

| Option | Example | Verdict |
|--------|---------|---------|
| Numbered | `01_raw/`, `02_staging/` | Visual order, but cluttered |
| Alphabetic | `bronze/`, `silver/`, `gold/` | Doesn't sort in flow order |
| Current | `raw/`, `staging/`, `intermediate/`, `marts/` | Standard dbt conventions |

### Decision
**Keep current naming.** Reasons:
- Follows dbt conventions
- `stg_`, `int_` prefixes are more descriptive than "silver"
- No refactoring needed
- This document provides medallion mapping

---

## Future Enhancements

### Adding More Sources
```
staging/
├── tlc/
│   ├── stg_tlc__yellow_trips.sql
│   ├── stg_tlc__green_trips.sql
│   └── stg_tlc__fhv_trips.sql
└── _stg__models.yml

intermediate/
└── int_all_trips_unioned.sql
```

### Adding Aggregates
```
marts/
├── core/           # Atomic grain
│   ├── dim_*.sql
│   └── fct_trips.sql
└── aggregates/     # Pre-computed
    ├── fct_daily_trips.sql
    └── fct_location_summary.sql
```

### Partitioning (if needed)
```sql
{{ config(
    materialized='incremental',
    incremental_strategy='merge',
    partition_by={'field': 'data_year', 'data_type': 'int'}
) }}
```

---

## References

- [dbt - How we structure our dbt projects](https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview)
- [dbt - Materializations](https://docs.getdbt.com/docs/build/materializations)
- [dbt - Incremental Models](https://docs.getdbt.com/best-practices/materializations/4-incremental-models)
- [Medallion Architecture - Databricks](https://www.databricks.com/glossary/medallion-architecture)
- [Kimball's Data Warehouse Toolkit](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/)
