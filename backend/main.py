import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import traceback
from datetime import datetime
from config.firebase_config import initialize_firebase, verify_firebase_token, get_firebase_config
from api.routes import api # Changed api_bp to api
from api.admin_routes import admin_bp  # Add admin routes
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure more detailed logging
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG for more detailed logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # Log to console
    ]
)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    
    # Set development mode environment variable
    os.environ['DEV_MODE'] = 'true'
    os.environ['FLASK_ENV'] = 'development'
    
    # CORS configuration for development - more permissive
    CORS(app, 
         resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5500",
                                          "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175", "http://127.0.0.1:5500",
                                          "http://localhost:8080", "http://127.0.0.1:8080"],
                               "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                               "allow_headers": ["Content-Type", "Authorization", "Accept", "X-API-Key", "X-Dev-Mode", "X-Dev-Auth-Bypass"]}},
         supports_credentials=True)
    
    # Ensure real AI mode is enforced
    force_real_ai = os.environ.get('FORCE_REAL_AI', 'false').lower() == 'true'
    if force_real_ai:
        logger.info("🤖 REAL AI MODE ENFORCED - No demo fallbacks")
    else:
        logger.warning("⚠️ Real AI mode not enforced - check FORCE_REAL_AI setting")

    # Initialize Firebase Admin SDK with better error reporting
    dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
    
    try:
        if not initialize_firebase():
            logger.error("Failed to initialize Firebase Admin SDK. Authentication features may not work.")
    except Exception as e:
        logger.error(f"Firebase initialization error: {str(e)}")
        logger.error(traceback.format_exc())

    # Initialize Firebase Realtime Database reference
    dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
    
    # For development, use Firebase REST API instead of Admin SDK
    logger.info("🔧 DEVELOPMENT MODE: Using Firebase REST API for database access")
    
    import requests
    import json
    
    class FirebaseRestClient:
        def __init__(self, database_url):
            self.database_url = database_url.rstrip('/')
            self.base_url = f"{self.database_url}"
            
        def child(self, path):
            """Navigate to a child path"""
            new_client = FirebaseRestClient(self.database_url)
            new_client.path = getattr(self, 'path', '') + '/' + path
            return new_client
            
        def get(self, auth_token=None):
            """Get data from Firebase using REST API"""
            try:
                path = getattr(self, 'path', '')
                url = f"{self.base_url}{path}.json"
                
                params = {}
                if auth_token:
                    params['auth'] = auth_token
                    
                logger.debug(f"FirebaseRestClient: GET {url}")
                response = requests.get(url, params=params, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    logger.debug(f"FirebaseRestClient: Received data: {type(data)}")
                    return data if data is not None else {}
                else:
                    logger.warning(f"FirebaseRestClient: HTTP {response.status_code} - {response.text}")
                    return {}
                    
            except Exception as e:
                logger.error(f"FirebaseRestClient: Error getting data: {str(e)}")
                return {}
        
        def get_root_data(self, auth_token=None):
            """Get root data from Firebase"""
            try:
                url = f"{self.base_url}/.json"
                
                params = {}
                if auth_token:
                    params['auth'] = auth_token
                    
                logger.debug(f"FirebaseRestClient: GET ROOT {url}")
                response = requests.get(url, params=params, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    logger.debug(f"FirebaseRestClient: Root data received: {type(data)}")
                    return data if data is not None else {}
                else:
                    logger.warning(f"FirebaseRestClient: HTTP {response.status_code} - {response.text}")
                    return {}
                    
            except Exception as e:
                logger.error(f"FirebaseRestClient: Error getting root data: {str(e)}")
                return {}
                
        def set(self, data, auth_token=None):
            """Set data to Firebase using REST API"""
            try:
                path = getattr(self, 'path', '')
                url = f"{self.base_url}{path}.json"
                
                params = {}
                if auth_token:
                    params['auth'] = auth_token
                    
                logger.debug(f"FirebaseRestClient: PUT {url}")
                response = requests.put(url, json=data, params=params, timeout=10)
                
                if response.status_code == 200:
                    logger.debug(f"FirebaseRestClient: Data set successfully")
                    return True
                else:
                    logger.warning(f"FirebaseRestClient: HTTP {response.status_code} - {response.text}")
                    return False
                    
            except Exception as e:
                logger.error(f"FirebaseRestClient: Error setting data: {str(e)}")
                return False
                
        def update(self, data, auth_token=None):
            """Update data in Firebase using REST API"""
            try:
                path = getattr(self, 'path', '')
                url = f"{self.base_url}{path}.json"
                
                params = {}
                if auth_token:
                    params['auth'] = auth_token
                    
                logger.debug(f"FirebaseRestClient: PATCH {url}")
                response = requests.patch(url, json=data, params=params, timeout=10)
                
                if response.status_code == 200:
                    logger.debug(f"FirebaseRestClient: Data updated successfully")
                    return True
                else:
                    logger.warning(f"FirebaseRestClient: HTTP {response.status_code} - {response.text}")
                    return False
                    
            except Exception as e:
                logger.error(f"FirebaseRestClient: Error updating data: {str(e)}")
                return False
                
        def push(self, data, auth_token=None):
            """Push data to Firebase using REST API"""
            try:
                path = getattr(self, 'path', '')
                url = f"{self.base_url}{path}.json"
                
                params = {}
                if auth_token:
                    params['auth'] = auth_token
                    
                logger.debug(f"FirebaseRestClient: POST {url}")
                response = requests.post(url, json=data, params=params, timeout=10)
                
                if response.status_code == 200:
                    result = response.json()
                    logger.debug(f"FirebaseRestClient: Data pushed successfully, key: {result.get('name')}")
                    # Return a new client pointing to the created resource
                    new_client = FirebaseRestClient(self.database_url)
                    new_client.path = f"{path}/{result.get('name')}"
                    return new_client
                else:
                    logger.warning(f"FirebaseRestClient: HTTP {response.status_code} - {response.text}")
                    return self
                    
            except Exception as e:
                logger.error(f"FirebaseRestClient: Error pushing data: {str(e)}")
                return self
                
        def key(self):
            """Get the key of the current path"""
            path = getattr(self, 'path', '')
            return path.split('/')[-1] if path else None
    
    # Initialize Firebase REST client
    database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com/')
    app.config['db_ref'] = FirebaseRestClient(database_url)
    logger.info("✅ Firebase REST API client initialized - You can access your stored data without service account keys!")

    # Register API blueprint
    app.register_blueprint(api, url_prefix='/api') # Changed api_bp to api
    logger.info("✅ Main API blueprint registered")
    
    # Register admin blueprint (always in development)
    try:
        app.register_blueprint(admin_bp, url_prefix='/api')
        logger.info("✅ Admin routes registered successfully")
        
        # Log all registered routes for debugging
        for rule in app.url_map.iter_rules():
            if 'admin' in rule.rule:
                logger.info(f"📍 Admin route registered: {rule.rule} -> {rule.endpoint}")
                
    except Exception as e:
        logger.error(f"❌ Failed to register admin routes: {e}")
        logger.error(traceback.format_exc())

    # Root endpoint for health check
    @app.route('/')
    def home():
        return jsonify({
            'status': 'API is running',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    # Add an explicit health check endpoint
    @app.route('/api/health')
    def health():
        return jsonify({
            'status': 'healthy',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat(),
            'environment': os.environ.get('FLASK_ENV', 'unknown')
        }), 200

    # Middleware to log requests
    @app.before_request
    def log_request_info():
        logger.info(f'🌐 Request: {request.method} {request.path}')
        logger.info(f'🔍 Origin: {request.headers.get("Origin", "Unknown")}')
        logger.info(f'🔑 Authorization: {"Present" if request.headers.get("Authorization") else "Missing"}')
        logger.info(f'🏠 Remote Address: {request.remote_addr}')
        if request.method != 'OPTIONS':  # Don't log OPTIONS requests
            logger.debug(f'📋 Headers: {dict(request.headers)}')
            if request.data:
                logger.debug(f'📦 Request Data: {request.data[:200]}...' if len(request.data) > 200 else f'📦 Request Data: {request.data}')
    
    # Add after_request handler to log responses
    @app.after_request
    def log_response_info(response):
        logger.info(f'📤 Response: {response.status_code} for {request.method} {request.path}')
        return response

    # Global error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Unhandled exception: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500

    return app

# Create the app instance for uvicorn
app = create_app()

if __name__ == '__main__':
    try:
        # Load port from environment variable, default to 8000
        port = int(os.environ.get('PORT', 8000))
        
        # Determine if we're in development
        dev_mode = os.environ.get('DEV_MODE') == 'true' or os.environ.get('FLASK_ENV') == 'development'
        
        # Create and configure the app
        app = create_app()
        
        # Log startup information
        logger.info(f"Starting Flask server on http://127.0.0.1:{port}")
        logger.info(f"Development mode: {dev_mode}")
        logger.info(f"Environment: {os.environ.get('FLASK_ENV', 'production')}")
        
        # Run with optimized settings - disable debug mode to prevent continuous iteration
        app.run(
            host='0.0.0.0', 
            port=port, 
            debug=False,  # Disable debug mode to stop file watching/continuous iteration
            use_reloader=False,  # Disable auto-reloader
            threaded=True  # Enable threading for better performance
        )
    except Exception as e:
        logger.critical(f"Failed to start server: {str(e)}")
        logger.critical(traceback.format_exc())