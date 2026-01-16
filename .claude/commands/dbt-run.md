# dbt Run and Test

Execute dbt commands and analyze results.

---

allowed_tools: Bash(dbt:*), Bash(cd:*), Read
argument_description: [run|test|build|compile] [optional model selector]

---

## Context

```bash
cd dbt_project && dbt debug
```

## Commands

### `/dbt-run run`
```bash
cd dbt_project && dbt run
```

### `/dbt-run run +fct_trips`
```bash
cd dbt_project && dbt run --select +fct_trips
```

### `/dbt-run test`
```bash
cd dbt_project && dbt test
```

### `/dbt-run build`
```bash
cd dbt_project && dbt build
```

## Selectors

- `model_name` - Single model
- `+model_name` - Model and all upstream
- `model_name+` - Model and all downstream
- `tag:marts` - All models with tag
- `path:models/marts/core` - All in path

## On Failure

1. Show the error message clearly
2. Read the failing model file
3. Identify the root cause
4. Suggest a fix

## Success Output

```
Models: X passed
Tests: Y passed
Time: Z seconds
```
