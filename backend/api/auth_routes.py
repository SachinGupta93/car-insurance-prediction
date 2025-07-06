# Authentication routes for the car damage prediction API
from flask import Blueprint, jsonify, request
from functools import wraps
from backend.auth.user_auth import UserAuth
from config.firebase_config import verify_firebase_token
import logging
import traceback
import os

logger = logging.getLogger(__name__)
auth_routes = Blueprint('auth_routes', __name__)

def firebase_auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Handle OPTIONS requests for CORS preflight
        if request.method == 'OPTIONS':
            return '', 200
            
        # Check for development mode
        dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
        
        # In development mode, check for dev bypass header
        if dev_mode and request.headers.get('X-Dev-Auth-Bypass') == 'true':
            logger.warning("DEV MODE: Authentication bypassed with X-Dev-Auth-Bypass header")
            request.user = {
                'uid': 'dev-user-123',
                'email': 'dev@example.com',
                'name': 'Development User',
                'dev_mode': True
            }
            return f(*args, **kwargs)
            
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]
        
        if not token:
            if dev_mode:
                logger.warning("DEV MODE: No token provided, using mock user")
                request.user = {
                    'uid': 'dev-user-no-token',
                    'email': 'dev-no-token@example.com',
                    'name': 'Development User (No Token)',
                    'dev_mode': True
                }
                return f(*args, **kwargs)
            return jsonify({'error': 'Firebase token is missing'}), 401
        
        try:
            decoded_token = verify_firebase_token(token)
            request.user = decoded_token
        except Exception as e:
            return jsonify({'error': str(e)}), 401
        
        return f(*args, **kwargs)
    return decorated

@auth_routes.route('/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        user_auth = UserAuth(request.app.config['db_ref'])
        
        user_id = user_auth.create_user(
            email=data['email'],
            password=data['password'],
            user_data={
                'name': data.get('name'),
                'phone': data.get('phone'),
                'role': 'user'
            }
        )
        
        return jsonify({'message': 'User created successfully', 'user_id': user_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@auth_routes.route('/auth/login', methods=['POST'])
def login():
    """Login a user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = UserAuth.login(email, password)
        if user:
            return jsonify(user), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Authentication failed'}), 500

@auth_routes.route('/auth/verify', methods=['POST', 'OPTIONS'])
def verify_token():
    """Verify a Firebase token"""
    if request.method == 'OPTIONS':
        return '', 204
    
    dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
    
    try:
        token = None
        
        if request.is_json:
            data = request.get_json()
            token = data.get('token')
        
        if not token and 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            if dev_mode and request.headers.get('X-Dev-Auth-Bypass') == 'true':
                logger.warning("DEV MODE: Authentication bypassed")
                mock_user = {'uid': 'dev-user-123', 'email': 'dev@example.com', 'name': 'Development User', 'dev_mode': True}
                return jsonify({'valid': True, 'user': mock_user, 'dev_mode': True}), 200
            return jsonify({'error': 'No token provided'}), 400
        
        if dev_mode and token == 'DEVELOPMENT_TOKEN_FOR_TESTING':
            logger.warning("DEV MODE: Using development test token")
            mock_user = {'uid': 'dev-user-123', 'email': 'dev@example.com', 'name': 'Development User', 'dev_mode': True}
            return jsonify({'valid': True, 'user': mock_user, 'dev_mode': True}), 200
            
        try:
            decoded_token = verify_firebase_token(token)
            if decoded_token:
                logger.info(f"Token verified successfully for user: {decoded_token.get('uid', 'unknown')}")
                return jsonify({'valid': True, 'user': decoded_token}), 200
            else:
                if dev_mode:
                    mock_user = {'uid': 'dev-user-fallback', 'email': 'dev-fallback@example.com', 'name': 'Development Fallback User', 'dev_mode': True}
                    return jsonify({'valid': True, 'user': mock_user, 'dev_mode': True, 'warning': 'Using development fallback authentication'}), 200
                return jsonify({'valid': False, 'error': 'Invalid token'}), 401
        except ValueError as token_error:
            if dev_mode:
                mock_user = {'uid': 'dev-user-error', 'email': 'dev-error@example.com', 'name': 'Development Error User', 'dev_mode': True}
                return jsonify({'valid': True, 'user': mock_user, 'dev_mode': True, 'warning': f'Using development authentication. Original error: {str(token_error)}'}), 200
            return jsonify({'valid': False, 'error': str(token_error)}), 401
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        if dev_mode:
            mock_user = {'uid': 'dev-user-exception', 'email': 'dev-exception@example.com', 'name': 'Development Exception User', 'dev_mode': True}
            return jsonify({'valid': True, 'user': mock_user, 'dev_mode': True, 'warning': f'Using development authentication due to exception: {str(e)}'}), 200
        return jsonify({'valid': False, 'error': str(e)}), 500
