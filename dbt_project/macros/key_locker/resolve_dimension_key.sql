-- Key Locker: Resolves natural key to surrogate key with null handling
-- Returns unknown key (-1) when natural key is null
-- Centralizes key resolution logic for consistency

{% macro resolve_dimension_key(natural_key, default_value=none) %}
    coalesce({{ natural_key }}, {{ default_value if default_value is not none else get_unknown_key() }})
{% endmacro %}
