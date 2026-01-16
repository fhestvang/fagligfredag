{{
    config(
        materialized='table'
    )
}}

with time_spine as (
    -- Generate all minutes in a day (0-1439)
    select i as minute_of_day
    from range(1440) as t(i)
),

time_dimension as (
    select
        -- Surrogate key (HHMM format, e.g., 930 = 09:30, 1430 = 14:30)
        (minute_of_day // 60) * 100 + (minute_of_day % 60) as time_key,

        -- Time attributes
        make_time(minute_of_day // 60, minute_of_day % 60, 0) as time_of_day,
        minute_of_day // 60 as hour_24,
        case
            when minute_of_day // 60 = 0 then 12
            when minute_of_day // 60 > 12 then minute_of_day // 60 - 12
            else minute_of_day // 60
        end as hour_12,
        minute_of_day % 60 as minute,

        -- AM/PM
        case when minute_of_day // 60 < 12 then 'AM' else 'PM' end as am_pm,

        -- Time period classification
        case
            when minute_of_day // 60 between 5 and 11 then 'Morning'
            when minute_of_day // 60 between 12 and 16 then 'Afternoon'
            when minute_of_day // 60 between 17 and 20 then 'Evening'
            else 'Night'
        end as time_period,

        -- Rush hour flags (weekday consideration should be done at query time with dim_date)
        case
            when minute_of_day // 60 between 7 and 9 then true
            when minute_of_day // 60 between 16 and 19 then true
            else false
        end as rush_hour_flag,

        -- Peak demand hours for taxi (based on typical NYC patterns)
        case
            when minute_of_day // 60 between 7 and 9 then true
            when minute_of_day // 60 between 17 and 20 then true
            when minute_of_day // 60 between 22 and 23 then true  -- Late night entertainment
            else false
        end as is_peak_hour

    from time_spine
)

select * from time_dimension
