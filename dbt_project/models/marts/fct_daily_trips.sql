-- Fact table: Daily trip aggregations
-- Provides daily metrics for taxi trips

with trips as (
    select * from {{ ref('stg_trips') }}
),

daily_agg as (
    select
        -- Date dimension
        date_trunc('day', pickup_datetime) as trip_date,
        taxi_type,

        -- Trip counts
        count(*) as total_trips,
        sum(passenger_count) as total_passengers,

        -- Distance metrics
        sum(trip_distance) as total_distance_miles,
        avg(trip_distance) as avg_distance_miles,

        -- Revenue metrics
        sum(fare_amount) as total_fare,
        sum(tip_amount) as total_tips,
        sum(total_amount) as total_revenue,
        avg(total_amount) as avg_trip_revenue,

        -- Payment breakdown
        sum(case when payment_type = 1 then 1 else 0 end) as credit_card_trips,
        sum(case when payment_type = 2 then 1 else 0 end) as cash_trips

    from trips
    group by 1, 2
)

select
    *,
    -- Calculated metrics
    round(total_tips / nullif(total_fare, 0) * 100, 2) as tip_percentage,
    round(total_revenue / nullif(total_trips, 0), 2) as revenue_per_trip,
    round(total_distance_miles / nullif(total_trips, 0), 2) as avg_trip_distance

from daily_agg
order by trip_date, taxi_type
