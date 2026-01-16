{{
    config(
        materialized='table'
    )
}}

with payment_types as (
    select
        payment_type_code as payment_type_key,
        payment_type_code,
        payment_type_name,
        payment_category,
        is_revenue_generating
    from {{ ref('seed_payment_types') }}

    union all

    -- Add unknown payment type for handling nulls
    select
        -1 as payment_type_key,
        -1 as payment_type_code,
        'Unknown' as payment_type_name,
        'Other' as payment_category,
        false as is_revenue_generating
)

select * from payment_types
