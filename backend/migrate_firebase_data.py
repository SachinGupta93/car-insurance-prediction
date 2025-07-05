#!/usr/bin/env python3
"""
Migrate Firebase data from root level to proper user structure
"""
import os
import sys
import logging
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.firebase_config import initialize_firebase
import requests
import json

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FirebaseRestClient:
    def __init__(self, database_url):
        self.database_url = database_url.rstrip('/')
    
    def get(self, path):
        """Get data from Firebase"""
        try:
            url = f"{self.database_url}/{path.lstrip('/')}.json"
            response = requests.get(url)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"HTTP {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error getting data: {str(e)}")
            return None
    
    def put(self, path, data):
        """Set data in Firebase"""
        try:
            url = f"{self.database_url}/{path.lstrip('/')}.json"
            response = requests.put(url, json=data)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"HTTP {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error setting data: {str(e)}")
            return None
    
    def delete(self, path):
        """Delete data from Firebase"""
        try:
            url = f"{self.database_url}/{path.lstrip('/')}.json"
            response = requests.delete(url)
            
            if response.status_code == 200:
                return True
            else:
                logger.warning(f"HTTP {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error deleting data: {str(e)}")
            return False

def migrate_data():
    """Migrate data from root level to proper user structure using Firebase REST API"""
    try:
        # Initialize Firebase
        initialize_firebase()
        
        # Create Firebase REST client
        database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com/')
        firebase_rest_client = FirebaseRestClient(database_url)
        
        logger.info("🔍 Fetching current Firebase data structure...")
        
        # Get all data from Firebase root
        root_data = firebase_rest_client.get('/')
        
        if not root_data:
            logger.info("📭 No data found in Firebase root")
            return
        
        logger.info(f"📊 Found data in Firebase root")
        
        # Find items that need migration (have userId but are at root level)
        items_to_migrate = []
        users_data = root_data.get('users', {})
        
        for key, value in root_data.items():
            if key == 'users':
                continue
            
            if isinstance(value, dict) and 'userId' in value:
                items_to_migrate.append((key, value))
        
        if not items_to_migrate:
            logger.info("✅ No items need migration")
            return
        
        logger.info(f"🔄 Found {len(items_to_migrate)} items to migrate")
        
        # Group by userId
        user_groups = {}
        for key, value in items_to_migrate:
            user_id = value['userId']
            if user_id not in user_groups:
                user_groups[user_id] = []
            user_groups[user_id].append((key, value))
        
        logger.info(f"👥 Items belong to {len(user_groups)} users")
        
        # Migrate each user's data
        for user_id, items in user_groups.items():
            logger.info(f"👤 Migrating {len(items)} items for user {user_id}")
            
            # Ensure user profile exists
            user_path = f'users/{user_id}'
            existing_user = firebase_rest_client.get(user_path)
            
            if not existing_user:
                logger.info(f"  📝 Creating user profile for {user_id}")
                firebase_rest_client.put(f'{user_path}/profile', {
                    'uid': user_id,
                    'created_at': datetime.now().isoformat(),
                    'last_login_at': datetime.now().isoformat()
                })
            
            # Migrate each item
            for key, value in items:
                # Clean and transform the data
                clean_value = transform_legacy_data(value)
                
                # Save to user's analysis history
                analysis_path = f'users/{user_id}/analysis_history/{key}'
                firebase_rest_client.put(analysis_path, clean_value)
                
                logger.info(f"  ✅ Migrated {key}")
            
            logger.info(f"  🎉 Completed migration for user {user_id}")
        
        # Ask user if they want to clean up old data
        cleanup = input("\n🗑️ Migration complete! Remove old data from root? (y/n): ")
        if cleanup.lower() == 'y':
            for user_id, items in user_groups.items():
                for key, value in items:
                    firebase_rest_client.delete(key)
                    logger.info(f"  🗑️ Removed {key} from root")
            
            logger.info("✅ Cleanup completed")
        
        logger.info("🎉 Data migration completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise

def transform_legacy_data(legacy_data):
    """Transform legacy data structure to new format"""
    clean_data = legacy_data.copy()
    
    # Remove userId since it's now implicit in the path
    if 'userId' in clean_data:
        del clean_data['userId']
    
    # Add required timestamps
    if 'uploadedAt' not in clean_data:
        clean_data['uploadedAt'] = datetime.now().isoformat()
    
    if 'created_at' not in clean_data:
        clean_data['created_at'] = clean_data.get('uploadedAt', datetime.now().isoformat())
    
    # Transform imageUrl to image
    if 'imageUrl' in clean_data:
        clean_data['image'] = clean_data.pop('imageUrl')
    
    # Create result structure
    result = clean_data.get('result', {})
    
    # Move recommendations to result
    if 'recommendations' in clean_data:
        result['recommendations'] = clean_data.pop('recommendations')
    
    # Move repairEstimate to result
    if 'repairEstimate' in clean_data:
        result['repairEstimate'] = clean_data.pop('repairEstimate')
    
    # Add default values for missing fields
    if 'confidence' not in result:
        result['confidence'] = 0.85
    
    if 'severity' not in result:
        result['severity'] = 'moderate'
    
    if 'identifiedDamageRegions' not in result:
        # Create damage regions from description if available
        regions = []
        if 'description' in clean_data:
            regions.append({
                'damageType': extract_damage_type(clean_data['description']),
                'location': 'hood',  # Default location
                'severity': result['severity'],
                'confidence': result['confidence']
            })
        result['identifiedDamageRegions'] = regions
    
    clean_data['result'] = result
    
    return clean_data

def extract_damage_type(description):
    """Extract damage type from description"""
    description_lower = description.lower()
    
    if 'scratch' in description_lower:
        return 'scratch'
    elif 'dent' in description_lower:
        return 'dent'
    elif 'paint' in description_lower or 'chip' in description_lower:
        return 'paint damage'
    elif 'crack' in description_lower:
        return 'crack'
    elif 'rust' in description_lower:
        return 'rust'
    else:
        return 'other'

if __name__ == "__main__":
    migrate_data()