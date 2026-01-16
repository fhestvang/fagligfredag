{{
    config(
        materialized='incremental',
        unique_key='trip_key',
        incremental_strategy='merge'
    )
}}

-- Atomic fact table: One row per taxi trip
-- This is the primary fact table at the most granular level
-- All aggregate facts should be derived from this table

with enriched_trips as (
    select * from {{ ref('int_trips_enriched') }}

    {% if is_incremental() %}
    -- Only process new/updated records based on load timestamp
    where _loaded_at > (select max(_loaded_at) from {{ this }})
    {% endif %}
)

select
    -- Surrogate key
    trip_key,

    -- Dimension keys
    pickup_date_key,
    pickup_time_key,
    dropoff_date_key,
    dropoff_time_key,
    pickup_location_key,
    dropoff_location_key,
    payment_type_key,
    rate_code_key,
    vendor_key,

    -- Degenerate dimensions
    unique_id as trip_id,
    store_and_fwd_flag,
    taxi_type,

    -- Additive facts - trip metrics
    passenger_count,
    trip_distance_miles,
    trip_duration_minutes,

    -- Additive facts - financial
    fare_amount,
    extra_amount,
    mta_tax_amount,
    tip_amount,
    tolls_amount,
    improvement_surcharge,
    congestion_surcharge,
    airport_fee,
    total_amount,

    -- Semi-additive/derived facts
    trip_speed_mph,

    -- Metadata
    data_year,
    data_month,
    _loaded_at

from enriched_trips
