{{
    config(
        materialized='table'
    )
}}

with rate_codes as (
    select
        rate_code_id as rate_code_key,
        rate_code_id,
        rate_code_name,
        rate_category,
        is_flat_rate
    from {{ ref('seed_rate_codes') }}

    union all

    -- Add unknown rate code for handling nulls
    select
        -1 as rate_code_key,
        -1 as rate_code_id,
        'Unknown' as rate_code_name,
        'Other' as rate_category,
        false as is_flat_rate
)

select * from rate_codes
