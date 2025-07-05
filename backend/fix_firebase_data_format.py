import os
import sys
import logging
import firebase_admin
from firebase_admin import db, credentials
import json
from datetime import datetime
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK and return database reference"""
    try:
        # Check if Firebase app is already initialized
        if not firebase_admin._apps:
            # Use service account file from root directory
            service_account_path = os.path.join(os.path.dirname(__file__), '..', 'service-account.json')
            
            if os.path.exists(service_account_path):
                logger.info(f"Using service account: {service_account_path}")
                
                # Initialize with credentials
                try:
                    cred = credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred, {
                        'databaseURL': 'https://car-damage-prediction-default-rtdb.firebaseio.com/'
                    })
                    logger.info("Firebase initialized with service account")
                except Exception as e:
                    logger.error(f"Error initializing Firebase: {str(e)}")
                    logger.error(traceback.format_exc())
                    return None
            else:
                logger.error(f"Service account file not found at: {service_account_path}")
                return None
        
        # Get database reference
        return db.reference('/')
        
    except Exception as e:
        logger.error(f"Firebase initialization error: {str(e)}")
        return None

def get_user_ids(db_ref):
    """Get all user IDs from the database"""
    try:
        users = db_ref.child('users').get()
        if users and isinstance(users, dict):
            return list(users.keys())
        return []
    except Exception as e:
        logger.error(f"Error getting user IDs: {str(e)}")
        return []

def fix_analysis_history_format(db_ref, user_id):
    """Convert analysis history from Firebase dict format to list format"""
    try:
        # Get current analysis history
        history_ref = db_ref.child('users').child(user_id).child('analysis_history')
        history = history_ref.get()
        
        if not history or not isinstance(history, dict):
            logger.info(f"No analysis history or not in dict format for user {user_id}")
            return False
            
        logger.info(f"Found {len(history)} analysis history records for user {user_id}")
        
        # Convert to list format with IDs included
        history_list = []
        for key, value in history.items():
            if isinstance(value, dict):
                # Add ID to the record
                value['id'] = key
                
                # Make sure timestamp exists
                if 'timestamp' not in value and 'created_at' in value:
                    value['timestamp'] = value['created_at']
                elif 'timestamp' not in value:
                    value['timestamp'] = datetime.now().isoformat()
                    
                history_list.append(value)
                
        # Sort by timestamp
        history_list.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Store back as "analysis_history_list" (keeping original for safety)
        try:
            db_ref.child('users').child(user_id).child('analysis_history_list').set(history_list)
            logger.info(f"Successfully stored {len(history_list)} records in list format for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error storing list format: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Error fixing analysis history format for user {user_id}: {str(e)}")
        return False

def fix_all_users_data_format(db_ref):
    """Fix data format for all users"""
    user_ids = get_user_ids(db_ref)
    logger.info(f"Found {len(user_ids)} users")
    
    success_count = 0
    for user_id in user_ids:
        if fix_analysis_history_format(db_ref, user_id):
            success_count += 1
            
    logger.info(f"Successfully fixed data format for {success_count} out of {len(user_ids)} users")
    
def check_ids_in_analysis_history(db_ref, ids_to_check):
    """Check if specific IDs exist in any user's analysis history"""
    user_ids = get_user_ids(db_ref)
    
    for user_id in user_ids:
        try:
            # Check analysis history
            history = db_ref.child('users').child(user_id).child('analysis_history').get()
            if history and isinstance(history, dict):
                for id_to_check in ids_to_check:
                    if id_to_check in history:
                        data = history[id_to_check]
                        logger.info(f"✅ Found ID {id_to_check} in analysis_history for user {user_id}")
                        logger.info(f"Data: {json.dumps(data)[:200]}..." if len(json.dumps(data)) > 200 else f"Data: {json.dumps(data)}")
        except Exception as e:
            logger.error(f"Error checking IDs for user {user_id}: {str(e)}")
    
def main():
    # List of IDs to check
    ids_to_check = [
        "-OUBDCbETC9JaPQtR7Ze", "-OUBDCcAawgbmktJPeYM", "-OUBElXXoez36a28UoBl",
        "-OUBElikNEhQtnU2Ckwm", "-OUEQpcOM3CyPTBd9gdO", "-OUEQqJEFHEEldM2iJ36",
        "-OUEZAumUg_kvi-OE0Q8", "-OUEZAvd-zaRkvrPYaR4", "-OUEcycC2EcEtkJc1368",
        "-OUEcydfMzOio_zqs7uL", "-OUEhGfKPBBBEJeF43PC", "-OUEhGggArX4sglw8Wrm",
        "-OUEjRh-9B58OpL7_KqK", "-OUEjSTZlJVpKD6yOhc_", "-OUFCfb6m8nRyjsHAUGl",
        "-OUFCfmi3cmVWdE-ZgFX", "-OUFK-ZWm30y6m1j2pYs", "-OUFK-_GItBW16dB_tdZ"
    ]
    
    # Initialize Firebase
    db_ref = initialize_firebase()
    if not db_ref:
        logger.error("Failed to initialize Firebase. Exiting.")
        return
        
    print("\n" + "="*50)
    print("🔧 FIREBASE DATA FORMAT FIXER")
    print("="*50)
    
    print("\nOptions:")
    print("1. Fix analysis history format for all users")
    print("2. Check specific IDs in analysis history")
    print("3. Do both")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ")
    
    if choice == '1':
        fix_all_users_data_format(db_ref)
    elif choice == '2':
        check_ids_in_analysis_history(db_ref, ids_to_check)
    elif choice == '3':
        fix_all_users_data_format(db_ref)
        check_ids_in_analysis_history(db_ref, ids_to_check)
    
    print("\n" + "="*50)

if __name__ == "__main__":
    main()