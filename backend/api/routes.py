# Main routes file - consolidated and modular
from flask import Blueprint, jsonify
from api.auth_routes import auth_routes, firebase_auth_required
from api.damage_analysis_routes import damage_routes
from api.user_routes import user_routes
from api.admin_routes import admin_bp
from config.firebase_usage_warning import firebase_warning_bp

# Create main API blueprint
api = Blueprint('api', __name__)

# A simple health check/status endpoint
@api.route('/status', methods=['GET'])
def api_status():
    return jsonify({"status": "ok", "message": "API is running"}), 200

# Register all route modules
api.register_blueprint(auth_routes)
api.register_blueprint(damage_routes)
api.register_blueprint(user_routes)
api.register_blueprint(admin_bp)  # Add admin routes
api.register_blueprint(firebase_warning_bp)  # Add Firebase warning routes

# Export firebase_auth_required for use in other modules
__all__ = ['api', 'firebase_auth_required']
