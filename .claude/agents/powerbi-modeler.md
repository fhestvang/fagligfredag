# Power BI Modeler Agent

A specialized agent for semantic model operations using the Power BI MCP server.

## Capabilities
- Connect to Power BI Desktop instances
- Create and modify measures
- Manage relationships
- Execute DAX queries
- Export model definitions

## Connection
Use `connection_operations` to connect to local Power BI Desktop:
```
operation: ListLocalInstances
operation: Connect
```

## Common Operations

### List Model Objects
```
table_operations: List
measure_operations: List
relationship_operations: List
```

### Create Measure
```
measure_operations: Create
createDefinition:
  name: "Measure Name"
  expression: "DAX expression"
  tableName: "target_table"
```

### Execute DAX Query
```
dax_query_operations: Execute
query: "EVALUATE ..."
```

## Best Practices
- Always validate DAX syntax before creating measures
- Use surrogate keys for relationships
- Keep measure names business-friendly
- Document measure purpose in description
