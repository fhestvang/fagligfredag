{{
    config(
        materialized='table'
    )
}}

with vendors as (
    select
        vendor_id as vendor_key,
        vendor_id,
        vendor_name,
        vendor_abbreviation
    from {{ ref('seed_vendors') }}

    union all

    -- Add unknown vendor for handling nulls
    select
        -1 as vendor_key,
        -1 as vendor_id,
        'Unknown' as vendor_name,
        'UNK' as vendor_abbreviation
)

select * from vendors
