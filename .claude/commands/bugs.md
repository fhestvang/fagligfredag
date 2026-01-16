# Bug Finder

Analyze code for potential bugs, logic errors, and edge cases.

---

allowed_tools: Bash(git diff:*), Read, Grep, Glob
argument_description: [optional file/directory paths]

---

## Context

```bash
git diff --staged --name-only
git diff HEAD --name-only
```

## Target Selection

1. **With arguments**: Analyze specified files/directories
2. **No arguments**: Analyze recent git changes (staged first, then unstaged)

## Analysis Categories

### Logic Errors
- Off-by-one errors
- Incorrect boolean logic
- Impossible conditions
- Missing break statements

### Null/Undefined Access
- Unguarded property chains
- Unsafe array indexing
- Missing null checks

### SQL/dbt Specific
- Incorrect JOIN conditions
- Missing WHERE clauses in incremental models
- Wrong grain in aggregations
- Duplicate key generation
- Missing `{{ this }}` references

### Error Handling
- Silent failures
- Swallowed exceptions
- Missing error states

## Report Format

For each issue:
```
[SEVERITY] file:line - One sentence description
  Code: `problematic code`
  Impact: What could go wrong
  Fix: Suggested remediation
```

Severity: CRITICAL | WARNING | SUGGESTION
