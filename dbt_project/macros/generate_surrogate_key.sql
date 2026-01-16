{% macro generate_surrogate_key(field_list) %}
    {# Generate MD5 hash surrogate key from list of fields #}
    {%- set fields = [] -%}
    {%- for field in field_list -%}
        {%- do fields.append("coalesce(cast(" ~ field ~ " as varchar), '')") -%}
    {%- endfor -%}
    md5({{ fields | join(" || '|' || ") }})
{% endmacro %}
