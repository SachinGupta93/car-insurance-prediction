# Start the backend and frontend servers

# IMPORTANT: Set the path to your Firebase service account key JSON file
$env:GOOGLE_APPLICATION_CREDENTIALS = "/path/to/your/serviceAccountKey.json"

# Start the backend server
# Ensure Flask reloads on code changes and provides debugging information
$env:FLASK_ENV = "development"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot/backend; python -m flask run --port=8000"

# Start the frontend server
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot/frontend; npm run dev"

Write-Host "Servers starting..."
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Press Ctrl+C to stop the servers"