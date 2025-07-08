# User management routes for the car damage prediction API
from flask import Blueprint, jsonify, request, current_app
import logging
import traceback
from datetime import datetime
from .auth_routes import firebase_auth_required
from auth.user_auth import UserAuth

logger = logging.getLogger(__name__)
user_routes = Blueprint('user_routes', __name__)

def _get_auth_token(request):
    """Extracts the Firebase ID token from the Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    logger.warning("Auth token not found or in invalid format.")
    return None

@user_routes.route('/user/ensure-profile', methods=['POST'])
@firebase_auth_required
def ensure_user_profile():
    """Ensure user profile exists, create if it doesn't"""
    try:
        user_id = request.user['uid']
        user_email = request.user.get('email', 'unknown@example.com')
        auth_token = _get_auth_token(request)
        if not auth_token:
            return jsonify({'error': 'Authorization token is missing or invalid', 'success': False}), 401

        logger.info(f"Ensuring profile for user: {user_email} (ID: {user_id})")
        
        user_auth = UserAuth(current_app.config['db_ref'])
        
        try:
            profile = user_auth.get_user_profile(user_id, auth_token)
            logger.info(f"Profile already exists for user: {user_email}")
            return jsonify({
                'message': 'Profile already exists',
                'profile': profile,
                'success': True
            }), 200
        except Exception:
            # Get data from the frontend, with a fallback for safety
            data = request.get_json() if request.is_json else {}
            logger.info(f"Request data for new profile: {data}")

            # Prioritize data from the request body, then Firebase token, then a default
            user_name = data.get('name') or (request.user.get('name') if request.user else None) or user_email.split('@')[0]
            user_email_from_data = data.get('email', user_email)

            logger.info(f"Creating new profile for user: {user_email_from_data} with name: {user_name}")
            
            profile_data = {
                'email': user_email_from_data, # Email from token is the source of truth
                'name': user_name,
                'created_at': datetime.now().isoformat(),
                'analysis_count': 0,
                'preferences': {
                    'notifications': True,
                    'theme': 'light'
                }
            }
            
            user_auth.create_user_profile(user_id, profile_data, auth_token)
            
            return jsonify({
                'message': 'Profile created successfully',
                'profile': profile_data,
                'success': True
            }), 201
            
    except Exception as e:
        logger.error(f"Error ensuring user profile: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@user_routes.route('/profile', methods=['GET'])
@firebase_auth_required
def get_profile():
    """Get user profile"""
    try:
        user_id = request.user['uid']
        auth_token = _get_auth_token(request)
        if not auth_token:
            return jsonify({'error': 'Authorization token is missing or invalid'}), 401

        user_auth = UserAuth(current_app.config['db_ref'])
        profile = user_auth.get_user_profile(user_id, auth_token)
        return jsonify(profile), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@user_routes.route('/profile', methods=['PUT'])
@firebase_auth_required
def update_profile():
    """Update user profile"""
    try:
        user_id = request.user['uid']
        auth_token = _get_auth_token(request)
        if not auth_token:
            return jsonify({'error': 'Authorization token is missing or invalid'}), 401
        
        data = request.get_json()
        user_auth = UserAuth(current_app.config['db_ref'])
        user_auth.update_user_profile(user_id, data, auth_token)
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@user_routes.route('/analysis/history', methods=['GET'])
@firebase_auth_required
def get_analysis_history():
    """Get user's analysis history"""
    try:
        logger.info(f"Request received from user {request.user.get('uid', 'unknown')}")
        
        if 'db_ref' not in current_app.config:
            logger.error("No database reference in app config")
            return jsonify({'error': 'Database reference not configured', 'success': False}), 500
            
        user_auth = UserAuth(current_app.config['db_ref'])
        
        if not request.user or 'uid' not in request.user:
            logger.error("No user ID available in request")
            return jsonify({'error': 'User not authenticated', 'success': False}), 401
            
        user_id = request.user['uid']
        
        auth_token = _get_auth_token(request)
        if not auth_token:
            return jsonify({'error': 'Authorization token is missing or invalid', 'success': False}), 401
        
        logger.info(f"Fetching history for user_id: {user_id}")
        history = user_auth.get_analysis_history(user_id, id_token=auth_token)
        
        logger.info("Successfully fetched history")
        
        history_list = []
        if isinstance(history, dict):
            if history:
                for key, value in history.items():
                    if isinstance(value, dict):
                        value['id'] = key
                    else:
                        # Handle cases where the value might not be a dict
                        value = {'id': key, 'data': value} 
                    history_list.append(value)
                
                # Sort by timestamp, handling missing timestamps gracefully
                history_list.sort(
                    key=lambda x: x.get('timestamp', x.get('created_at', '1970-01-01T00:00:00')), 
                    reverse=True
                )
                
                logger.info(f"Converted to list with {len(history_list)} items")
                return jsonify({'data': history_list, 'success': True}), 200
            else:
                return jsonify({'data': [], 'success': True}), 200
        elif isinstance(history, list):
            # If it's already a list, we assume it's in the correct format
            return jsonify({'data': history, 'success': True}), 200
        else:
            # Handle other unexpected data types
            return jsonify({'data': [], 'success': True}), 200
                
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(f"Error traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e), 'success': False}), 500

@user_routes.route('/user/history/add', methods=['POST'])
@firebase_auth_required
def add_analysis_to_history():
    """Add analysis to user's history"""
    try:
        logger.info(f"Request received from user {request.user.get('uid', 'unknown')}")
        
        if 'db_ref' not in current_app.config:
            logger.error("No database reference in app config")
            return jsonify({'error': 'Database reference not configured', 'success': False}), 500
            
        user_auth = UserAuth(current_app.config['db_ref'])
        
        if not request.user or 'uid' not in request.user:
            logger.error("No user ID available in request")
            return jsonify({'error': 'User not authenticated', 'success': False}), 401
            
        user_id = request.user['uid']
        auth_token = _get_auth_token(request)
        if not auth_token:
            return jsonify({'error': 'Authorization token is missing or invalid', 'success': False}), 401
        
        analysis_data = request.get_json()
        if not analysis_data:
            logger.error("No analysis data provided")
            return jsonify({'error': 'Analysis data is required', 'success': False}), 400
        
        logger.info(f"Adding analysis for user {user_id}")
        
        if 'timestamp' not in analysis_data:
            analysis_data['timestamp'] = datetime.now().isoformat()
        
        result = user_auth.add_analysis_history(user_id, analysis_data, auth_token)
        logger.info("Analysis saved successfully")
        return jsonify({'success': True, 'id': result if result else 'saved', 'message': 'Analysis saved to history'}), 200
        
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@user_routes.route('/user/stats', methods=['GET'])
@firebase_auth_required
def get_user_stats():
    """Get user statistics, ensuring robust data handling."""
    try:
        user_id = request.user['uid']
        auth_token = _get_auth_token(request)
        if not auth_token:
            return jsonify({'error': 'Authorization token is missing or invalid'}), 401

        # Enhanced logging to trace request source
        requester_ip = request.remote_addr
        user_agent = request.headers.get('User-Agent', 'Unknown')
        logger.info(f"STATS_REQUEST: Received /user/stats request for user {user_id} from IP: {requester_ip}, User-Agent: {user_agent}")

        user_auth = UserAuth(current_app.config['db_ref'])
        
        # This call now uses the robust parsing logic
        stats = user_auth.get_user_stats(user_id, auth_token)
        
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"STATS_ERROR: Error getting user stats for user {request.user.get('uid', 'N/A') if request.user else 'N/A'}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f"An error occurred while fetching user stats: {str(e)}"}), 500

@user_routes.route('/debug/user-history', methods=['GET'])
@firebase_auth_required
def debug_user_history():
    """Debug endpoint to directly check user's analysis history in Firebase"""
    try:
        user_id = request.user['uid']
        logger.info(f"🔍 Debugging history for user: {user_id}")
        
        # Direct access to Firebase at different paths
        db_ref = current_app.config['db_ref']
        
        # First, check at the users/{uid}/analysis_history path
        user_path = f"users/{user_id}/analysis_history"
        logger.info(f"📝 Checking path: {user_path}")
        analysis_history = db_ref.child('users').child(user_id).child('analysis_history').get()
        
        # Also check at the root level
        logger.info("📝 Checking root level for user records")
        root_data = db_ref.get()
        
        # Filter root data for records matching this user
        user_root_records = {}
        if isinstance(root_data, dict):
            for key, value in root_data.items():
                if isinstance(value, dict) and value.get('userId') == user_id:
                    user_root_records[key] = value
                    
        return jsonify({
            'success': True,
            'user_id': user_id,
            'user_path_data': analysis_history,
            'root_records_count': len(user_root_records) if isinstance(user_root_records, dict) else 0,
            'sample_root_keys': list(user_root_records.keys())[:5] if isinstance(user_root_records, dict) else []
        })
        
    except Exception as e:
        logger.error(f"❌ Error in debug history: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@user_routes.route('/user/dashboard-data', methods=['GET'])
@firebase_auth_required
def get_dashboard_data():
    """Get combined dashboard data (stats + recent history) in one optimized call."""
    try:
        user_id = request.user['uid']
        auth_token = _get_auth_token(request)
        if not auth_token:
            return jsonify({'error': 'Authorization token is missing or invalid'}), 401

        logger.info(f"📊 Dashboard data request for user: {user_id}")

        user_auth = UserAuth(current_app.config['db_ref'])
        
        # Use fast stats for dashboard (processes only 20 items max)
        stats = user_auth.get_user_stats_fast(user_id, auth_token)
        
        # Extract and format recent analyses for dashboard display (limit to 5 for speed)
        recent_analyses_raw = stats.get('recentAnalyses', [])[:5]  # Take only 5 most recent
        formatted_recent_analyses = []
        
        for item in recent_analyses_raw:
            try:
                # Fast formatting with minimal processing
                formatted_item = {
                    'id': item.get('id', ''),
                    'date': (item.get('uploadedAt') or item.get('timestamp') or item.get('created_at', '2025-01-01'))[:10],  # Quick date extraction
                    'vehicle': item.get('result', {}).get('vehicleIdentification', {}).get('make') or 'Vehicle',
                    'damageType': item.get('result', {}).get('damageType') or item.get('damageType') or 'Damage',
                    'severity': item.get('result', {}).get('severity') or item.get('severity') or 'moderate',
                    'status': 'Completed'
                }
                formatted_recent_analyses.append(formatted_item)
            except Exception:
                # Skip problematic items instead of failing
                continue
        
        # Combine data for dashboard
        dashboard_data = {
            'stats': stats,
            'recentAnalyses': formatted_recent_analyses
        }
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        logger.error(f"💥 Error getting dashboard data for user {request.user.get('uid', 'N/A') if request.user else 'N/A'}: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f"An error occurred while fetching dashboard data: {str(e)}"}), 500
