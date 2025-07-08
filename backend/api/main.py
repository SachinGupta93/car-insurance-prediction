from flask import Flask, request
from flask_cors import CORS
import logging
from .routes import api

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configure CORS
    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", 
                      "https://car-damage-app.com", "https://www.car-damage-app.com"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Dev-Auth-Bypass"],
            "supports_credentials": True
        }
    })
    
    # Register blueprints
    app.register_blueprint(api, url_prefix='/api')
    
    @app.before_request
    def log_request_info():
        """Log request information"""
        logger.info('Headers: %s', dict(request.headers))
        logger.info('Body: %s', request.get_data())
    
    @app.after_request
    def after_request(response):
        """Add CORS headers to response"""
        origin = request.headers.get('Origin')
        allowed_origins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 
                         'https://car-damage-app.com', 'https://www.car-damage-app.com']
        if origin in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Dev-Auth-Bypass')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    return app

app = create_app()

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    app.run(host="127.0.0.1", port=8000, debug=False, use_reloader=False, threaded=True)