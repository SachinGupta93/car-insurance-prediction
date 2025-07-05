# CORS patch for development environment
from flask_cors import CORS
from datetime import datetime

def apply_cors_patch(app):
    """Apply CORS configuration for development environment"""
    CORS(app, 
         resources={
             r"/api/*": {
                 "origins": [
                     "http://localhost:3000",
                     "http://localhost:5173",
                     "http://localhost:5174",
                     "http://localhost:5175",
                     "http://127.0.0.1:3000",
                     "http://127.0.0.1:5173",
                     "http://127.0.0.1:5174", 
                     "http://127.0.0.1:5175"
                 ],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "Accept", "X-Dev-Mode"],
                 "supports_credentials": True
             }
         })
    
    # Add a health check endpoint
    @app.route('/api/health')
    def health_check():
        return {"status": "ok", "timestamp": str(datetime.now())}
    
    print("✅ CORS patch applied for development with health check endpoint")
