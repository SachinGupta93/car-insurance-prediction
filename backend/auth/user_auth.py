from firebase_admin import auth
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class UserAuth:
    def __init__(self, db_ref):
        self.db_ref = db_ref

    def create_user(self, email, password, user_data):
        """Create a new user in Firebase Authentication and store additional data in Realtime Database"""
        try:
            # Create user in Firebase Authentication
            user = auth.create_user(
                email=email,
                password=password,
                display_name=user_data.get('name')
            )
            
            # Store additional user data in Realtime Database
            user_data['created_at'] = datetime.now().isoformat()
            self.db_ref.child('users').child(user.uid).set(user_data)
            
            return user.uid
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            raise

    def get_user_profile(self, uid):
        """Get user profile from Realtime Database"""
        try:
            user_data = self.db_ref.child('users').child(uid).get()
            if not user_data:
                raise Exception("User not found")
            return user_data
        except Exception as e:
            logger.error(f"Error getting user profile: {str(e)}")
            raise

    def update_user_profile(self, uid, data):
        """Update user profile in Realtime Database"""
        try:
            self.db_ref.child('users').child(uid).update(data)
        except Exception as e:
            logger.error(f"Error updating user profile: {str(e)}")
            raise

    def add_vehicle(self, uid, vehicle_data):
        """Add a vehicle to user's profile"""
        try:
            vehicle_ref = self.db_ref.child('users').child(uid).child('vehicles').push()
            vehicle_data['created_at'] = datetime.now().isoformat()
            vehicle_ref.set(vehicle_data)
            return vehicle_ref.key
        except Exception as e:
            logger.error(f"Error adding vehicle: {str(e)}")
            raise

    def get_user_vehicles(self, uid):
        """Get user's vehicles"""
        try:
            vehicles = self.db_ref.child('users').child(uid).child('vehicles').get()
            return vehicles if vehicles else {}
        except Exception as e:
            logger.error(f"Error getting user vehicles: {str(e)}")
            raise

    def add_insurance(self, uid, insurance_data):
        """Add insurance information"""
        try:
            insurance_ref = self.db_ref.child('users').child(uid).child('insurance').push()
            insurance_data['created_at'] = datetime.now().isoformat()
            insurance_ref.set(insurance_data)
            return insurance_ref.key
        except Exception as e:
            logger.error(f"Error adding insurance: {str(e)}")
            raise

    def get_user_insurance(self, uid):
        """Get user's insurance information"""
        try:
            insurance = self.db_ref.child('users').child(uid).child('insurance').get()
            return insurance if insurance else {}
        except Exception as e:
            logger.error(f"Error getting user insurance: {str(e)}")
            raise

    def add_analysis_history(self, uid, analysis_data):
        """Add analysis to user's history"""
        try:
            history_ref = self.db_ref.child('users').child(uid).child('analysis_history').push()
            analysis_data['created_at'] = datetime.now().isoformat()
            history_ref.set(analysis_data)
            return history_ref.key
        except Exception as e:
            logger.error(f"Error adding analysis history: {str(e)}")
            raise

    def get_analysis_history(self, uid):
        """Get user's analysis history"""
        try:
            history = self.db_ref.child('users').child(uid).child('analysis_history').get()
            return history if history else {}
        except Exception as e:
            logger.error(f"Error getting analysis history: {str(e)}")
            raise 