#!/usr/bin/env python3
"""
Simple script to create missing user profiles directly via Firebase REST API
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

def create_missing_profiles():
    """Create missing user profiles for the known users"""
    try:
        database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com')
        
        # Known users from Firebase Auth (from the console you showed)
        known_users = [
            {
                'uid': 'Z9J4xwhXDceAD6u83WOqdOlORVO2',
                'email': '22p61a67f5@vbithyd.ac.in',
                'display_name': '22p61a67f5@vbithyd.ac.in',
                'created_date': '2025-07-03'
            },
            {
                'uid': '63C3fVHR59cBBjtaZXuIH5bs7c53',
                'email': 'deekshaguptha2@gmail.com',
                'display_name': 'deekshaguptha2@gmail.com',
                'created_date': '2025-05-27'
            },
            {
                'uid': 'nCmRw6KPoKZJAxpVcXzFVrHzC5B2',
                'email': 'deekshagupta6302@gmail.com',
                'display_name': 'deekshagupta6302@gmail.com',
                'created_date': '2025-05-27'
            },
            {
                'uid': 'AWorsS210YShgNlvMCjPFK2nDpg1',
                'email': 'guptasach8247@gmail.com',
                'display_name': 'guptasach8247@gmail.com',
                'created_date': '2025-05-23'
            }
        ]
        
        logger.info(f"Creating profiles for {len(known_users)} users...")
        
        for user in known_users:
            try:
                user_uid = user['uid']
                
                # Check if profile already exists
                profile_url = f"{database_url}/users/{user_uid}/profile.json"
                logger.info(f"Checking profile for {user['email']}...")
                
                response = requests.get(profile_url, timeout=10)
                if response.status_code == 200 and response.json():
                    logger.info(f"✅ Profile already exists for {user['email']}")
                    continue
                
                # Create profile data
                profile_data = {
                    'uid': user_uid,
                    'email': user['email'],
                    'name': user['display_name'],
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
                    'account_created_date': user['created_date']
                }
                
                # Create the profile
                logger.info(f"Creating profile for {user['email']}...")
                response = requests.put(profile_url, json=profile_data, timeout=10)
                
                if response.status_code == 200:
                    logger.info(f"✅ Created profile for {user['email']}")
                    
                    # Initialize other data structures
                    logger.info(f"Initializing data structures for {user['email']}...")
                    
                    # Analysis history
                    history_url = f"{database_url}/users/{user_uid}/analysis_history.json"
                    requests.put(history_url, json={}, timeout=10)
                    
                    # Vehicles
                    vehicles_url = f"{database_url}/users/{user_uid}/vehicles.json"
                    requests.put(vehicles_url, json={}, timeout=10)
                    
                    # Insurance
                    insurance_url = f"{database_url}/users/{user_uid}/insurance.json"
                    requests.put(insurance_url, json={}, timeout=10)
                    
                    logger.info(f"✅ Initialized all data structures for {user['email']}")
                    
                else:
                    logger.error(f"❌ Failed to create profile for {user['email']}: HTTP {response.status_code}")
                    
            except Exception as e:
                logger.error(f"❌ Error creating profile for {user['email']}: {str(e)}")
        
        logger.info("✅ Profile creation completed!")
        
        # Verify all profiles exist
        logger.info("Verifying all profiles...")
        for user in known_users:
            try:
                profile_url = f"{database_url}/users/{user['uid']}/profile.json"
                response = requests.get(profile_url, timeout=10)
                
                if response.status_code == 200 and response.json():
                    logger.info(f"✅ Verified: {user['email']} profile exists")
                else:
                    logger.error(f"❌ Verification failed: {user['email']} profile missing")
                    
            except Exception as e:
                logger.error(f"❌ Error verifying {user['email']}: {str(e)}")
        
    except Exception as e:
        logger.error(f"❌ Error during profile creation: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    logger.info("🔄 Starting profile creation...")
    create_missing_profiles()
    logger.info("🏁 Profile creation script completed!")