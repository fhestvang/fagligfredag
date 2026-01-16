# Git Rebase

Rebase current branch onto remote upstream with automatic stash handling.

---

allowed_tools: Bash(git:*)
argument_description: [optional branch name, defaults to tracking branch]

---

## Context

```bash
git status
git branch -vv
git remote -v
```

## Usage

- `/rebase` - Rebase onto tracking branch
- `/rebase main` - Rebase onto origin/main
- `/rebase feature/xyz` - Rebase onto origin/feature/xyz

## Process

1. Check for uncommitted changes, stash if needed
2. Fetch latest from origin
3. Determine target branch:
   - Use argument if provided
   - Otherwise use tracking branch
   - Fallback to origin/main
4. Execute rebase
5. Restore stashed changes

## Safety

- **Never proceed** if already in a rebase operation
- **Abort** if no remote configured
- **Provide guidance** for conflict resolution

## Conflict Resolution

If conflicts occur:
```bash
# Edit conflicted files
git add <resolved-files>
git rebase --continue
```

To abort:
```bash
git rebase --abort
```
