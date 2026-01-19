-- Intermediate model: Enriched trips with calculated fields and dimension keys
-- This layer prepares data for the fact table by:
-- 1. Calculating derived metrics (duration, speed)
-- 2. Generating dimension keys using Key Locker macros
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

        -- Date dimension keys (semantic YYYYMMDD format via Key Locker)
        {{ get_date_key('pickup_datetime') }} as pickup_date_key,
        {{ get_date_key('dropoff_datetime') }} as dropoff_date_key,

        -- Time dimension keys (semantic HHMM format via Key Locker)
        {{ get_time_key('pickup_datetime') }} as pickup_time_key,
        {{ get_time_key('dropoff_datetime') }} as dropoff_time_key,

        -- Location dimension keys (hash-based via Key Locker)
        -- Cast to integer to ensure consistent hashing with dimension tables
        case
            when pickup_location_id is null then {{ get_unknown_key() }}
            else {{ generate_surrogate_key(['cast(pickup_location_id as integer)']) }}
        end as pickup_location_key,
        case
            when dropoff_location_id is null then {{ get_unknown_key() }}
            else {{ generate_surrogate_key(['cast(dropoff_location_id as integer)']) }}
        end as dropoff_location_key,

        -- Other dimension keys (hash-based via Key Locker)
        -- Cast to integer to ensure consistent hashing with dimension tables
        case
            when payment_type is null then {{ get_unknown_key() }}
            else {{ generate_surrogate_key(['cast(payment_type as integer)']) }}
        end as payment_type_key,
        case
            when rate_code_id is null then {{ get_unknown_key() }}
            else {{ generate_surrogate_key(['cast(rate_code_id as integer)']) }}
        end as rate_code_key,
        case
            when vendor_id is null then {{ get_unknown_key() }}
            else {{ generate_surrogate_key(['cast(vendor_id as integer)']) }}
        end as vendor_key,

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
