-- Staging model for taxi trips
-- Cleans and standardizes raw trip data

with source as (
    select * from {{ source('nyc_taxi_raw', 'trips') }}
),

cleaned as (
    select
        -- IDs
        unique_id,
        vendor_id,
        pu_location_id as pickup_location_id,
        do_location_id as dropoff_location_id,

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
        extra,
        mta_tax,
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

    from source
    where
        -- Basic data quality filters
        trip_distance > 0
        and fare_amount > 0
        and total_amount > 0
)

select * from cleaned
