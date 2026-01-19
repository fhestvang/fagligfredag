# Dimension Table Design Patterns

## Core Dimension Types

### Standard Dimension
```sql
SELECT
    -- Surrogate key (system-generated, stable)
    {{ dbt_utils.generate_surrogate_key(['customer_id']) }} as customer_key,

    -- Natural/business key (from source system)
    customer_id,

    -- Descriptive attributes (denormalized)
    customer_name,
    email,
    phone,

    -- Hierarchical attributes (flattened, not snowflaked)
    city,
    state,
    country,
    region,

    -- Categorical attributes
    customer_segment,
    customer_tier,

    -- Dates for analysis
    first_order_date,

    -- Audit
    _loaded_at
FROM {{ ref('stg_customers') }}
```

### Degenerate Dimension
- Dimension attributes stored directly in fact table (no separate dim table)
- Use for: Invoice numbers, order numbers, transaction IDs
- These provide operational detail without analytical attributes

### Junk Dimension
Consolidates miscellaneous low-cardinality flags and indicators.

```sql
-- dim_transaction_profile.sql
SELECT DISTINCT
    {{ dbt_utils.generate_surrogate_key(['is_online', 'is_gift', 'is_rush', 'payment_method']) }} as transaction_profile_key,
    is_online,
    is_gift,
    is_rush,
    payment_method
FROM {{ ref('stg_transactions') }}
```

### Role-Playing Dimension
Single physical dimension referenced multiple times with different meanings.

```sql
-- Create views or aliases, NOT duplicate tables
-- dim_date referenced as: order_date, ship_date, delivery_date
-- dim_employee referenced as: sales_rep, manager, approver
```

### Mini-Dimension
- Breaks out rapidly changing attributes from large dimensions
- Prevents dimension explosion from Type 2 changes
- Should stay under 200K rows

```sql
-- dim_customer_demographics.sql
SELECT DISTINCT
    {{ dbt_utils.generate_surrogate_key(['age_band', 'income_band', 'credit_score_band']) }} as demo_key,
    age_band,
    income_band,
    credit_score_band,
    home_owner_flag
FROM {{ ref('stg_customer_demographics') }}
```

### Outrigger Dimension
- Dimension table joined to another dimension (not fact table)
- Use sparingly - can impact query performance
- Example: Hire date dimension as outrigger to employee dimension

## Date Dimension (Required)

```sql
SELECT
    -- Smart key: YYYYMMDD format
    CAST(REPLACE(CAST(date_day AS VARCHAR), '-', '') AS INTEGER) as date_key,
    date_day,

    -- Day attributes
    day_of_week,
    day_of_week_name,
    day_of_month,
    day_of_year,
    is_weekend,
    is_weekday,

    -- Week attributes
    week_of_year,
    week_start_date,
    week_end_date,

    -- Month attributes
    month_number,
    month_name,
    month_start_date,
    month_end_date,
    days_in_month,

    -- Quarter attributes
    quarter_number,
    quarter_name,
    quarter_start_date,
    quarter_end_date,

    -- Year attributes
    year_number,
    year_start_date,
    year_end_date,

    -- Fiscal calendar
    fiscal_year,
    fiscal_quarter,
    fiscal_month,

    -- Special days
    is_holiday,
    holiday_name,
    is_last_day_of_month,
    is_last_day_of_quarter,
    is_last_day_of_year
FROM {{ ref('date_spine') }}
```

## Hierarchy Handling

### Fixed-Depth Hierarchies
Denormalize into dimension table columns.

```sql
SELECT
    product_key,
    product_name,
    subcategory_name,    -- Level 2
    category_name,       -- Level 1
    department_name      -- Level 0
FROM dim_product
```

### Ragged/Variable-Depth Hierarchies

**Option 1: Bridge Table (Recommended)**
```sql
SELECT
    parent_key,
    child_key,
    parent_level,
    child_level,
    depth,
    is_leaf
FROM recursive_hierarchy
```

**Option 2: Pathstring Attribute**
```sql
SELECT
    node_key,
    node_name,
    path_string,  -- '/Root/Level1/Level2/Current'
    level_depth
FROM dim_org_hierarchy
```

## Unknown Member Handling

Always create a -1 row for unknown/missing dimension values:

```sql
SELECT
    -1 as customer_key,
    'Unknown' as customer_id,
    'Unknown' as customer_name,
    -- ... other attributes as 'Unknown' or NULL
```
