# Architecture

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   NYC TLC API   │────▶│      dlt        │────▶│    DuckDB       │
│  (Parquet files)│     │   (Extract &    │     │   (Raw data)    │
└─────────────────┘     │     Load)       │     └────────┬────────┘
                        └─────────────────┘              │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌────────┴────────┐
│  Analytics      │◀────│      dbt        │◀────│   DuckDB        │
│  (BI Tools)     │     │  (Transform)    │     │  (Source)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Components

### dlt (Data Load Tool)
- **Purpose**: Extract and load raw data
- **Source**: NYC TLC Trip Record Data (public parquet files)
- **Destination**: DuckDB
- **Location**: `dlt_pipeline/`

### dbt (Data Build Tool)
- **Purpose**: Transform raw data into analytics-ready models
- **Location**: `dbt_project/`

## dbt Model Layers

| Layer | Description | Materialization |
|-------|-------------|-----------------|
| `staging` | Cleaned source data | View |
| `marts` | Business-level aggregations | Table |

## Database Schema

### Raw (from dlt)
- `nyc_taxi_raw.trips` - Raw trip records

### Transformed (from dbt)
- `staging.stg_trips` - Cleaned trips
- `marts.fct_daily_trips` - Daily metrics
- `marts.fct_location_stats` - Location stats
