# Multi-Agent Git Worktree Workflow

This project uses **git worktrees** to enable multiple Claude Code agents to work simultaneously on different features without conflicts.

---

## Directory Structure

```
C:\Users\{user}\
├── fagligfredag/           # Main worktree (main branch)
├── fagligfredag-agent1/    # Agent 1 worktree (feature branches)
├── fagligfredag-agent2/    # Agent 2 worktree (feature branches)
└── fagligfredag-agent3/    # Agent 3 worktree (feature branches)
```

Each directory is a **separate VS Code window** with its own Claude Code session.

---

## Setup (One-Time)

### 1. Clone the main repository
```bash
cd C:\Users\{user}
git clone https://github.com/fhestvang/fagligfredag.git
cd fagligfredag
```

### 2. Create agent worktrees
```bash
# Create worktree for agent1 on a new feature branch
git worktree add ../fagligfredag-agent1 -b feature/agent1-work

# Create worktree for agent2 on a new feature branch
git worktree add ../fagligfredag-agent2 -b feature/agent2-work

# Create worktree for agent3 on a new feature branch
git worktree add ../fagligfredag-agent3 -b feature/agent3-work
```

### 3. Open each in VS Code
```bash
code ../fagligfredag-agent1
code ../fagligfredag-agent2
code ../fagligfredag-agent3
```

---

## Daily Workflow

### Starting Work (Each Agent)

Before starting new work, sync with main:

```bash
# Fetch latest changes
git fetch origin

# Rebase your feature branch onto main
git rebase origin/main
```

Or create a fresh feature branch:
```bash
git fetch origin
git checkout -b feature/my-new-feature origin/main
```

### During Work

Each agent works independently on their branch:
- Agent 1: `feature/agent1-work` or `feature/specific-feature-name`
- Agent 2: `feature/agent2-work` or `feature/another-feature`
- Agent 3: `feature/agent3-work` or `feature/third-feature`

**Important:** Agents should work on **different files** when possible to avoid merge conflicts.

### Committing & Pushing

```bash
# Stage and commit
git add .
git commit -m "Description of changes"

# Push to remote
git push origin HEAD
```

### Creating a PR

```bash
gh pr create --base main --title "Feature title" --body "Description"
```

### Merging to Main

Option 1: Via GitHub UI
- Review and merge PR on GitHub
- Branch auto-deletes on merge

Option 2: Via CLI
```bash
gh pr merge {PR_NUMBER} --merge
```

### After Merge - Cleanup

```bash
# Prune deleted remote branches
git fetch origin --prune

# Switch to a new feature branch for next task
git checkout -b feature/next-task origin/main
```

---

## Coordination Between Agents

### Communication Pattern

| Agent | Role | Typical Tasks |
|-------|------|---------------|
| Main (fagligfredag) | Coordinator/Review | PR reviews, main branch management |
| Agent 1 | Feature development | New features, research tasks |
| Agent 2 | Feature development | Parallel features, refactoring |
| Agent 3 | Feature development | Testing, documentation, fixes |

### Avoiding Conflicts

1. **File ownership**: Assign different files/directories to each agent
2. **Sequential edits**: If agents must edit same file, merge one PR before the other starts
3. **Communication**: Use PR descriptions to note dependencies

### Syncing Shared Changes

When one agent's changes are merged and another agent needs them:

```bash
# In the agent worktree that needs the changes
git fetch origin
git rebase origin/main
```

If there are conflicts:
```bash
# Resolve conflicts in editor, then:
git add .
git rebase --continue
```

---

## Worktree Management

### List all worktrees
```bash
git worktree list
```

### Remove a worktree
```bash
# From the main repo directory
git worktree remove ../fagligfredag-agent1
```

### Switch branch in a worktree
```bash
# You cannot checkout a branch that's checked out elsewhere
# First, ensure no other worktree has that branch

git checkout -b new-feature-branch origin/main
```

### Important Constraint
**A branch can only be checked out in ONE worktree at a time.**

If you try to checkout `main` in an agent worktree:
```
fatal: 'main' is already checked out at 'C:/Users/.../fagligfredag'
```

Solution: Always use feature branches in agent worktrees.

---

## Common Scenarios

### Scenario 1: Agent needs changes from another agent's unmerged branch

```bash
# Agent 2 needs Agent 1's changes (not yet merged)
git fetch origin
git cherry-pick <commit-hash>
# OR
git merge origin/feature/agent1-work
```

### Scenario 2: Resolving merge conflicts in PR

```bash
# Fetch and rebase onto main
git fetch origin
git rebase origin/main

# Resolve conflicts
# Edit files to resolve...
git add .
git rebase --continue

# Force push to update PR
git push origin HEAD --force-with-lease
```

### Scenario 3: Starting fresh after project completion

```bash
# Delete old feature branch
git branch -D feature/old-task

# Create new branch from updated main
git fetch origin
git checkout -b feature/new-task origin/main
```

---

## Best Practices

1. **Keep branches short-lived** - Merge frequently to avoid large conflicts
2. **Descriptive branch names** - `feature/add-dim-modeller-skill` not `feature/work`
3. **Atomic commits** - One logical change per commit
4. **Sync often** - `git fetch origin` regularly to stay aware of changes
5. **Clean up** - Delete merged branches, prune remote references
6. **PR descriptions** - Document what changed and why for other agents

---

## Troubleshooting

### "Branch already checked out" error
Another worktree has that branch. Use a different branch or remove the other worktree.

### Worktree shows wrong branch
```bash
git worktree list  # Check current state
git checkout -b new-branch origin/main  # Switch to new branch
```

### Stale remote branches showing
```bash
git fetch origin --prune
git remote prune origin
```

### Need to see all branches (local + remote)
```bash
git branch -a
```
