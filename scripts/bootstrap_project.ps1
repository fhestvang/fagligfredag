# bootstrap_project.ps1
# Quick setup script for new projects based on this template

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,

    [Parameter(Mandatory=$false)]
    [string]$TargetPath = ".."
)

$ErrorActionPreference = "Stop"

$FullPath = Join-Path $TargetPath $ProjectName

Write-Host "Creating new project: $ProjectName" -ForegroundColor Cyan
Write-Host "Target: $FullPath" -ForegroundColor Gray

# Create directory structure
$dirs = @(
    "$FullPath/.claude/agents",
    "$FullPath/.claude/commands",
    "$FullPath/.claude/skills",
    "$FullPath/.claude/rules",
    "$FullPath/scripts",
    "$FullPath/docs"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Host "  Created: $dir" -ForegroundColor Green
}

# Copy Claude configuration
$copyItems = @(
    @{From=".claude/agents/*.md"; To="$FullPath/.claude/agents/"},
    @{From=".claude/commands/*.md"; To="$FullPath/.claude/commands/"},
    @{From=".claude/skills/"; To="$FullPath/.claude/skills/"},
    @{From=".claude/rules/*.md"; To="$FullPath/.claude/rules/"},
    @{From=".claude/CLAUDE.md"; To="$FullPath/.claude/"},
    @{From="scripts/*.py"; To="$FullPath/scripts/"},
    @{From="scripts/*.ps1"; To="$FullPath/scripts/"}
)

foreach ($item in $copyItems) {
    if (Test-Path $item.From) {
        Copy-Item -Path $item.From -Destination $item.To -Recurse -Force
        Write-Host "  Copied: $($item.From)" -ForegroundColor Green
    }
}

# Create basic CLAUDE.md
$claudeMd = @"
# $ProjectName

## Project Overview
[Add project description]

## Tech Stack
[List technologies]

## Architecture
[Describe architecture]

## Development Workflow
[Document workflow]

## Code Standards
[List standards]

## See Also
- .claude/rules/ - Development standards
- .claude/agents/ - Specialized agents
- .claude/skills/ - Auto-triggered skills
"@

Set-Content -Path "$FullPath/CLAUDE.md" -Value $claudeMd

Write-Host "`nProject created successfully!" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd $FullPath"
Write-Host "  2. git init"
Write-Host "  3. Update CLAUDE.md with project details"
Write-Host "  4. Remove unused agents/skills"
