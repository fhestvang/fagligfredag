# Git Workflow Standards

## Branch Naming
- `feature/<description>` - New features
- `fix/<description>` - Bug fixes
- `refactor/<description>` - Code improvements

## Commit Messages
- Use imperative mood ("Add feature" not "Added feature")
- Keep first line under 72 characters
- Reference issue numbers when applicable

## Multi-Agent Development
This project uses git worktrees for parallel development:
- `fagligfredag/` - Main orchestrator
- `fagligfredag-agent1/` - Agent 1 worktree
- `fagligfredag-agent2/` - Agent 2 worktree

### Worktree Rules
- Each agent works on separate branches
- Never force push to main
- Coordinate through main orchestrator
- Keep agent branches up to date with main

## PR Guidelines
- Create feature branches from main
- Squash commits when merging
- Delete branches after merge
- Include test results in PR description
