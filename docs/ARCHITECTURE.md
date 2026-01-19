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
                                              │  │Intermediate   │  │
                                              │  │ (enrichment)  │  │
                                              │  └───────┬───────┘  │
                                              │          ▼          │
                                              │  ┌───────────────┐  │
                                              │  │  Marts Layer  │  │
                                              │  │ (star schema) │  │
                                              │  └───────────────┘  │
                                              └─────────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │     Power BI        │
                                              │   (via MCP server)  │
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

### Power BI
- **Purpose**: Business intelligence and visualization
- **Connection**: Via MCP server to DuckDB
- **Location**: External (connects to `data/nyc_taxi.duckdb`)

## dbt Model Layers

| Layer | Medallion | Materialization | Purpose |
|-------|-----------|-----------------|---------|
| `raw/` | Bronze | View | 1:1 source copy, audit trail |
| `staging/` | Silver | View | Cleaned, typed, basic filters |
| `intermediate/` | Silver | View | Keys, calculations, enrichment |
| `marts/` | Gold | Table/Incremental | Star schema (dims + facts) |

## Database Schema

### Source (from dlt)
- `nyc_taxi_raw.trips` - Raw trip records from dlt ingestion

### Transformed (from dbt)
- `raw.raw_trips` - 1:1 copy of source
- `staging.stg_trips` - Cleaned trips with standardized columns
- `intermediate.int_trips_enriched` - Surrogate keys, derived fields
- `marts.dim_*` - Dimension tables (date, time, location, vendor, etc.)
- `marts.fct_trips` - Atomic fact table (incremental)

## Data Lineage

```
source (nyc_taxi_raw.trips)
    └── raw_trips (1:1 copy)
            └── stg_trips (clean, type, filter)
                    └── int_trips_enriched (keys, calculations)
                            └── fct_trips (star schema fact)
                                    ↑
                    dim_date ──────┘
                    dim_time ──────┘
                    dim_location ──┘
                    dim_vendor ────┘
                    dim_payment_type ─┘
                    dim_rate_code ────┘
```

## Key Locker Pattern

Surrogate keys are managed centrally via macros in `macros/key_locker/`:

| Macro | Purpose | Example Output |
|-------|---------|----------------|
| `get_date_key()` | Date surrogate key | `20230115` |
| `get_time_key()` | Time surrogate key | `1430` (2:30 PM) |
| `get_unknown_key()` | Unknown/null handling | `-1` |
| `generate_surrogate_key()` | Hash-based key | MD5 hash |

See [MEDALLION_ARCHITECTURE.md](MEDALLION_ARCHITECTURE.md) for detailed layer documentation.
