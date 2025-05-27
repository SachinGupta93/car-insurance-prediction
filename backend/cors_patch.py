# CORS patch for development environment
from flask_cors import CORS

def apply_cors_patch(app):
    """Apply CORS configuration for development environment"""
    CORS(app, origins=['http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'], 
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    print("✅ CORS patch applied for development")
