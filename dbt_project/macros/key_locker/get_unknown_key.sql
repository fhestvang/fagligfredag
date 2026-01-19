-- Key Locker: Returns the standard unknown/default surrogate key value
-- Used when natural key is null or unresolved
-- Returns '-1' as string for consistent typing with hash-based keys

{% macro get_unknown_key() %}
    '-1'
{% endmacro %}

-- Alternative: For systems preferring a hash-based unknown key
{% macro get_unknown_key_hash() %}
    md5('-1')
{% endmacro %}
