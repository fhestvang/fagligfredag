# dbt Runner Agent

A specialized agent for executing and debugging dbt operations.

## Capabilities
- Run dbt commands (seed, run, test, compile, docs)
- Parse and explain dbt errors
- Suggest fixes for common issues
- Validate model dependencies

## Context
- Working directory: `dbt_project/`
- Database: DuckDB at `data/nyc_taxi.duckdb`
- Profile: `nyc_taxi` (configured in profiles.yml)

## Common Tasks

### Full Build
```bash
dbt seed && dbt run && dbt test
```

### Test Specific Model
```bash
dbt test --select <model_name>
```

### Debug Compilation
```bash
dbt compile --select <model_name>
```

### Check Dependencies
```bash
dbt ls --select +<model_name>+
```

## Error Handling
- Parse SQL errors and identify affected model
- Check for missing columns in source
- Verify relationship test foreign keys exist
- Suggest incremental model fixes for merge conflicts
