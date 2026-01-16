-- Staging model for taxi trips
-- Cleans and standardizes raw trip data
-- All transformations happen here (raw layer is 1:1 copy)

with raw as (
    select * from {{ ref('raw_trips') }}
),

cleaned as (
    select
        -- IDs (using actual column names from dlt ingestion)
        unique_id,
        vendor_id,
        pu_location_id as pickup_location_id,
        do_location_id as dropoff_location_id,
        ratecode_id as rate_code_id,
        store_and_fwd_flag,

        -- Timestamps
        tpep_pickup_datetime as pickup_datetime,
        tpep_dropoff_datetime as dropoff_datetime,

        -- Trip details
        passenger_count,
        trip_distance,

        -- Payment
        payment_type,
        case payment_type
            when 1 then 'Credit card'
            when 2 then 'Cash'
            when 3 then 'No charge'
            when 4 then 'Dispute'
            when 5 then 'Unknown'
            when 6 then 'Voided trip'
            else 'Other'
        end as payment_type_name,

        -- Amounts
        fare_amount,
        extra as extra_amount,
        mta_tax as mta_tax_amount,
        tip_amount,
        tolls_amount,
        improvement_surcharge,
        total_amount,
        congestion_surcharge,
        airport_fee,

        -- Metadata
        _taxi_type as taxi_type,
        _data_year as data_year,
        _data_month as data_month

    from raw
    where
        -- Basic data quality filters
        trip_distance > 0
        and fare_amount > 0
        and total_amount > 0
)

select * from cleaned
