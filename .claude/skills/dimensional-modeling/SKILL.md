---
name: dimensional-modeling
description: |
  Design and implement dimensional models using Kimball methodology.
  Auto-applies when discussing: star schema, facts, dimensions, grain,
  surrogate keys, SCDs, bus matrix, data warehouse design, denormalization,
  conformed dimensions, or Kimball patterns.
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Dimensional Modeling Expert

You are an expert in Kimball dimensional modeling methodology. Apply these principles when designing, reviewing, or implementing data warehouse models.

## Core Process

1. **Identify the business process** - What are we measuring?
2. **Declare the grain** - What does one row represent?
3. **Identify dimensions** - Who, what, where, when, why, how?
4. **Identify facts** - What are we measuring? (additive/semi-additive/non-additive)

## Kimball's 10 Essential Rules (Summary)

| # | Rule | Key Point |
|---|------|-----------|
| 1 | Atomic Data | Load most granular data |
| 2 | Business Processes | Each process = one fact table |
| 3 | Date Dimension | Every fact needs date FK |
| 4 | Same Grain | All facts in table at same detail |
| 5 | M:M in Facts | Use bridge tables |
| 6 | M:1 in Dims | Denormalize hierarchies |
| 7 | Text in Dims | Labels belong in dimensions |
| 8 | Surrogate Keys | Never join on natural keys |
| 9 | Conformed Dims | Reuse across fact tables |
| 10 | Business Acceptance | Best model is one users use |

For detailed rules, see [kimball-rules.md](kimball-rules.md)

## Quick Decision Trees

### Fact vs Dimension?
- **Fact**: Numeric, measurable, changes over time, many rows
- **Dimension**: Descriptive, categorical, context for facts

### Which Fact Table Type?
- **Transaction**: Individual events (orders, clicks)
- **Periodic Snapshot**: State at intervals (daily inventory)
- **Accumulating Snapshot**: Process milestones (order fulfillment)

### Which SCD Type?
- **Type 0**: Never changes (birth date)
- **Type 1**: Overwrite (corrections)
- **Type 2**: Track history (address changes)
- **Type 3**: Previous + current only

For detailed patterns, see [scd-patterns.md](scd-patterns.md)

## Naming Conventions

```
dim_<entity>           # Dimension tables
fct_<process>          # Fact tables
stg_<source>__<table>  # Staging
int_<entity>_<verb>    # Intermediate
<entity>_key           # Surrogate keys
<entity>_id            # Natural keys
```

## dbt Templates

### Dimension
```sql
select
    {{ dbt_utils.generate_surrogate_key(['natural_key']) }} as entity_key,
    natural_key as entity_id,
    -- attributes (denormalized)
from {{ ref('stg_source__entity') }}
```

### Fact (Incremental)
```sql
{{ config(materialized='incremental', unique_key='fact_key', incremental_strategy='merge') }}

select
    {{ dbt_utils.generate_surrogate_key(['id']) }} as fact_key,
    -- dimension FKs
    -- additive facts
    -- metadata
from {{ ref('int_entity_enriched') }}
{% if is_incremental() %}
where _loaded_at > (select max(_loaded_at) from {{ this }})
{% endif %}
```

## Deep Dive References

| Topic | File |
|-------|------|
| Kimball's 10 rules explained | [kimball-rules.md](kimball-rules.md) |
| Fact table patterns | [fact-patterns.md](fact-patterns.md) |
| Dimension patterns | [dimension-patterns.md](dimension-patterns.md) |
| SCD strategies | [scd-patterns.md](scd-patterns.md) |
| Layer architecture | [layer-architecture.md](layer-architecture.md) |
| Anti-patterns | [anti-patterns.md](anti-patterns.md) |

## Anti-Patterns (Quick List)

1. Mixed grain in fact tables
2. Snowflaking dimensions
3. Natural keys for joins
4. Text in fact tables
5. Not declaring grain
6. Skipping unknown member (-1)

For detailed anti-patterns, see [anti-patterns.md](anti-patterns.md)
