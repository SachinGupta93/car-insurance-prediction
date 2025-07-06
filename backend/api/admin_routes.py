#!/usr/bin/env python3
"""
Admin routes for data migration and debugging
"""

import os
import json
import requests
from datetime import datetime
from flask import Blueprint, request, jsonify
from config.firebase_config import get_firebase_config
import traceback

admin_bp = Blueprint('admin', __name__)

# Firebase REST API client
firebase_config = get_firebase_config()
firebase_db_url = firebase_config.get('databaseURL')

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
