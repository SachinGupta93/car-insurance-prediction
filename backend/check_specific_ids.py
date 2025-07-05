import os
import sys
import logging
import firebase_admin
from firebase_admin import db, credentials
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# IDs to check - add the IDs you're interested in
IDS_TO_CHECK = [
    "-OUBDCbETC9JaPQtR7Ze",
    "-OUBDCcAawgbmktJPeYM",
    "-OUBElXXoez36a28UoBl",
    "-OUBElikNEhQtnU2Ckwm",
    "-OUEQpcOM3CyPTBd9gdO",
    "-OUEQqJEFHEEldM2iJ36",
    "-OUEZAumUg_kvi-OE0Q8",
    "-OUEZAvd-zaRkvrPYaR4",
    "-OUEcycC2EcEtkJc1368",
    "-OUEcydfMzOio_zqs7uL",
    "-OUEhGfKPBBBEJeF43PC",
    "-OUEhGggArX4sglw8Wrm",
    "-OUEjRh-9B58OpL7_KqK",
    "-OUEjSTZlJVpKD6yOhc_",
    "-OUFCfb6m8nRyjsHAUGl",
    "-OUFCfmi3cmVWdE-ZgFX",
    "-OUFK-ZWm30y6m1j2pYs",
    "-OUFK-_GItBW16dB_tdZ"
]

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
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': 'https://car-damage-prediction-default-rtdb.firebaseio.com/'
                })
                logger.info("Firebase initialized with service account")
            else:
                logger.error(f"Service account file not found at: {service_account_path}")
                return None
        
        # Get database reference
        return db.reference('/')
        
    except Exception as e:
        logger.error(f"Firebase initialization error: {str(e)}")
        return None

def search_id_in_database(ref, id_to_find, path='/', depth=0, max_depth=5):
    """
    Recursively search for an ID in the database
    Returns a list of paths where the ID was found
    """
    if depth > max_depth:
        return []
        
    results = []
    try:
        # First check if current path matches the ID
        if path.endswith(id_to_find):
            results.append(path)
            
        # Get data at current path
        data = ref.child(path.lstrip('/')).get()
        if isinstance(data, dict):
            # Check if any keys match the ID
            for key in data.keys():
                if key == id_to_find:
                    full_path = f"{path}/{key}" if path != '/' else f"/{key}"
                    results.append(full_path)
                    
                # Recursively search child paths
                child_path = f"{path}/{key}" if path != '/' else f"/{key}"
                child_results = search_id_in_database(ref, id_to_find, child_path, depth + 1, max_depth)
                results.extend(child_results)
        
        return results
    except Exception as e:
        logger.error(f"Error searching at path {path}: {str(e)}")
        return results

def check_id_exists(ref, id_to_check):
    """Check if a specific ID exists anywhere in the database"""
    # Common paths where these IDs might be located
    common_paths = [
        "users",
        "analysis_history",
        "vehicles",
        "insurance"
    ]
    
    found_locations = []
    
    # Check in each common path first (more efficient)
    for path in common_paths:
        # Try direct access first
        try:
            data = ref.child(path).child(id_to_check).get()
            if data is not None:
                found_locations.append(f"/{path}/{id_to_check}")
                # If found, check what this entry contains
                print(f"Found data at /{path}/{id_to_check}: {json.dumps(data)[:100]}..." if isinstance(data, (dict, list)) else str(data))
        except:
            pass
            
        # Check for IDs under user records
        if path == "users":
            users = ref.child(path).get()
            if isinstance(users, dict):
                for user_id, user_data in users.items():
                    if isinstance(user_data, dict):
                        for section in ["analysis_history", "vehicles", "insurance"]:
                            if section in user_data and isinstance(user_data[section], dict):
                                if id_to_check in user_data[section]:
                                    location = f"/{path}/{user_id}/{section}/{id_to_check}"
                                    found_locations.append(location)
                                    data = user_data[section][id_to_check]
                                    print(f"Found data at {location}: {json.dumps(data)[:100]}..." if isinstance(data, (dict, list)) else str(data))
    
    # If not found in common paths, perform deeper search
    if not found_locations:
        print(f"ID {id_to_check} not found in common paths, performing deeper search...")
        found_locations = search_id_in_database(ref, id_to_check)
    
    return found_locations

def main():
    # Initialize Firebase
    db_ref = initialize_firebase()
    if not db_ref:
        logger.error("Failed to initialize Firebase. Exiting.")
        return
    
    print("\n" + "="*50)
    print("🔍 FIREBASE ID CHECKER TOOL")
    print("="*50)
    
    # Check each ID
    for id_to_check in IDS_TO_CHECK:
        print(f"\nChecking ID: {id_to_check}")
        
        found_locations = check_id_exists(db_ref, id_to_check)
        
        if found_locations:
            print(f"✅ ID found at {len(found_locations)} locations:")
            for location in found_locations:
                print(f"  - {location}")
                
            # Attempt to get data
            for location in found_locations:
                path = location.lstrip('/')
                try:
                    data = db_ref.child(path).get()
                    if data:
                        print(f"\nData at {path}:")
                        print(json.dumps(data, indent=2))
                except Exception as e:
                    print(f"Error retrieving data: {str(e)}")
        else:
            print(f"❌ ID not found in database")
    
    print("\n" + "="*50)

if __name__ == "__main__":
    main()