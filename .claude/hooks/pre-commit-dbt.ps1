# Pre-commit hook for dbt validation
# Validates dbt models compile before committing

$ErrorActionPreference = "Stop"

# Check if dbt files are staged
$stagedFiles = git diff --cached --name-only --diff-filter=ACM | Where-Object { $_ -match "\.sql$|\.yml$" }

if ($stagedFiles) {
    Write-Host "Validating dbt models..." -ForegroundColor Cyan

    Push-Location dbt_project
    try {
        # Compile to check for syntax errors
        dbt compile --quiet
        if ($LASTEXITCODE -ne 0) {
            Write-Host "dbt compile failed. Please fix errors before committing." -ForegroundColor Red
            exit 1
        }
        Write-Host "dbt validation passed!" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

exit 0
