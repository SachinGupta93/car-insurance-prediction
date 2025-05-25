# Car Damage Prediction Application - Setup Guide

## Overview

This application uses AI to analyze car damage from images, providing damage assessments, repair recommendations, and insurance guidance. It consists of a React frontend and Flask backend with Google's Gemini AI for image analysis.

## Prerequisites

- **Python 3.8+**
- **Node.js 18+**
- **Firebase Project** (for authentication)
- **Google Cloud Project** with Gemini API enabled (for AI analysis)

## Setup Instructions

### Step 1: Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com/)
2. Enable Authentication with Email/Password method
3. Generate a Service Account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file to the root of this project as `service-account.json`

### Step 2: Gemini API Setup

1. Create or use an existing Google Cloud Project
2. Enable the Gemini API
3. Create an API key and add it to the `.env` file as `GEMINI_API_KEY`

### Step 3: Install Dependencies

```powershell
# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 4: Environment Configuration

Create a `.env` file in the project root with the following:

```
# Firebase Configuration
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key
```

### Step 5: Start the Application

Use our improved development starter script:

```powershell
.\start-dev.ps1
```

This will:
1. Start the Flask backend on http://localhost:8000
2. Start the React frontend on http://localhost:3000
3. Check for common configuration issues

## Common Issues and Solutions

### Backend Connection Refused

If you see `ERR_CONNECTION_REFUSED` errors:

1. **Check if backend is running**
   - Look for a terminal window showing Flask logs
   - Verify it shows "Running on http://0.0.0.0:8000"

2. **Check for backend errors**
   - Look for error messages in the Flask terminal
   - Most common issues relate to missing environment variables or API keys

3. **Try restarting the backend**
   ```powershell
   cd backend
   python -m flask run --host=0.0.0.0 --port=8000
   ```

### Firebase Authentication Issues

If you see `Firebase verification error`:

1. **Check `service-account.json`**
   - Verify this file exists in the project root
   - Ensure it's a valid Firebase service account key

2. **Set environment variable manually**
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="$pwd\service-account.json"
   ```

3. **Use development mode**
   - In development, you can use the `X-Dev-Auth-Bypass: true` header
   - Or modify `backend/api/routes.py` to bypass authentication in dev mode

### Gemini API Issues

If image analysis doesn't work:

1. **Check Gemini API key**
   - Verify `GEMINI_API_KEY` is set in your `.env`
   - Check API key permissions and quotas

2. **Check backend logs**
   - The backend will show detailed logs for Gemini API calls
   - Verify the API key is being correctly loaded

## Project Structure

```
Car-damage-prediction/
├── backend/
│   ├── api/               # API endpoints
│   ├── auth/              # Firebase authentication
│   ├── config/            # Configuration files
│   ├── rag_implementation/ # RAG system for car damage analysis
│   └── main.py            # Main Flask application
├── frontend/
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── hooks/         # Custom React hooks
│   └── package.json
├── service-account.json   # Firebase service account key
├── .env                   # Environment variables
└── start-dev.ps1          # Development starter script
```

## Development Mode Features

- **Authentication Bypass**: In development mode, you can use mock users
- **Mock RAG Responses**: The frontend provides mock RAG responses when the backend is unavailable
- **Detailed Error Messages**: More helpful error messages for common issues
