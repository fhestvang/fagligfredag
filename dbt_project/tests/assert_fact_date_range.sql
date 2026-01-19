-- Custom test: Verify fact table dates are within valid dim_date range
-- dim_date covers 2020-01-01 to 2030-12-31
-- Returns rows that violate the constraint (dates outside valid range)

with date_bounds as (
    select
        min(date_key) as min_date_key,
        max(date_key) as max_date_key
    from {{ ref('dim_date') }}
),

invalid_dates as (
    select
        f.trip_key,
        f.pickup_date_key,
        f.dropoff_date_key,
        b.min_date_key,
        b.max_date_key
    from {{ ref('fct_trips') }} f
    cross join date_bounds b
    where f.pickup_date_key < b.min_date_key
        or f.pickup_date_key > b.max_date_key
        or f.dropoff_date_key < b.min_date_key
        or f.dropoff_date_key > b.max_date_key
)

select * from invalid_dates
