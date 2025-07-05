from firebase_admin import auth
import logging
import traceback
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
            # Ensure user profile exists
            self.ensure_user_profile(uid)
            
            vehicle_ref = self.db_ref.child('users').child(uid).child('vehicles').push()
            vehicle_data['created_at'] = datetime.now().isoformat()
            vehicle_ref.set(vehicle_data)
            
            # Update vehicle count in profile
            try:
                profile_ref = self.db_ref.child('users').child(uid).child('profile')
                current_profile = profile_ref.get()
                if current_profile:
                    current_count = current_profile.get('total_vehicles', 0)
                    profile_ref.update({'total_vehicles': current_count + 1})
            except Exception as e:
                logger.warning(f"Could not update vehicle count: {str(e)}")
            
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
            # Ensure user profile exists
            self.ensure_user_profile(uid)
            
            insurance_ref = self.db_ref.child('users').child(uid).child('insurance').push()
            insurance_data['created_at'] = datetime.now().isoformat()
            insurance_ref.set(insurance_data)
            
            # Update insurance count in profile
            try:
                profile_ref = self.db_ref.child('users').child(uid).child('profile')
                current_profile = profile_ref.get()
                if current_profile:
                    current_count = current_profile.get('total_insurance_records', 0)
                    profile_ref.update({'total_insurance_records': current_count + 1})
            except Exception as e:
                logger.warning(f"Could not update insurance count: {str(e)}")
            
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

    def get_analysis_history(self, uid, auth_token=None):
        """Get user's analysis history from root level where data currently exists"""
        try:
            logger.info(f"🗃️ UserAuth.get_analysis_history: Fetching for uid: {uid}")
            
            # Get all data from root level (where the data actually exists)
            logger.info("📂 UserAuth.get_analysis_history: Getting data from root level")
            root_ref = self.db_ref
            
            # Generate Firebase ID token for authentication
            firebase_token = self._generate_firebase_token(uid)
            
            # Get root data using the new method
            if hasattr(root_ref, 'get_root_data'):
                root_data = root_ref.get_root_data(auth_token=firebase_token)
            else:
                # Fallback to regular get
                root_data = root_ref.get()
            
            logger.info(f"✅ UserAuth.get_analysis_history: Raw root data received")
            logger.info(f"🔍 UserAuth.get_analysis_history: Root data type: {type(root_data)}")
            
            if root_data and isinstance(root_data, dict):
                # Filter data by userId from root level
                user_history = {}
                items_found = 0
                
                for key, value in root_data.items():
                    # Skip the 'users' key if it exists
                    if key == 'users':
                        continue
                    
                    # Check if this item belongs to the user
                    if isinstance(value, dict) and value.get('userId') == uid:
                        # Transform the data to match expected format
                        transformed_item = self._transform_legacy_item(key, value)
                        user_history[key] = transformed_item
                        items_found += 1
                
                logger.info(f"📊 UserAuth.get_analysis_history: Found {items_found} items for user {uid}")
                
                if user_history:
                    # Sort by timestamp if available
                    try:
                        sorted_items = sorted(
                            user_history.items(),
                            key=lambda x: x[1].get('uploadedAt', x[1].get('created_at', '')),
                            reverse=True
                        )
                        user_history = dict(sorted_items)
                    except Exception as sort_error:
                        logger.warning(f"⚠️ Could not sort items: {sort_error}")
                    
                    return user_history
                else:
                    logger.info("📭 UserAuth.get_analysis_history: No items found for user")
                    return {}
            else:
                logger.info("📭 UserAuth.get_analysis_history: No root data found")
                return {}
                
        except Exception as e:
            logger.error(f"💥 UserAuth.get_analysis_history: Error occurred: {str(e)}")
            logger.error(f"📚 UserAuth.get_analysis_history: Error traceback: {traceback.format_exc()}")
            raise
    
    def _generate_firebase_token(self, uid):
        """Generate Firebase ID token for REST API authentication"""
        try:
            import firebase_admin
            from firebase_admin import auth
            
            # Create custom token using Firebase Admin SDK
            if firebase_admin._apps:
                custom_token = auth.create_custom_token(uid)
                # Convert bytes to string if needed
                if isinstance(custom_token, bytes):
                    custom_token = custom_token.decode('utf-8')
                logger.info(f"🔑 Generated Firebase custom token for user {uid}")
                return custom_token
            else:
                logger.warning("⚠️ Firebase Admin SDK not initialized")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error generating Firebase token: {str(e)}")
            return None
    
    def _transform_legacy_item(self, key, item):
        """Transform legacy data item to expected format"""
        try:
            # Start with the original item
            transformed = item.copy()
            
            # Add id if not present
            if 'id' not in transformed:
                transformed['id'] = key
            
            # Remove userId since it's now implicit
            if 'userId' in transformed:
                del transformed['userId']
            
            # Add timestamps if missing
            if 'uploadedAt' not in transformed:
                transformed['uploadedAt'] = datetime.now().isoformat()
            
            if 'created_at' not in transformed:
                transformed['created_at'] = transformed.get('uploadedAt', datetime.now().isoformat())
            
            # Transform imageUrl to image
            if 'imageUrl' in transformed:
                transformed['image'] = transformed.pop('imageUrl')
            
            # Create or update result structure
            result = transformed.get('result', {})
            
            # Move recommendations to result if not already there
            if 'recommendations' in transformed and 'recommendations' not in result:
                result['recommendations'] = transformed.pop('recommendations')
            
            # Move repairEstimate to result if not already there  
            if 'repairEstimate' in transformed and 'repairEstimate' not in result:
                result['repairEstimate'] = transformed.pop('repairEstimate')
            
            # Add default values for missing fields
            if 'confidence' not in result:
                result['confidence'] = 0.85
            
            if 'severity' not in result:
                result['severity'] = 'moderate'
            
            if 'identifiedDamageRegions' not in result:
                # Create damage regions from description if available
                regions = []
                if 'description' in transformed:
                    regions.append({
                        'damageType': self._extract_damage_type(transformed['description']),
                        'location': self._extract_location(transformed['description']),
                        'severity': result['severity'],
                        'confidence': result['confidence']
                    })
                result['identifiedDamageRegions'] = regions
            
            transformed['result'] = result
            
            return transformed
            
        except Exception as e:
            logger.error(f"❌ Error transforming legacy item {key}: {str(e)}")
            # Return original item if transformation fails
            return item
    
    def _extract_damage_type(self, description):
        """Extract damage type from description"""
        if not description:
            return 'other'
        
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
    
    def _extract_location(self, description):
        """Extract location from description"""
        if not description:
            return 'unknown'
        
        description_lower = description.lower()
        
        if 'hood' in description_lower:
            return 'hood'
        elif 'door' in description_lower:
            return 'door'
        elif 'bumper' in description_lower:
            return 'bumper'
        elif 'fender' in description_lower:
            return 'fender'
        elif 'roof' in description_lower:
            return 'roof'
        else:
            return 'unknown'
    
    def save_analysis_result(self, uid, analysis_data):
        """Save analysis result to user's history"""
        try:
            logger.info(f"💾 UserAuth.save_analysis_result: Saving analysis for uid: {uid}")
            
            # Ensure user profile exists and track activity
            self.ensure_user_profile(uid)
            
            # Add timestamp to analysis data
            analysis_data['created_at'] = datetime.now().isoformat()
            analysis_data['user_id'] = uid
            
            # Save to user's analysis history
            history_ref = self.db_ref.child('users').child(uid).child('analysis_history').push()
            
            # If it's our REST client, we might need to handle it differently
            if hasattr(history_ref, 'set'):
                history_ref.set(analysis_data)
            else:
                # For REST client, use the parent reference
                analysis_id = f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
                self.db_ref.child('users').child(uid).child('analysis_history').child(analysis_id).set(analysis_data)
                return analysis_id
            
            # Update user's last activity
            self.update_user_activity(uid)
            
            logger.info(f"✅ UserAuth.save_analysis_result: Successfully saved analysis")
            return history_ref.key if hasattr(history_ref, 'key') else analysis_id
            
        except Exception as e:
            logger.error(f"💥 UserAuth.save_analysis_result: Error occurred: {str(e)}")
            logger.error(f"📚 UserAuth.save_analysis_result: Error traceback: {traceback.format_exc()}")
            raise

    def ensure_user_profile(self, uid, user_info=None):
        """Ensure user profile exists in Firebase with proper structure"""
        try:
            logger.info(f"👤 UserAuth.ensure_user_profile: Checking profile for uid: {uid}")
            
            # Check if user profile exists
            user_profile = self.db_ref.child('users').child(uid).child('profile').get()
            
            if not user_profile:
                logger.info(f"👤 UserAuth.ensure_user_profile: Creating new profile for uid: {uid}")
                
                # Create default profile structure
                profile_data = {
                    'uid': uid,
                    'created_at': datetime.now().isoformat(),
                    'first_login': datetime.now().isoformat(),
                    'last_activity': datetime.now().isoformat(),
                    'total_analyses': 0,
                    'total_vehicles': 0,
                    'total_insurance_records': 0,
                    'is_active': True,
                    'user_status': 'active',
                    'platform': 'web',
                    'features_used': []
                }
                
                # Add any additional user info if provided
                if user_info:
                    profile_data.update({
                        'email': user_info.get('email', ''),
                        'name': user_info.get('name', ''),
                        'photo_url': user_info.get('picture', ''),
                        'provider': user_info.get('provider', 'firebase')
                    })
                
                # Create the profile
                self.db_ref.child('users').child(uid).child('profile').set(profile_data)
                
                # Initialize other user data structures
                self.db_ref.child('users').child(uid).child('analysis_history').set({})
                self.db_ref.child('users').child(uid).child('vehicles').set({})
                self.db_ref.child('users').child(uid).child('insurance').set({})
                
                logger.info(f"✅ UserAuth.ensure_user_profile: Created new profile for uid: {uid}")
                
            else:
                logger.info(f"👤 UserAuth.ensure_user_profile: Profile exists for uid: {uid}")
                
        except Exception as e:
            logger.error(f"💥 UserAuth.ensure_user_profile: Error occurred: {str(e)}")
            logger.error(f"📚 UserAuth.ensure_user_profile: Error traceback: {traceback.format_exc()}")
            # Don't raise here - profile creation failure shouldn't block other operations
            
    def update_user_activity(self, uid):
        """Update user's last activity timestamp and increment usage counters"""
        try:
            logger.info(f"📈 UserAuth.update_user_activity: Updating activity for uid: {uid}")
            
            current_time = datetime.now().isoformat()
            
            # Update profile activity
            profile_updates = {
                'last_activity': current_time,
                'is_active': True,
                'user_status': 'active'
            }
            
            self.db_ref.child('users').child(uid).child('profile').update(profile_updates)
            
            # Increment analysis counter
            profile_ref = self.db_ref.child('users').child(uid).child('profile')
            current_profile = profile_ref.get()
            
            if current_profile:
                current_count = current_profile.get('total_analyses', 0)
                profile_ref.update({'total_analyses': current_count + 1})
            
            logger.info(f"✅ UserAuth.update_user_activity: Updated activity for uid: {uid}")
            
        except Exception as e:
            logger.error(f"💥 UserAuth.update_user_activity: Error occurred: {str(e)}")
            # Don't raise here - activity update failure shouldn't block other operations
            
    def get_user_stats(self, uid):
        """Get user statistics and activity data"""
        try:
            profile = self.db_ref.child('users').child(uid).child('profile').get()
            
            if not profile:
                return None
                
            return {
                'uid': uid,
                'created_at': profile.get('created_at'),
                'last_activity': profile.get('last_activity'),
                'total_analyses': profile.get('total_analyses', 0),
                'total_vehicles': profile.get('total_vehicles', 0),
                'total_insurance_records': profile.get('total_insurance_records', 0),
                'is_active': profile.get('is_active', False),
                'user_status': profile.get('user_status', 'unknown'),
                'features_used': profile.get('features_used', [])
            }
            
        except Exception as e:
            logger.error(f"Error getting user stats: {str(e)}")
            return None
            
    def get_all_users_stats(self):
        """Get statistics for all users (admin function)"""
        try:
            all_users = self.db_ref.child('users').get()
            
            if not all_users:
                return []
                
            user_stats = []
            for uid, user_data in all_users.items():
                profile = user_data.get('profile', {})
                if profile:
                    user_stats.append({
                        'uid': uid,
                        'created_at': profile.get('created_at'),
                        'last_activity': profile.get('last_activity'),
                        'total_analyses': profile.get('total_analyses', 0),
                        'total_vehicles': profile.get('total_vehicles', 0),
                        'total_insurance_records': profile.get('total_insurance_records', 0),
                        'is_active': profile.get('is_active', False),
                        'user_status': profile.get('user_status', 'unknown'),
                        'email': profile.get('email', ''),
                        'name': profile.get('name', ''),
                        'provider': profile.get('provider', '')
                    })
            
            return user_stats
            
        except Exception as e:
            logger.error(f"Error getting all users stats: {str(e)}")
            return [] 