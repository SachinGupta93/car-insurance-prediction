# Car Damage Prediction - Startup Guide

## Quick Start (Recommended)

### 1. Check Setup
```powershell
python check_setup.py
```

### 2. Start Development Environment
```powershell
# Option A: Start both servers automatically
./start_development.ps1

# Option B: Start servers individually
# Terminal 1: Backend
./run_backend.ps1

# Terminal 2: Frontend  
./run_frontend.ps1
```

### 3. Test Connection
```powershell
# Test backend API
python test_backend_connection.py
```

## Manual Setup

### Backend Setup
1. Install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Start backend server:
   ```bash
   python main.py
   ```
   - Backend will run on: http://localhost:5174
   - API endpoints: http://localhost:5174/api

### Frontend Setup
1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start frontend development server:
   ```bash
   npm run dev
   ```
   - Frontend will run on: http://localhost:5173

## URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5174
- **API Health**: http://localhost:5174/api/health
- **Analysis History**: http://localhost:5174/api/analysis/history

## Debugging

### Console Logs
The application now includes comprehensive console logging:

#### Frontend Console (Browser DevTools)
- Dashboard: Analytics data loading, chart rendering
- History: Data filtering and processing
- Insurance: Claims data transformation
- Charts: Data flow and rendering decisions

#### Backend Console (Terminal)
- Request logging with authorization tracking
- CORS configuration details
- API endpoint responses
- Error handling with stack traces

### Common Issues

1. **Port Already in Use**
   - Check if port 5174 (backend) or 5173 (frontend) is already in use
   - Kill existing processes or use different ports

2. **Backend Not Responding**
   - Ensure backend server is running
   - Check console for error messages
   - Verify port 5174 is accessible

3. **Frontend Can't Connect to Backend**
   - Ensure CORS is configured properly
   - Check browser network tab for failed requests
   - Verify API_BASE_URL in .env.local

4. **No Data Showing**
   - Check browser console for API errors
   - Verify Firebase authentication
   - Check if backend is returning data

5. **Charts Not Rendering**
   - Check console for chart data processing logs
   - Verify analytics data structure
   - Check if chart components are receiving proper data

## Sample Data
To test with sample data:
```bash
cd backend
python create_sample_data.py
```

## Environment Variables
Make sure these are set in `frontend/.env.local`:
```
VITE_API_BASE_URL=http://localhost:5174/api
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## Troubleshooting Steps

1. **Run Setup Check**
   ```powershell
   python check_setup.py
   ```

2. **Check Backend Connection**
   ```powershell
   python test_backend_connection.py
   ```

3. **View Console Logs**
   - Open browser DevTools (F12)
   - Check Console tab for frontend logs
   - Check backend terminal for API logs

4. **Test API Endpoints**
   - Visit http://localhost:5174/api/health
   - Check if backend responds with health status

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload
2. **Error Handling**: Check console logs for detailed error information
3. **API Testing**: Use browser DevTools Network tab to inspect API calls
4. **Database**: Firebase Realtime Database is used for data storage

## Support
If you encounter issues:
1. Check console logs first
2. Verify all URLs and ports are correct
3. Ensure both servers are running
4. Check network connectivity between frontend and backend