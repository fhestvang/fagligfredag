{{
    config(
        materialized='table'
    )
}}

with date_spine as (
    -- Generate dates from 2020-01-01 to 2030-12-31
    select
        cast('2020-01-01' as date) + interval (i) day as date_day
    from range(4018) as t(i)  -- ~11 years of dates
),

date_dimension as (
    select
        -- Surrogate key (YYYYMMDD format)
        cast(strftime(date_day, '%Y%m%d') as integer) as date_key,

        -- Date attributes
        date_day,

        -- Day attributes
        dayofweek(date_day) as day_of_week,  -- 0=Sunday in DuckDB
        dayname(date_day) as day_of_week_name,
        day(date_day) as day_of_month,
        dayofyear(date_day) as day_of_year,

        -- Week attributes
        weekofyear(date_day) as week_of_year,

        -- Month attributes
        month(date_day) as month_number,
        monthname(date_day) as month_name,
        date_trunc('month', date_day) as month_start_date,
        last_day(date_day) as month_end_date,

        -- Quarter attributes
        quarter(date_day) as quarter_number,
        'Q' || quarter(date_day) as quarter_name,

        -- Year attributes
        year(date_day) as year_number,

        -- Flags
        case when dayofweek(date_day) in (0, 6) then true else false end as is_weekend,
        false as is_holiday  -- Can be enhanced with actual holiday data

    from date_spine
)

select * from date_dimension
