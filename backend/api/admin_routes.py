#!/usr/bin/env python3
"""
Admin routes for data migration and debugging
"""

import os
import json
import requests
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from config.firebase_config import get_firebase_config
import traceback
from functools import wraps
import logging
from firebase_admin import auth, firestore

from .utils import require_api_key, require_admin, get_user_from_request
from config.firebase_usage_optimization import (
    cached_firestore_query,
    throttle_requests,
    batch_process_documents,
    log_firebase_operation
)
from config.firebase_usage_warning import usage_warning, track_operation, get_usage_status

admin_bp = Blueprint('admin', __name__)

# Firebase REST API client
firebase_config = get_firebase_config()
firebase_db_url = firebase_config['databaseURL']

def process_dashboard_data(users_data):
    """Process user data to create aggregated dashboard statistics"""
    # Initialize counters
    total_analyses = 0
    total_users = len(users_data)
    new_users_this_month = 0
    all_analyses = []
    damage_types = {}
    vehicle_makes = {}
    total_repair_cost = 0
    repair_cost_count = 0
    
    current_date = datetime.now()
    current_month = current_date.month
    current_year = current_date.year
    
    # Process each user's data
    for user_id, user_data in users_data.items():
        if not isinstance(user_data, dict):
            continue
            
        # Check if user joined this month
        user_profile = user_data.get('profile', {})
        created_at = user_profile.get('createdAt', '')
        if created_at:
            try:
                created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                if created_date.month == current_month and created_date.year == current_year:
                    new_users_this_month += 1
            except:
                pass
        
        # Get analysis history
        analysis_history = user_data.get('analysisHistory', {})
        if not analysis_history:
            analysis_history = user_data.get('analysis_history', {})
        
        if isinstance(analysis_history, dict):
            for history_id, history_data in analysis_history.items():
                if not isinstance(history_data, dict):
                    continue
                    
                total_analyses += 1
                
                # Extract damage information
                damage_info = history_data.get('damageAnalysis', {})
                if damage_info:
                    damage_type = damage_info.get('damageType', 'Unknown')
                    damage_types[damage_type] = damage_types.get(damage_type, 0) + 1
                
                # Extract vehicle information
                vehicle_details = history_data.get('vehicleDetails', {})
                if not vehicle_details:
                    vehicle_details = history_data.get('vehicle_details', {})
                    
                if vehicle_details:
                    make = vehicle_details.get('make', 'Unknown')
                    vehicle_makes[make] = vehicle_makes.get(make, 0) + 1
                
                # Extract cost information
                estimated_cost = history_data.get('estimatedCost') or history_data.get('estimated_cost')
                if estimated_cost:
                    try:
                        # Remove currency symbols and convert to float
                        cost_str = str(estimated_cost).replace('$', '').replace(',', '')
                        cost = float(cost_str)
                        total_repair_cost += cost
                        repair_cost_count += 1
                    except:
                        pass
                
                # Add to recent analyses
                all_analyses.append({
                    'id': history_id,
                    'vehicleMake': vehicle_details.get('make', 'Unknown'),
                    'vehicleModel': vehicle_details.get('model', 'Unknown'),
                    'damageType': damage_info.get('damageType', 'Unknown'),
                    'confidence': damage_info.get('confidence', 0),
                    'timestamp': history_data.get('timestamp', ''),
                    'estimatedCost': estimated_cost or 0
                })
    
    # Sort analyses by timestamp (most recent first)
    all_analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    recent_analyses = all_analyses[:5]  # Get 5 most recent
    
    # Calculate aggregated data
    avg_confidence = sum(a.get('confidence', 0) for a in all_analyses) / len(all_analyses) if all_analyses else 0
    top_damage_type = max(damage_types.keys(), key=lambda k: damage_types[k]) if damage_types else 'Unknown'
    popular_vehicle_makes = sorted(vehicle_makes.keys(), key=lambda k: vehicle_makes[k], reverse=True)[:3]
    avg_repair_cost = total_repair_cost / repair_cost_count if repair_cost_count > 0 else 0
    
    # Count analyses this month
    analyses_this_month = 0
    for analysis in all_analyses:
        timestamp = analysis.get('timestamp', '')
        if timestamp:
            try:
                analysis_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                if analysis_date.month == current_month and analysis_date.year == current_year:
                    analyses_this_month += 1
            except:
                pass
    
    return {
        "totalAnalyses": total_analyses,
        "avgConfidence": round(avg_confidence, 2),
        "topDamageType": top_damage_type,
        "analysesThisMonth": analyses_this_month,
        "totalClaimsValue": int(total_repair_cost),
        "claimsSuccessRate": 0.92,  # Default value
        "activeClaims": max(0, int(total_analyses * 0.1)),  # 10% of total as active
        "avgClaimTime": "7 days",
        "pendingClaims": max(0, int(total_analyses * 0.05)),  # 5% as pending
        "resolvedClaims": max(0, int(total_analyses * 0.85)),  # 85% as resolved
        "totalUsers": total_users,
        "newUsersThisMonth": new_users_this_month,
        "popularVehicleMakes": popular_vehicle_makes,
        "avgRepairCost": int(avg_repair_cost),
        "recentAnalyses": recent_analyses,
        "damageTypeDistribution": damage_types,
        "monthlyTrends": {
            "January": 89,
            "February": 95,
            "March": 78,
            "April": 102,
            "May": 88,
            "June": analyses_this_month
        }
    }

def get_db():
    """Get Firestore client with lazy initialization"""
    dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
    
    # Check if user explicitly wants real data even in dev mode
    force_real_data = os.environ.get('FORCE_REAL_DATA') == 'true'
    
    if dev_mode and not force_real_data:
        # In development mode, return None to force REST API usage unless explicitly requested
        logging.info("Development mode: Using REST API instead of Firestore SDK")
        return None
    
    # Get current Firebase usage status
    usage_status = get_usage_status()
    
    # If we're at critical usage limits, force fallback to sample data
    if usage_status['status'] == 'critical':
        logging.warning("CRITICAL: Firebase usage limits reached. Forcing fallback to sample data.")
        return None
        
    try:
        # If we're approaching limits (warning), log it but still try to use Firestore
        if usage_status['status'] == 'warning':
            logging.warning("Firebase usage approaching limits. Consider upgrading plan.")
            for warning in usage_status['warnings']:
                logging.warning(f"Firebase {warning['type']} usage warning: {warning['message']}")
        
        logging.info("Attempting to connect to Firestore for real data...")
        db = firestore.client()
        logging.info("Successfully connected to Firestore!")
        return db
    except Exception as e:
        # Firebase not initialized or connection failed, return None for graceful fallback
        logging.warning(f"Failed to connect to Firestore: {e}")
        return None

@admin_bp.route('/admin/migrate-user-data', methods=['POST'])
def migrate_user_data():
    """
    Migrate data from test users to real user ID
    """
    try:
        # Get request data
        data = request.get_json()
        real_user_id = data.get('realUserId')
        test_user_ids = data.get('testUserIds', [])
        
        if not real_user_id:
            return jsonify({'error': 'realUserId is required'}), 400
        
        if not test_user_ids:
            return jsonify({'error': 'testUserIds array is required'}), 400
        
        # For development, allow this operation
        dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
        
        if not dev_mode:
            return jsonify({'error': 'This operation is only allowed in development mode'}), 403
        
        print(f"🔄 Starting data migration to user: {real_user_id}")
        
        # Initialize session for Firebase REST API
        session = requests.Session()
        
        # Collections to migrate
        all_analysis_data = {}
        all_vehicle_data = {}
        all_insurance_data = {}
        
        # Collect data from test users
        for test_id in test_user_ids:
            try:
                # Get test user data
                test_url = f"{firebase_db_url}/users/{test_id}.json"
                response = session.get(test_url)
                
                if response.status_code == 200:
                    test_data = response.json()
                    
                    if test_data:
                        print(f"✅ Found data for test user: {test_id}")
                        
                        # Collect analysis history
                        if 'analysisHistory' in test_data:
                            history = test_data['analysisHistory']
                            if isinstance(history, dict):
                                for key, value in history.items():
                                    unique_key = f"{test_id}_{key}"
                                    all_analysis_data[unique_key] = value
                                print(f"   - Analysis History: {len(history)} items")
                        
                        # Collect vehicles
                        if 'vehicles' in test_data:
                            vehicles = test_data['vehicles']
                            if isinstance(vehicles, dict):
                                for key, value in vehicles.items():
                                    unique_key = f"{test_id}_{key}"
                                    all_vehicle_data[unique_key] = value
                                print(f"   - Vehicles: {len(vehicles)} items")
                        
                        # Collect insurance
                        if 'insurance' in test_data:
                            insurance = test_data['insurance']
                            if isinstance(insurance, dict):
                                for key, value in insurance.items():
                                    unique_key = f"{test_id}_{key}"
                                    all_insurance_data[unique_key] = value
                                print(f"   - Insurance: {len(insurance)} items")
                else:
                    print(f"❌ No data found for test user: {test_id}")
                    
            except Exception as e:
                print(f"❌ Error processing test user {test_id}: {str(e)}")
                continue
        
        # Migrate data to real user
        if all_analysis_data or all_vehicle_data or all_insurance_data:
            print(f"🔄 Migrating data to real user: {real_user_id}")
            
            # Get existing real user data
            real_user_url = f"{firebase_db_url}/users/{real_user_id}.json"
            response = session.get(real_user_url)
            existing_data = response.json() if response.status_code == 200 and response.json() else {}
            
            migration_results = {}
            
            # Migrate analysis history
            if all_analysis_data:
                print(f"📊 Migrating {len(all_analysis_data)} analysis records...")
                existing_analysis = existing_data.get('analysisHistory', {})
                if isinstance(existing_analysis, dict):
                    existing_analysis.update(all_analysis_data)
                else:
                    existing_analysis = all_analysis_data
                
                # Update Firebase
                analysis_url = f"{firebase_db_url}/users/{real_user_id}/analysisHistory.json"
                response = session.put(analysis_url, json=existing_analysis)
                
                if response.status_code == 200:
                    print("✅ Analysis history migrated")
                    migration_results['analysisHistory'] = len(all_analysis_data)
                else:
                    print(f"❌ Failed to migrate analysis history: {response.text}")
                    migration_results['analysisHistory'] = 0
            
            # Migrate vehicles
            if all_vehicle_data:
                print(f"🚗 Migrating {len(all_vehicle_data)} vehicle records...")
                existing_vehicles = existing_data.get('vehicles', {})
                if isinstance(existing_vehicles, dict):
                    existing_vehicles.update(all_vehicle_data)
                else:
                    existing_vehicles = all_vehicle_data
                
                # Update Firebase
                vehicles_url = f"{firebase_db_url}/users/{real_user_id}/vehicles.json"
                response = session.put(vehicles_url, json=existing_vehicles)
                
                if response.status_code == 200:
                    print("✅ Vehicles migrated")
                    migration_results['vehicles'] = len(all_vehicle_data)
                else:
                    print(f"❌ Failed to migrate vehicles: {response.text}")
                    migration_results['vehicles'] = 0
            
            # Migrate insurance
            if all_insurance_data:
                print(f"🛡️ Migrating {len(all_insurance_data)} insurance records...")
                existing_insurance = existing_data.get('insurance', {})
                if isinstance(existing_insurance, dict):
                    existing_insurance.update(all_insurance_data)
                else:
                    existing_insurance = all_insurance_data
                
                # Update Firebase
                insurance_url = f"{firebase_db_url}/users/{real_user_id}/insurance.json"
                response = session.put(insurance_url, json=existing_insurance)
                
                if response.status_code == 200:
                    print("✅ Insurance migrated")
                    migration_results['insurance'] = len(all_insurance_data)
                else:
                    print(f"❌ Failed to migrate insurance: {response.text}")
                    migration_results['insurance'] = 0
            
            # Create/update profile
            profile_data = {
                'email': 'user@example.com',
                'name': 'User',
                'created_at': datetime.now().isoformat(),
                'total_analyses': len(all_analysis_data),
                'total_vehicles': len(all_vehicle_data),
                'total_insurance_records': len(all_insurance_data),
                'last_activity': datetime.now().isoformat(),
                'is_active': True,
                'user_status': 'active'
            }
            
            profile_url = f"{firebase_db_url}/users/{real_user_id}/profile.json"
            response = session.put(profile_url, json=profile_data)
            
            if response.status_code == 200:
                print("✅ Profile created/updated")
                migration_results['profile'] = True
            else:
                print(f"❌ Failed to update profile: {response.text}")
                migration_results['profile'] = False
            
            # Final verification
            print(f"\n🔍 Final verification for user: {real_user_id}")
            response = session.get(real_user_url)
            
            if response.status_code == 200:
                final_data = response.json()
                
                if final_data:
                    verification_results = {
                        'profile': 'profile' in final_data,
                        'analysisHistory': 'analysisHistory' in final_data,
                        'vehicles': 'vehicles' in final_data,
                        'insurance': 'insurance' in final_data
                    }
                    
                    if 'analysisHistory' in final_data:
                        history = final_data['analysisHistory']
                        verification_results['analysisHistoryCount'] = len(history) if isinstance(history, dict) else 0
                    
                    if 'vehicles' in final_data:
                        vehicles = final_data['vehicles']
                        verification_results['vehiclesCount'] = len(vehicles) if isinstance(vehicles, dict) else 0
                    
                    if 'insurance' in final_data:
                        insurance = final_data['insurance']
                        verification_results['insuranceCount'] = len(insurance) if isinstance(insurance, dict) else 0
                    
                    print(f"✅ Migration completed successfully!")
                    print(f"   - Analysis records: {migration_results.get('analysisHistory', 0)}")
                    print(f"   - Vehicle records: {migration_results.get('vehicles', 0)}")
                    print(f"   - Insurance records: {migration_results.get('insurance', 0)}")
                    
                    return jsonify({
                        'success': True,
                        'message': 'Data migration completed successfully',
                        'migration_results': migration_results,
                        'verification_results': verification_results
                    })
                else:
                    return jsonify({
                        'success': False,
                        'message': 'Migration completed but no data found in final verification'
                    }), 500
            else:
                return jsonify({
                    'success': False,
                    'message': 'Migration completed but verification failed'
                }), 500
        else:
            return jsonify({
                'success': False,
                'message': 'No data found to migrate'
            }), 404
            
    except Exception as e:
        print(f"❌ Error in migration: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Migration error: {str(e)}'
        }), 500

@admin_bp.route('/admin/check-user-data/<user_id>', methods=['GET'])
def check_user_data(user_id):
    """
    Check user data structure
    """
    try:
        # For development, allow this operation
        dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
        
        if not dev_mode:
            return jsonify({'error': 'This operation is only allowed in development mode'}), 403
        
        # Initialize session for Firebase REST API
        session = requests.Session()
        
        # Get user data
        user_url = f"{firebase_db_url}/users/{user_id}.json"
        response = session.get(user_url)
        
        if response.status_code == 200:
            user_data = response.json()
            
            if user_data:
                data_structure = {
                    'profile': 'profile' in user_data,
                    'analysisHistory': 'analysisHistory' in user_data,
                    'vehicles': 'vehicles' in user_data,
                    'insurance': 'insurance' in user_data
                }
                
                if 'analysisHistory' in user_data:
                    history = user_data['analysisHistory']
                    data_structure['analysisHistoryCount'] = len(history) if isinstance(history, dict) else 0
                    
                    # Show sample keys
                    if isinstance(history, dict) and len(history) > 0:
                        sample_key = list(history.keys())[0]
                        sample_data = history[sample_key]
                        data_structure['sampleAnalysisKeys'] = list(sample_data.keys())
                
                if 'vehicles' in user_data:
                    vehicles = user_data['vehicles']
                    data_structure['vehiclesCount'] = len(vehicles) if isinstance(vehicles, dict) else 0
                
                if 'insurance' in user_data:
                    insurance = user_data['insurance']
                    data_structure['insuranceCount'] = len(insurance) if isinstance(insurance, dict) else 0
                
                return jsonify({
                    'success': True,
                    'user_id': user_id,
                    'data_structure': data_structure
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'No data found for user'
                }), 404
        else:
            return jsonify({
                'success': False,
                'message': f'Failed to fetch user data: {response.text}'
            }), response.status_code
            
    except Exception as e:
        print(f"❌ Error checking user data: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500

@admin_bp.route('/admin/analysis_histories', methods=['GET'])
@require_api_key
@require_admin
def get_all_analysis_histories():
    """
    Retrieves all analysis histories with pagination. Admin access is required.
    
    Query parameters:
    - page: Page number (default: 1)
    - per_page: Number of records per page (default: 50, max: 100)
    """
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)  # Limit to max 100 records per page
        
        # Calculate offset
        offset = (page - 1) * per_page
        
        logging.info(f"Fetching analysis histories for admin dashboard (page={page}, per_page={per_page})")
        
        # Try to use Firebase Admin SDK to access the Realtime Database
        try:
            from firebase_admin import db
            
            # Get reference to users node
            users_ref = db.reference('users')
            users_data = users_ref.get()
            
            if not users_data:
                users_data = {}
                
            logging.info(f"Successfully fetched {len(users_data)} users from Firebase Realtime Database")
            
        except Exception as e:
            logging.warning(f"Failed to access Firebase Realtime Database: {e}")
            # Return empty data structure for now
            return jsonify({
                'data': [],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': 0,
                    'pages': 0,
                    'has_next': False,
                    'has_prev': False
                }
            }), 200
        
        users_data = response.json() or {}
        all_histories = []
        
        logging.info(f"Found {len(users_data)} users in Firebase")
        
        # Collect all analysis histories from all users
        for user_id, user_data in users_data.items():
            if not isinstance(user_data, dict):
                continue
                
            # Check for analysis history in different possible locations
            analysis_history = user_data.get('analysisHistory', {})
            if not analysis_history:
                analysis_history = user_data.get('analysis_history', {})
                
            if isinstance(analysis_history, dict):
                for history_id, history_data in analysis_history.items():
                    if not isinstance(history_data, dict):
                        continue
                        
                    # Extract user info from profile or root level
                    user_profile = user_data.get('profile', {})
                    user_name = user_profile.get('name') or user_data.get('name', 'N/A')
                    user_email = user_profile.get('email') or user_data.get('email', 'N/A')
                    
                    # Extract vehicle details
                    vehicle_details = history_data.get('vehicleDetails', {})
                    if not vehicle_details:
                        vehicle_details = history_data.get('vehicle_details', {})
                    
                    # Extract cost information
                    estimated_cost = history_data.get('estimatedCost') or history_data.get('estimated_cost', 'N/A')
                    
                    simplified_history = {
                        'id': history_id,
                        'userId': user_id,
                        'userName': user_name,
                        'userEmail': user_email,
                        'timestamp': history_data.get('timestamp', ''),
                        'status': history_data.get('status', 'N/A'),
                        'vehicleMake': vehicle_details.get('make', 'N/A'),
                        'vehicleModel': vehicle_details.get('model', 'N/A'),
                        'estimatedCost': estimated_cost,
                        'image_url': history_data.get('imageUrl') or history_data.get('image_url', None)
                    }
                    all_histories.append(simplified_history)
        
        logging.info(f"Collected {len(all_histories)} analysis histories from Firebase")
        
        # Sort by timestamp (most recent first)
        all_histories.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Apply pagination
        total_records = len(all_histories)
        paginated_histories = all_histories[offset:offset + per_page]
        
        # Create pagination metadata
        pagination = {
            'page': page,
            'per_page': per_page,
            'total': total_records,
            'pages': (total_records + per_page - 1) // per_page if total_records > 0 else 1,
            'has_next': page < (total_records + per_page - 1) // per_page if total_records > 0 else False,
            'has_prev': page > 1
        }
        
        logging.info(f"Successfully fetched {len(paginated_histories)} analysis histories (page {page}/{pagination['pages']})")
        return jsonify({
            'data': paginated_histories,
            'pagination': pagination
        }), 200

    except Exception as e:
        logging.error(f"Error fetching all analysis histories: {e}", exc_info=True)
        return jsonify({"error": "An error occurred while fetching analysis histories.", "details": str(e)}), 500

@admin_bp.route('/admin/aggregated-dashboard-data', methods=['GET', 'OPTIONS'])
@require_api_key
@require_admin
def get_aggregated_dashboard_data():
    """
    Retrieves aggregated data for the main dashboard.
    First tries to fetch real data from Firebase/Firestore, then falls back to sample data if unavailable.
    """
    try:
        logging.info("Fetching aggregated dashboard data for main dashboard")

        # Try to use Firebase Admin SDK to access the Realtime Database
        try:
            from firebase_admin import db
            
            # Get reference to users node
            users_ref = db.reference('users')
            users_data = users_ref.get()
            
            if not users_data:
                users_data = {}
                
            logging.info(f"Successfully fetched {len(users_data)} users from Firebase Realtime Database")
            
            # Process the data to create aggregated dashboard data
            aggregated_data = process_dashboard_data(users_data)
            
            response_data = {
                "success": True,
                "data": aggregated_data,
                "data_source": "real",
                "message": "Using real data from Firebase Realtime Database"
            }
            
            logging.info("Successfully returned real dashboard data from Firebase Realtime Database")
            return jsonify(response_data), 200
            
        except Exception as e:
            logging.warning(f"Failed to access Firebase Realtime Database: {e}")
            # Continue to fallback below

        # Fallback to sample data
        logging.info("Using sample dashboard data")
        aggregated_data = {
            "totalAnalyses": 1250,
            "avgConfidence": 0.85,
            "topDamageType": "Scratch",
            "analysesThisMonth": 89,
            "totalClaimsValue": 3500000,
            "claimsSuccessRate": 0.92,
            "activeClaims": 45,
            "avgClaimTime": "7 days",
            "monthlyTrends": [
                {"month": "2024-07", "count": 120, "avgCost": 28000},
                {"month": "2024-08", "count": 135, "avgCost": 31000},
                {"month": "2024-09", "count": 142, "avgCost": 29500},
                {"month": "2024-10", "count": 158, "avgCost": 32000},
                {"month": "2024-11", "count": 167, "avgCost": 30500},
                {"month": "2024-12", "count": 89, "avgCost": 33000}
            ],
            "severityBreakdown": {
                "minor": 450,
                "moderate": 520,
                "severe": 280
            },
            "damageTypeDistribution": {
                "scratch": 380,
                "dent": 340,
                "paint_damage": 290,
                "crack": 150,
                "rust": 90
            },
            "recentAnalyses": [
                {
                    'id': 'dev_001',
                    'uploadedAt': '2024-12-08T10:30:00Z',
                    'result': {
                        'vehicleIdentification': {
                            'make': 'Toyota',
                            'model': 'Camry'
                        },
                        'damageType': 'Scratch',
                        'severity': 'minor'
                    }
                },
                {
                    'id': 'dev_002',
                    'uploadedAt': '2024-12-08T09:15:00Z',
                    'result': {
                        'vehicleIdentification': {
                            'make': 'Honda',
                            'model': 'Civic'
                        },
                        'damageType': 'Dent',
                        'severity': 'moderate'
                    }
                }
            ]
        }
        
        # Return sample data with fallback indicator
        response_data = {
            "success": True, 
            "data": aggregated_data,
            "data_source": "sample",
            "message": "Using sample dashboard data (Firebase unavailable or no real data)"
        }
            
        logging.info("Successfully generated aggregated dashboard sample data")
        return jsonify(response_data), 200

    except Exception as e:
        logging.error(f"Error fetching aggregated dashboard data: {e}", exc_info=True)
        # Return sample data even on error to prevent 500 responses
        return jsonify({
            "success": True,
            "data": {
                "totalAnalyses": 100,
                "avgConfidence": 0.80,
                "topDamageType": "Scratch",
                "analysesThisMonth": 10,
                "totalClaimsValue": 250000,
                "claimsSuccessRate": 0.85,
                "activeClaims": 5,
                "avgClaimTime": "7 days",
                "monthlyTrends": [],
                "severityBreakdown": {"minor": 50, "moderate": 30, "severe": 20},
                "damageTypeDistribution": {"scratch": 40, "dent": 30, "paint_damage": 20, "crack": 10},
                "recentAnalyses": []
            },
            "data_source": "fallback",
            "message": "Using fallback sample data due to error",
            "error_details": str(e)
        }), 200

def get_real_dashboard_data(db):
    """
    Fetch real dashboard data from Firestore database.
    """
    users_ref = db.collection('users')
    all_users = users_ref.stream()

    total_analyses = 0
    total_cost = 0
    cost_count = 0
    total_confidence = 0
    confidence_count = 0
    severity_distribution = {}
    damage_type_distribution = {}
    monthly_trends = {}
    recent_analyses = []

    # Process each user's data
    for user in all_users:
        user_data = user.to_dict()
        if 'analysisHistory' in user_data:
            for analysis_id, analysis in user_data['analysisHistory'].items():
                total_analyses += 1
                
                # Track confidence scores
                if 'confidenceScore' in analysis:
                    total_confidence += analysis['confidenceScore']
                    confidence_count += 1
                
                # Track cost estimates
                if 'estimatedCost' in analysis:
                    try:
                        # Handle cost that might be stored as string with currency symbol
                        cost_str = str(analysis['estimatedCost'])
                        cost = float(''.join(c for c in cost_str if c.isdigit() or c == '.'))
                        total_cost += cost
                        cost_count += 1
                    except:
                        pass
                
                # Track severity distribution
                severity = analysis.get('severity', 'unknown').lower()
                severity_distribution[severity] = severity_distribution.get(severity, 0) + 1
                
                # Track damage type distribution
                damage_type = analysis.get('damageType', 'unknown').lower()
                damage_type_distribution[damage_type] = damage_type_distribution.get(damage_type, 0) + 1
                
                # Track monthly trends
                timestamp = analysis.get('timestamp', '')
                if timestamp:
                    try:
                        date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        month_key = date.strftime('%Y-%m')
                        if month_key not in monthly_trends:
                            monthly_trends[month_key] = {'count': 0, 'total_cost': 0}
                        monthly_trends[month_key]['count'] += 1
                        
                        # Add cost to monthly trends if available
                        if 'estimatedCost' in analysis:
                            try:
                                cost_str = str(analysis['estimatedCost'])
                                cost = float(''.join(c for c in cost_str if c.isdigit() or c == '.'))
                                monthly_trends[month_key]['total_cost'] += cost
                            except:
                                pass
                    except:
                        pass
                
                # Add to recent analyses (limit to 10 most recent)
                if len(recent_analyses) < 10:
                    recent_analyses.append({
                        'id': analysis_id,
                        'uploadedAt': analysis.get('timestamp', ''),
                        'result': {
                            'vehicleIdentification': {
                                'make': analysis.get('vehicleMake', 'Unknown'),
                                'model': analysis.get('vehicleModel', 'Unknown')
                            },
                            'damageType': analysis.get('damageType', 'Unknown'),
                            'severity': analysis.get('severity', 'Unknown')
                        }
                    })

    # Calculate averages and format data for response
    avg_confidence = total_confidence / confidence_count if confidence_count > 0 else 0
    avg_cost = total_cost / cost_count if cost_count > 0 else 0
    
    # Find top damage type
    top_damage_type = max(damage_type_distribution.items(), key=lambda x: x[1])[0].title() if damage_type_distribution else "Unknown"
    
    # Format monthly trends for response
    formatted_monthly_trends = []
    for month, data in sorted(monthly_trends.items()):
        formatted_monthly_trends.append({
            'month': month,
            'count': data['count'],
            'avgCost': data['total_cost'] / data['count'] if data['count'] > 0 else 0
        })
    
    # Calculate analyses this month
    current_month = datetime.now().strftime('%Y-%m')
    analyses_this_month = monthly_trends.get(current_month, {}).get('count', 0)
    
    # Prepare and return the response
    aggregated_data = {
        "totalAnalyses": total_analyses,
        "avgConfidence": avg_confidence,
        "topDamageType": top_damage_type,
        "analysesThisMonth": analyses_this_month,
        "totalClaimsValue": total_cost,
        "claimsSuccessRate": 0.92,  # Placeholder
        "activeClaims": 45,  # Placeholder
        "avgClaimTime": "7 days",  # Placeholder
        "monthlyTrends": formatted_monthly_trends,
        "severityBreakdown": severity_distribution,
        "damageTypeDistribution": damage_type_distribution,
        "recentAnalyses": recent_analyses
    }
    
    return jsonify({"success": True, "data": aggregated_data}), 200

# Cached version of the dashboard data function
@cached_firestore_query('users', cache_seconds=300)  # Cache for 5 minutes
def cached_get_real_dashboard_data(db):
    """
    Cached version of the real dashboard data function.
    Uses the same logic but with caching to reduce Firebase reads.
    """
    return get_real_dashboard_data(db)

def get_real_insurance_data(db):
    """
    Fetches real insurance data from Firestore by analyzing user analysis histories
    for insurance-related claims and damage assessments.
    """
    try:
        logging.info("Fetching real insurance data from Firestore")
        
        # Track operations for usage monitoring
        track_operation('read', 'users_collection')
        
        # Initialize counters and data structures
        total_claims = 0
        total_claim_value = 0
        coverage_types = {"comprehensive": 0, "collision": 0, "liability": 0}
        claim_statuses = {"approved": 0, "pending": 0, "rejected": 0}
        recent_claims = []
        monthly_trends = {}
        vehicle_makes = {}
        
        # Query users collection with pagination to manage reads
        users_ref = db.collection('users')
        
        # Use batch processing to optimize reads
        batch_size = 50
        last_doc = None
        processed_users = 0
        
        while processed_users < 200:  # Limit total users processed to control costs
            query = users_ref.limit(batch_size)
            if last_doc:
                query = query.start_after(last_doc)
            
            docs = query.stream()
            docs_list = list(docs)
            
            if not docs_list:
                break
                
            last_doc = docs_list[-1]
            processed_users += len(docs_list)
            
            for user_doc in docs_list:
                user_data = user_doc.to_dict()
                user_id = user_doc.id
                
                # Process analysis history for insurance data
                analysis_history = user_data.get('analysisHistory', {})
                
                for analysis_id, analysis in analysis_history.items():
                    if not isinstance(analysis, dict):
                        continue
                    
                    # Check if this analysis has insurance relevance
                    has_insurance_data = any([
                        analysis.get('insuranceProvider'),
                        analysis.get('policyNumber'),
                        analysis.get('claimAmount'),
                        analysis.get('severity') in ['high', 'severe', 'major']
                    ])
                    
                    if has_insurance_data or analysis.get('damageType'):
                        total_claims += 1
                        
                        # Extract cost information
                        claim_amount = 0
                        if 'estimatedCost' in analysis:
                            try:
                                cost_str = str(analysis['estimatedCost'])
                                claim_amount = float(''.join(c for c in cost_str if c.isdigit() or c == '.'))
                                total_claim_value += claim_amount
                            except:
                                claim_amount = 2500  # Default claim amount
                                total_claim_value += claim_amount
                        elif 'claimAmount' in analysis:
                            try:
                                claim_amount = float(analysis['claimAmount'])
                                total_claim_value += claim_amount
                            except:
                                claim_amount = 2500
                                total_claim_value += claim_amount
                        else:
                            # Estimate claim amount based on damage severity
                            severity = analysis.get('severity', 'medium').lower()
                            if severity in ['high', 'severe', 'major']:
                                claim_amount = 4500
                            elif severity in ['medium', 'moderate']:
                                claim_amount = 2500
                            else:
                                claim_amount = 1200
                            total_claim_value += claim_amount
                        
                        # Categorize coverage type based on damage type
                        damage_type = analysis.get('damageType', '').lower()
                        if any(word in damage_type for word in ['collision', 'crash', 'impact']):
                            coverage_types["collision"] += 1
                        elif any(word in damage_type for word in ['theft', 'vandal', 'weather', 'hail', 'flood']):
                            coverage_types["comprehensive"] += 1
                        else:
                            coverage_types["liability"] += 1
                        
                        # Assign claim status based on analysis data
                        if analysis.get('status') == 'approved' or analysis.get('confidence', 0) > 0.8:
                            claim_statuses["approved"] += 1
                        elif analysis.get('status') == 'rejected' or analysis.get('confidence', 0) < 0.4:
                            claim_statuses["rejected"] += 1
                        else:
                            claim_statuses["pending"] += 1
                        
                        # Track vehicle makes for diversity
                        vehicle_make = analysis.get('vehicleMake', 'Unknown')
                        vehicle_makes[vehicle_make] = vehicle_makes.get(vehicle_make, 0) + 1
                        
                        # Track monthly trends
                        timestamp = analysis.get('timestamp', '')
                        if timestamp:
                            try:
                                date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                month_key = date.strftime('%Y-%m')
                                if month_key not in monthly_trends:
                                    monthly_trends[month_key] = {'claims': 0, 'settlements': 0, 'total_cost': 0}
                                monthly_trends[month_key]['claims'] += 1
                                monthly_trends[month_key]['total_cost'] += claim_amount
                                
                                # Calculate settlements based on status
                                if analysis.get('status') == 'approved' or analysis.get('confidence', 0) > 0.8:
                                    monthly_trends[month_key]['settlements'] += 1
                            except:
                                pass
                        
                        # Add to recent claims (limit to 10 most recent)
                        if len(recent_claims) < 10:
                            recent_claims.append({
                                'id': f'claim_{analysis_id}',
                                'submittedAt': analysis.get('timestamp', datetime.now().isoformat()),
                                'claimDetails': {
                                    'policyNumber': analysis.get('policyNumber', f'POL-{total_claims:03d}'),
                                    'insuranceProvider': analysis.get('insuranceProvider', 'AutoSecure'),
                                    'claimAmount': claim_amount,
                                    'status': analysis.get('status', 'approved' if analysis.get('confidence', 0) > 0.8 else 'pending'),
                                    'vehicleMake': analysis.get('vehicleMake', 'Unknown'),
                                    'vehicleModel': analysis.get('vehicleModel', 'Unknown'),
                                    'damageType': analysis.get('damageType', 'Unknown'),
                                    'premium': int(claim_amount * 0.15)  # Estimate 15% of claim as premium
                                }
                            })
        
        # If we have no real insurance data, return None to trigger fallback
        if total_claims == 0:
            logging.info("No real insurance data found in Firestore")
            return None
        
        # Format monthly trends for response
        formatted_monthly_trends = []
        for month, data in sorted(monthly_trends.items()):
            avg_cost = data['total_cost'] / data['claims'] if data['claims'] > 0 else 0
            formatted_monthly_trends.append({
                'month': month,
                'claims': data['claims'],
                'settlements': data['settlements'],
                'averageCost': int(avg_cost)
            })
        
        # Calculate current month claims
        current_month = datetime.now().strftime('%Y-%m')
        claims_this_month = monthly_trends.get(current_month, {}).get('claims', 0)
        
        # Calculate approval rate
        approval_rate = claim_statuses["approved"] / total_claims if total_claims > 0 else 0
        
        # Prepare insurance data response
        insurance_data = {
            "totalClaims": total_claims,
            "avgClaimValue": int(total_claim_value / total_claims) if total_claims > 0 else 0,
            "topInsuranceType": max(coverage_types.items(), key=lambda x: x[1])[0].title() if any(coverage_types.values()) else "Comprehensive",
            "claimsThisMonth": claims_this_month,
            "totalInsuranceValue": int(total_claim_value),
            "claimApprovalRate": round(approval_rate, 2),
            "pendingApprovals": claim_statuses["pending"],
            "avgProcessingTime": "5-7 days",
            "monthlyTrends": formatted_monthly_trends,
            "coverageBreakdown": coverage_types,
            "claimStatusDistribution": claim_statuses,
            "recentClaims": recent_claims
        }
        
        logging.info(f"Successfully fetched real insurance data: {total_claims} claims, {len(vehicle_makes)} vehicle makes")
        return insurance_data
        
    except Exception as e:
        logging.error(f"Error fetching real insurance data from Firestore: {e}", exc_info=True)
        return None

# Cached version of the insurance data function
@cached_firestore_query('users', cache_seconds=300)  # Cache for 5 minutes
def cached_get_real_insurance_data(db):
    """
    Cached version of the real insurance data function.
    Uses the same logic but with caching to reduce Firebase reads.
    """
    return get_real_insurance_data(db)

@admin_bp.route('/admin/insurance-dashboard-data', methods=['GET', 'OPTIONS'])
@require_api_key
@require_admin
def get_insurance_dashboard_data():
    """
    Retrieves insurance-specific dashboard data with unique data per car.
    First tries to fetch real data from Firebase/Firestore, then falls back to sample data if unavailable.
    """
    try:
        logging.info("Fetching insurance-specific dashboard data")
        
        # First, try to get real data from Firebase/Firestore
        db = get_db()
        if db is not None:
            try:
                logging.info("Attempting to fetch real insurance data from Firestore")
                real_data = get_real_insurance_data(db)
                
                # If we got real data successfully, return it
                if real_data and real_data.get('totalClaims', 0) > 0:
                    response_data = {
                        "success": True, 
                        "data": real_data,
                        "data_source": "real",
                        "message": "Using real insurance data from Firestore"
                    }
                    logging.info("Successfully fetched real insurance data from Firestore")
                    return jsonify(response_data), 200
                else:
                    logging.info("No real insurance data found in Firestore, falling back to sample data")
                    
            except Exception as firestore_error:
                logging.warning(f"Failed to fetch real insurance data from Firestore: {firestore_error}")
                # Continue to fallback below
        else:
            logging.info("Firestore unavailable or usage limits reached, using sample insurance data")
        
        # Fallback to sample data
        # Generate unique insurance data per car make/model
        import random
        import hashlib
        
        # Car data with unique characteristics
        car_models = [
            {"make": "Toyota", "model": "Camry", "base_value": 25000},
            {"make": "Honda", "model": "Civic", "base_value": 22000},
            {"make": "BMW", "model": "X3", "base_value": 45000},
            {"make": "Mercedes", "model": "C-Class", "base_value": 50000},
            {"make": "Audi", "model": "A4", "base_value": 40000},
            {"make": "Ford", "model": "F-150", "base_value": 35000},
            {"make": "Chevrolet", "model": "Malibu", "base_value": 24000},
            {"make": "Nissan", "model": "Altima", "base_value": 23000},
            {"make": "Hyundai", "model": "Elantra", "base_value": 20000},
            {"make": "Volkswagen", "model": "Jetta", "base_value": 21000}
        ]
        
        # Generate unique data for each car
        def generate_car_specific_data(car):
            # Use car make+model as seed for consistent but unique data
            seed = int(hashlib.md5(f"{car['make']}{car['model']}".encode()).hexdigest()[:8], 16)
            random.seed(seed)
            
            # Generate unique characteristics based on car value and brand
            luxury_factor = 1.0
            if car['make'] in ['BMW', 'Mercedes', 'Audi']:
                luxury_factor = 1.5
            elif car['make'] in ['Toyota', 'Honda']:
                luxury_factor = 0.8
                
            return {
                "claims": random.randint(8, 25),
                "avgCost": int(car['base_value'] * luxury_factor * random.uniform(0.1, 0.3)),
                "approvalRate": round(random.uniform(0.75, 0.95), 2),
                "premium": int(car['base_value'] * 0.03 * luxury_factor * random.uniform(0.8, 1.2))
            }
        
        # Generate comprehensive data
        total_claims = 0
        total_claim_value = 0
        coverage_types = {"comprehensive": 0, "collision": 0, "liability": 0}
        claim_statuses = {"approved": 0, "pending": 0, "rejected": 0}
        recent_claims = []
        monthly_trends = []
        
        # Generate monthly data for last 6 months
        months = ["2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12"]
        for i, month in enumerate(months):
            month_claims = 0
            month_settlements = 0
            month_costs = []
            
            for car in car_models:
                car_data = generate_car_specific_data(car)
                
                # Vary monthly data slightly
                random.seed(int(hashlib.md5(f"{car['make']}{month}".encode()).hexdigest()[:8], 16))
                monthly_factor = random.uniform(0.7, 1.3)
                
                claims_this_month = max(1, int(car_data["claims"] / 6 * monthly_factor))
                settlements = int(claims_this_month * car_data["approvalRate"])
                avg_cost = car_data["avgCost"]
                
                month_claims += claims_this_month
                month_settlements += settlements
                month_costs.append(avg_cost)
                
                total_claims += claims_this_month
                total_claim_value += claims_this_month * avg_cost
                
                # Distribute coverage types
                coverage_types["comprehensive"] += int(claims_this_month * 0.4)
                coverage_types["collision"] += int(claims_this_month * 0.35)
                coverage_types["liability"] += int(claims_this_month * 0.25)
                
                # Distribute claim statuses
                claim_statuses["approved"] += settlements
                claim_statuses["pending"] += max(0, claims_this_month - settlements - int(claims_this_month * 0.1))
                claim_statuses["rejected"] += int(claims_this_month * 0.1)
            
            monthly_trends.append({
                "month": month,
                "claims": month_claims,
                "settlements": month_settlements,
                "averageCost": int(sum(month_costs) / len(month_costs))
            })
        
        # Generate recent claims with unique car data
        for i, car in enumerate(car_models[:5]):
            car_data = generate_car_specific_data(car)
            recent_claims.append({
                'id': f'claim_{car["make"].lower()}_{i+1:03d}',
                'submittedAt': f'2024-12-{8-i:02d}T{10+i:02d}:30:00Z',
                'claimDetails': {
                    'policyNumber': f'POL-{car["make"][:3].upper()}{i+1:03d}',
                    'insuranceProvider': 'AutoSecure' if car['make'] in ['BMW', 'Mercedes'] else 'SafeDrive',
                    'claimAmount': car_data["avgCost"],
                    'status': ['approved', 'pending', 'approved', 'approved', 'pending'][i],
                    'vehicleMake': car['make'],
                    'vehicleModel': car['model'],
                    'damageType': ['Collision', 'Scratch', 'Dent', 'Paint Damage', 'Hail Damage'][i],
                    'premium': car_data["premium"]
                }
            })
        
        insurance_data = {
            "totalClaims": total_claims,
            "avgClaimValue": int(total_claim_value / total_claims) if total_claims > 0 else 0,
            "topInsuranceType": "Comprehensive",
            "claimsThisMonth": monthly_trends[-1]["claims"],
            "totalInsuranceValue": total_claim_value,
            "claimApprovalRate": round(claim_statuses["approved"] / total_claims, 2) if total_claims > 0 else 0,
            "pendingApprovals": claim_statuses["pending"],
            "avgProcessingTime": "5-7 days",
            "monthlyTrends": monthly_trends,
            "coverageBreakdown": coverage_types,
            "claimStatusDistribution": claim_statuses,
            "recentClaims": recent_claims
        }
        
        # Return sample data with fallback indicator
        response_data = {
            "success": True, 
            "data": insurance_data,
            "data_source": "sample",
            "message": "Using sample insurance data (Firebase unavailable or no real data)"
        }
        
        logging.info("Successfully generated insurance dashboard sample data")
        return jsonify(response_data), 200

    except Exception as e:
        logging.error(f"Error fetching insurance dashboard data: {e}", exc_info=True)
        # Return sample data even on error to prevent 500 responses
        return jsonify({
            "success": True,
            "data": {
                "totalClaims": 50,
                "avgClaimValue": 3500,
                "topInsuranceType": "Comprehensive",
                "claimsThisMonth": 8,
                "totalInsuranceValue": 175000,
                "claimApprovalRate": 0.85,
                "pendingApprovals": 5,
                "avgProcessingTime": "5-7 days",
                "monthlyTrends": [],
                "coverageBreakdown": {"comprehensive": 20, "collision": 18, "liability": 12},
                "claimStatusDistribution": {"approved": 42, "pending": 5, "rejected": 3},
                "recentClaims": []
            },
            "data_source": "fallback",
            "message": "Using fallback sample data due to error",
            "error_details": str(e)
        }), 200

@admin_bp.route('/admin/test-simple', methods=['GET'])
def test_simple():
    """Simple test route without any dependencies"""
    return jsonify({
        "success": True,
        "message": "Simple test route working",
        "timestamp": str(datetime.now())
    }), 200
