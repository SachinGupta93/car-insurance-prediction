#!/usr/bin/env python3
"""
Debug Firebase Database Structure using REST API
"""
import requests
import json
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Firebase REST API URL
FIREBASE_URL = 'https://car-13674-default-rtdb.firebaseio.com'

def fetch_firebase_data():
    """Fetch Firebase data using REST API"""
    try:
        # Get all data from root
        response = requests.get(f"{FIREBASE_URL}/.json")
        
        if response.status_code == 200:
            data = response.json()
            
            if not data:
                logger.info("📭 No data found in Firebase")
                return
            
            logger.info(f"📊 Found {len(data)} items at root level")
            
            # Analyze structure
            users_data = data.get('users', {})
            root_level_items = {k: v for k, v in data.items() if k != 'users'}
            
            logger.info(f"👥 Users data: {len(users_data)} users")
            logger.info(f"🗂️ Root level items: {len(root_level_items)} items")
            
            # Show user structure
            if users_data:
                logger.info("\n👥 USERS STRUCTURE:")
                for uid, user_data in list(users_data.items())[:3]:
                    logger.info(f"  👤 User {uid}:")
                    if isinstance(user_data, dict):
                        for key, value in user_data.items():
                            if key == 'analysis_history':
                                if isinstance(value, dict):
                                    logger.info(f"    📊 {key}: {len(value)} items")
                                else:
                                    logger.info(f"    📊 {key}: {type(value)}")
                            else:
                                logger.info(f"    🔑 {key}: {type(value)}")
            
            # Show root level items
            if root_level_items:
                logger.info("\n🗂️ ROOT LEVEL ITEMS:")
                for key, value in list(root_level_items.items())[:10]:
                    if isinstance(value, dict):
                        logger.info(f"  🔑 {key}:")
                        for subkey, subvalue in list(value.items())[:5]:
                            if subkey == 'userId':
                                logger.info(f"    👤 {subkey}: {subvalue}")
                            elif subkey == 'description':
                                logger.info(f"    📝 {subkey}: {str(subvalue)[:50]}...")
                            elif subkey == 'uploadedAt':
                                logger.info(f"    📅 {subkey}: {subvalue}")
                            elif subkey == 'imageUrl':
                                logger.info(f"    🖼️ {subkey}: {str(subvalue)[:50]}...")
                            else:
                                logger.info(f"    🔑 {subkey}: {type(subvalue)}")
                    else:
                        logger.info(f"  🔑 {key}: {type(value)} - {str(value)[:50]}...")
            
            # Check for items that should be migrated
            items_to_migrate = []
            for key, value in root_level_items.items():
                if isinstance(value, dict) and 'userId' in value:
                    items_to_migrate.append((key, value))
            
            if items_to_migrate:
                logger.info(f"\n🔄 Found {len(items_to_migrate)} items that should be migrated")
                
                # Group by userId
                user_groups = {}
                for key, value in items_to_migrate:
                    user_id = value['userId']
                    if user_id not in user_groups:
                        user_groups[user_id] = []
                    user_groups[user_id].append((key, value))
                
                logger.info(f"👥 Items belong to {len(user_groups)} different users:")
                for user_id, items in user_groups.items():
                    logger.info(f"  👤 User {user_id}: {len(items)} items")
                
                # Migrate data
                migrate_data(user_groups)
            
        else:
            logger.error(f"❌ Failed to fetch data: {response.status_code}")
            
    except Exception as e:
        logger.error(f"❌ Error fetching Firebase data: {e}")
        raise

def migrate_data(user_groups):
    """Migrate data from root level to proper user structure"""
    try:
        logger.info("\n🔄 Starting data migration...")
        
        for user_id, items in user_groups.items():
            logger.info(f"👤 Migrating {len(items)} items for user {user_id}")
            
            # Prepare data for batch update
            for key, value in items:
                # Clean the data
                clean_value = value.copy()
                
                # Remove userId from the data since it's now implicit in the path
                if 'userId' in clean_value:
                    del clean_value['userId']
                
                # Add proper timestamp fields
                if 'uploadedAt' not in clean_value:
                    clean_value['uploadedAt'] = datetime.now().isoformat()
                
                # Add created_at for consistency
                if 'created_at' not in clean_value:
                    clean_value['created_at'] = clean_value.get('uploadedAt', datetime.now().isoformat())
                
                # Transform the data structure to match expected format
                if 'imageUrl' in clean_value:
                    clean_value['image'] = clean_value.pop('imageUrl')
                
                # Transform recommendations and repair estimate into result structure
                if 'recommendations' in clean_value or 'repairEstimate' in clean_value:
                    result = clean_value.get('result', {})
                    
                    if 'recommendations' in clean_value:
                        result['recommendations'] = clean_value.pop('recommendations')
                    
                    if 'repairEstimate' in clean_value:
                        result['repairEstimate'] = clean_value.pop('repairEstimate')
                    
                    # Add default values for missing fields
                    if 'confidence' not in result:
                        result['confidence'] = 0.85  # Default confidence
                    
                    if 'severity' not in result:
                        result['severity'] = 'moderate'  # Default severity
                    
                    if 'identifiedDamageRegions' not in result:
                        result['identifiedDamageRegions'] = []
                    
                    clean_value['result'] = result
                
                # Save to user's analysis history
                user_path = f"/users/{user_id}/analysis_history/{key}"
                response = requests.put(f"{FIREBASE_URL}{user_path}.json", json=clean_value)
                
                if response.status_code == 200:
                    logger.info(f"    ✅ Migrated item {key}")
                else:
                    logger.error(f"    ❌ Failed to migrate item {key}: {response.status_code}")
            
            logger.info(f"  ✅ Completed migration for user {user_id}")
        
        # Remove old data from root level
        logger.info("\n🗑️ Removing old data from root level...")
        for user_id, items in user_groups.items():
            for key, value in items:
                response = requests.delete(f"{FIREBASE_URL}/{key}.json")
                if response.status_code == 200:
                    logger.info(f"    🗑️ Removed old item {key}")
                else:
                    logger.error(f"    ❌ Failed to remove old item {key}: {response.status_code}")
        
        logger.info("🎉 Data migration completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Error during data migration: {e}")
        raise

if __name__ == "__main__":
    fetch_firebase_data()