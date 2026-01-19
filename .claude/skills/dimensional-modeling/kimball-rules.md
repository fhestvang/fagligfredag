# Kimball's 10 Essential Rules

## Rule 1: Load Detailed Atomic Data
- Populate dimensional models with bedrock atomic (most granular) data
- Atomic data supports unpredictable filtering and grouping by users
- Never start with aggregated data - it limits analysis flexibility
- Atomic data has the most dimensionality and resists ad hoc attacks

## Rule 2: Structure Around Business Processes
- Business processes are activities performed by the organization (verbs)
- Each business process = one atomic fact table
- Examples: taking an order, billing a customer, shipping a product
- The grain is tied to the measurement event

## Rule 3: Every Fact Table Needs a Date Dimension
- Time is fundamental to business measurement
- Never use raw date fields in fact tables
- Date dimension enables calendar navigation, fiscal periods, holidays
- Use smart keys in YYYYMMDD format for date dimensions

## Rule 4: Same Grain for All Facts in a Fact Table
- Every fact in a single fact table MUST be at the same level of detail
- Mixed granularity causes bad calculations and overlapping data
- If facts have different grains, create separate fact tables

## Rule 5: Resolve Many-to-Many in Fact Tables
- M:M relationships belong in fact tables, not dimension tables
- Use bridge tables when a single fact associates with multiple dimension values
- Include weight factors in bridge tables for allocated calculations

## Rule 6: Resolve Many-to-One in Dimension Tables
- Denormalize hierarchical M:1 relationships into flattened dimension tables
- Dimension denormalization is the name of the game
- Avoid snowflaking unless absolutely necessary

## Rule 7: Store Labels and Filter Values in Dimensions
- All descriptive text attributes belong in dimension tables
- Never store text in fact tables (except degenerate dimensions)
- Ensures single version of truth for labels

## Rule 8: Use Surrogate Keys for Dimensions
- Every dimension table needs a surrogate key (system-generated integer)
- Never use operational/natural keys for joins to fact tables
- Surrogate keys enable SCD tracking, source independence, better performance
- Use -1 or negative integers for unknown/missing values

## Rule 9: Create Conformed Dimensions
- Conformed dimensions are defined once and reused across fact tables
- They deliver analytic consistency and reduce development costs
- Enterprise integration depends on conformed dimensions
- Use the Bus Matrix to plan conformed dimensions

## Rule 10: Balance Requirements with Business Acceptance
- DW/BI success requires business user adoption
- Continuously balance technical best practices with usability
- The best model is one that users actually use
