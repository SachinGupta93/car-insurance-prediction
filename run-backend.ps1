# Simple backend startup script
# This script starts only the backend API server

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  STARTING CAR DAMAGE PREDICTION   " -ForegroundColor Cyan
Write-Host "  BACKEND SERVER                   " -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Set development environment variables
$env:FLASK_ENV = "development"
$env:DEV_MODE = "true"
$env:FLASK_DEBUG = "1"

Write-Host "Starting backend server on port 5000..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow

# Change to the backend directory
Set-Location $PSScriptRoot\backend

# Run the Flask development server directly with Python
python -c "from main import create_app; app = create_app(); app.run(host='0.0.0.0', port=5000, debug=True)"
