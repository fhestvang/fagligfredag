-- Key Locker: Generates time surrogate key in HHMM format
-- Semantic key pattern for dim_time joins
-- Example: 09:30 -> 930, 14:05 -> 1405

{% macro get_time_key(datetime_column) %}
    cast(strftime({{ datetime_column }}, '%H') as integer) * 100
        + cast(strftime({{ datetime_column }}, '%M') as integer)
{% endmacro %}
