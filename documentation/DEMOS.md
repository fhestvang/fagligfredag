# Demo Scripts

This document explains how to run the demo scripts that showcase dlt's data engineering capabilities.

## Prerequisites

1. Ensure dependencies are installed:
```powershell
.\setup.ps1
```

2. **Important**: Close DBeaver or any other application that has the DuckDB file open. DuckDB only allows one connection at a time.

## Available Demos

### 1. Schema Change Demo

**Location**: `demos/schema_change_demo.py`

**Purpose**: Demonstrates how dlt automatically handles schema evolution when new columns appear in source data.

**Run**:
```powershell
python demos/schema_change_demo.py
```

**What it shows**:
1. Initial load creates table with base columns
2. Second load includes 3 new columns: `weather_condition`, `traffic_level`, `driver_rating`
3. dlt automatically adds columns to the destination table
4. Old records have NULL for new columns
5. No manual DDL (ALTER TABLE) required

**Key takeaway**: dlt handles schema evolution automatically - just add columns to your source and they appear in the destination.

---

### 2. Incremental Load Demo

**Location**: `demos/incremental_load_demo.py`

**Purpose**: Demonstrates how dlt handles incremental data loads using different write dispositions.

**Run**:
```powershell
python demos/incremental_load_demo.py
```

**What it shows**:
1. **REPLACE**: Initial load that creates/replaces the table
2. **MERGE (insert)**: Adding new records based on primary key
3. **MERGE (update)**: Updating existing records based on primary key

**Key takeaway**: Use `write_disposition="merge"` with a `primary_key` for incremental/upsert pipelines.

---

## Write Dispositions Explained

| Disposition | Behavior | Use Case |
|-------------|----------|----------|
| `replace` | Drop and recreate table | Full refresh, initial loads |
| `merge` | Upsert based on primary key | Incremental loads, CDC |
| `append` | Insert without checking duplicates | Log data, event streams |

## Using with dbt

After running demos, verify the data flows through dbt:

```powershell
cd dbt_project
python -c "from dbt.cli.main import cli; cli()" run
python -c "from dbt.cli.main import cli; cli()" test
```

The dbt models will automatically pick up:
- New columns from schema evolution (in raw layer)
- Updated records from incremental loads

## Cleanup

To reset demo data, delete the tables:
```python
import duckdb
conn = duckdb.connect("data/nyc_taxi.duckdb")
conn.execute("DROP SCHEMA IF EXISTS schema_demo CASCADE")
conn.execute("DROP SCHEMA IF EXISTS incremental_demo CASCADE")
conn.close()
```
