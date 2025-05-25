# Frontend development server startup script

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  STARTING CAR DAMAGE PREDICTION   " -ForegroundColor Cyan
Write-Host "  FRONTEND DEV SERVER              " -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Change to the frontend directory
Set-Location $PSScriptRoot\frontend

# Set environment variables for development
$env:VITE_API_BASE_URL = "http://localhost:5000/api"
$env:VITE_DEV_MODE = "true"

Write-Host "Starting frontend development server with environment:" -ForegroundColor Blue
Write-Host "VITE_API_BASE_URL = $env:VITE_API_BASE_URL" -ForegroundColor Yellow
Write-Host "VITE_DEV_MODE = $env:VITE_DEV_MODE" -ForegroundColor Yellow

# Run the development server
npm run dev
