#!/bin/bash

# IMPORTANT: Set the path to your Firebase service account key JSON file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"

# Start the backend server
# Ensure Flask reloads on code changes and provides debugging information
export FLASK_ENV=development
(cd backend && python -m flask run --port=8000) &
BACKEND_PID=$!

# Start the frontend server
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "Servers started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop the servers"

# Handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for both processes to finish
wait