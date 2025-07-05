#!/usr/bin/env python3
"""
Script to fix missing user profiles by calling the backend API endpoint
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

def fix_missing_profiles():
    """Fix missing user profiles by calling the backend API"""
    try:
        # Backend URL
        backend_url = "http://127.0.0.1:8000/api"
        
        # Known users with missing profiles
        missing_users = [
            {
                'uid': 'Z9J4xwhXDceAD6u83WOqdOlORVO2',
                'email': '22p61a67f5@vbithyd.ac.in',
                'display_name': '22p61a67f5@vbithyd.ac.in'
            },
            {
                'uid': '63C3fVHR59cBBjtaZXuIH5bs7c53',
                'email': 'deekshaguptha2@gmail.com',
                'display_name': 'deekshaguptha2@gmail.com'
            }
        ]
        
        logger.info(f"Creating profiles for {len(missing_users)} users...")
        
        for user in missing_users:
            try:
                logger.info(f"Creating profile for {user['email']} ({user['uid']})...")
                
                # Create profile data
                profile_data = {
                    'email': user['email'],
                    'display_name': user['display_name']
                }
                
                # Call the backend API with dev mode bypass
                headers = {
                    'Content-Type': 'application/json',
                    'X-Dev-Auth-Bypass': 'true'
                }
                
                # First, let's manually create the profile using the backend's internal structure
                url = f"{backend_url}/dev/create-profile"
                
                payload = {
                    'uid': user['uid'],
                    'profile_data': profile_data
                }
                
                logger.info(f"Making request to: {url}")
                response = requests.post(url, json=payload, headers=headers, timeout=30)
                
                if response.status_code == 200:
                    logger.info(f"✅ Successfully created profile for {user['email']}")
                else:
                    logger.error(f"❌ Failed to create profile for {user['email']}: HTTP {response.status_code}")
                    logger.error(f"Response: {response.text}")
                    
            except Exception as e:
                logger.error(f"❌ Error creating profile for {user['email']}: {str(e)}")
        
        logger.info("✅ Profile creation completed!")
        
    except Exception as e:
        logger.error(f"❌ Error during profile creation: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    logger.info("🔄 Starting profile creation fix...")
    fix_missing_profiles()
    logger.info("🏁 Profile creation fix completed!")