#!/usr/bin/env python3
"""
Create test data for the dashboard to work with
"""
import os
import sys
import logging
import requests
import json
from datetime import datetime, timedelta
import random

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FirebaseRestClient:
    def __init__(self, database_url):
        self.database_url = database_url.rstrip('/')
    
    def put(self, path, data):
        """Set data in Firebase"""
        try:
            url = f"{self.database_url}/{path.lstrip('/')}.json"
            response = requests.put(url, json=data)
            
            if response.status_code == 200:
                logger.info(f"✅ Successfully set data at {path}")
                return response.json()
            else:
                logger.warning(f"❌ HTTP {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"❌ Error setting data: {str(e)}")
            return None

def create_test_data():
    """Create test data for dashboard"""
    try:
        # Create Firebase REST client
        database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com/')
        firebase_client = FirebaseRestClient(database_url)
        
        # Test user ID (you can replace with actual user ID)
        test_user_id = "AWorsS210YShgNlvMCjPFK2nDpg1"
        
        logger.info(f"🔧 Creating test data for user {test_user_id}")
        
        # Create user profile
        user_profile = {
            "uid": test_user_id,
            "displayName": "Test User",
            "email": "test@example.com",
            "created_at": datetime.now().isoformat(),
            "last_login_at": datetime.now().isoformat()
        }
        
        firebase_client.put(f"users/{test_user_id}/profile", user_profile)
        
        # Create sample analysis history
        analysis_history = {}
        
        # Create 10 sample analyses
        damage_types = ["scratch", "dent", "paint damage", "crack", "rust"]
        severities = ["minor", "moderate", "severe"]
        locations = ["hood", "door", "bumper", "fender", "roof"]
        
        for i in range(10):
            analysis_id = f"analysis_{i+1}"
            
            # Create date from 30 days ago to now
            days_ago = random.randint(0, 30)
            analysis_date = datetime.now() - timedelta(days=days_ago)
            
            damage_type = random.choice(damage_types)
            severity = random.choice(severities)
            location = random.choice(locations)
            
            analysis_data = {
                "id": analysis_id,
                "uploadedAt": analysis_date.isoformat(),
                "created_at": analysis_date.isoformat(),
                "image": f"https://example.com/images/{analysis_id}.jpg",
                "description": f"Sample {damage_type} on {location}",
                "result": {
                    "confidence": round(random.uniform(0.7, 0.95), 2),
                    "severity": severity,
                    "repairEstimate": f"${random.randint(100, 2000)} - ${random.randint(2000, 5000)}",
                    "recommendations": [
                        f"Repair {damage_type} on {location}",
                        f"Consider professional {severity} damage assessment",
                        "Schedule repair within 2 weeks"
                    ],
                    "identifiedDamageRegions": [
                        {
                            "damageType": damage_type,
                            "location": location,
                            "severity": severity,
                            "confidence": round(random.uniform(0.7, 0.95), 2)
                        }
                    ]
                }
            }
            
            analysis_history[analysis_id] = analysis_data
        
        # Save all analysis history
        firebase_client.put(f"users/{test_user_id}/analysis_history", analysis_history)
        
        logger.info(f"✅ Created {len(analysis_history)} sample analyses")
        logger.info("🎉 Test data creation completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Test data creation failed: {e}")
        raise

if __name__ == "__main__":
    create_test_data()