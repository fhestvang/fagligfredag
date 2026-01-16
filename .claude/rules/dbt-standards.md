# dbt Development Standards

## Model Naming Conventions
- **raw_** prefix: 1:1 source copies
- **stg_** prefix: Staging models (cleaned, typed)
- **int_** prefix: Intermediate transformations
- **dim_** prefix: Dimension tables
- **fct_** prefix: Fact tables

## File Organization
```
models/
├── raw/           # Source copies
├── staging/       # Cleaning and typing
├── intermediate/  # Business logic
└── marts/
    └── core/      # Dimensional model
```

## SQL Style
- Use lowercase for SQL keywords
- Use snake_case for all identifiers
- Prefix CTEs descriptively (e.g., `source_data`, `filtered_trips`)
- Always qualify column references with table aliases in joins

## Testing Requirements
- All primary keys: `unique`, `not_null`
- All foreign keys: `relationships` test
- Accepted values for categorical columns
- Data quality tests for numeric ranges

## Materialization Strategy
- **view**: staging, intermediate (fast iteration)
- **table**: marts (query performance)
- **incremental**: large fact tables with merge strategy

## Documentation
- Every model needs a description in `_<folder>__models.yml`
- Document all columns with business definitions
- Add tests inline with column definitions
