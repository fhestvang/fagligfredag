# dbt Models Reference

## Overview

The dbt project follows Kimball dimensional modeling with a star schema design.

```
models/
├── raw/           # Bronze - 1:1 source
├── staging/       # Silver - clean & type
├── intermediate/  # Silver - enrich
└── marts/
    └── core/      # Gold - star schema
```

## Staging Layer

### stg_trips
Cleaned and standardized taxi trip data.

**Key transformations:**
- Renames columns to snake_case
- Casts data types
- Filters invalid records (distance > 0, fare > 0, total > 0)
- Generates unique_id

**Key Columns:**
| Column | Type | Description |
|--------|------|-------------|
| unique_id | varchar | Trip identifier (hash) |
| pickup_datetime | timestamp | Pickup time |
| dropoff_datetime | timestamp | Dropoff time |
| passenger_count | integer | Passengers |
| trip_distance | double | Miles traveled |
| payment_type | integer | Payment code (1-6) |
| total_amount | double | Total cost |

---

## Intermediate Layer

### int_trips_enriched
Enriched trips with surrogate keys and calculated fields.

**Key transformations:**
- Generates surrogate keys via Key Locker macros
- Calculates trip duration and speed
- Applies business logic filters

**Key Columns:**
| Column | Type | Description |
|--------|------|-------------|
| trip_key | varchar | Surrogate key (MD5) |
| pickup_date_key | integer | FK to dim_date (YYYYMMDD) |
| pickup_time_key | integer | FK to dim_time (HHMM) |
| pickup_location_key | varchar | FK to dim_location (hash) |
| vendor_key | varchar | FK to dim_vendor (hash) |
| trip_duration_minutes | integer | Calculated duration |
| trip_speed_mph | double | Calculated speed |

---

## Marts Layer - Dimensions

### dim_date
Calendar date dimension (2020-2030).

| Column | Description |
|--------|-------------|
| date_key | Surrogate key (YYYYMMDD) |
| date_day | Calendar date |
| day_of_week | 0=Sunday, 6=Saturday |
| day_name | Monday, Tuesday, etc. |
| month_name | January, February, etc. |
| is_weekend | True if Sat/Sun |

### dim_time
Time of day dimension (1,440 rows).

| Column | Description |
|--------|-------------|
| time_key | Surrogate key (HHMM) |
| hour_24 | Hour (0-23) |
| minute | Minute (0-59) |
| time_period | Morning/Afternoon/Evening/Night |
| rush_hour_flag | True if 7-9 AM or 4-7 PM |

### dim_location
Location dimension from trip data.

| Column | Description |
|--------|-------------|
| location_key | Surrogate key (hash) |
| location_id | NYC TLC zone ID |

### dim_vendor
Taxi technology providers (seed data).

| Column | Description |
|--------|-------------|
| vendor_key | Surrogate key (hash) |
| vendor_id | TLC vendor ID |
| vendor_name | CMT, VeriFone |

### dim_payment_type
Payment methods (seed data).

| Column | Description |
|--------|-------------|
| payment_type_key | Surrogate key (hash) |
| payment_type_code | TLC code (1-6) |
| payment_type_name | Credit Card, Cash, etc. |
| is_revenue_generating | True for actual payments |

### dim_rate_code
Rate codes (seed data).

| Column | Description |
|--------|-------------|
| rate_code_key | Surrogate key (hash) |
| rate_code_id | TLC code (1-6) |
| rate_code_name | Standard, JFK, Newark, etc. |
| is_flat_rate | True for flat-rate fares |

---

## Marts Layer - Facts

### fct_trips
Atomic fact table (one row per trip). Incremental loading with merge strategy.

**Grain:** One taxi trip

**Dimension Keys:**
- pickup_date_key, dropoff_date_key
- pickup_time_key, dropoff_time_key
- pickup_location_key, dropoff_location_key
- payment_type_key, rate_code_key, vendor_key

**Additive Facts:**
| Column | Description |
|--------|-------------|
| passenger_count | Number of passengers |
| trip_distance_miles | Distance traveled |
| trip_duration_minutes | Duration in minutes |
| fare_amount | Base fare |
| tip_amount | Tip amount |
| tolls_amount | Tolls |
| total_amount | Total charge |

**Semi-Additive Facts:**
| Column | Description |
|--------|-------------|
| trip_speed_mph | Average speed (don't sum) |

**Degenerate Dimensions:**
| Column | Description |
|--------|-------------|
| trip_id | Natural key |
| store_and_fwd_flag | Y/N flag |
| taxi_type | yellow/green |

---

## Testing Coverage

All models include:
- Primary key tests: `unique`, `not_null`
- Foreign key tests: `relationships`
- Data quality tests via custom SQL in `tests/`

Current test count: **94 tests**
