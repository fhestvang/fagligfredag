# NYC-TAXI Data Pipeline Plan

## Overview
Set up a data pipeline using **dlt** (data load tool) for ingestion and **dbt** (data build tool) for transformation of NYC-TAXI test data.

## Architecture
```
NYC-TAXI API → dlt (Extract & Load) → DuckDB → dbt (Transform) → Analytics-ready tables
```

## Components

### 1. dlt Pipeline
- Source: NYC-TAXI public dataset
- Destination: DuckDB (local development)
- Tasks: Extract taxi trip data, load to raw tables

### 2. dbt Project
- Source: Raw tables from dlt
- Models: Staging → Intermediate → Marts
- Output: Cleaned, aggregated analytics tables

## Project Structure
```
fagligfredag/
├── documentation/       # Project documentation
├── dlt_pipeline/       # dlt ingestion code
│   ├── nyc_taxi_pipeline.py
│   └── .dlt/
├── dbt_project/        # dbt transformation project
│   ├── models/
│   ├── dbt_project.yml
│   └── profiles.yml
├── requirements.txt
└── README.md
```

## Steps
1. Set up Python environment
2. Create dlt pipeline for NYC-TAXI data
3. Initialize dbt project
4. Create dbt models
5. Test end-to-end pipeline
