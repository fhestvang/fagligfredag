# dbt Models Reference

## Staging Layer

### stg_trips
Cleaned and standardized taxi trip data.

**Key transformations:**
- Renames columns to snake_case
- Maps payment_type codes to names
- Filters invalid records (distance/fare > 0)

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| unique_id | int | Trip identifier |
| pickup_datetime | timestamp | Pickup time |
| dropoff_datetime | timestamp | Dropoff time |
| passenger_count | int | Passengers |
| trip_distance | float | Miles traveled |
| payment_type_name | string | Payment method |
| total_amount | float | Total cost |

---

## Marts Layer

### fct_daily_trips
Daily aggregated metrics.

**Columns:**
| Column | Description |
|--------|-------------|
| trip_date | Date |
| total_trips | Trip count |
| total_passengers | Passenger count |
| total_revenue | Revenue sum |
| avg_trip_revenue | Avg revenue |
| tip_percentage | Tips / Fare % |

### fct_location_stats
Statistics by pickup/dropoff location.

**Columns:**
| Column | Description |
|--------|-------------|
| location_id | Zone ID |
| location_type | pickup/dropoff |
| trip_count | Number of trips |
| total_revenue | Revenue at location |
| avg_fare | Average fare |
