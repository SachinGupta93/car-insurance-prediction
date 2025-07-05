#!/usr/bin/env python3
"""
Debug script to check Firebase data structure and user association
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.firebase_config import initialize_firebase
from firebase_admin import db
import json
import traceback

def check_firebase_data():
    try:
        print("🔧 Initializing Firebase...")
        initialize_firebase()
        
        # Get database reference
        database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-damage-prediction-default-rtdb.firebaseio.com/')
        db_ref = db.reference(url=database_url)
        
        print("🔍 Checking Firebase database structure...")
        
        # Check users structure
        print("\n📂 Checking users structure:")
        users_data = db_ref.child('users').get()
        
        if users_data:
            print(f"👥 Found {len(users_data)} users in database")
            for user_id, user_data in users_data.items():
                print(f"\n👤 User ID: {user_id}")
                if isinstance(user_data, dict):
                    print(f"   📧 Email: {user_data.get('email', 'N/A')}")
                    print(f"   👤 Name: {user_data.get('name', user_data.get('displayName', 'N/A'))}")
                    print(f"   📅 Created: {user_data.get('created_at', 'N/A')}")
                    
                    # Check if user has analysis history
                    if 'analysis_history' in user_data:
                        history = user_data['analysis_history']
                        print(f"   📊 Analysis History: {len(history)} items")
                        if history:
                            first_item_id = list(history.keys())[0]
                            first_item = history[first_item_id]
                            print(f"   🔍 First item ID: {first_item_id}")
                            print(f"   🔍 First item keys: {list(first_item.keys()) if isinstance(first_item, dict) else 'Not a dict'}")
                    else:
                        print("   📊 Analysis History: None")
                else:
                    print(f"   ⚠️ User data is not a dict: {type(user_data)}")
        else:
            print("❌ No users found in database")
        
        # Check if there are any root-level analysis records
        print("\n📂 Checking root-level data structure:")
        root_data = db_ref.get()
        if root_data:
            root_keys = list(root_data.keys())
            print(f"🔑 Root level keys: {root_keys}")
            
            # Check for non-user data
            for key in root_keys:
                if key != 'users':
                    data = root_data[key]
                    if isinstance(data, dict):
                        print(f"📁 {key}: {len(data)} items")
                        if len(data) > 0:
                            first_key = list(data.keys())[0]
                            print(f"   🔍 Sample key: {first_key}")
                    else:
                        print(f"📁 {key}: {type(data)}")
        
        # Check specific IDs mentioned by user
        print("\n🔍 Checking specific IDs mentioned by user:")
        specific_ids = [
            "-OUB6OZNhOU3jwkli46f", "-OUBBJDVg3uDI3ftOU6B", "-OUBBJDd3Mvp1shcBdIE",
            "-OUBDCbETC9JaPQtR7Ze", "-OUBDCcAawgbmktJPeYM", "-OUBElXXoez36a28UoBl"
        ]
        
        for record_id in specific_ids:
            print(f"\n🔍 Searching for ID: {record_id}")
            
            # Check in users
            found = False
            if users_data:
                for user_id, user_data in users_data.items():
                    if isinstance(user_data, dict) and 'analysis_history' in user_data:
                        if record_id in user_data['analysis_history']:
                            print(f"   ✅ Found in user {user_id} analysis_history")
                            record_data = user_data['analysis_history'][record_id]
                            if isinstance(record_data, dict):
                                print(f"   📄 Record keys: {list(record_data.keys())}")
                                print(f"   📅 Timestamp: {record_data.get('timestamp', record_data.get('uploadedAt', 'N/A'))}")
                            found = True
                            break
            
            # Check in root level
            if not found and root_data:
                for key, value in root_data.items():
                    if key != 'users' and isinstance(value, dict) and record_id in value:
                        print(f"   ✅ Found in root level under '{key}'")
                        found = True
                        break
            
            if not found:
                print(f"   ❌ Not found in database")
        
    except Exception as e:
        print(f"💥 Error checking Firebase data: {str(e)}")
        print(f"📚 Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    check_firebase_data()
