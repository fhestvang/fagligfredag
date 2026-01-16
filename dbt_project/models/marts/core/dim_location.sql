{{
    config(
        materialized='table'
    )
}}

-- Basic location dimension derived from trip data
-- Uses location_id as both natural and surrogate key for simplicity
-- Can be enhanced later with full TLC zone data (borough, zone_name, etc.)

with locations_from_trips as (
    -- Get all unique location IDs from trip data
    select distinct pickup_location_id as location_id
    from {{ ref('stg_trips') }}
    where pickup_location_id is not null

    union

    select distinct dropoff_location_id as location_id
    from {{ ref('stg_trips') }}
    where dropoff_location_id is not null
),

location_dimension as (
    select
        location_id as location_key,  -- Using natural key as surrogate for simplicity
        location_id,
        'Unknown' as borough,  -- Can be enhanced with TLC zone data
        'Zone ' || location_id as zone_name,  -- Placeholder
        'Unknown' as service_zone
    from locations_from_trips

    union all

    -- Add unknown location for handling nulls
    select
        -1 as location_key,
        -1 as location_id,
        'Unknown' as borough,
        'Unknown' as zone_name,
        'Unknown' as service_zone
)

select * from location_dimension
