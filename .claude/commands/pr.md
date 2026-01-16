Create a pull request for the current branch.

Execute the following steps:
1. Check `git status` for uncommitted changes - if any exist, ask if they should be committed first
2. Get the current branch name and verify it's not main
3. Push the current branch to origin with `git push -u origin HEAD`
4. Create a PR using `gh pr create --fill`
5. Return the PR URL to the user
