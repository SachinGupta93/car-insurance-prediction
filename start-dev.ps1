# Improved start script for Car Damage Prediction
# This script will start both the frontend and backend servers
# with proper error handling and environment variables

# Function to display colored text
function Write-ColoredText {
    param (
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

# Display banner
Write-ColoredText @"

╔═══════════════════════════════════════════════════════════╗
║               Car Damage Prediction Startup               ║
║                      Development Mode                     ║
╚═══════════════════════════════════════════════════════════╝
"@ -Color Cyan

# Set environment variables
$env:FLASK_ENV = "development"
$env:FLASK_DEBUG = "1"
$env:PYTHONUNBUFFERED = "1"  # Ensure Python prints are not buffered

# Set Firebase credentials - REPLACE THIS PATH with your actual service account file
$serviceAccountPath = Join-Path $PSScriptRoot "service-account.json"
if (Test-Path $serviceAccountPath) {
    Write-ColoredText "✓ Using Firebase service account: $serviceAccountPath" -Color Green
    $env:GOOGLE_APPLICATION_CREDENTIALS = $serviceAccountPath
} else {
    Write-ColoredText "⚠ WARNING: Firebase service account file not found at $serviceAccountPath" -Color Yellow
    Write-ColoredText "  Firebase authentication features may not work correctly." -Color Yellow
    Write-ColoredText "  Create a service account file from the Firebase console and place it at the path above." -Color Yellow
}

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-ColoredText "✓ Found Python: $pythonVersion" -Color Green
} catch {
    Write-ColoredText "❌ ERROR: Python is not installed or not in PATH" -Color Red
    Write-ColoredText "  Please install Python and try again" -Color Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-ColoredText "✓ Found Node.js: $nodeVersion (npm $npmVersion)" -Color Green
} catch {
    Write-ColoredText "❌ ERROR: Node.js is not installed or not in PATH" -Color Red
    Write-ColoredText "  Please install Node.js and try again" -Color Red
    exit 1
}

# Start backend server
Write-ColoredText "`n📡 Starting backend server..." -Color Magenta
try {
    # Start backend in a new window so we can see its output
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; cd backend; python -m flask run --host=0.0.0.0 --port=8000"
    Write-ColoredText "✓ Backend starting on http://localhost:8000" -Color Green
    
    # Give the backend a moment to start
    Start-Sleep -Seconds 2
    
    # Test if backend is responding
    try {
        Write-ColoredText "🔍 Testing backend connection..." -Color Blue
        $response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing
        Write-ColoredText "✓ Backend is running: HTTP $($response.StatusCode)" -Color Green
    } catch {
        Write-ColoredText "⚠ WARNING: Backend may not be running correctly. HTTP error: $($_.Exception.Message)" -Color Yellow
        Write-ColoredText "  Check the backend terminal window for errors" -Color Yellow
    }
} catch {
    Write-ColoredText "⚠ WARNING: Could not start backend server: $($_.Exception.Message)" -Color Yellow
    Write-ColoredText "  The application may not function correctly" -Color Yellow
}

# Start frontend server
Write-ColoredText "`n🖥️ Starting frontend server..." -Color Magenta
try {
    # Navigate to frontend directory
    Set-Location -Path "$PSScriptRoot\frontend"
    
    # Start frontend in a new window
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"
    
    # Return to original directory
    Set-Location -Path $PSScriptRoot
    Write-ColoredText "✓ Frontend starting on http://localhost:3000" -Color Green
} catch {
    Write-ColoredText "❌ ERROR: Could not start frontend server: $($_.Exception.Message)" -Color Red
    exit 1
}

# Display final instructions
Write-ColoredText @"

╔═══════════════════════════════════════════════════════════╗
║                     STARTUP COMPLETE                      ║
╠═══════════════════════════════════════════════════════════╣
║ Backend API: http://localhost:8000                        ║
║ Frontend:    http://localhost:3000                        ║
║                                                           ║
║ - Check the terminal windows for detailed logs            ║
║ - Press Ctrl+C in each window to stop the servers         ║
╚═══════════════════════════════════════════════════════════╝
"@ -Color Green

# Keep the main script running
Write-ColoredText "Press Enter to exit this startup script (servers will continue running)..." -Color Gray
Read-Host
