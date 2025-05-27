from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import traceback
import sys
from datetime import datetime
from backend.config.firebase_config import initialize_firebase, verify_firebase_token, get_firebase_config
from backend.api.routes import api # Changed api_bp to api
import os

# Configure more detailed logging
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG for more detailed logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # Log to console
    ]
)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    
    # CORS configuration with more permissive settings for development
    CORS(app, 
         resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
                                          "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"],
                               "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                               "allow_headers": ["Content-Type", "Authorization", "Accept", "X-Dev-Mode", "X-Dev-Auth-Bypass"]}},
         supports_credentials=True)

    # Initialize Firebase Admin SDK with better error reporting
    try:
        if not initialize_firebase():
            logger.error("Failed to initialize Firebase Admin SDK. Authentication features may not work.")
    except Exception as e:
        logger.error(f"Firebase initialization error: {str(e)}")
        logger.error(traceback.format_exc())

    # Add configuration information to app
    app.config['db_ref'] = None  # You might want to initialize your database reference here

    # Register API blueprint
    app.register_blueprint(api, url_prefix='/api') # Changed api_bp to api

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
        logger.info(f'Request: {request.method} {request.path}')
        if request.method != 'OPTIONS':  # Don't log OPTIONS requests
            logger.debug(f'Headers: {request.headers}')
            if request.data:
                logger.debug(f'Request Data: {request.data[:200]}...' if len(request.data) > 200 else f'Request Data: {request.data}')

    # Global error handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.error(f"Unhandled exception: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500

    return app

if __name__ == '__main__':
    try:
        # Force debug mode for development
        os.environ['FLASK_ENV'] = 'development'
        os.environ['FLASK_DEBUG'] = '1'
        
        # Load port from environment variable, default to 8000
        port = int(os.environ.get('PORT', 8000))
        
        # Create and configure the app
        app = create_app()
        
        # Log startup information
        logger.info(f"Starting Flask server on http://127.0.0.1:{port}")
        logger.info(f"Debug mode: {app.debug}")
        logger.info(f"Environment: {os.environ.get('FLASK_ENV', 'development')}")
        
        # Run the app on all interfaces (0.0.0.0) to be accessible from other devices if needed
        app.run(host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        logger.critical(f"Failed to start server: {str(e)}")
        logger.critical(traceback.format_exc())