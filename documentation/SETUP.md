# Setup Guide

## Prerequisites
- Python 3.9+
- pip

## Installation

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

## Running the Pipeline

### Step 1: Load Data with dlt
```bash
cd dlt_pipeline
python nyc_taxi_pipeline.py
```

This will:
- Download NYC Yellow Taxi data (Jan 2023, 10k rows sample)
- Load into DuckDB database at `nyc_taxi.duckdb`

### Step 2: Transform with dbt
```bash
cd dbt_project
dbt run
```

This will create:
- `stg_trips`: Cleaned trip data
- `fct_daily_trips`: Daily aggregations
- `fct_location_stats`: Location statistics

### Step 3: Run Tests
```bash
cd dbt_project
dbt test
```

## Custom Data Load

Load different months or taxi types:
```python
from nyc_taxi_pipeline import run_pipeline

# Green taxi, March 2023
run_pipeline(year=2023, month=3, taxi_type="green")
```

Taxi types available: `yellow`, `green`, `fhv`, `fhvhv`
