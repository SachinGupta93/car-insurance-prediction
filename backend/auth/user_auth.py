from firebase_admin import auth
import logging
import os
import requests
import traceback
from datetime import datetime
from backend.config.firebase_config import get_firebase_config

logger = logging.getLogger(__name__)

class UserAuth:
    def __init__(self, db_ref):
        self.db_ref = db_ref
        self.firebase_config = get_firebase_config()
        self.db_url = self.firebase_config.get('databaseURL')

    def _get_authenticated_session(self, id_token):
        """Creates a requests session authenticated with a Firebase ID token."""
        session = requests.Session()
        session.params = {'auth': id_token}
        return session

    def create_user(self, email, password, user_data):
        """Create a new user in Firebase Authentication and store additional data in Realtime Database"""
        try:
            # Create user in Firebase Authentication
            # This operation requires admin privileges, so it will likely fail without a service account.
            # For development, user creation should be handled on the client-side.
            logger.warning("User creation via backend is not recommended without a service account.")
            user = auth.create_user(
                email=email,
                password=password,
                display_name=user_data.get('name')
            )
            
            # Store additional user data in Realtime Database
            user_data['created_at'] = datetime.now().isoformat()
            # This part will also fail without admin privileges.
            self.db_ref.child('users').child(user.uid).set(user_data)
            
            return user.uid
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            logger.error("Please create users via the frontend Firebase SDK for development.")
            raise

    def get_user_profile(self, uid, id_token):
        """Get user profile from Realtime Database using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/profile.json"
            response = session.get(url)
            response.raise_for_status()  # Raise an exception for bad status codes
            user_data = response.json()
            if not user_data:
                # If profile doesn't exist, create a basic one
                self.ensure_user_profile(uid, id_token, {'email': 'Not set', 'name': 'New User'})
                return self.get_user_profile(uid, id_token)
            return user_data
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error getting user profile via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting user profile: {str(e)}")
            raise

    def create_user_profile(self, uid, data, id_token):
        """Create or overwrite a user profile in Realtime Database using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/profile.json"
            response = session.put(url, json=data) # Use PUT to create/overwrite
            response.raise_for_status()
            logger.info(f"Successfully created/updated profile for user {uid}")
            return response.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error creating user profile via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error creating user profile: {str(e)}")
            raise

    def update_user_profile(self, uid, data, id_token):
        """Update user profile in Realtime Database using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/profile.json"
            response = session.patch(url, json=data) # Use PATCH to update fields
            response.raise_for_status()
            logger.info(f"Successfully updated profile for user {uid}")
            return response.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error updating user profile via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error updating user profile: {str(e)}")
            raise

    def add_vehicle(self, uid, vehicle_data, id_token):
        """Add a vehicle to user's profile using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            # Ensure user profile exists first
            self.ensure_user_profile(uid, id_token)

            url = f"{self.db_url}/users/{uid}/vehicles.json"
            vehicle_data['created_at'] = datetime.now().isoformat()
            
            response = session.post(url, json=vehicle_data) # POST generates a unique ID
            response.raise_for_status()
            
            new_vehicle_key = response.json().get('name')
            logger.info(f"Successfully added vehicle {new_vehicle_key} for user {uid}")
            return new_vehicle_key
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error adding vehicle via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error adding vehicle: {str(e)}")
            raise

    def get_user_vehicles(self, uid, id_token):
        """Get user's vehicles using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/vehicles.json"
            response = session.get(url)
            response.raise_for_status()
            vehicles = response.json()
            return vehicles if vehicles else {}
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error getting user vehicles via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting user vehicles: {str(e)}")
            raise

    def add_insurance(self, uid, insurance_data, id_token):
        """Add insurance information using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            # Ensure user profile exists
            self.ensure_user_profile(uid, id_token)
            
            url = f"{self.db_url}/users/{uid}/insurance.json"
            insurance_data['created_at'] = datetime.now().isoformat()

            response = session.post(url, json=insurance_data) # POST generates a unique ID
            response.raise_for_status()

            new_insurance_key = response.json().get('name')
            logger.info(f"Successfully added insurance {new_insurance_key} for user {uid}")
            return new_insurance_key
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error adding insurance via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error adding insurance: {str(e)}")
            raise

    def get_user_insurance(self, uid, id_token):
        """Get user's insurance records using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/insurance.json"
            response = session.get(url)
            response.raise_for_status()
            insurance = response.json()
            return insurance if insurance else {}
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error getting user insurance via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting user insurance: {str(e)}")
            raise

    def add_analysis_history(self, uid, analysis_data, id_token):
        """Save analysis to user's history using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            # Ensure user profile exists
            self.ensure_user_profile(uid, id_token)

            url = f"{self.db_url}/users/{uid}/analysisHistory.json"
            analysis_data['created_at'] = datetime.now().isoformat()

            response = session.post(url, json=analysis_data) # POST generates a unique ID
            response.raise_for_status()
            
            new_analysis_key = response.json().get('name')
            logger.info(f"Successfully saved analysis {new_analysis_key} for user {uid}")
            return new_analysis_key
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error saving analysis to history via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error saving analysis to history: {str(e)}")
            raise

    def get_analysis_history(self, uid, id_token):
        """Get user's analysis history using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/analysisHistory.json"
            response = session.get(url)
            response.raise_for_status()
            history = response.json()
            return history if history else {}
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error getting analysis history via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error getting analysis history: {str(e)}")
            raise

    def get_user_stats(self, uid, id_token):
        """Get user statistics from Realtime Database."""
        try:
            history = self.get_analysis_history(uid, id_token)
            
            if not history:
                return {
                    'totalAnalyses': 0,
                    'avgConfidence': 0,
                    'damageTypes': {},
                    'monthlyTrends': [],
                    'severityBreakdown': {},
                    'recentAnalyses': []
                }

            analyses = []
            if isinstance(history, dict):
                for key, value in history.items():
                    if isinstance(value, dict):
                        value['id'] = key
                        analyses.append(value)
            
            # Sort analyses by date to easily find recent ones
            analyses.sort(
                key=lambda x: x.get('timestamp', x.get('created_at', '1970-01-01T00:00:00')), 
                reverse=True
            )
            
            recent_analyses = analyses[:5]
            total_analyses = len(analyses)
            
            # Calculate average confidence
            confidences = [
                item.get('result', {}).get('confidence', 0) or item.get('confidence', 0)
                for item in analyses if (item.get('result', {}).get('confidence') is not None or item.get('confidence') is not None)
            ]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0

            # Tally damage types
            damage_types = {}
            for item in analyses:
                damage_type = item.get('result', {}).get('damageType') or item.get('damageType')
                if damage_type:
                    damage_types[damage_type] = damage_types.get(damage_type, 0) + 1

            # Find top damage type
            top_damage_type = max(damage_types, key=damage_types.get) if damage_types else 'N/A'


            # Tally severity
            severity_breakdown = {}
            for item in analyses:
                severity = item.get('result', {}).get('severity') or item.get('severity')
                if severity:
                    severity_breakdown[severity] = severity_breakdown.get(severity, 0) + 1

            # Calculate monthly trends
            monthly_trends = {}
            for item in analyses:
                try:
                    # Handle multiple possible timestamp fields
                    timestamp_str = item.get('uploadedAt') or item.get('created_at') or item.get('timestamp')
                    if not timestamp_str:
                        continue
                    
                    # Parse ISO format datetime string
                    analysis_date = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    month_key = analysis_date.strftime('%Y-%m')
                    
                    if month_key not in monthly_trends:
                        monthly_trends[month_key] = {'count': 0, 'totalCost': 0, 'costEntries': 0}
                    
                    monthly_trends[month_key]['count'] += 1
                    
                    # Extract and parse repair estimate
                    result = item.get('result', {})
                    repair_estimate_str = result.get('repairEstimate') or item.get('repairEstimate')

                    cost = 0
                    if repair_estimate_str:
                        try:
                            # Clean string and parse range, e.g., "$1,200 - $2,500" or just "1500"
                            cleaned_str = repair_estimate_str.replace('$', '').replace(',', '')
                            parts = cleaned_str.split('-')
                            if len(parts) == 1:
                                cost = float(parts[0].strip())
                            else:
                                low_estimate = float(parts[0].strip())
                                high_estimate = float(parts[1].strip())
                                cost = (low_estimate + high_estimate) / 2
                        except (ValueError, IndexError) as parse_error:
                            logger.warning(f"Could not parse repairEstimate: '{repair_estimate_str}', error: {parse_error}")
                    
                    if cost > 0:
                        monthly_trends[month_key]['totalCost'] += cost
                        monthly_trends[month_key]['costEntries'] += 1

                except (ValueError, TypeError) as e:
                    logger.warning(f"Could not parse date for trend analysis: {timestamp_str}, error: {e}")


            # Format monthly trends for the frontend
            formatted_trends = sorted([
                {
                    'month': key,
                    'count': value['count'],
                    'avgCost': (value['totalCost'] / value['costEntries']) if value['costEntries'] > 0 else 0
                }
                for key, value in monthly_trends.items()
            ], key=lambda x: x['month'])


            stats = {
                'totalAnalyses': total_analyses,
                'avgConfidence': avg_confidence,
                'damageTypes': damage_types,
                'monthlyTrends': formatted_trends,
                'severityBreakdown': severity_breakdown,
                'recentAnalyses': recent_analyses,
                'topDamageType': top_damage_type
            }

            return stats
        except Exception as e:
            logger.error(f"Error getting user stats: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def ensure_user_profile(self, uid, id_token, default_profile=None):
        """Ensure a user profile exists, creating it if necessary, using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/profile.json"
            response = session.get(url)
            
            # Check if profile exists and is not null
            if response.status_code == 200 and response.content and response.json() is not None:
                return  # Profile exists

            # Profile does not exist or is null, create it
            logger.info(f"User profile for {uid} not found, creating one.")
            
            if default_profile is None:
                profile_data = {
                    'email': 'unknown@example.com',
                    'name': 'User',
                    'created_at': datetime.now().isoformat(),
                    'last_activity': datetime.now().isoformat()
                }
            else:
                profile_data = default_profile
                profile_data['created_at'] = datetime.now().isoformat()

            # Use PUT to create the profile at the specific path
            create_response = session.put(url, json=profile_data)
            create_response.raise_for_status()
            logger.info(f"Successfully created profile for user {uid}")

        except requests.exceptions.HTTPError as e:
            # It's possible for a race condition where another process creates the profile
            # between our GET and PUT. A 400 error with "data already exists" is fine.
            if e.response.status_code != 400:
                 logger.error(f"Error ensuring user profile exists via REST: {e.response.text}")
                 raise
        except Exception as e:
            logger.error(f"Error ensuring user profile exists: {str(e)}")
            raise

    def direct_update_analysis_history(self, uid, data, id_token):
        """Directly update analysis history for a user (for migration/admin tasks)."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/analysisHistory.json"
            response = session.put(url, json=data) # Use PUT to overwrite the whole history
            response.raise_for_status()
            logger.info(f"Successfully performed direct update on analysis history for user {uid}")
            return response.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error in direct update of analysis history via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error in direct update of analysis history: {str(e)}")
            raise

    def direct_update_user_data(self, uid, path, data, id_token):
        """Directly update any part of a user's data (for migration/admin tasks)."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/{path}.json"
            response = session.put(url, json=data) # Use PUT to overwrite the data at the path
            response.raise_for_status()
            logger.info(f"Successfully performed direct update on {path} for user {uid}")
            return response.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"Error in direct update of {path} via REST: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error in direct update of {path}: {str(e)}")
            raise