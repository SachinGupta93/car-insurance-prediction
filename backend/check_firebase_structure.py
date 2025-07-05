"""
Check Firebase database structure and user profiles
"""

import requests
import os
import json
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_firebase_structure():
    """Check current Firebase structure"""
    try:
        # Get database URL from environment
        database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com/')
        
        # Check if we can connect to Firebase
        logger.info(f"Checking Firebase structure at: {database_url}")
        
        # Get root data
        root_url = f"{database_url.rstrip('/')}.json"
        logger.info(f"Fetching root data from: {root_url}")
        
        response = requests.get(root_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Successfully connected to Firebase")
            
            if data:
                logger.info(f"📊 Root data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dictionary'}")
                
                # Check if users structure exists
                if isinstance(data, dict) and 'users' in data:
                    users_data = data['users']
                    logger.info(f"👥 Found {len(users_data)} users in database")
                    
                    # Show user structure
                    for user_id, user_data in users_data.items():
                        logger.info(f"👤 User ID: {user_id}")
                        if isinstance(user_data, dict):
                            logger.info(f"   📂 User data keys: {list(user_data.keys())}")
                            
                            # Check profile structure
                            if 'profile' in user_data:
                                profile = user_data['profile']
                                logger.info(f"   📊 Profile: {profile}")
                            else:
                                logger.info(f"   ⚠️ No profile found for user {user_id}")
                                
                            # Check analysis history
                            if 'analysis_history' in user_data:
                                history = user_data['analysis_history']
                                if isinstance(history, dict):
                                    logger.info(f"   📈 Analysis history: {len(history)} entries")
                                else:
                                    logger.info(f"   📈 Analysis history: {type(history)}")
                            else:
                                logger.info(f"   ⚠️ No analysis history for user {user_id}")
                        else:
                            logger.info(f"   ⚠️ User data is not a dictionary: {type(user_data)}")
                else:
                    logger.info("⚠️ No users structure found in database")
                    
                # Check if there's old analysis_history structure
                if isinstance(data, dict) and 'analysis_history' in data:
                    old_history = data['analysis_history']
                    logger.info(f"⚠️ Found old analysis_history structure with {len(old_history)} entries")
                    logger.info("   This should be migrated to the new user-based structure")
                    
            else:
                logger.info("📂 Database is empty")
                
        else:
            logger.error(f"❌ Failed to connect to Firebase: {response.status_code}")
            logger.error(f"Response: {response.text}")
            
    except Exception as e:
        logger.error(f"❌ Error checking Firebase structure: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

def create_sample_user_profile():
    """Create a sample user profile for testing"""
    try:
        database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com/')
        
        sample_user_id = "sample_user_123"
        sample_profile = {
            'uid': sample_user_id,
            'created_at': datetime.now().isoformat(),
            'first_login': datetime.now().isoformat(),
            'last_activity': datetime.now().isoformat(),
            'total_analyses': 0,
            'total_vehicles': 0,
            'total_insurance_records': 0,
            'is_active': True,
            'user_status': 'active',
            'platform': 'web',
            'features_used': [],
            'email': 'sample@example.com',
            'name': 'Sample User',
            'provider': 'sample'
        }
        
        # Create user profile
        profile_url = f"{database_url.rstrip('/')}/users/{sample_user_id}/profile.json"
        logger.info(f"Creating sample user profile at: {profile_url}")
        
        response = requests.put(profile_url, json=sample_profile, timeout=10)
        
        if response.status_code == 200:
            logger.info("✅ Sample user profile created successfully")
            
            # Create empty structures
            for path in ['analysis_history', 'vehicles', 'insurance']:
                url = f"{database_url.rstrip('/')}/users/{sample_user_id}/{path}.json"
                requests.put(url, json={}, timeout=10)
                logger.info(f"✅ Created empty {path} structure")
                
        else:
            logger.error(f"❌ Failed to create sample profile: {response.status_code}")
            logger.error(f"Response: {response.text}")
            
    except Exception as e:
        logger.error(f"❌ Error creating sample profile: {str(e)}")

if __name__ == "__main__":
    logger.info("🔍 Checking Firebase database structure...")
    check_firebase_structure()
    
    logger.info("\n" + "="*50)
    logger.info("🚀 Creating sample user profile...")
    create_sample_user_profile()
    
    logger.info("\n" + "="*50)
    logger.info("🔍 Checking structure after sample creation...")
    check_firebase_structure()