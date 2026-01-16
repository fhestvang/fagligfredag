{% macro date_spine(start_date, end_date) %}
    {# Generate a date spine between start and end dates #}
    with date_spine as (
        select
            cast('{{ start_date }}' as date) + interval (row_number() over () - 1) day as date_day
        from range(
            datediff('day', cast('{{ start_date }}' as date), cast('{{ end_date }}' as date)) + 1
        )
    )
    select date_day from date_spine
{% endmacro %}


{% macro time_spine() %}
    {# Generate a time spine for all minutes in a day (0-1439) #}
    with time_spine as (
        select
            row_number() over () - 1 as minute_of_day
        from range(1440)
    )
    select
        minute_of_day,
        make_time(minute_of_day // 60, minute_of_day % 60, 0) as time_of_day
    from time_spine
{% endmacro %}
