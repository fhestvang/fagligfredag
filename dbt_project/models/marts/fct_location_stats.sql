-- Fact table: Location-based statistics
-- Aggregates trip data by pickup/dropoff locations

with trips as (
    select * from {{ ref('stg_trips') }}
),

pickup_stats as (
    select
        pickup_location_id as location_id,
        'pickup' as location_type,
        count(*) as trip_count,
        sum(total_amount) as total_revenue,
        avg(trip_distance) as avg_trip_distance,
        avg(total_amount) as avg_fare
    from trips
    group by 1
),

dropoff_stats as (
    select
        dropoff_location_id as location_id,
        'dropoff' as location_type,
        count(*) as trip_count,
        sum(total_amount) as total_revenue,
        avg(trip_distance) as avg_trip_distance,
        avg(total_amount) as avg_fare
    from trips
    group by 1
)

select * from pickup_stats
union all
select * from dropoff_stats
