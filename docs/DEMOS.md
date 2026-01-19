# Demo Scripts

Educational demos showcasing dlt's data engineering capabilities.

## Prerequisites

1. Run setup: `.\setup.ps1`
2. Close DBeaver or any DuckDB connections (only one write connection allowed)

## Available Demos

### 1. Schema Change Demo

**Location**: `demos/schema_change_demo.py`

**Purpose**: Demonstrates automatic schema evolution.

```powershell
python demos/schema_change_demo.py
```

**What it shows:**
1. Initial load creates table with base columns
2. Second load includes new columns: `weather_condition`, `traffic_level`, `driver_rating`
3. dlt automatically adds columns to destination
4. Old records have NULL for new columns
5. No manual DDL required

**Key takeaway**: Just add columns to your source - dlt handles the rest.

---

### 2. Incremental Load Demo

**Location**: `demos/incremental_load_demo.py`

**Purpose**: Demonstrates incremental data loads with different write dispositions.

```powershell
python demos/incremental_load_demo.py
```

**What it shows:**
1. **REPLACE**: Initial load that creates/replaces the table
2. **MERGE (insert)**: Adding new records based on primary key
3. **MERGE (update)**: Updating existing records based on primary key

**Key takeaway**: Use `write_disposition="merge"` with `primary_key` for incremental/upsert pipelines.

---

## Write Dispositions

| Disposition | Behavior | Use Case |
|-------------|----------|----------|
| `replace` | Drop and recreate table | Full refresh, initial loads |
| `merge` | Upsert based on primary key | Incremental loads, CDC |
| `append` | Insert without checking duplicates | Log data, event streams |

## Using with dbt

After running demos, verify data flows through dbt:

```powershell
cd dbt_project
dbt run
dbt test
```

dbt models will automatically pick up:
- New columns from schema evolution (in raw layer)
- Updated records from incremental loads

## Cleanup

Reset demo data:
```python
import duckdb
conn = duckdb.connect("data/nyc_taxi.duckdb")
conn.execute("DROP SCHEMA IF EXISTS schema_demo CASCADE")
conn.execute("DROP SCHEMA IF EXISTS incremental_demo CASCADE")
conn.close()
```
