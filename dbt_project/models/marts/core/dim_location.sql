{{
    config(
        materialized='table'
    )
}}

-- Location dimension with hash-based surrogate key
-- Separates surrogate key from natural key per Kimball methodology
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
        {{ generate_surrogate_key(['location_id']) }} as location_key,
        location_id,
        'Unknown' as borough,  -- Can be enhanced with TLC zone data
        'Zone ' || location_id as zone_name,  -- Placeholder
        'Unknown' as service_zone
    from locations_from_trips

    union all

    -- Add unknown location for handling nulls
    select
        {{ get_unknown_key() }} as location_key,
        -1 as location_id,
        'Unknown' as borough,
        'Unknown' as zone_name,
        'Unknown' as service_zone
)

select * from location_dimension
