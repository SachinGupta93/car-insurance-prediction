# Car Damage Prediction Project Development Starter Script
# This script starts the backend API server and frontend development server

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  STARTING CAR DAMAGE PREDICTION   " -ForegroundColor Cyan
Write-Host "  DEVELOPMENT ENVIRONMENT          " -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Check for environment variable file
if (-not (Test-Path -Path ".env")) {
    Write-Host "Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating minimal .env file for development..." -ForegroundColor Yellow
    
    $envContent = @"
FLASK_ENV=development
DEV_MODE=true
FLASK_DEBUG=1
FIREBASE_API_KEY=dev-api-key
FIREBASE_PROJECT_ID=dev-project
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host ".env file created with development defaults" -ForegroundColor Green
}

# Check for Python
Write-Host "Checking for Python installation..." -ForegroundColor Blue
try {
    $pythonVersion = python --version
    Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Python not found! Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Check for Node.js
Write-Host "Checking for Node.js installation..." -ForegroundColor Blue
try {
    $nodeVersion = node --version
    Write-Host "Found Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js not found! Please install Node.js 14 or higher." -ForegroundColor Red
    exit 1
}

# Setting up backend
Write-Host "`nSetting up backend..." -ForegroundColor Magenta
Set-Location backend

# Check for Python virtual environment
if (-not (Test-Path -Path "venv" -PathType Container)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if (-not $?) {
        Write-Host "Error: Failed to create Python virtual environment!" -ForegroundColor Red
        exit 1
    }
}

# Activate virtual environment
Write-Host "Activating Python virtual environment..." -ForegroundColor Blue
try {
    .\venv\Scripts\Activate
    if (-not $?) { throw "Failed to activate virtual environment" }
} catch {
    Write-Host "Error: Failed to activate Python virtual environment!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "Installing/updating backend dependencies..." -ForegroundColor Blue
try {
    # Skip installing the backend as a package since it doesn't have setup.py or pyproject.toml
    
    # Just install requirements
    pip install -r requirements.txt
    if (-not $?) { throw "Failed to install requirements" }
    
    # If a backend-specific requirements file exists, install those too
    if (Test-Path -Path "requirements.txt") {
        pip install -r requirements.txt
        if (-not $?) { throw "Failed to install backend requirements" }
    }
} catch {
    Write-Host "Error: Failed to install backend dependencies!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    deactivate
    exit 1
}

# Set environment variables for development mode
$env:FLASK_ENV = "development"
$env:DEV_MODE = "true"
$env:FLASK_DEBUG = 1

# Start backend server in new terminal
Write-Host "Starting backend server..." -ForegroundColor Green
$backendCommand = "cd '$((Get-Location).Path)'; .\venv\Scripts\Activate; flask run --host=0.0.0.0 --port=5000 --debug"
Start-Process powershell -ArgumentList "-Command", $backendCommand

# Return to root directory
Set-Location ..

# Setup frontend
Write-Host "`nSetting up frontend..." -ForegroundColor Magenta
Set-Location frontend

# Install frontend dependencies
Write-Host "Installing/updating frontend dependencies..." -ForegroundColor Blue
try {
    npm install
    if (-not $?) { throw "Failed to install npm dependencies" }
} catch {
    Write-Host "Error: Failed to install frontend dependencies!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Set environment variable for frontend development
$env:VITE_API_BASE_URL = "http://localhost:5000/api"
$env:VITE_DEV_MODE = "true"

# Start frontend development server
Write-Host "Starting frontend development server..." -ForegroundColor Green
npm run dev

# Note: The script will wait at this point until the npm run dev command completes or is stopped
# When that happens, we'll clean up

Write-Host "`nDevelopment servers stopped" -ForegroundColor Yellow
Set-Location ..

# Reminder about stopping backend
Write-Host "`nRemember to close the backend server window when done!" -ForegroundColor Cyan
