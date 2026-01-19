-- Key Locker: Generates date surrogate key in YYYYMMDD format
-- Semantic key pattern for dim_date joins
-- Example: 2024-01-15 -> 20240115

{% macro get_date_key(datetime_column) %}
    cast(strftime({{ datetime_column }}, '%Y%m%d') as integer)
{% endmacro %}
