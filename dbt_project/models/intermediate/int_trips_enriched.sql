-- Intermediate model: Enriched trips with calculated fields and dimension keys
-- This layer prepares data for the fact table by:
-- 1. Calculating derived metrics (duration, speed)
-- 2. Generating dimension keys for joins
-- 3. Applying business logic

with staged_trips as (
    select * from {{ ref('stg_trips') }}
),

enriched as (
    select
        -- Natural key
        unique_id,

        -- Generate surrogate key for fact table
        {{ generate_surrogate_key(['unique_id']) }} as trip_key,

        -- Dimension keys (using natural keys that match dimension tables)
        -- Date keys (YYYYMMDD format)
        cast(strftime(pickup_datetime, '%Y%m%d') as integer) as pickup_date_key,
        cast(strftime(dropoff_datetime, '%Y%m%d') as integer) as dropoff_date_key,

        -- Time keys (HHMM format)
        cast(strftime(pickup_datetime, '%H') as integer) * 100
            + cast(strftime(pickup_datetime, '%M') as integer) as pickup_time_key,
        cast(strftime(dropoff_datetime, '%H') as integer) * 100
            + cast(strftime(dropoff_datetime, '%M') as integer) as dropoff_time_key,

        -- Location keys (using natural key, default -1 for unknown)
        coalesce(pickup_location_id, -1) as pickup_location_key,
        coalesce(dropoff_location_id, -1) as dropoff_location_key,

        -- Other dimension keys
        coalesce(payment_type, -1) as payment_type_key,
        coalesce(rate_code_id, -1) as rate_code_key,
        coalesce(vendor_id, -1) as vendor_key,

        -- Degenerate dimensions (kept on fact)
        store_and_fwd_flag,
        taxi_type,

        -- Original timestamps (for reference)
        pickup_datetime,
        dropoff_datetime,

        -- Trip metrics
        passenger_count,
        trip_distance as trip_distance_miles,

        -- Financial metrics
        fare_amount,
        extra_amount,
        mta_tax_amount,
        tip_amount,
        tolls_amount,
        improvement_surcharge,
        congestion_surcharge,
        airport_fee,
        total_amount,

        -- Calculated: Trip duration in minutes
        datediff('minute', pickup_datetime, dropoff_datetime) as trip_duration_minutes,

        -- Calculated: Speed in mph (with safety check for division by zero)
        case
            when datediff('minute', pickup_datetime, dropoff_datetime) > 0
            then round(
                trip_distance / (datediff('minute', pickup_datetime, dropoff_datetime) / 60.0),
                2
            )
            else null
        end as trip_speed_mph,

        -- Metadata
        data_year,
        data_month,
        current_timestamp as _loaded_at

    from staged_trips
    where
        -- Additional quality filters for enriched layer
        pickup_datetime < dropoff_datetime  -- Valid trip duration
        and datediff('minute', pickup_datetime, dropoff_datetime) <= 1440  -- Max 24 hours
)

select * from enriched
