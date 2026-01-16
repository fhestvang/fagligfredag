<#
.SYNOPSIS
    Creates a new git worktree with isolated environment for multi-agent development.

.DESCRIPTION
    Sets up a new worktree with:
    - Isolated branch checkout
    - Own virtual environment
    - Fresh database copy
    - Proper configuration

.PARAMETER Name
    Name for the worktree (will be prefixed with 'fagligfredag-')

.PARAMETER Branch
    Branch name to checkout (creates new branch if doesn't exist)

.EXAMPLE
    .\create_worktree.ps1 -Name "feature-api" -Branch "feature/api-endpoints"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Name,

    [Parameter(Mandatory=$true)]
    [string]$Branch
)

$ErrorActionPreference = "Stop"

# Get paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MainRepo = Split-Path -Parent $ScriptDir
$WorktreeName = "fagligfredag-$Name"
$WorktreePath = Join-Path (Split-Path -Parent $MainRepo) $WorktreeName

Write-Host "Creating worktree: $WorktreeName" -ForegroundColor Cyan
Write-Host "  Location: $WorktreePath"
Write-Host "  Branch: $Branch"
Write-Host ""

# Check if worktree already exists
if (Test-Path $WorktreePath) {
    Write-Host "Error: Directory already exists: $WorktreePath" -ForegroundColor Red
    exit 1
}

# Check if branch exists
$branchExists = git -C $MainRepo branch --list $Branch
$remoteBranchExists = git -C $MainRepo branch -r --list "origin/$Branch"

if ($branchExists -or $remoteBranchExists) {
    Write-Host "Checking out existing branch: $Branch" -ForegroundColor Yellow
    git -C $MainRepo worktree add $WorktreePath $Branch
} else {
    Write-Host "Creating new branch: $Branch" -ForegroundColor Yellow
    git -C $MainRepo worktree add -b $Branch $WorktreePath
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to create worktree" -ForegroundColor Red
    exit 1
}

Write-Host "Worktree created successfully" -ForegroundColor Green
Write-Host ""

# Create data directory
$DataDir = Join-Path $WorktreePath "data"
if (-not (Test-Path $DataDir)) {
    New-Item -ItemType Directory -Path $DataDir | Out-Null
}

# Copy database if it exists in main
$MainDb = Join-Path $MainRepo "data\nyc_taxi.duckdb"
$WorktreeDb = Join-Path $DataDir "nyc_taxi.duckdb"

if (Test-Path $MainDb) {
    Write-Host "Copying database to worktree..." -ForegroundColor Cyan
    Copy-Item $MainDb $WorktreeDb
    Write-Host "Database copied: $WorktreeDb" -ForegroundColor Green
} else {
    Write-Host "No database found in main repo (will be created on first pipeline run)" -ForegroundColor Yellow
}

Write-Host ""

# Create virtual environment
Write-Host "Creating virtual environment..." -ForegroundColor Cyan
$VenvPath = Join-Path $WorktreePath ".venv"
python -m venv $VenvPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to create virtual environment" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
$PipPath = Join-Path $VenvPath "Scripts\pip.exe"
& $PipPath install -r (Join-Path $WorktreePath "requirements.txt") -q

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Dependencies installed" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Worktree setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Location: $WorktreePath"
Write-Host "Branch:   $Branch"
Write-Host ""
Write-Host "To start working:"
Write-Host "  cd $WorktreePath"
Write-Host "  .\.venv\Scripts\Activate.ps1"
Write-Host ""
Write-Host "To run dlt pipeline:"
Write-Host "  python dlt_pipeline\nyc_taxi_pipeline.py"
Write-Host ""
Write-Host "To run dbt:"
Write-Host "  cd dbt_project"
Write-Host "  python -c `"from dbt.cli.main import cli; cli()`" run"
Write-Host ""
