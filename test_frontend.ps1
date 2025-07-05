# PowerShell script to test the frontend with fallback data
Write-Host "🧪 Testing Car Damage Prediction Frontend" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan

# Change to frontend directory
Set-Location -Path "frontend"

# Check if dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
    npm install
}

# Check if .env.local exists
if (!(Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local file not found!" -ForegroundColor Yellow
    Write-Host "💡 Make sure to create .env.local with proper configuration" -ForegroundColor Yellow
}

# Build the project to check for errors
Write-Host "🔨 Building project to check for errors..." -ForegroundColor Blue
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Error details:" -ForegroundColor Red
    Write-Host $buildResult -ForegroundColor Red
    exit 1
}

# Start development server
Write-Host "🚀 Starting development server..." -ForegroundColor Green
Write-Host "🌐 Frontend will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Fallback data will be used if backend is not available" -ForegroundColor Yellow
Write-Host "📊 Check browser console for debugging information" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Cyan

npm run dev