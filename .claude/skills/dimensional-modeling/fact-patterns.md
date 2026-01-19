# Fact Table Design Patterns

## Three Types of Fact Tables

### 1. Transaction Fact Table
- **Grain**: One row per measurement event (e.g., one sale, one click)
- **Characteristics**: Unpredictably sparse or dense, can be enormous
- **Use when**: Recording individual business events
- **Example**: `fct_orders` with one row per order line

### 2. Periodic Snapshot Fact Table
- **Grain**: One row per entity per time period (day, week, month)
- **Characteristics**: Predictable row counts, many facts per row
- **Use when**: Tracking state over time (inventory levels, account balances)
- **Example**: `fct_daily_inventory` with inventory levels by product by day

### 3. Accumulating Snapshot Fact Table
- **Grain**: One row per pipeline/workflow instance
- **Characteristics**: Rows are UPDATED as process progresses, multiple date FKs
- **Use when**: Tracking processes with defined start/end (order fulfillment, claims)
- **Example**: `fct_order_fulfillment` tracking order->ship->deliver milestones

## Fact Types

| Type | Description | Example | Can Sum? |
|------|-------------|---------|----------|
| **Additive** | Sum across ALL dimensions | revenue, quantity | Yes, always |
| **Semi-additive** | Sum across SOME dimensions | account balance | Not across time |
| **Non-additive** | Cannot be summed | ratios, percentages | Never |

## Fact Table Template

```sql
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

    -- Additive facts
    quantity,
    unit_price,
    discount_amount,
    net_amount,

    -- Semi-additive facts (document clearly)
    -- account_balance,  -- cannot sum across time

    -- Non-additive facts
    unit_margin_percent,

    -- Metadata
    _loaded_at
FROM {{ ref('int_orders_enriched') }}
```

## Factless Fact Tables

Contain only dimension foreign keys, no numeric facts.

**Use cases:**
1. **Coverage tables**: What products are on promotion in which stores
2. **Event tracking**: Student attendance, page views without metrics
3. **Bridge tables**: Many-to-many relationships between dimensions

## Aggregate Fact Tables

Pre-calculated summaries for performance (100-1000x speedup).

```sql
-- fct_daily_sales_by_product.sql
{{ config(materialized='table') }}

SELECT
    date_key,
    product_key,
    store_key,
    SUM(quantity) as total_quantity,
    SUM(net_amount) as total_net_amount,
    COUNT(*) as transaction_count,
    AVG(unit_price) as avg_unit_price
FROM {{ ref('fct_sales') }}
GROUP BY 1, 2, 3
```

## Incremental Pattern (dbt)

```sql
{{ config(
    materialized='incremental',
    unique_key='order_key',
    incremental_strategy='merge',
    on_schema_change='append_new_columns'
) }}

SELECT
    {{ dbt_utils.generate_surrogate_key(['order_id', 'line_number']) }} as order_key,
    -- dimension keys, facts, metadata
    CURRENT_TIMESTAMP as _loaded_at
FROM {{ ref('int_orders_enriched') }}

{% if is_incremental() %}
WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```
