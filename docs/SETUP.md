# Setup Guide

## Prerequisites
- Python 3.9+
- Git
- (Optional) DBeaver or VS Code DuckDB extension for database exploration

## Quick Setup (Windows)

```powershell
# Clone repository
git clone https://github.com/fhestvang/fagligfredag.git
cd fagligfredag

# Run setup script
.\setup.ps1
```

## Manual Installation

### 1. Create Virtual Environment
```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Install dbt Packages
```bash
cd dbt_project
dbt deps
```

## Storage

Data is stored in a local DuckDB file:
- **Location**: `data/nyc_taxi.duckdb`
- **Type**: Single file database (no server needed)

## Running the Pipeline

### Step 1: Load Data with dlt
```bash
cd dlt_pipeline
python nyc_taxi_pipeline.py
```

This will:
- Download NYC Yellow Taxi data (Jan 2023, 10k rows sample)
- Load into DuckDB database at `data/nyc_taxi.duckdb`

### Step 2: Transform with dbt
```bash
cd dbt_project
dbt build
```

This runs seeds, models, and tests to create:
- 6 dimension tables (`dim_date`, `dim_time`, `dim_location`, etc.)
- 1 fact table (`fct_trips`)

### Step 3: Run Tests Only
```bash
cd dbt_project
dbt test
```

## Custom Data Load

Load different months or taxi types:
```python
from nyc_taxi_pipeline import run_pipeline

# Green taxi, March 2023, all rows
run_pipeline(year=2023, month=3, taxi_type="green", row_limit=None)
```

Taxi types available: `yellow`, `green`, `fhv`, `fhvhv`

## Exploring the Database

### DBeaver
1. New Connection > DuckDB
2. Path: `data/nyc_taxi.duckdb`
3. Browse schemas: `nyc_taxi_raw`, `raw`, `staging`, `intermediate`, `marts`

### VS Code
1. Install "DuckDB" extension
2. Open `data/nyc_taxi.duckdb`

### Python
```python
import duckdb
conn = duckdb.connect("data/nyc_taxi.duckdb")
conn.sql("SELECT * FROM marts.fct_trips LIMIT 10").show()
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DUCKDB_PATH` | Override database location | `data/nyc_taxi.duckdb` |

## Troubleshooting

### Database Lock Error
DuckDB only allows one write connection. Close DBeaver or other connections.

### dbt Not Found
Use the virtual environment's Python:
```bash
../.venv/Scripts/python.exe -c "from dbt.cli.main import cli; cli()" run
```

### Missing dbt Packages
```bash
cd dbt_project
dbt deps
```
