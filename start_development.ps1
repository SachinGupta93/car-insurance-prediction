# PowerShell script to start both backend and frontend servers
Write-Host "🚀 Car Damage Prediction - Development Startup" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

# Configuration
$BackendPort = 5174
$FrontendPort = 5173
$BackendPath = "backend"
$FrontendPath = "frontend"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  🔧 Backend Port: $BackendPort" -ForegroundColor White
Write-Host "  🎨 Frontend Port: $FrontendPort" -ForegroundColor White
Write-Host "  📂 Backend Path: $BackendPath" -ForegroundColor White
Write-Host "  📂 Frontend Path: $FrontendPath" -ForegroundColor White
Write-Host "=" * 60 -ForegroundColor Cyan

# Function to start backend
function Start-Backend {
    Write-Host "🔥 Starting Backend Server..." -ForegroundColor Green
    $env:FLASK_ENV = "development"
    $env:FLASK_DEBUG = "1"
    $env:DEV_MODE = "true"
    $env:PORT = $BackendPort
    
    Set-Location -Path $BackendPath
    
    if (Test-Path "requirements.txt") {
        Write-Host "📦 Installing Python dependencies..." -ForegroundColor Blue
        python -m pip install -r requirements.txt --quiet
    }
    
    Write-Host "🌐 Backend starting on http://localhost:$BackendPort" -ForegroundColor Cyan
    Start-Process -FilePath "python" -ArgumentList "main.py" -WindowStyle Normal
    
    # Return to root directory
    Set-Location -Path ".."
}

# Function to start frontend
function Start-Frontend {
    Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Green
    
    Set-Location -Path $FrontendPath
    
    if (Test-Path "package.json") {
        if (!(Test-Path "node_modules")) {
            Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Blue
            npm install
        }
    }
    
    Write-Host "🌐 Frontend starting on http://localhost:$FrontendPort" -ForegroundColor Cyan
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Normal
    
    # Return to root directory
    Set-Location -Path ".."
}

# Function to check if ports are available
function Test-Port {
    param($Port)
    $connection = New-Object System.Net.Sockets.TcpClient
    try {
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Main execution
try {
    # Check if ports are available
    if (Test-Port $BackendPort) {
        Write-Host "⚠️  Port $BackendPort is already in use" -ForegroundColor Yellow
    }
    
    if (Test-Port $FrontendPort) {
        Write-Host "⚠️  Port $FrontendPort is already in use" -ForegroundColor Yellow
    }
    
    # Start backend
    Start-Backend
    
    # Wait a bit before starting frontend
    Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Start frontend
    Start-Frontend
    
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "🎉 Development Environment Started!" -ForegroundColor Green
    Write-Host "🌐 Frontend: http://localhost:$FrontendPort" -ForegroundColor Cyan
    Write-Host "🔧 Backend: http://localhost:$BackendPort" -ForegroundColor Cyan
    Write-Host "📊 API Health: http://localhost:$BackendPort/api/health" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    
    Write-Host "💡 Tips:" -ForegroundColor Yellow
    Write-Host "  - Check console logs for debugging information" -ForegroundColor White
    Write-Host "  - Both servers have hot reload enabled" -ForegroundColor White
    Write-Host "  - Press Ctrl+C in each terminal to stop servers" -ForegroundColor White
    Write-Host "  - Test API connection with: python test_backend_connection.py" -ForegroundColor White
    
} catch {
    Write-Host "❌ Failed to start development environment" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Startup script completed!" -ForegroundColor Green