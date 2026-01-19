# Dimensional Modeling Anti-Patterns

## Design Anti-Patterns

### 1. Mixed Granularity in Fact Tables
**Problem:** Combining different levels of detail in one table.
**Impact:** Bad calculations, overlapping data.
**Solution:** Create separate fact tables for different grains.

### 2. Snowflaking Dimensions
**Problem:** Normalizing dimension tables into multiple related tables.
**Impact:** Complex queries, poor performance.
**Solution:** Denormalize into flat dimension tables.

### 3. Using Natural Keys for Joins
**Problem:** Joining fact to dimension on business keys.
**Impact:** Breaks SCD tracking, poor performance.
**Solution:** Always use surrogate keys for joins.

### 4. Storing Text in Fact Tables
**Problem:** Putting descriptive attributes in facts.
**Impact:** Bloated facts, inconsistent labels.
**Solution:** Move to dimensions or use degenerate dimensions.

### 5. Creating Dimensions for Single-Use
**Problem:** One dimension per low-cardinality flag.
**Impact:** Dimension proliferation.
**Solution:** Consolidate into junk dimensions.

### 6. Excessive Outrigger Dimensions
**Problem:** Too many dimension-to-dimension relationships.
**Impact:** Query complexity, performance issues.
**Solution:** Denormalize or accept some redundancy.

### 7. Not Declaring the Grain
**Problem:** Ambiguous fact table meaning.
**Impact:** Incorrect aggregations, confused users.
**Solution:** Always document "one row = ..."

## Implementation Anti-Patterns

### 1. Hash Keys for Massive Tables
**Problem:** Using MD5/SHA for billions of rows.
**Impact:** Storage and join performance.
**Solution:** Integer sequences for large tables.

### 2. Not Testing Referential Integrity
**Problem:** Orphaned fact records.
**Impact:** Missing data in reports.
**Solution:** Use dbt relationship tests.

### 3. Skipping Unknown Member Handling
**Problem:** NULL foreign keys in facts.
**Impact:** Records disappear in inner joins.
**Solution:** Create -1 "Unknown" dimension rows.

### 4. Ignoring Late-Arriving Data
**Problem:** No plan for out-of-order records.
**Impact:** Missing or incorrect historical data.
**Solution:** Implement inferred members.

### 5. Over-Engineering for Hypotheticals
**Problem:** Building for imaginary requirements.
**Impact:** Complexity, maintenance burden.
**Solution:** Build for current needs only.

### 6. Not Documenting Business Rules
**Problem:** Complex logic without explanation.
**Impact:** Maintenance nightmare.
**Solution:** Comment all business logic.

## Query Anti-Patterns

### 1. Joining Fact to Fact Directly
**Problem:** Direct joins between fact tables.
**Impact:** Cartesian products, wrong results.
**Solution:** Drill across via conformed dimensions.

### 2. Filtering on FK Integers
**Problem:** WHERE customer_key = 1234.
**Impact:** Unmaintainable, error-prone.
**Solution:** Filter on dimension attributes.

### 3. Summing Non-Additive Facts
**Problem:** SUM(margin_percent).
**Impact:** Meaningless results.
**Solution:** Use appropriate aggregations (weighted avg).

### 4. Ignoring Dimension Hierarchies
**Problem:** Ad-hoc grouping without drill paths.
**Impact:** Inconsistent analysis.
**Solution:** Use proper hierarchy levels.

## Materialization Anti-Patterns

### 1. Everything as Tables
**Problem:** Materializing every model as table.
**Impact:** Wasted storage, slow builds.
**Solution:** Views for staging/intermediate.

### 2. Everything as Views
**Problem:** All models as views including facts.
**Impact:** Slow queries, repeated computation.
**Solution:** Tables for marts, incremental for facts.

### 3. Incremental When Not Needed
**Problem:** Incremental for small tables.
**Impact:** Unnecessary complexity.
**Solution:** Simple table for <10M rows.

### 4. Views on Views on Views
**Problem:** Deep view chains (5+ levels).
**Impact:** Query planning overhead, debugging difficulty.
**Solution:** Materialize intermediate checkpoints.

## Testing Checklist

```yaml
# Minimum tests for dimensional model
models:
  - name: fct_orders
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
```
