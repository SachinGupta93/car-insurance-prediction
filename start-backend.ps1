#!/usr/bin/env powershell

# Simple Flask backend startup script
Write-Host "Starting Car Damage Prediction Backend Server..." -ForegroundColor Cyan

# Set development environment variables
$env:FLASK_ENV = "development"
$env:DEV_MODE = "true"
$env:FLASK_DEBUG = 1

# Add PYTHONPATH to ensure modules can be found (important for imports)
$env:PYTHONPATH = $PSScriptRoot

# Get into the backend directory
Set-Location "$PSScriptRoot\backend"

# Start the Flask server
Write-Host "Starting Flask server on http://localhost:5000" -ForegroundColor Green
python -m flask run --host=0.0.0.0 --port=5000 --debug
