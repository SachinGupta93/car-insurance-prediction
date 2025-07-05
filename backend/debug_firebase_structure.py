#!/usr/bin/env python3
"""
Debug Firebase Database Structure
This script will help us understand the current data structure in Firebase.
"""
import firebase_admin
from firebase_admin import credentials, db
import json
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if Firebase is already initialized
        if not firebase_admin._apps:
            # Initialize Firebase Admin SDK
            cred = credentials.Certificate("D:/Car-damage-prediction/backend/car-damage-prediction-firebase-adminsdk-r9cud-7a3e5d0f1b.json")
            firebase_admin.initialize_app(cred, {
                'databaseURL': 'https://car-13674-default-rtdb.firebaseio.com/'
            })
            logger.info("✅ Firebase initialized successfully")
        else:
            logger.info("✅ Firebase already initialized")
        
        return db.reference()
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {e}")
        raise

def debug_firebase_structure():
    """Debug the current Firebase structure"""
    try:
        # Initialize Firebase
        db_ref = initialize_firebase()
        
        logger.info("🔍 Fetching root data from Firebase...")
        
        # Get all data from root
        root_data = db_ref.get()
        
        if not root_data:
            logger.info("📭 No data found in Firebase")
            return
        
        logger.info(f"📊 Found {len(root_data)} items at root level")
        
        # Analyze structure
        users_data = {}
        root_level_data = {}
        
        for key, value in root_data.items():
            if key == 'users':
                users_data = value
            else:
                root_level_data[key] = value
        
        logger.info(f"👥 Users data: {len(users_data) if users_data else 0} users")
        logger.info(f"🗂️ Root level data: {len(root_level_data)} items")
        
        # Analyze root level data
        if root_level_data:
            logger.info("📋 Root level data analysis:")
            for key, value in list(root_level_data.items())[:5]:  # Show first 5 items
                if isinstance(value, dict):
                    logger.info(f"  🔑 {key}: {list(value.keys())[:5]}...")
                    if 'userId' in value:
                        logger.info(f"    👤 userId: {value['userId']}")
                    if 'description' in value:
                        logger.info(f"    📝 description: {value['description'][:50]}...")
                    if 'uploadedAt' in value:
                        logger.info(f"    📅 uploadedAt: {value['uploadedAt']}")
                else:
                    logger.info(f"  🔑 {key}: {type(value)} - {str(value)[:50]}...")
        
        # Analyze users data
        if users_data:
            logger.info("👥 Users data analysis:")
            for uid, user_data in list(users_data.items())[:3]:  # Show first 3 users
                logger.info(f"  👤 User {uid}:")
                if isinstance(user_data, dict):
                    logger.info(f"    🔑 Keys: {list(user_data.keys())}")
                    if 'analysis_history' in user_data:
                        history = user_data['analysis_history']
                        if isinstance(history, dict):
                            logger.info(f"    📊 Analysis history: {len(history)} items")
                        else:
                            logger.info(f"    📊 Analysis history: {type(history)}")
        
        # Check for data that should be moved
        items_to_migrate = []
        for key, value in root_level_data.items():
            if isinstance(value, dict) and 'userId' in value:
                items_to_migrate.append((key, value))
        
        if items_to_migrate:
            logger.info(f"🔄 Found {len(items_to_migrate)} items that should be migrated to user structure")
            
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
            
            # Ask if user wants to migrate
            response = input("🔄 Do you want to migrate this data to the proper user structure? (y/n): ")
            if response.lower() == 'y':
                migrate_data(db_ref, user_groups)
        
    except Exception as e:
        logger.error(f"❌ Error debugging Firebase structure: {e}")
        raise

def migrate_data(db_ref, user_groups):
    """Migrate data from root level to proper user structure"""
    try:
        logger.info("🔄 Starting data migration...")
        
        for user_id, items in user_groups.items():
            logger.info(f"👤 Migrating {len(items)} items for user {user_id}")
            
            # Create or update user's analysis_history
            user_ref = db_ref.child('users').child(user_id).child('analysis_history')
            
            for key, value in items:
                # Remove userId from the data since it's now implicit in the path
                clean_value = value.copy()
                if 'userId' in clean_value:
                    del clean_value['userId']
                
                # Add proper timestamp fields
                if 'uploadedAt' not in clean_value:
                    clean_value['uploadedAt'] = datetime.now().isoformat()
                
                # Save to user's analysis history
                user_ref.child(key).set(clean_value)
                logger.info(f"    ✅ Migrated item {key}")
            
            logger.info(f"  ✅ Completed migration for user {user_id}")
        
        # Ask if user wants to remove old data
        response = input("🗑️ Do you want to remove the old data from root level? (y/n): ")
        if response.lower() == 'y':
            for user_id, items in user_groups.items():
                for key, value in items:
                    db_ref.child(key).delete()
                    logger.info(f"    🗑️ Removed old item {key}")
            logger.info("✅ Old data removed from root level")
        
        logger.info("🎉 Data migration completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Error during data migration: {e}")
        raise

if __name__ == "__main__":
    debug_firebase_structure()