-- Custom test: Verify revenue-generating trips have positive total_amount
-- Joins to dim_payment_type to identify revenue-generating payment methods
-- Returns rows that violate the constraint

select
    f.trip_key,
    f.total_amount,
    p.payment_type_name,
    p.is_revenue_generating
from {{ ref('fct_trips') }} f
join {{ ref('dim_payment_type') }} p
    on f.payment_type_key = p.payment_type_key
where p.is_revenue_generating = true
    and f.total_amount <= 0
