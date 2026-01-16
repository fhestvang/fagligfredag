# Intelligent Commit

Create context-aware git commits based on conversation history.

---

allowed_tools: Bash(git status:*), Bash(git add:*), Bash(git diff:*), Bash(git commit:*), Bash(git log:*)
model: haiku
argument_description: [optional description] or [multi-commit request]

---

## Context

```bash
git status
git diff --staged
git diff
git log --oneline -5
```

## Behavior

**No arguments**: Commit only files related to recent conversation work
**With description**: Filter commits to match the provided context
**Multi-commit request**: Create separate commits for distinct change sets

## Rules

1. **Never commit everything blindly** - stage selectively based on conversation
2. **Ask for clarification** when file relevance is ambiguous
3. **Use conventional commits**: `type(scope): subject`
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation
   - `refactor`: Code restructuring
   - `test`: Adding tests
   - `chore`: Maintenance
4. **Imperative mood**: "Add feature" not "Added feature"
5. **No emojis** in commit messages
6. **Match project style** from git log

## Example

```bash
# Good
git commit -m "feat(dims): add dim_customer with SCD type 2 support"

# Bad
git commit -m "Added new customer dimension table"
```
