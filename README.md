# 🚗 Car Damage Prediction & Insurance Analysis

A comprehensive web application that leverages Google's Gemini AI to analyze car damage from uploaded images, providing detailed assessments, repair recommendations, and insurance guidance with modern interactive dashboards.

## ✨ Features

### 🔍 **AI-Powered Analysis**
- Advanced car damage detection using Google Gemini 1.5 Flash
- Detailed damage severity classification (Minor/Moderate/Severe/Critical)
- Comprehensive repair recommendations with cost estimates
- Safety and compliance assessments

### 📊 **Interactive Dashboards**
- Modern dashboard with real-time charts and metrics
- Multiple chart types: Bar, Area, Line, and Pie charts
- Insurance company comparison and performance tracking
- Claims processing analytics and approval rates

### 🏢 **Insurance Integration**
- Comprehensive insurance analysis system
- Real-time claims tracking and status updates
- Insurance company comparison with success rates
- Coverage recommendations by vehicle type

### 🚙 **Vehicle Database**
- Searchable car models database with insurance ratings
- Repair cost estimates by make and model
- Market values and common damage types
- Insurance company partnerships and specialties

### 🎨 **Modern UI/UX**
- Responsive design with automotive-inspired color palette
- Drag-and-drop image upload with auto-analysis
- Mobile-optimized interface
- Enhanced loading states and smooth animations

### 🔐 **Authentication & Security**
- Firebase Authentication integration
- Protected routes and user sessions
- Secure API endpoints with proper validation

### ⚡ **Performance Optimizations**
- **Duplicate API Call Prevention**: Robust system to prevent multiple requests for the same image
- File-based deduplication using unique identifiers (name, size, lastModified)
- Session-based analysis tracking to prevent concurrent requests
- Optimized resource usage and improved user experience

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** with custom design system
- **Recharts** for data visualization
- **Lucide React** for modern icons
- **React Router** for navigation
- **Firebase** for authentication

### Backend
- **Python Flask** REST API
- **Google Gemini 1.5 Flash** for AI analysis
- **ChromaDB** for vector storage and RAG
- **Firebase Admin SDK** for user management
- **PIL** for image processing

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.11+)
- **Firebase Account** with project setup
- **Google Gemini API Key**

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt
```


# Terminal 2: Start Frontend (from root)  
.\run-frontend.ps1
```

### 5. Access Application

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:8000
- **API Health**: http://localhost:8000/api/health
```

```

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- Firebase account
- Google Gemini API key


### Backend Setup

1. Create a virtual environment:
```powershell
python -m venv venv
venv\Scripts\activate  # On Windows
```

2. Install backend dependencies:
```powershell
pip install -r requirements.txt
```

3. Start the backend server:
```powershell
python -m flask run --port=8000
```

> **IMPORTANT**: A valid Gemini API key is required for full AI functionality. Without it, the system will fall back to mock data for testing purposes only.

### Frontend Setup

1. Navigate to the frontend directory:
```powershell
cd frontend
```

2. Install dependencies:
```powershell
npm install
```

3. Start the development server:
```powershell
npm run dev
```

## Usage

1. Open your browser and go to `http://localhost:3001` (or the port shown in your console)
2. Navigate to the Damage Analyzer section
3. Drag and drop a car image or click to select one
4. Click "Analyze Damage" and wait for processing to complete
5. View the comprehensive damage assessment with vehicle information and insurance recommendations

### Using Gemini Direct Analysis

For direct, unprocessed AI outputs:

1. Click on "Gemini Direct" in the navigation bar
2. Upload your car damage image
3. Click "Analyze with Gemini AI"
4. View the raw, unprocessed output directly from Gemini's API

This feature is useful for advanced users who want to see the direct AI response without any post-processing or formatting.

#### Response Caching

The application includes a smart caching system to improve performance:

- Vehicle information is cached for 24 hours
- Insurance recommendations are cached for 12 hours
- Gemini analysis can be optionally cached (disabled by default)
- Clear the cache anytime with the "Clear Cache" button

## Project Structure

```
Car-damage-prediction/
├── backend/
│   ├── api/
│   │   ├── routes.py          # API endpoints for analysis
│   │   └── data/              # RAG data storage
│   ├── auth/
│   │   └── user_auth.py       # Firebase authentication
│   ├── config/
│   │   └── firebase_config.py # Firebase configuration
│   ├── rag_implementation/
│   │   ├── car_damage_rag.py  # Car damage analysis with Gemini
│   │   ├── insurance_rag.py   # Insurance recommendations 
│   │   └── vehicle_rag.py     # Vehicle information retrieval
│   └── main.py                # Main Flask application
├── frontend/
│   ├── src/
│   │   ├── api/               # API client for backend communication
│   │   ├── components/        # React components
│   │   │   └── damage/
│   │   │       └── DamageAnalyzer.jsx  # Main analysis component
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js     # Tailwind configuration
│   └── package.json
└── README.md
```

## API Endpoints

### Main Endpoints

- `POST /api/analyze` - Analyze car damage from uploaded image
- `POST /api/analyze/gemini-only` - Direct Gemini analysis with
- `GET /api/vehicle/info` - Get vehicle information by make/model/year
- `POST /api/vehicle/repair-cost` - Get repair cost estimates
- `POST /api/insurance/recommendations` - Get insurance recommendations
- `GET /api/analysis/latest-techniques` - Get the latest car damage analysis techniques
- `POST /api/damage/recommendations` - Get repair recommendations

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with credentials
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

## Technologies Used

### Backend
- **Flask**: Web framework for API
- **Google Gemini AI**: Advanced language and vision model for car damage analysis
- **ChromaDB**: Vector database for RAG (Retrieval Augmented Generation)
- **Firebase**: Authentication and database
- **Python**: Core programming language
- **PIL**: Image processing library

### Frontend
- **React**: UI development library
- **Vite**: Build tooling
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Axios**: HTTP client for API communication
- **React Icons**: Icon library

## Advanced Features

- **Gemini Integration**: Direct integration with Google's advanced Gemini AI models
- **Comprehensive Analysis**: Detailed damage assessment with multiple data points
- **Fallback System**: Automatic fallback to mock data when API keys are unavailable
- **Beautiful UI**: Modern, animated interface with Tailwind CSS and Framer Motion
- **Advanced Error Handling**: Robust error handling throughout the application
- **Firebase Authentication**: Secure user authentication with Firebase
- **API Response Caching**: Improved performance with smart caching system
- **Direct Gemini Access**: New component for direct, unprocessed Gemini AI responses
- **Token Auto-Refresh**: Automatic Firebase token refresh for better security
