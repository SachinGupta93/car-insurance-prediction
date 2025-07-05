#!/usr/bin/env python3
"""
Script to backfill missing user profiles in Firebase Realtime Database
This script creates profiles for users who exist in Firebase Auth but not in the database
"""

import os
import sys
import json
import logging
from datetime import datetime
from firebase_admin import auth
from config.firebase_config import initialize_firebase
from auth.user_auth import UserAuth
import requests

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def backfill_missing_profiles():
    """Backfill missing user profiles"""
    try:
        # Initialize Firebase Admin
        logger.info("Initializing Firebase Admin...")
        if not initialize_firebase():
            logger.error("Failed to initialize Firebase")
            return
            
        # Create a simple REST client for database access
        database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com')
        
        class SimpleFirebaseClient:
            def __init__(self, database_url):
                self.database_url = database_url.rstrip('/')
                
            def child(self, path):
                new_client = SimpleFirebaseClient(self.database_url)
                new_client.path = getattr(self, 'path', '') + '/' + path
                return new_client
                
            def get(self):
                try:
                    path = getattr(self, 'path', '')
                    url = f"{self.database_url}{path}.json"
                    response = requests.get(url, timeout=10)
                    if response.status_code == 200:
                        return response.json()
                    return {}
                except Exception as e:
                    logger.error(f"Error getting data: {str(e)}")
                    return {}
                    
            def set(self, data):
                try:
                    path = getattr(self, 'path', '')
                    url = f"{self.database_url}{path}.json"
                    response = requests.put(url, json=data, timeout=10)
                    return response.status_code == 200
                except Exception as e:
                    logger.error(f"Error setting data: {str(e)}")
                    return False
        
        db_ref = SimpleFirebaseClient(database_url)
        
        # Get all users from Firebase Auth
        logger.info("Fetching all users from Firebase Auth...")
        users = []
        page = auth.list_users()
        
        while page:
            for user in page.users:
                users.append(user)
            page = page.get_next_page()
        
        logger.info(f"Found {len(users)} users in Firebase Auth")
        
        # Initialize UserAuth
        user_auth = UserAuth(db_ref)
        
        # Get existing profiles from database
        logger.info("Checking existing profiles in database...")
        existing_profiles = db_ref.child('users').get() or {}
        
        missing_profiles = []
        
        for user in users:
            user_id = user.uid
            
            # Check if profile exists
            if user_id not in existing_profiles or 'profile' not in existing_profiles.get(user_id, {}):
                missing_profiles.append({
                    'uid': user.uid,
                    'email': user.email,
                    'display_name': user.display_name,
                    'created_time': user.user_metadata.creation_timestamp,
                    'last_sign_in': user.user_metadata.last_sign_in_timestamp
                })
        
        logger.info(f"Found {len(missing_profiles)} users missing profiles")
        
        if not missing_profiles:
            logger.info("✅ All users already have profiles!")
            return
        
        # Create missing profiles
        logger.info("Creating missing profiles...")
        for user_info in missing_profiles:
            try:
                logger.info(f"Creating profile for user: {user_info['email']} ({user_info['uid']})")
                
                # Create user info dict
                user_data = {
                    'email': user_info['email'],
                    'name': user_info['display_name'] or user_info['email'].split('@')[0],
                    'provider': 'firebase'
                }
                
                # Use the ensure_user_profile method to create the profile
                user_auth.ensure_user_profile(user_info['uid'], user_data)
                
                logger.info(f"✅ Created profile for {user_info['email']}")
                
            except Exception as e:
                logger.error(f"❌ Failed to create profile for {user_info['email']}: {str(e)}")
        
        logger.info("✅ Backfill operation completed!")
        
        # Verify results
        logger.info("Verifying results...")
        updated_profiles = db_ref.child('users').get() or {}
        
        for user_info in missing_profiles:
            if user_info['uid'] in updated_profiles and 'profile' in updated_profiles[user_info['uid']]:
                logger.info(f"✅ Verified: {user_info['email']} profile exists")
            else:
                logger.error(f"❌ Verification failed: {user_info['email']} profile missing")
        
    except Exception as e:
        logger.error(f"❌ Error during backfill: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    logger.info("🔄 Starting user profile backfill...")
    backfill_missing_profiles()
    logger.info("🏁 Backfill script completed!")