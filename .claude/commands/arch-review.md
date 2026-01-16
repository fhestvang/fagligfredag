# Architecture Review

Conduct architectural assessment of code changes or specified paths.

---

allowed_tools: Bash(git diff:*), Read, Grep, Glob, Task
argument_description: [optional file/directory paths]

---

## Context

```bash
git diff --staged --name-only
git diff HEAD --name-only
```

## Target Selection

1. **With arguments**: Review specified files/directories
2. **No arguments**: Review recent git changes

## Evaluation Framework

### Separation of Concerns
- Layer isolation (staging/intermediate/marts)
- Single responsibility per model
- Clear data flow direction

### dbt Best Practices
- Proper materialization strategy
- Incremental model efficiency
- Test coverage
- Documentation completeness

### Dimensional Modeling
- Grain declaration clarity
- Surrogate key consistency
- Conformed dimension usage
- Fact/dimension separation

### Scalability
- Query performance considerations
- Partition/cluster strategies
- Incremental vs full refresh

## Report Format

```
## Executive Summary
One paragraph overall assessment

## Strengths
- What's done well

## Risks
- Critical issues to address

## Recommendations
- Suggested improvements
```
