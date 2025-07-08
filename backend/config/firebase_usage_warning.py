#!/usr/bin/env python3
"""
Firebase Usage Warning Manager

This module helps handle Firebase usage limits by displaying clear warnings
and providing options to mitigate or address usage limit issues.
"""

import os
import logging
import json
from datetime import datetime
from flask import jsonify, Blueprint, request
from functools import wraps

logger = logging.getLogger(__name__)

# Create blueprint for Firebase warning routes
firebase_warning_bp = Blueprint('firebase_warning', __name__)

# Firebase free tier usage limits
FIREBASE_FREE_LIMITS = {
    'reads': 50000,  # 50K reads/day
    'writes': 20000,  # 20K writes/day
    'deletes': 20000,  # 20K deletes/day
    'storage': 1,  # 1GB storage
    'bandwidth': 10  # 10GB bandwidth/month
}

# Warning thresholds (percentage of limit)
WARNING_THRESHOLD = 0.75  # 75%
CRITICAL_THRESHOLD = 0.90  # 90%

# Path to store usage data
USAGE_DATA_PATH = os.path.join(os.path.dirname(__file__), 'firebase_usage.json')

def get_current_usage():
    """Get current usage data or default values if not available"""
    try:
        if os.path.exists(USAGE_DATA_PATH):
            with open(USAGE_DATA_PATH, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading usage data: {e}")
    
    # Default usage data structure
    return {
        'date': datetime.now().strftime('%Y-%m-%d'),
        'reads': 0,
        'writes': 0,
        'deletes': 0,
        'storage': 0,
        'bandwidth': 0
    }

def save_usage_data(usage_data):
    """Save usage data to file"""
    try:
        with open(USAGE_DATA_PATH, 'w') as f:
            json.dump(usage_data, f)
    except Exception as e:
        logger.error(f"Error saving usage data: {e}")

def track_operation(operation_type, count=1):
    """
    Track Firebase operation usage
    
    Args:
        operation_type: Type of operation ('reads', 'writes', 'deletes')
        count: Number of operations to add
    """
    usage_data = get_current_usage()
    
    # Check if we need to reset for a new day
    current_date = datetime.now().strftime('%Y-%m-%d')
    if usage_data['date'] != current_date:
        # Reset daily counters
        usage_data = {
            'date': current_date,
            'reads': 0,
            'writes': 0,
            'deletes': 0,
            'storage': usage_data['storage'],  # Persist storage value
            'bandwidth': 0  # Reset monthly bandwidth (simplification)
        }
    
    # Increment the counter
    if operation_type in usage_data:
        usage_data[operation_type] += count
    
    # Save updated usage
    save_usage_data(usage_data)
    
    # Check for warnings
    check_usage_warnings(usage_data)
    
    return usage_data

def check_usage_warnings(usage_data):
    """Check if usage is approaching limits and log warnings"""
    warnings = []
    
    for key, limit in FIREBASE_FREE_LIMITS.items():
        if key in usage_data:
            usage_percent = usage_data[key] / (limit * 1000 if key == 'storage' or key == 'bandwidth' else limit)
            
            if usage_percent >= CRITICAL_THRESHOLD:
                msg = f"CRITICAL: Firebase {key} usage at {usage_percent:.1%} of free tier limit"
                logger.critical(msg)
                warnings.append({'type': key, 'level': 'critical', 'message': msg})
            elif usage_percent >= WARNING_THRESHOLD:
                msg = f"WARNING: Firebase {key} usage at {usage_percent:.1%} of free tier limit"
                logger.warning(msg)
                warnings.append({'type': key, 'level': 'warning', 'message': msg})
    
    return warnings

def usage_warning(f):
    """Decorator to add Firebase usage warnings to API responses"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the original response
        response = f(*args, **kwargs)
        
        # If it's a tuple (response, status_code)
        if isinstance(response, tuple) and len(response) == 2:
            json_response, status_code = response
            
            # Only modify successful responses
            if 200 <= status_code < 300 and hasattr(json_response, 'get_json'):
                try:
                    # Get the JSON data
                    data = json_response.get_json()
                    
                    # Add usage warnings if needed
                    usage_data = get_current_usage()
                    warnings = check_usage_warnings(usage_data)
                    
                    if warnings:
                        # Create a new response with warnings
                        if isinstance(data, dict):
                            data['firebase_usage_warnings'] = warnings
                            return jsonify(data), status_code
                except Exception as e:
                    logger.error(f"Error adding usage warnings: {e}")
        
        # Return original response if we couldn't modify it
        return response
    
    return decorated_function

@firebase_warning_bp.route('/admin/firebase-usage', methods=['GET'])
def get_firebase_usage():
    """Endpoint to get current Firebase usage statistics"""
    usage_data = get_current_usage()
    warnings = check_usage_warnings(usage_data)
    
    # Calculate percentages
    usage_percentages = {}
    for key, limit in FIREBASE_FREE_LIMITS.items():
        if key in usage_data:
            usage_percentages[key] = usage_data[key] / (limit * 1000 if key == 'storage' or key == 'bandwidth' else limit)
    
    response = {
        'usage': usage_data,
        'limits': FIREBASE_FREE_LIMITS,
        'percentages': usage_percentages,
        'warnings': warnings,
        'upgrade_needed': any(w['level'] == 'critical' for w in warnings)
    }
    
    return jsonify(response)

@firebase_warning_bp.route('/admin/reset-firebase-usage', methods=['POST'])
def reset_firebase_usage():
    """Endpoint to reset usage counters (for testing)"""
    current_date = datetime.now().strftime('%Y-%m-%d')
    usage_data = {
        'date': current_date,
        'reads': 0,
        'writes': 0,
        'deletes': 0,
        'storage': 0,
        'bandwidth': 0
    }
    save_usage_data(usage_data)
    
    return jsonify({
        'success': True,
        'message': 'Firebase usage counters reset',
        'usage': usage_data
    })

def get_usage_status():
    """Get a simple usage status for display in UI"""
    usage_data = get_current_usage()
    warnings = check_usage_warnings(usage_data)
    
    if any(w['level'] == 'critical' for w in warnings):
        status = "critical"
    elif any(w['level'] == 'warning' for w in warnings):
        status = "warning"
    else:
        status = "normal"
    
    return {
        'status': status,
        'warnings': warnings,
        'usage_data': usage_data
    }
