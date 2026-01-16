# Power BI Development Standards

## Semantic Model Design
- Follow Kimball dimensional modeling (star schema)
- Use surrogate keys for dimension joins
- Keep fact tables at atomic grain when possible

## DAX Best Practices
- Use variables for complex calculations
- Avoid iterators when aggregations work
- Format measures with proper indentation
- Use CALCULATE with explicit filter context

## Naming Conventions
- **Measures**: Use descriptive names (e.g., `Total Revenue`, `Avg Trip Duration`)
- **Columns**: Use snake_case matching source
- **Tables**: Use singular nouns (e.g., `dim_date`, `fct_trips`)

## Relationship Guidelines
- Single active relationship per table pair
- Use USERELATIONSHIP for role-playing dimensions
- Cross-filter direction: Single unless specifically needed

## Performance Optimization
- Pre-aggregate in dbt when possible
- Limit imported columns to what's needed
- Use DirectQuery only when real-time required
