-- Custom test: Verify all trip locations exist in dim_location
-- This catches data quality issues where trips reference non-existent locations
-- Returns rows that violate the constraint (orphan keys)

with pickup_orphans as (
    select distinct f.pickup_location_key
    from {{ ref('fct_trips') }} f
    left join {{ ref('dim_location') }} d
        on f.pickup_location_key = d.location_key
    where d.location_key is null
),

dropoff_orphans as (
    select distinct f.dropoff_location_key
    from {{ ref('fct_trips') }} f
    left join {{ ref('dim_location') }} d
        on f.dropoff_location_key = d.location_key
    where d.location_key is null
)

select 'pickup' as location_type, pickup_location_key as orphan_key
from pickup_orphans
union all
select 'dropoff' as location_type, dropoff_location_key as orphan_key
from dropoff_orphans
