# NYC Taxi Data Pipeline

A data pipeline using **dlt** for ingestion and **dbt** for transformation of NYC Taxi trip data.

![dbt CI](https://github.com/fhestvang/fagligfredag/actions/workflows/dbt-ci.yml/badge.svg)
![dlt CI](https://github.com/fhestvang/fagligfredag/actions/workflows/dlt-ci.yml/badge.svg)

## Quick Start

```bash
# 1. Setup environment
.\scripts\setup.ps1

# Or manually:
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -e .

# 2. Load data
cd dlt_pipeline
python nyc_taxi_pipeline.py

# 3. Transform
cd ../dbt_project
dbt deps
dbt build
```

## Project Structure

```
├── .claude/               # Claude Code configuration
├── .github/workflows/     # CI/CD pipelines
├── data/                  # DuckDB database
├── dbt_project/           # Data transformation (dbt)
├── dlt_pipeline/          # Data ingestion (dlt)
├── docs/                  # Documentation
├── scripts/               # Automation scripts
├── webapp/                # Web application
└── pyproject.toml         # Python dependencies
```

## Documentation

- [Setup Guide](docs/SETUP.md) - Installation and running
- [Architecture](docs/ARCHITECTURE.md) - System design
- [Models](docs/MODELS.md) - dbt model reference
- [CI/CD](docs/CI_CD.md) - GitHub Actions workflows
- [All Documentation](docs/README.md) - Full index

## Data Source

NYC TLC Trip Record Data: https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page
