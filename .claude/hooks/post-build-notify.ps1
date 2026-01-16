# Post-build hook for notifications
# Sends notification after dbt build completes

param(
    [Parameter(Mandatory=$true)]
    [string]$Status,

    [Parameter(Mandatory=$false)]
    [int]$ModelCount = 0,

    [Parameter(Mandatory=$false)]
    [int]$TestCount = 0
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

if ($Status -eq "success") {
    Write-Host "[$timestamp] Build completed successfully!" -ForegroundColor Green
    Write-Host "  Models: $ModelCount" -ForegroundColor Gray
    Write-Host "  Tests: $TestCount passed" -ForegroundColor Gray
}
else {
    Write-Host "[$timestamp] Build failed!" -ForegroundColor Red
    Write-Host "  Check logs for details" -ForegroundColor Gray
}
