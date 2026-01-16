# NYC Taxi Data Pipeline

A data pipeline using **dlt** for ingestion and **dbt** for transformation of NYC Taxi trip data.

## Quick Start

```bash
# 1. Setup environment
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 2. Load data
cd dlt_pipeline
python nyc_taxi_pipeline.py

# 3. Transform
cd ../dbt_project
dbt run
```

## Project Structure

```
├── documentation/          # Project docs
│   ├── PLAN.md
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   └── MODELS.md
├── dlt_pipeline/          # Data ingestion
│   └── nyc_taxi_pipeline.py
├── dbt_project/           # Data transformation
│   └── models/
└── requirements.txt
```

## Documentation

- [Setup Guide](documentation/SETUP.md) - Installation and running
- [Architecture](documentation/ARCHITECTURE.md) - System design
- [Models](documentation/MODELS.md) - dbt model reference

## Data Source

NYC TLC Trip Record Data: https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page
