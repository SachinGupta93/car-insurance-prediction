# Diagnostic Script for Car Damage Prediction
# This script checks the status of the backend and frontend services

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  CAR DAMAGE PREDICTION - DIAGNOSTICS      " -ForegroundColor Cyan 
Write-Host "===========================================" -ForegroundColor Cyan

# Function to check if a port is in use (service is running)
function Test-PortInUse {
    param (
        [int]$Port
    )
    
    try {
        $result = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        return $result.TcpTestSucceeded
    } catch {
        return $false
    }
}

# Function to check if a URL is accessible
function Test-Url {
    param (
        [string]$Url,
        [string]$Method = "GET"
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            Content = $response.Content
        }
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            return @{
                Success = $false
                StatusCode = $_.Exception.Response.StatusCode.value__
                Error = $_.Exception.Message
            }
        } else {
            return @{
                Success = $false
                Error = $_.Exception.Message
            }
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Check backend server status
Write-Host "`nChecking Backend Server..." -ForegroundColor Yellow
$backendRunning = Test-PortInUse -Port 5000
if ($backendRunning) {
    Write-Host "✅ Backend server is running on port 5000" -ForegroundColor Green
    
    # Try to access the health endpoint
    Write-Host "  Checking API health endpoint..." -ForegroundColor Yellow
    $healthResult = Test-Url -Url "http://localhost:5000/api/health"
    
    if ($healthResult.Success) {
        Write-Host "  ✅ API health endpoint is accessible" -ForegroundColor Green
        Write-Host "  Health Status: " -NoNewline -ForegroundColor Gray
        try {
            $healthData = $healthResult.Content | ConvertFrom-Json
            Write-Host "$($healthData.status) (Environment: $($healthData.environment))" -ForegroundColor Green
        } catch {
            Write-Host $healthResult.Content -ForegroundColor Green
        }
    } else {
        Write-Host "  ❌ API health endpoint could not be accessed: $($healthResult.Error)" -ForegroundColor Red
        Write-Host "  This suggests the Flask server is running but the API routes may not be properly configured" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Backend server is NOT running on port 5000" -ForegroundColor Red
    Write-Host "  Run the backend server with: .\run-backend.ps1" -ForegroundColor Yellow
}

# Check frontend server status
Write-Host "`nChecking Frontend Development Server..." -ForegroundColor Yellow
$frontendRunning = Test-PortInUse -Port 5173
if ($frontendRunning) {
    Write-Host "✅ Frontend development server is running on port 5173" -ForegroundColor Green
    
    # Try to access the frontend
    Write-Host "  Checking frontend accessibility..." -ForegroundColor Yellow
    $frontendResult = Test-Url -Url "http://localhost:5173"
    
    if ($frontendResult.Success) {
        Write-Host "  ✅ Frontend is accessible" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Frontend could not be accessed: $($frontendResult.Error)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Frontend development server is NOT running on port 5173" -ForegroundColor Red
    Write-Host "  Run the frontend server with: .\run-frontend.ps1" -ForegroundColor Yellow
}

# Check environment variables
Write-Host "`nChecking Environment Configuration..." -ForegroundColor Yellow

# Check development mode
if ($env:DEV_MODE -eq "true" -or $env:FLASK_ENV -eq "development") {
    Write-Host "✅ Development mode is enabled" -ForegroundColor Green
} else {
    Write-Host "❓ Development mode does not appear to be enabled" -ForegroundColor Yellow
    Write-Host "  Set DEV_MODE=true or FLASK_ENV=development for development features" -ForegroundColor Gray
}

# Check Firebase service account
$serviceAccountPath = Join-Path -Path $PSScriptRoot -ChildPath "service-account.json"
if (Test-Path $serviceAccountPath) {
    Write-Host "✅ Firebase service account file exists" -ForegroundColor Green
    
    # Check if it's valid JSON
    try {
        $null = Get-Content -Path $serviceAccountPath | ConvertFrom-Json
        Write-Host "  ✅ Service account file contains valid JSON" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Service account file contains invalid JSON" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Firebase service account file not found at: $serviceAccountPath" -ForegroundColor Red
}

Write-Host "`nSummary:" -ForegroundColor Magenta
if ($backendRunning -and $frontendRunning) {
    Write-Host "✅ All services appear to be running!" -ForegroundColor Green
    Write-Host "  Access the application at: http://localhost:5173" -ForegroundColor Cyan
} else {
    Write-Host "❌ Some services are not running" -ForegroundColor Red
    if (-not $backendRunning) {
        Write-Host "  - Backend server needs to be started" -ForegroundColor Yellow
    }
    if (-not $frontendRunning) {
        Write-Host "  - Frontend server needs to be started" -ForegroundColor Yellow
    }
    Write-Host "`nTo start all services:" -ForegroundColor Cyan
    Write-Host "  - Run .\run-backend.ps1 in one terminal" -ForegroundColor Cyan
    Write-Host "  - Run .\run-frontend.ps1 in another terminal" -ForegroundColor Cyan
}
