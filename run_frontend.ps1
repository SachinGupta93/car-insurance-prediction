# PowerShell script to run the frontend server
Write-Host "🚀 Starting Car Damage Prediction Frontend..." -ForegroundColor Green
Write-Host "📍 Port: 5173" -ForegroundColor Yellow
Write-Host "🔧 Environment: Development" -ForegroundColor Yellow
Write-Host "🔗 Backend API: http://localhost:5174/api" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Cyan

# Change to frontend directory
Set-Location -Path "frontend"

# Check if Node.js is available
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js 16+" -ForegroundColor Red
    exit 1
}

# Check if npm is available
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "✅ npm found: $(npm --version)" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
if (Test-Path "package.json") {
    if (!(Test-Path "node_modules")) {
        Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
        npm install
    } else {
        Write-Host "✅ Dependencies already installed" -ForegroundColor Green
    }
}

# Start the development server
Write-Host "🔥 Starting Vite development server..." -ForegroundColor Green
Write-Host "🌐 Frontend will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔄 Hot reload enabled" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

try {
    npm run dev
} catch {
    Write-Host "❌ Failed to start frontend server" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}