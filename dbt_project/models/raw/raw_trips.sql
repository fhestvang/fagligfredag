-- Raw layer: 1:1 copy of source data with no transformations
-- This model preserves the exact structure from dlt ingestion

select * from {{ source('nyc_taxi_raw', 'trips') }}
