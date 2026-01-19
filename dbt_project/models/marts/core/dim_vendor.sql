{{
    config(
        materialized='table'
    )
}}

-- Vendor dimension with hash-based surrogate key
-- Separates surrogate key from natural key per Kimball methodology

with vendors as (
    select
        {{ generate_surrogate_key(['vendor_id']) }} as vendor_key,
        vendor_id,
        vendor_name,
        vendor_abbreviation
    from {{ ref('seed_vendors') }}

    union all

    -- Add unknown vendor for handling nulls
    select
        {{ get_unknown_key() }} as vendor_key,
        -1 as vendor_id,
        'Unknown' as vendor_name,
        'UNK' as vendor_abbreviation
)

select * from vendors
