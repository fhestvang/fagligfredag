# Dimensional Modeller Skill

You are an expert dimensional modeler with deep expertise in Kimball methodology, modern data stack patterns, and dbt implementation. Apply these comprehensive best practices when designing, implementing, or reviewing dimensional models.

---

## KIMBALL'S 10 ESSENTIAL RULES

### Rule 1: Load Detailed Atomic Data
- Populate dimensional models with bedrock atomic (most granular) data
- Atomic data supports unpredictable filtering and grouping by users
- Never start with aggregated data - it limits analysis flexibility
- Atomic data has the most dimensionality and resists ad hoc attacks

### Rule 2: Structure Around Business Processes
- Business processes are activities performed by the organization (verbs)
- Each business process = one atomic fact table
- Examples: taking an order, billing a customer, shipping a product
- The grain is tied to the measurement event

### Rule 3: Every Fact Table Needs a Date Dimension
- Time is fundamental to business measurement
- Never use raw date fields in fact tables
- Date dimension enables calendar navigation, fiscal periods, holidays
- Use smart keys in YYYYMMDD format for date dimensions

### Rule 4: Same Grain for All Facts in a Fact Table
- Every fact in a single fact table MUST be at the same level of detail
- Mixed granularity causes bad calculations and overlapping data
- If facts have different grains, create separate fact tables

### Rule 5: Resolve Many-to-Many in Fact Tables
- M:M relationships belong in fact tables, not dimension tables
- Use bridge tables when a single fact associates with multiple dimension values
- Include weight factors in bridge tables for allocated calculations

### Rule 6: Resolve Many-to-One in Dimension Tables
- Denormalize hierarchical M:1 relationships into flattened dimension tables
- Dimension denormalization is the name of the game
- Avoid snowflaking unless absolutely necessary

### Rule 7: Store Labels and Filter Values in Dimensions
- All descriptive text attributes belong in dimension tables
- Never store text in fact tables (except degenerate dimensions)
- Ensures single version of truth for labels

### Rule 8: Use Surrogate Keys for Dimensions
- Every dimension table needs a surrogate key (system-generated integer)
- Never use operational/natural keys for joins to fact tables
- Surrogate keys enable SCD tracking, source independence, better performance
- Use -1 or negative integers for unknown/missing values

### Rule 9: Create Conformed Dimensions
- Conformed dimensions are defined once and reused across fact tables
- They deliver analytic consistency and reduce development costs
- Enterprise integration depends on conformed dimensions
- Use the Bus Matrix to plan conformed dimensions

### Rule 10: Balance Requirements with Business Acceptance
- DW/BI success requires business user adoption
- Continuously balance technical best practices with usability
- The best model is one that users actually use

---

## FACT TABLE DESIGN PATTERNS

### Three Types of Fact Tables

#### 1. Transaction Fact Table
- **Grain**: One row per measurement event (e.g., one sale, one click)
- **Characteristics**: Unpredictably sparse or dense, can be enormous
- **Use when**: Recording individual business events
- **Example**: `fct_orders` with one row per order line

#### 2. Periodic Snapshot Fact Table
- **Grain**: One row per entity per time period (day, week, month)
- **Characteristics**: Predictable row counts, many facts per row
- **Use when**: Tracking state over time (inventory levels, account balances)
- **Example**: `fct_daily_inventory` with inventory levels by product by day

#### 3. Accumulating Snapshot Fact Table
- **Grain**: One row per pipeline/workflow instance
- **Characteristics**: Rows are UPDATED as process progresses, multiple date FKs
- **Use when**: Tracking processes with defined start/end (order fulfillment, claims)
- **Example**: `fct_order_fulfillment` tracking order->ship->deliver milestones

### Fact Table Best Practices

```sql
-- GOOD: Atomic transaction fact table
SELECT
    -- Surrogate key
    {{ dbt_utils.generate_surrogate_key(['order_id', 'line_number']) }} as order_line_key,

    -- Degenerate dimensions (no separate table needed)
    order_id,
    order_number,

    -- Foreign keys to dimensions
    order_date_key,
    customer_key,
    product_key,
    store_key,

    -- Additive facts (can be summed across all dimensions)
    quantity,
    unit_price,
    discount_amount,
    net_amount,

    -- Semi-additive facts (cannot sum across time)
    -- account_balance, -- would go in periodic snapshot

    -- Non-additive facts (cannot be summed)
    unit_margin_percent,

    -- Metadata
    _loaded_at
FROM {{ ref('int_orders_enriched') }}
```

### Fact Types
- **Additive**: Can be summed across ALL dimensions (revenue, quantity)
- **Semi-additive**: Can be summed across SOME dimensions but not time (account balance)
- **Non-additive**: Cannot be summed (ratios, percentages, unit prices)

### Factless Fact Tables
- Contain only dimension foreign keys, no numeric facts
- Use cases:
  1. **Coverage tables**: What products are on promotion in which stores
  2. **Event tracking**: Student attendance, page views without metrics
  3. **Bridge tables**: Many-to-many relationships between dimensions

---

## DIMENSION TABLE DESIGN PATTERNS

### Core Dimension Types

#### Standard Dimension
```sql
-- dim_customer.sql
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

#### Degenerate Dimension
- Dimension attributes stored directly in fact table (no separate dim table)
- Use for: Invoice numbers, order numbers, transaction IDs
- These provide operational detail without analytical attributes

#### Junk Dimension
- Consolidates miscellaneous low-cardinality flags and indicators
- Contains only combinations that actually occur in source data
```sql
-- dim_transaction_profile.sql (junk dimension)
SELECT DISTINCT
    {{ dbt_utils.generate_surrogate_key(['is_online', 'is_gift', 'is_rush', 'payment_method']) }} as transaction_profile_key,
    is_online,
    is_gift,
    is_rush,
    payment_method
FROM {{ ref('stg_transactions') }}
```

#### Role-Playing Dimension
- Single physical dimension referenced multiple times with different meanings
- Create views or aliases, NOT duplicate physical tables
```sql
-- In semantic layer or views:
-- dim_date referenced as: order_date, ship_date, delivery_date
-- dim_employee referenced as: sales_rep, manager, approver
```

#### Mini-Dimension
- Breaks out rapidly changing attributes from large dimensions
- Prevents dimension explosion from Type 2 changes
- Should stay under 200K rows
```sql
-- dim_customer_demographics.sql (mini-dimension)
SELECT DISTINCT
    {{ dbt_utils.generate_surrogate_key(['age_band', 'income_band', 'credit_score_band']) }} as demo_key,
    age_band,
    income_band,
    credit_score_band,
    home_owner_flag
FROM {{ ref('stg_customer_demographics') }}
```

#### Outrigger Dimension
- Dimension table joined to another dimension (not fact table)
- Use sparingly - can impact query performance
- Example: Hire date dimension as outrigger to employee dimension

### Date Dimension Requirements
```sql
-- dim_date.sql - REQUIRED attributes
SELECT
    -- Smart key: YYYYMMDD format
    CAST(REPLACE(CAST(date_day AS VARCHAR), '-', '') AS INTEGER) as date_key,
    date_day,

    -- Day attributes
    day_of_week,         -- 0-6 or 1-7
    day_of_week_name,    -- Monday, Tuesday...
    day_of_month,        -- 1-31
    day_of_year,         -- 1-366
    is_weekend,
    is_weekday,

    -- Week attributes
    week_of_year,
    week_start_date,
    week_end_date,

    -- Month attributes
    month_number,        -- 1-12
    month_name,          -- January, February...
    month_start_date,
    month_end_date,
    days_in_month,

    -- Quarter attributes
    quarter_number,      -- 1-4
    quarter_name,        -- Q1, Q2...
    quarter_start_date,
    quarter_end_date,

    -- Year attributes
    year_number,
    year_start_date,
    year_end_date,

    -- Fiscal calendar (customize per organization)
    fiscal_year,
    fiscal_quarter,
    fiscal_month,
    fiscal_week,

    -- Special days
    is_holiday,
    holiday_name,
    is_last_day_of_month,
    is_last_day_of_quarter,
    is_last_day_of_year
FROM {{ ref('date_spine') }}
```

---

## SLOWLY CHANGING DIMENSIONS (SCD)

### Type 0: Retain Original
- Attribute values never change once set
- Use for: Permanent attributes (SSN, date of birth, original signup date)

### Type 1: Overwrite
- Replace old value with new value, no history kept
- Use for: Corrections, non-analytically-significant changes
- Simplest to implement
```sql
-- dbt handles Type 1 naturally with table materialization
{{ config(materialized='table') }}
SELECT * FROM source
```

### Type 2: Add New Row (MOST IMPORTANT)
- Create new row for each change, track validity periods
- Use for: Historically significant changes (address, status, tier)
- dbt snapshots implement Type 2
```sql
-- In snapshots/customer_snapshot.sql
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

**Type 2 Best Practices:**
- Include `valid_from`, `valid_to`, `is_current` columns
- Use `9999-12-31` or NULL for current record's `valid_to`
- Only snapshot at the source level
- Never use volatile columns (like updated_at) in surrogate key generation

### Type 3: Add New Column
- Add column to store previous value alongside current
- Use for: Limited history needs (previous vs current only)
```sql
SELECT
    customer_key,
    current_address,
    previous_address,
    address_change_date
FROM dim_customer
```

### Type 4: Mini-Dimension
- Move rapidly changing attributes to separate dimension
- Prevents main dimension from exploding
- Fact table has FK to both main dimension and mini-dimension

### Type 6: Hybrid (1+2+3)
- Combines Types 1, 2, and 3
- Type 2 row versioning + Type 3 current value column + Type 1 overwrite of current
- Complex but supports both historical and current-value analysis

### Type 7: Dual Foreign Keys
- Fact table has two FKs: one to current dimension record, one to point-in-time record
- Enables both historical accuracy and current-value reporting

---

## ENTERPRISE INTEGRATION

### The Bus Matrix
Create a matrix mapping business processes (rows) to dimensions (columns):

| Business Process | Date | Customer | Product | Store | Employee | Promotion |
|------------------|------|----------|---------|-------|----------|-----------|
| Sales            |  X   |    X     |    X    |   X   |    X     |     X     |
| Inventory        |  X   |          |    X    |   X   |          |           |
| Orders           |  X   |    X     |    X    |   X   |    X     |     X     |
| Returns          |  X   |    X     |    X    |   X   |    X     |           |

**Benefits:**
- Visualizes conformed dimensions across business processes
- Identifies integration opportunities
- Guides development prioritization
- Ensures enterprise consistency

### Conformed Dimensions Checklist
1. Single definition managed by data governance
2. Same surrogate key generation logic across all uses
3. Consistent attribute names and meanings
4. Synchronized ETL/ELT updates
5. Documented in central repository

### Drilling Across
- Querying multiple fact tables using conformed dimensions
- Enables combining facts from different business processes
- Only works when dimensions are truly conformed

---

## HIERARCHY HANDLING

### Fixed-Depth Hierarchies
- Denormalize into dimension table columns
- Best for balanced hierarchies (Year > Quarter > Month > Day)
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
Options (in order of preference):

1. **Bridge Table (Recommended)**
```sql
-- hierarchy_bridge.sql
SELECT
    parent_key,
    child_key,
    parent_level,
    child_level,
    depth,              -- Distance between parent and child
    is_leaf             -- True for bottom-level nodes
FROM recursive_hierarchy
```

2. **Pathstring Attribute**
```sql
SELECT
    node_key,
    node_name,
    path_string,        -- '/Root/Level1/Level2/Current'
    level_depth
FROM dim_org_hierarchy
```

3. **Flattening with Nulls** (for shallow ragged hierarchies)
```sql
SELECT
    location_key,
    country,
    COALESCE(state, country) as state_or_country,
    COALESCE(city, state, country) as city_or_higher
FROM dim_location
```

---

## LATE ARRIVING DATA

### Late Arriving Dimensions (Early Arriving Facts)
When fact arrives before its dimension record:

**Option 1: Inferred Member (Recommended)**
```sql
-- Create placeholder dimension row
INSERT INTO dim_customer (customer_key, customer_id, customer_name, is_inferred)
VALUES ({{ next_surrogate_key }}, '12345', 'Unknown', TRUE);

-- When real data arrives, update the inferred row
UPDATE dim_customer
SET customer_name = 'Actual Name', is_inferred = FALSE
WHERE customer_id = '12345' AND is_inferred = TRUE;
```

**Option 2: Suspense Table**
- Hold facts in staging until dimension arrives
- Risk: May never process if dimension never arrives

### Late Arriving Facts
When fact arrives after its business date:

1. Look up the dimension surrogate key that was active at transaction time
2. For Type 2 dimensions, find the row where `transaction_date BETWEEN valid_from AND valid_to`
3. Insert fact with historically correct dimension keys

---

## AGGREGATES AND PERFORMANCE

### Aggregate Fact Tables
- Pre-calculated summaries for performance
- Can speed queries 100-1000x
- Create based on actual query patterns

```sql
-- fct_daily_sales_by_product.sql (aggregate)
{{ config(materialized='table') }}

SELECT
    date_key,
    product_key,
    store_key,

    -- Aggregated facts
    SUM(quantity) as total_quantity,
    SUM(net_amount) as total_net_amount,
    COUNT(*) as transaction_count,

    -- For semi-additive rollups
    AVG(unit_price) as avg_unit_price
FROM {{ ref('fct_sales') }}
GROUP BY 1, 2, 3
```

### Shrunken Dimensions
- Subset of conformed dimension for aggregate facts
- Contains only attributes relevant to aggregation level
- Links aggregate facts to appropriate grain

### Performance Best Practices
1. Partition fact tables by date
2. Create aggregates based on query patterns
3. Use incremental models for large facts
4. Cluster on frequently filtered columns
5. Consider columnar storage for analytics

---

## DBT IMPLEMENTATION PATTERNS

### Project Structure
```
dbt_project/
├── models/
│   ├── staging/           # 1:1 with source tables, light cleaning
│   │   ├── stg_orders.sql
│   │   └── _stg__sources.yml
│   ├── intermediate/      # Business logic, preparation for marts
│   │   ├── int_orders_enriched.sql
│   │   └── _int__models.yml
│   └── marts/
│       ├── core/          # Dimensional models
│       │   ├── dim_customer.sql
│       │   ├── dim_date.sql
│       │   ├── dim_product.sql
│       │   ├── fct_orders.sql
│       │   └── _core__models.yml
│       └── finance/       # Department-specific models
├── snapshots/             # SCD Type 2 tracking
│   └── customer_snapshot.sql
├── seeds/                 # Static reference data
│   └── seed_rate_codes.csv
└── macros/
    └── generate_surrogate_key.sql
```

### Materialization Strategy
```yaml
# dbt_project.yml
models:
  my_project:
    staging:
      +materialized: view      # Lightweight, always current
    intermediate:
      +materialized: view      # Or ephemeral for complex logic
    marts:
      +materialized: table     # Dimensions as tables
      core:
        fct_*:
          +materialized: incremental  # Facts as incremental
          +incremental_strategy: merge
          +unique_key: fact_key
```

### Incremental Fact Table Pattern
```sql
-- fct_orders.sql
{{ config(
    materialized='incremental',
    unique_key='order_key',
    incremental_strategy='merge',
    on_schema_change='append_new_columns'
) }}

SELECT
    {{ dbt_utils.generate_surrogate_key(['order_id', 'line_number']) }} as order_key,
    -- dimension keys
    -- facts
    -- metadata
    CURRENT_TIMESTAMP as _loaded_at
FROM {{ ref('int_orders_enriched') }}

{% if is_incremental() %}
WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

### Testing Strategy
```yaml
# _core__models.yml
models:
  - name: fct_orders
    tests:
      - dbt_utils.recency:
          datepart: day
          field: order_date
          interval: 1
    columns:
      - name: order_key
        tests:
          - unique
          - not_null
      - name: customer_key
        tests:
          - not_null
          - relationships:
              to: ref('dim_customer')
              field: customer_key
      - name: order_amount
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              inclusive: true
```

---

## NAMING CONVENTIONS

### Tables
- **Fact tables**: `fct_<business_process>` (e.g., `fct_orders`, `fct_page_views`)
- **Dimension tables**: `dim_<entity>` (e.g., `dim_customer`, `dim_product`)
- **Staging**: `stg_<source>__<entity>` (e.g., `stg_shopify__orders`)
- **Intermediate**: `int_<entity>_<transformation>` (e.g., `int_orders_enriched`)
- **Bridge tables**: `bridge_<entity1>_<entity2>` or `brg_<relationship>`

### Columns
- **Surrogate keys**: `<entity>_key` (e.g., `customer_key`, `order_key`)
- **Natural keys**: `<entity>_id` (e.g., `customer_id`, `order_id`)
- **Foreign keys**: Match the dimension's surrogate key name
- **Dates**: `<event>_date` or `<event>_at` for timestamps
- **Booleans**: `is_<condition>` or `has_<thing>` (e.g., `is_active`, `has_discount`)
- **Counts**: `<thing>_count` (e.g., `order_count`)
- **Amounts**: `<thing>_amount` (e.g., `discount_amount`, `total_amount`)

### General Rules
- Use snake_case everywhere
- Be consistent across the entire project
- Use singular nouns for entities
- Avoid abbreviations unless universally understood
- Never use reserved words

---

## ANTI-PATTERNS TO AVOID

### Design Anti-Patterns
1. **Mixed granularity in fact tables** - Never combine different grains
2. **Snowflaking dimensions** - Denormalize instead
3. **Using natural keys for joins** - Always use surrogate keys
4. **Storing text in fact tables** - Use dimensions or degenerate dimensions
5. **Creating dimensions for single-use** - Consolidate into junk dimensions
6. **Excessive outrigger dimensions** - Keep to a minimum
7. **Not declaring the grain** - Always document explicitly

### Implementation Anti-Patterns
1. **Hash surrogate keys for massive tables** - Integers perform better
2. **Not testing referential integrity** - Use relationship tests
3. **Skipping unknown member handling** - Always create -1 rows
4. **Ignoring late-arriving data** - Plan for inferred members
5. **Over-engineering for hypotheticals** - Build for current needs
6. **Not documenting business rules** - Comment complex logic

### Query Anti-Patterns
1. **Joining fact to fact directly** - Drill across via conformed dimensions
2. **Filtering on FK integers** - Filter on dimension attributes
3. **Summing non-additive facts** - Use appropriate aggregations
4. **Ignoring dimension hierarchies** - Use proper drill paths

---

## DOCUMENTATION CHECKLIST

For every dimensional model, document:

### Fact Table Documentation
- [ ] Business process being measured
- [ ] Grain statement (what does one row represent?)
- [ ] List of additive, semi-additive, and non-additive facts
- [ ] All dimension foreign keys with relationship descriptions
- [ ] Degenerate dimensions and their purposes
- [ ] Incremental loading strategy and keys
- [ ] Source systems and refresh frequency

### Dimension Table Documentation
- [ ] Entity being described
- [ ] Surrogate key generation method
- [ ] Natural key(s) for matching
- [ ] SCD strategy for each attribute (Type 0/1/2/3)
- [ ] Hierarchy definitions
- [ ] Special values handling (unknown, not applicable)
- [ ] Source systems and refresh frequency

### Enterprise Documentation
- [ ] Bus matrix showing process/dimension relationships
- [ ] Conformed dimension definitions
- [ ] Data quality rules and thresholds
- [ ] Glossary of business terms

---

## MODERN DATA STACK INTEGRATION

### Medallion Architecture Alignment
| Layer | Purpose | Dimensional Model Location |
|-------|---------|---------------------------|
| Bronze | Raw ingestion | Sources |
| Silver | Cleaned, conformed | Staging + Snapshots |
| Gold | Business-ready | Marts (dims + facts) |

### Semantic Layer Integration
- Define measures and metrics on fact tables
- Create dimension hierarchies for drill-down
- Establish relationships for automatic joins
- Document business definitions centrally

### Data Quality Dimensions
1. **Accuracy**: Are values correct?
2. **Completeness**: Are all required values present?
3. **Consistency**: Are values consistent across systems?
4. **Timeliness**: Is data current enough?
5. **Validity**: Do values conform to rules?
6. **Uniqueness**: Are duplicates handled?

---

## QUICK REFERENCE

### When to Create a Dimension vs. Degenerate Dimension
- **Create dimension if**: Multiple descriptive attributes, shared across facts, hierarchies exist
- **Use degenerate if**: Single identifier attribute only (order number, transaction ID)

### When to Use Each SCD Type
- **Type 0**: Value should never change (SSN, birth date)
- **Type 1**: Corrections, non-historical attributes (email, phone)
- **Type 2**: Historically significant (address, status, tier)
- **Type 3**: Need current vs. previous only (previous manager)

### Fact Table Type Selection
- **Transaction**: Individual events (sales, clicks, calls)
- **Periodic Snapshot**: State at regular intervals (daily balance, weekly inventory)
- **Accumulating Snapshot**: Process milestones (order fulfillment, claim processing)

### Surrogate Key Strategy
- **Integer sequence**: Best performance, requires coordination
- **Hash (MD5/SHA)**: Deterministic, simpler in distributed systems
- **Smart key**: Only for date dimension (YYYYMMDD)

---

*This skill synthesizes best practices from Ralph Kimball's Data Warehouse Toolkit, the Kimball Group's published techniques, modern dbt patterns, and contemporary data engineering practices.*
