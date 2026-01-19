# Slowly Changing Dimension (SCD) Patterns

## Type Overview

| Type | Strategy | History | Use Case |
|------|----------|---------|----------|
| 0 | Retain Original | None | Permanent attributes (SSN, birth date) |
| 1 | Overwrite | None | Corrections, non-analytical changes |
| 2 | Add New Row | Full | Historically significant (address, tier) |
| 3 | Add Column | Limited | Previous vs current only |
| 4 | Mini-Dimension | Separate | Rapidly changing attributes |
| 6 | Hybrid (1+2+3) | Full + Current | Complex historical needs |
| 7 | Dual FK | Full + Current | Both historical and current analysis |

## Type 0: Retain Original
- Attribute values never change once set
- Use for: SSN, date of birth, original signup date

## Type 1: Overwrite
- Replace old value with new value, no history kept
- Use for: Corrections, non-analytically-significant changes
- Simplest to implement

```sql
-- dbt handles Type 1 naturally with table materialization
{{ config(materialized='table') }}
SELECT * FROM source
```

## Type 2: Add New Row (Most Important)

Create new row for each change, track validity periods.

### dbt Snapshot Implementation
```sql
-- snapshots/customer_snapshot.sql
{% snapshot customer_snapshot %}
{{
    config(
        target_schema='snapshots',
        unique_key='customer_id',
        strategy='timestamp',
        updated_at='updated_at',
        invalidate_hard_deletes=True
    )
}}
SELECT * FROM {{ source('crm', 'customers') }}
{% endsnapshot %}
```

### Best Practices
- Include `valid_from`, `valid_to`, `is_current` columns
- Use `9999-12-31` or NULL for current record's `valid_to`
- Only snapshot at the source level
- Never use volatile columns (like updated_at) in surrogate key generation

### Result Structure
```
customer_key | customer_id | address      | valid_from | valid_to   | is_current
1001         | C123        | 123 Main St  | 2020-01-01 | 2022-06-15 | false
1002         | C123        | 456 Oak Ave  | 2022-06-15 | 9999-12-31 | true
```

## Type 3: Add New Column
- Store previous value alongside current
- Use for: Limited history needs (previous vs current only)

```sql
SELECT
    customer_key,
    current_address,
    previous_address,
    address_change_date
FROM dim_customer
```

## Type 4: Mini-Dimension
- Move rapidly changing attributes to separate dimension
- Prevents main dimension from exploding
- Fact table has FK to both main dimension and mini-dimension

```sql
-- Fact table with dual FKs
SELECT
    fact_key,
    customer_key,      -- Main dimension (stable attributes)
    customer_demo_key, -- Mini-dimension (changing attributes)
    -- facts
FROM fct_orders
```

## Type 6: Hybrid (1+2+3)
- Combines Types 1, 2, and 3
- Type 2 row versioning + Type 3 current value column + Type 1 overwrite of current
- Complex but supports both historical and current-value analysis

```sql
SELECT
    customer_key,
    customer_id,
    current_address,     -- Type 1: always current
    historical_address,  -- Type 2: value at this row's time
    previous_address,    -- Type 3: previous value
    valid_from,
    valid_to,
    is_current
FROM dim_customer_type6
```

## Type 7: Dual Foreign Keys
- Fact table has two FKs: one to current dimension record, one to point-in-time record
- Enables both historical accuracy and current-value reporting

```sql
SELECT
    fact_key,
    customer_key_current,     -- Always points to current row
    customer_key_historical,  -- Points to row valid at transaction time
    -- facts
FROM fct_orders
```

## Decision Guide

```
Is the attribute historically significant?
├── No → Type 1 (overwrite)
└── Yes → Do you need full history?
    ├── No → Type 3 (previous + current)
    └── Yes → Does it change frequently?
        ├── No → Type 2 (add row)
        └── Yes → Type 4 (mini-dimension)
```

## Late Arriving Dimensions

When fact arrives before its dimension record:

**Option 1: Inferred Member (Recommended)**
```sql
-- Create placeholder
INSERT INTO dim_customer (customer_key, customer_id, customer_name, is_inferred)
VALUES ({{ next_key }}, '12345', 'Unknown', TRUE);

-- Update when real data arrives
UPDATE dim_customer
SET customer_name = 'Actual Name', is_inferred = FALSE
WHERE customer_id = '12345' AND is_inferred = TRUE;
```

**Option 2: Suspense Table**
- Hold facts in staging until dimension arrives
- Risk: May never process if dimension never arrives
