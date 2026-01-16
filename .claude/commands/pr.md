# Create Pull Request

Create a PR from current branch to main.

---

allowed_tools: Bash(git:*), Bash(gh:*)

---

## Context

```bash
git status
git log origin/main..HEAD --oneline
git diff origin/main..HEAD --stat
```

## Process

1. Check `git status` for uncommitted changes - if any exist, ask if they should be committed first
2. Get the current branch name and verify it's not main
3. Push current branch to origin with `git push -u origin HEAD`
4. Create PR with summary

## PR Template

```bash
gh pr create --base main --title "TYPE: Brief description" --body "$(cat <<'EOF'
## Summary
- Bullet points of changes

## Test plan
- [ ] How to verify

Generated with Claude Code
EOF
)"
```

## Title Conventions

- `feat: Add new feature`
- `fix: Resolve bug`
- `docs: Update documentation`
- `refactor: Restructure code`

## After Creation

Return the PR URL to the user.
