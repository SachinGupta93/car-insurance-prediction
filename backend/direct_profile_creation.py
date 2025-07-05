#!/usr/bin/env python3
"""
Direct profile creation using the same Firebase client as the backend
"""

import os
import sys
import json
import logging
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_profiles_directly():
    """Create profiles directly using the same Firebase client as backend"""
    try:
        # Import the same Firebase client class from main.py
        database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com')
        
        class FirebaseRestClient:
            def __init__(self, database_url):
                self.database_url = database_url.rstrip('/')
                self.base_url = f"{self.database_url}"
                
            def child(self, path):
                """Navigate to a child path"""
                new_client = FirebaseRestClient(self.database_url)
                new_client.path = getattr(self, 'path', '') + '/' + path
                return new_client
                
            def get(self, auth_token=None):
                """Get data from Firebase using REST API"""
                try:
                    path = getattr(self, 'path', '')
                    url = f"{self.base_url}{path}.json"
                    
                    params = {}
                    if auth_token:
                        params['auth'] = auth_token
                        
                    logger.debug(f"FirebaseRestClient: GET {url}")
                    response = requests.get(url, params=params, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        logger.debug(f"FirebaseRestClient: Received data: {type(data)}")
                        return data if data is not None else {}
                    else:
                        logger.warning(f"FirebaseRestClient: HTTP {response.status_code} - {response.text}")
                        return {}
                        
                except Exception as e:
                    logger.error(f"FirebaseRestClient: Error getting data: {str(e)}")
                    return {}
                    
            def set(self, data, auth_token=None):
                """Set data to Firebase using REST API"""
                try:
                    path = getattr(self, 'path', '')
                    url = f"{self.base_url}{path}.json"
                    
                    params = {}
                    if auth_token:
                        params['auth'] = auth_token
                        
                    logger.debug(f"FirebaseRestClient: SET {url}")
                    response = requests.put(url, json=data, params=params, timeout=10)
                    
                    if response.status_code == 200:
                        logger.debug(f"FirebaseRestClient: Successfully set data")
                        return True
                    else:
                        logger.error(f"FirebaseRestClient: HTTP {response.status_code} - {response.text}")
                        return False
                        
                except Exception as e:
                    logger.error(f"FirebaseRestClient: Error setting data: {str(e)}")
                    return False
        
        # Create database reference
        db_ref = FirebaseRestClient(database_url)
        
        # All known users
        all_users = [
            {
                'uid': 'Z9J4xwhXDceAD6u83WOqdOlORVO2',
                'email': '22p61a67f5@vbithyd.ac.in'
            },
            {
                'uid': '63C3fVHR59cBBjtaZXuIH5bs7c53',
                'email': 'deekshaguptha2@gmail.com'
            },
            {
                'uid': 'nCmRw6KPoKZJAxpVcXzFVrHzC5B2',
                'email': 'deekshagupta6302@gmail.com'
            },
            {
                'uid': 'AWorsS210YShgNlvMCjPFK2nDpg1',
                'email': 'guptasach8247@gmail.com'
            }
        ]
        
        logger.info(f"Creating profiles for {len(all_users)} users...")
        
        for user in all_users:
            try:
                uid = user['uid']
                email = user['email']
                
                logger.info(f"Creating profile for {email} ({uid})...")
                
                # Check if profile already exists
                profile = db_ref.child('users').child(uid).child('profile').get()
                
                if profile:
                    logger.info(f"✅ Profile already exists for {email}")
                    continue
                
                # Create profile data
                profile_data = {
                    'uid': uid,
                    'email': email,
                    'name': email.split('@')[0],
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
                    'provider': 'firebase',
                    'profile_created_via': 'direct_script'
                }
                
                # Create the profile
                success = db_ref.child('users').child(uid).child('profile').set(profile_data)
                
                if success:
                    logger.info(f"✅ Created profile for {email}")
                    
                    # Initialize other data structures
                    db_ref.child('users').child(uid).child('analysis_history').set({})
                    db_ref.child('users').child(uid).child('vehicles').set({})
                    db_ref.child('users').child(uid).child('insurance').set({})
                    
                    logger.info(f"✅ Initialized all data structures for {email}")
                else:
                    logger.error(f"❌ Failed to create profile for {email}")
                    
            except Exception as e:
                logger.error(f"❌ Error creating profile for {email}: {str(e)}")
        
        logger.info("✅ Profile creation completed!")
        
        # Verify all profiles exist
        logger.info("Verifying all profiles...")
        for user in all_users:
            try:
                uid = user['uid']
                email = user['email']
                
                profile = db_ref.child('users').child(uid).child('profile').get()
                
                if profile:
                    logger.info(f"✅ Verified: {email} profile exists")
                else:
                    logger.error(f"❌ Verification failed: {email} profile missing")
                    
            except Exception as e:
                logger.error(f"❌ Error verifying {email}: {str(e)}")
        
    except Exception as e:
        logger.error(f"❌ Error during profile creation: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    logger.info("🔄 Starting direct profile creation...")
    create_profiles_directly()
    logger.info("🏁 Direct profile creation completed!")