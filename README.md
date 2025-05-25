# Car Damage Prediction

A sophisticated web application that uses Google's Gemini AI to analyze car damage from uploaded images and provide comprehensive damage assessments, repair recommendations, and insurance guidance.

## Features

- User authentication with Firebase
- User authentication with Firebase
- Upload car images for professional damage analysis through Gemini AI
- Real-time image preview with beautiful UI
- Detailed damage assessment with severity classification
- Comprehensive insurance recommendations and coverage analysis
- Vehicle information retrieval with specifications
- Repair cost estimates with breakdown
- Safety implications assessment
- Repair timeline estimates
- RAG-based Q&A system for car damage queries
- RAG-based Q&A system for car damage queries

## Setup

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- Firebase account
- Google Gemini API key

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
FIREBASE_DATABASE_URL=your_firebase_database_url

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_APP=backend/main.py
PORT=8000
```

Create a `.env.local` file in the `frontend` directory with the following variables:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- Firebase account
- Google Gemini API key

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
FIREBASE_DATABASE_URL=your_firebase_database_url

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_APP=backend/main.py
PORT=8000
```

Create a `.env.local` file in the `frontend` directory with the following variables:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

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
