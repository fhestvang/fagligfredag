# Autonomous Agent Setup for Claude Code

This document describes how to configure Claude Code to run autonomously without permission prompts, enabling multi-hour unattended operation.

## The Problem

By default, Claude Code prompts for permission on every new tool/command type. This interrupts autonomous workflows and prevents long-running agent operations.

## Solution Overview

There are **three layers** of configuration needed for full autonomous operation:

| Layer | File/Setting | Purpose |
|-------|--------------|---------|
| VSCode Extension | VSCode User Settings | Enable bypass mode in the IDE |
| Project | `.claude/settings.local.json` | Project-specific permissions |
| User | `~/.claude/settings.json` | Global user permissions |

## VSCode Extension Configuration (CRITICAL)

**This is the most important step for VSCode users.**

Open VSCode Settings (JSON) and add:

```json
{
  "claudeCode.allowDangerouslySkipPermissions": true,
  "claudeCode.initialPermissionMode": "bypassPermissions"
}
```

**Both settings are required:**
- `allowDangerouslySkipPermissions` — **Enables** the bypass mode
- `initialPermissionMode` — **Activates** it for new conversations

Without both, the extension ignores project-level settings.

Reference: [GitHub Issue #12604](https://github.com/anthropics/claude-code/issues/12604)

## Project Settings (`.claude/settings.local.json`)

For project-specific permissions (not committed to git):

```json
{
  "permissions": {
    "allow": [
      "Bash",
      "Read",
      "Edit",
      "Write",
      "WebFetch",
      "WebSearch",
      "Task"
    ],
    "deny": [
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/secrets.*)",
      "Read(**/credentials.*)",
      "Read(**/profiles.yml)"
    ]
  }
}
```

### Wildcard Permissions

For full autonomy (use with caution):

```json
{
  "permissions": {
    "allow": ["*"],
    "deny": [
      "Read(**/.env)",
      "Read(**/secrets.*)"
    ]
  }
}
```

## User Settings (`~/.claude/settings.json`)

For global defaults across all projects:

```json
{
  "permissions": {
    "allow": [
      "Read",
      "WebFetch",
      "WebSearch"
    ]
  }
}
```

## CLI Usage (Headless Mode)

For CI/CD or scripted usage, use the `-p` flag with `--allowedTools`:

```bash
# Full autonomous operation
claude -p "Your task here" --allowedTools "Bash,Read,Edit,Write,WebFetch,WebSearch,Task"

# With dangerous skip (bypasses ALL permissions)
claude --dangerously-skip-permissions -p "Your task here"

# Pattern-based permissions
claude -p "Create a commit" --allowedTools "Bash(git:*),Read,Edit"
```

### Long-Running Operations

```bash
# Set max budget to prevent runaway costs
claude -p "Complex task" \
  --allowedTools "Bash,Read,Edit,Write" \
  --max-budget-usd 10.00

# Continue conversations across sessions
session_id=$(claude -p "Start analysis" --output-format json | jq -r '.session_id')
claude -p "Continue" --resume "$session_id" --allowedTools "Bash,Read,Edit"
```

## Permission Syntax Reference

| Pattern | Matches |
|---------|---------|
| `Bash` | All bash commands |
| `Bash(npm run build)` | Exact command only |
| `Bash(npm run:*)` | Commands starting with `npm run` |
| `Bash(git:*)` | All git commands |
| `Read` | All file reads |
| `Read(.env)` | Specific file |
| `Read(./secrets/**)` | Recursive directory |
| `Edit` | All file edits |
| `Write` | All file writes |
| `WebFetch` | All web fetches |
| `WebFetch(domain:example.com)` | Specific domain |
| `WebSearch` | All web searches |
| `Task` | Sub-agent spawning |
| `*` | Everything (wildcard) |

## Settings Precedence

Settings are evaluated in this order (first match wins):

1. **Managed settings** (`C:\Program Files\ClaudeCode\managed-settings.json`)
2. **Command-line arguments** (`--allowedTools`)
3. **Local project** (`.claude/settings.local.json`)
4. **Shared project** (`.claude/settings.json`)
5. **User settings** (`~/.claude/settings.json`)

## Environment Variables for Long Sessions

```bash
# Auto-compact context at 50% (prevents token limit errors)
set CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50

# Auto-exit after 5 seconds idle (for automated workflows)
set CLAUDE_CODE_EXIT_AFTER_STOP_DELAY=5000

# Disable background task interruptions
set CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1
```

## Sub-Agents and Task Tool

**Important:** When using `bypassPermissions`, all sub-agents (spawned via Task tool) inherit this mode. They have full autonomous access.

If you want sub-agents to have limited permissions, you must NOT use `bypassPermissions` - instead explicitly list allowed tools.

## Security Considerations

**WARNING:** Bash permission rules can be bypassed using:
- Command flag reordering
- Shell variables
- Output redirects

**Do not rely on Bash deny rules as a security boundary.**

For sensitive environments:
1. Use sandboxing (`sandbox.enabled: true`)
2. Limit to specific tools, not wildcards
3. Use deny rules for sensitive files only as a reminder, not security

## Troubleshooting

### Still Getting Prompts?

1. **VSCode users:** Ensure BOTH VSCode settings are configured
2. **Restart VSCode completely** (Cmd+Q / Alt+F4, not just reload)
3. **Start a new conversation** after changing settings
4. Check `~/.claude.json` for cached feature flags

### Sub-agents Prompting?

Sub-agents don't inherit project settings. Options:
- Use `bypassPermissions` mode (inherits to sub-agents)
- Use CLI with `--dangerously-skip-permissions`
- Avoid Task tool, do research directly in main conversation

### Settings Being Overwritten?

Claude Code may add specific rules when you approve prompts, overriding wildcards. Solutions:
- Make settings file read-only (temporary fix)
- Use `bypassPermissions` mode instead of wildcards

## Full Example Configuration

### VSCode Settings (User)
```json
{
  "claudeCode.allowDangerouslySkipPermissions": true,
  "claudeCode.initialPermissionMode": "bypassPermissions"
}
```

### Project Settings (`.claude/settings.local.json`)
```json
{
  "permissions": {
    "allow": [
      "Bash",
      "Read",
      "Edit",
      "Write",
      "WebFetch",
      "WebSearch",
      "Task",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/secrets.*)",
      "Read(**/credentials.*)",
      "Write(**/.env)",
      "Write(**/secrets.*)"
    ]
  }
}
```

## Sources

- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code Headless Mode](https://code.claude.com/docs/en/headless)
- [Anthropic Best Practices for Agentic Coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [GitHub Issue #12604 - VSCode Permission Settings](https://github.com/anthropics/claude-code/issues/12604)
- [Claude Code Settings Repository](https://github.com/feiskyer/claude-code-settings)
