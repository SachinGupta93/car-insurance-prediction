from flask import Flask
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
            "origins": ["http://localhost:5173"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
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
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    return app

app = create_app()

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    app.run(host="127.0.0.1", port=8000, debug=True) 