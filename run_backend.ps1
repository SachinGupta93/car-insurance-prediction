# PowerShell script to run the backend server
Write-Host "🚀 Starting Car Damage Prediction Backend Server..." -ForegroundColor Green
Write-Host "📍 Port: 5174" -ForegroundColor Yellow
Write-Host "🔧 Environment: Development" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Cyan

# Set environment variables
$env:FLASK_ENV = "development"
$env:FLASK_DEBUG = "1"
$env:DEV_MODE = "true"
$env:PORT = "5174"

# Change to backend directory
Set-Location -Path "backend"

# Check if Python is available
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "✅ Python found" -ForegroundColor Green
} else {
    Write-Host "❌ Python not found. Please install Python 3.7+" -ForegroundColor Red
    exit 1
}

# Install requirements if needed
if (Test-Path "requirements.txt") {
    Write-Host "📦 Installing/updating requirements..." -ForegroundColor Blue
    python -m pip install -r requirements.txt
}

# Start the server
Write-Host "🔥 Starting Flask server..." -ForegroundColor Green
Write-Host "🌐 Backend will be available at: http://localhost:5174" -ForegroundColor Cyan
Write-Host "🛠️  API endpoints at: http://localhost:5174/api" -ForegroundColor Cyan
Write-Host "📊 Health check: http://localhost:5174/api/health" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

try {
    python main.py
} catch {
    Write-Host "❌ Failed to start backend server" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}