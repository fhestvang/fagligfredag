# Architecture

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   NYC TLC API   │────▶│      dlt        │────▶│    DuckDB       │
│  (Parquet files)│     │   (Extract &    │     │   (Source)      │
└─────────────────┘     │     Load)       │     └────────┬────────┘
                        └─────────────────┘              │
                                                         ▼
                                              ┌──────────┴──────────┐
                                              │    dbt Layers       │
                                              │  ┌───────────────┐  │
                                              │  │   Raw Layer   │  │
                                              │  │ (1:1 copy)    │  │
                                              │  └───────┬───────┘  │
                                              │          ▼          │
                                              │  ┌───────────────┐  │
                                              │  │ Staging Layer │  │
                                              │  │ (transforms)  │  │
                                              │  └───────┬───────┘  │
                                              │          ▼          │
                                              │  ┌───────────────┐  │
                                              │  │  Marts Layer  │  │
                                              │  │ (aggregates)  │  │
                                              │  └───────────────┘  │
                                              └─────────────────────┘
```

## Components

### dlt (Data Load Tool)
- **Purpose**: Extract and load raw data (no transformations)
- **Source**: NYC TLC Trip Record Data (public parquet files)
- **Destination**: DuckDB
- **Location**: `dlt_pipeline/`

### dbt (Data Build Tool)
- **Purpose**: Transform raw data into analytics-ready models
- **Location**: `dbt_project/`

## dbt Model Layers

| Layer | Description | Materialization |
|-------|-------------|-----------------|
| `raw` | 1:1 copy of source data, no transformations | View |
| `staging` | Cleaned and standardized data | View |
| `marts` | Business-level aggregations | Table |

## Database Schema

### Source (from dlt)
- `nyc_taxi_raw.trips` - Raw trip records from dlt ingestion

### Transformed (from dbt)
- `raw.raw_trips` - 1:1 copy of source (no transformations)
- `staging.stg_trips` - Cleaned trips with standardized columns
- `marts.fct_daily_trips` - Daily metrics
- `marts.fct_location_stats` - Location stats

## Data Lineage

```
source (nyc_taxi_raw.trips)
    └── raw_trips (1:1 copy)
            └── stg_trips (transformations)
                    ├── fct_daily_trips
                    └── fct_location_stats
```
