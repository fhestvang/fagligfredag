# Git Worktree Management

Create or manage git worktrees for multi-agent development.

---

allowed_tools: Bash(git:*)
argument_description: [new|list|remove] [name]

---

## Context

```bash
git worktree list
git branch -a
git remote show origin
```

## Commands

### `/worktree new agent3`
Creates new worktree with feature branch:
```bash
git fetch origin
git worktree add ../fagligfredag-agent3 -b feature/agent3-work origin/main
```

### `/worktree list`
Shows all worktrees and their branches.

### `/worktree remove agent3`
Removes a worktree:
```bash
git worktree remove ../fagligfredag-agent3
```

## Naming Convention

- Main repo: `fagligfredag/` (main branch)
- Agent worktrees: `fagligfredag-agent{N}/` (feature branches)

## Rules

1. Each worktree must have a unique branch
2. Cannot checkout a branch that's already checked out elsewhere
3. Always create feature branches from origin/main
4. Use descriptive branch names: `feature/agent1-dim-modeling`

## After Creating

Open the new worktree in VS Code:
```bash
code ../fagligfredag-agent3
```
