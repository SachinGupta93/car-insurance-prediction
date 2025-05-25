# Car Damage Prediction - Setup Guide

This guide will help you set up and run the Car Damage Prediction application, which consists of a Flask backend API and a React/TypeScript frontend.

## Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn
- PowerShell (for Windows)

## Quick Start

For the quickest start, run the following commands in two separate terminal windows:

### Terminal 1 - Start the Backend

```powershell
# From the project root
.\run-backend.ps1
```

### Terminal 2 - Start the Frontend

```powershell
# From the project root
.\run-frontend.ps1
```

Then open your browser to http://localhost:5173 to access the application.

## Manual Setup

If you prefer to set things up manually, follow these steps:

### Backend Setup

1. Create a virtual environment:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate
   ```

2. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```powershell
   $env:FLASK_ENV = "development"
   $env:DEV_MODE = "true"
   $env:FLASK_DEBUG = "1"
   ```

4. Run the Flask server:
   ```powershell
   python -c "from main import create_app; app = create_app(); app.run(host='0.0.0.0', port=5000, debug=True)"
   ```

### Frontend Setup

1. Install dependencies:
   ```powershell
   cd frontend
   npm install
   ```

2. Set up environment variables:
   ```powershell
   $env:VITE_API_BASE_URL = "http://localhost:5000/api"
   $env:VITE_DEV_MODE = "true"
   ```

3. Run the development server:
   ```powershell
   npm run dev
   ```

## Troubleshooting

### Connection Issues

If you're seeing "ERR_CONNECTION_REFUSED" errors:

1. Ensure the backend is running on port 5000
2. Check for any errors in the backend console
3. Try accessing http://localhost:5000/api/health directly in your browser
4. Verify that the frontend is configured to use http://localhost:5000/api as the API base URL

### Firebase Authentication Issues

In development mode, the application can bypass Firebase authentication with test credentials. For full authentication:

1. Ensure your service-account.json file is correctly formatted
2. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to your service-account.json file

### Other Issues

For more detailed troubleshooting, refer to the SETUP.md file.
