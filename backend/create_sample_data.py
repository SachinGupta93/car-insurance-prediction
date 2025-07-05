#!/usr/bin/env python3
"""
Script to create sample data for testing the Car Damage Prediction app
"""
import firebase_admin
from firebase_admin import credentials, db
import json
from datetime import datetime, timedelta
import random
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Sample data
SAMPLE_DAMAGE_TYPES = [
    'Scratches', 'Dents', 'Cracked Windshield', 'Bumper Damage', 
    'Side Impact', 'Rear-end Collision', 'Paint Damage', 'Tire Damage'
]

SAMPLE_VEHICLE_MAKES = [
    'Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes', 'Audi', 'Nissan'
]

SAMPLE_SEVERITIES = ['minor', 'moderate', 'severe', 'critical']

def create_sample_analysis(index: int, user_id: str) -> dict:
    """Create a sample analysis result"""
    
    # Create timestamp (random within last 6 months)
    days_ago = random.randint(0, 180)
    timestamp = datetime.now() - timedelta(days=days_ago)
    
    # Random data
    damage_type = random.choice(SAMPLE_DAMAGE_TYPES)
    vehicle_make = random.choice(SAMPLE_VEHICLE_MAKES)
    severity = random.choice(SAMPLE_SEVERITIES)
    confidence = random.uniform(0.6, 0.95)
    repair_cost = random.randint(5000, 50000)
    
    return {
        'id': f'sample_{index}_{user_id}',
        'userId': user_id,
        'uploadedAt': timestamp.isoformat(),
        'analysisDate': timestamp.isoformat(),
        'filename': f'damage_image_{index}.jpg',
        'image': f'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w=={index}',  # Sample base64 header
        'result': {
            'damageType': damage_type,
            'confidence': confidence,
            'severity': severity,
            'repairEstimate': f'₹{repair_cost:,}',
            'description': f'Detected {damage_type.lower()} on {vehicle_make} vehicle. '
                          f'Estimated repair cost: ₹{repair_cost:,}. '
                          f'Severity level: {severity}.',
            'vehicleIdentification': {
                'make': vehicle_make,
                'model': 'Unknown',
                'year': random.randint(2015, 2023),
                'confidence': confidence
            },
            'identifiedDamageRegions': [
                {
                    'damageType': damage_type,
                    'location': f'{random.choice(["Front", "Rear", "Side", "Top"])} {random.choice(["Left", "Right", "Center"])}',
                    'severity': severity,
                    'confidence': confidence
                }
            ],
            'enhancedRepairCost': {
                'conservative': {
                    'rupees': f'₹{repair_cost}',
                    'dollars': f'${repair_cost // 80}'
                },
                'comprehensive': {
                    'rupees': f'₹{repair_cost + 5000}',
                    'dollars': f'${(repair_cost + 5000) // 80}'
                }
            }
        },
        'location': f'{vehicle_make} Vehicle',
        'damageType': damage_type,
        'severity': severity,
        'confidence': confidence
    }

def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Try to get existing app
        app = firebase_admin.get_app()
        logger.info("✅ Firebase app already initialized")
    except ValueError:
        # Initialize new app
        try:
            # Try to use service account key
            cred = credentials.Certificate('path/to/serviceAccountKey.json')
            firebase_admin.initialize_app(cred, {
                'databaseURL': 'https://car-13674-default-rtdb.firebaseio.com'
            })
            logger.info("✅ Firebase initialized with service account")
        except Exception as e:
            logger.warning(f"Service account initialization failed: {e}")
            # Try default credentials
            try:
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred, {
                    'databaseURL': 'https://car-13674-default-rtdb.firebaseio.com'
                })
                logger.info("✅ Firebase initialized with default credentials")
            except Exception as e2:
                logger.error(f"Failed to initialize Firebase: {e2}")
                return False
    
    return True

def create_sample_data():
    """Create sample data for testing"""
    
    if not init_firebase():
        logger.error("❌ Failed to initialize Firebase")
        return
    
    # Sample user ID (you might want to use a real one)
    sample_user_id = "SAMPLE_USER_123"
    
    logger.info(f"🔧 Creating sample data for user: {sample_user_id}")
    
    # Create sample analysis history
    ref = db.reference(f'users/{sample_user_id}/analysis_history')
    
    # Create 10 sample analyses
    for i in range(10):
        sample_analysis = create_sample_analysis(i, sample_user_id)
        analysis_ref = ref.child(sample_analysis['id'])
        analysis_ref.set(sample_analysis)
        logger.info(f"✅ Created sample analysis {i+1}: {sample_analysis['result']['damageType']}")
    
    logger.info("🎉 Sample data creation completed!")
    logger.info(f"📊 Created 10 sample analyses for user {sample_user_id}")
    logger.info("🌐 You can now test the frontend with this sample data")

if __name__ == '__main__':
    create_sample_data()