<#
.SYNOPSIS
    Removes a git worktree and cleans up its resources.

.DESCRIPTION
    Cleans up:
    - Git worktree reference
    - Virtual environment
    - Database file
    - Build artifacts

.PARAMETER Name
    Name of the worktree to remove (without 'fagligfredag-' prefix)

.PARAMETER Force
    Force removal even if there are uncommitted changes

.EXAMPLE
    .\remove_worktree.ps1 -Name "feature-api"

.EXAMPLE
    .\remove_worktree.ps1 -Name "feature-api" -Force
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Name,

    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Get paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MainRepo = Split-Path -Parent $ScriptDir
$WorktreeName = "fagligfredag-$Name"
$WorktreePath = Join-Path (Split-Path -Parent $MainRepo) $WorktreeName

Write-Host "Removing worktree: $WorktreeName" -ForegroundColor Cyan
Write-Host "  Location: $WorktreePath"
Write-Host ""

# Check if worktree exists
if (-not (Test-Path $WorktreePath)) {
    Write-Host "Error: Worktree not found: $WorktreePath" -ForegroundColor Red
    exit 1
}

# Check for uncommitted changes
Push-Location $WorktreePath
$status = git status --porcelain
Pop-Location

if ($status -and -not $Force) {
    Write-Host "Warning: Worktree has uncommitted changes:" -ForegroundColor Yellow
    Write-Host $status
    Write-Host ""
    Write-Host "Use -Force to remove anyway, or commit/stash changes first." -ForegroundColor Yellow
    exit 1
}

# Get branch name before removal
Push-Location $WorktreePath
$branch = git rev-parse --abbrev-ref HEAD
Pop-Location

# Remove the worktree
Write-Host "Removing git worktree..." -ForegroundColor Cyan

if ($Force) {
    git -C $MainRepo worktree remove --force $WorktreePath
} else {
    git -C $MainRepo worktree remove $WorktreePath
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to remove worktree" -ForegroundColor Red
    exit 1
}

# Prune worktree references
git -C $MainRepo worktree prune

Write-Host "Worktree removed successfully" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Removed: $WorktreePath"
Write-Host "Branch '$branch' still exists (not deleted)"
Write-Host ""
Write-Host "To delete the branch (if no longer needed):"
Write-Host "  git branch -d $branch"
Write-Host ""
Write-Host "Current worktrees:"
git -C $MainRepo worktree list
