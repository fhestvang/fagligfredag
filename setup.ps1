# NYC Taxi Pipeline Setup Script
# Run this in PowerShell from the project root

Write-Host "Setting up NYC Taxi Data Pipeline..." -ForegroundColor Cyan

# Create virtual environment
Write-Host "`n1. Creating virtual environment..." -ForegroundColor Yellow
python -m venv .venv

# Activate virtual environment
Write-Host "`n2. Activating virtual environment..." -ForegroundColor Yellow
& .\.venv\Scripts\Activate.ps1

# Upgrade pip
Write-Host "`n3. Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install dependencies
Write-Host "`n4. Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Create data directory
Write-Host "`n5. Creating data directory..." -ForegroundColor Yellow
if (!(Test-Path -Path "data")) {
    New-Item -ItemType Directory -Path "data"
}

Write-Host "`n Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run dlt pipeline:  cd dlt_pipeline; python nyc_taxi_pipeline.py"
Write-Host "  2. Run dbt models:    cd dbt_project; dbt run"
