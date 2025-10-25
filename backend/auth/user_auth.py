from firebase_admin import auth
import logging
import os
import requests
import traceback
from datetime import datetime
from config.firebase_config import get_firebase_config

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
            response = session.get(url, timeout=7)
            response.raise_for_status()  # Raise an exception for bad status codes
            user_data = response.json()
            if not user_data:
                # If profile doesn't exist, create a basic one
                self.ensure_user_profile(uid, id_token, {'email': 'Not set', 'name': 'New User'})
                return self.get_user_profile(uid, id_token)
            return user_data
        except requests.exceptions.HTTPError as e:
            status = getattr(e.response, 'status_code', None)
            try:
                logger.error(f"Error getting user profile via REST: {e.response.text}")
            except Exception:
                logger.error("Error getting user profile via REST (no response text)")
            # Fallback to Admin SDK when token is unauthorized by RTDB rules
            if status in (401, 403):
                try:
                    profile = self.db_ref.child('users').child(uid).child('profile').get(auth_token=id_token)
                    if not profile:
                        profile_data = {
                            'email': 'unknown@example.com',
                            'name': 'User',
                            'created_at': datetime.now().isoformat(),
                            'last_activity': datetime.now().isoformat()
                        }
                        self.db_ref.child('users').child(uid).child('profile').set(profile_data, auth_token=id_token)
                        return profile_data
                    return profile
                except Exception as admin_ex:
                    logger.error(f"Admin fallback failed in get_user_profile: {str(admin_ex)}")
            raise
        except Exception as e:
            logger.error(f"Error getting user profile: {str(e)}")
            raise

    def create_user_profile(self, uid, data, id_token):
        """Create or overwrite a user profile in Realtime Database using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/profile.json"
            response = session.put(url, json=data, timeout=7) # Use PUT to create/overwrite
            response.raise_for_status()
            logger.info(f"Successfully created/updated profile for user {uid}")
            return response.json()
        except requests.exceptions.HTTPError as e:
            status = getattr(e.response, 'status_code', None)
            try:
                logger.error(f"Error creating user profile via REST: {e.response.text}")
            except Exception:
                logger.error("Error creating user profile via REST (no response text)")
            if status in (401, 403):
                # Admin fallback
                try:
                    self.db_ref.child('users').child(uid).child('profile').set(data, auth_token=id_token)
                    logger.info(f"Admin fallback: profile created for user {uid}")
                    return data
                except Exception as admin_ex:
                    logger.error(f"Admin fallback failed in create_user_profile: {str(admin_ex)}")
            raise
        except Exception as e:
            logger.error(f"Error creating user profile: {str(e)}")
            raise

    def update_user_profile(self, uid, data, id_token):
        """Update user profile in Realtime Database using authenticated REST call."""
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/profile.json"
            response = session.patch(url, json=data, timeout=7) # Use PATCH to update fields
            response.raise_for_status()
            logger.info(f"Successfully updated profile for user {uid}")
            return response.json()
        except requests.exceptions.HTTPError as e:
            status = getattr(e.response, 'status_code', None)
            try:
                logger.error(f"Error updating user profile via REST: {e.response.text}")
            except Exception:
                logger.error("Error updating user profile via REST (no response text)")
            if status in (401, 403):
                try:
                    # Admin fallback: update the fields
                    self.db_ref.child('users').child(uid).child('profile').update(data, auth_token=id_token)
                    logger.info(f"Admin fallback: profile updated for user {uid}")
                    return data
                except Exception as admin_ex:
                    logger.error(f"Admin fallback failed in update_user_profile: {str(admin_ex)}")
            raise
        except Exception as e:
            logger.error(f"Error updating user profile: {str(e)}")
            raise

    def ensure_user_profile(self, uid, id_token, default_profile=None):
        """Ensure a user profile exists with a single PUT. Fallback to db_ref on auth errors."""
        # Build profile payload
        if default_profile is None:
            profile_data = {
                'email': 'unknown@example.com',
                'name': 'User',
                'created_at': datetime.now().isoformat(),
                'last_activity': datetime.now().isoformat()
            }
        else:
            profile_data = dict(default_profile)
            profile_data['created_at'] = datetime.now().isoformat()

        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/profile.json"
            # Quick existence check (2s) to avoid overwriting an existing profile
            try:
                check_resp = session.get(url, timeout=2)
                if check_resp.status_code == 200:
                    try:
                        existing = check_resp.json()
                    except Exception:
                        existing = None
                    if existing:
                        logger.info(f"Profile already exists for user {uid}")
                        return
            except Exception:
                # If the existence check fails (e.g., 401), continue to create path
                pass
            # Single PUT with shorter timeout to avoid client aborts
            put_resp = session.put(url, json=profile_data, timeout=4)
            if put_resp.status_code in (200, 204):
                logger.info(f"Profile ensured via REST for user {uid}")
                return
            put_resp.raise_for_status()
        except requests.exceptions.HTTPError as e:
            status = getattr(e.response, 'status_code', None)
            if status in (401, 403):
                try:
                    # Fallback using our REST client with user's token to satisfy RTDB rules
                    self.db_ref.child('users').child(uid).child('profile').set(profile_data, auth_token=id_token)
                    logger.info(f"Profile ensured via fallback for user {uid}")
                    return
                except Exception as admin_ex:
                    logger.error(f"Fallback failed in ensure_user_profile: {str(admin_ex)}")
            # Log any other REST error content if available
            try:
                logger.error(f"Error ensuring user profile via REST: {e.response.text}")
            except Exception:
                logger.error("Error ensuring user profile via REST (no response text)")
            raise
        except Exception as e:
            logger.error(f"Error ensuring user profile exists: {str(e)}")
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

            response = session.post(url, json=analysis_data, timeout=7) # POST generates a unique ID
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

    def get_analysis_history(self, uid, id_token, limit: int | None = None, order_by: str = 'uploadedAt'):
        """Get user's analysis history using authenticated REST call with optional server-side limiting.

        Args:
            uid: Firebase user ID
            id_token: Firebase ID token
            limit: When provided, limit to last N items (server-side)
            order_by: Child key to order by (default 'uploadedAt')
        """
        try:
            session = self._get_authenticated_session(id_token)
            url = f"{self.db_url}/users/{uid}/analysisHistory.json"

            params = {}
            # Firebase REST API requires JSON-encoded strings for orderBy
            if limit is not None and isinstance(limit, int) and limit > 0:
                try:
                    params = {
                        'orderBy': f'"{order_by}"',
                        'limitToLast': limit
                    }
                except Exception:
                    params = {}

            response = session.get(url, params=params, timeout=7)
            response.raise_for_status()
            history = response.json()
            return history if history else {}
        except requests.exceptions.HTTPError as e:
            # Include response content for debugging when available
            try:
                logger.error(f"Error getting analysis history via REST: {e.response.text}")
            except Exception:
                logger.error("Error getting analysis history via REST: HTTP error without response text")
            raise
        except Exception as e:
            logger.error(f"Error getting analysis history: {str(e)}")
            raise

    def get_user_stats(self, uid, id_token):
        """Get user statistics from Realtime Database with optimized processing."""
        try:
            history = self.get_analysis_history(uid, id_token)
            
            if not history:
                return {
                    'totalAnalyses': 0,
                    'avgConfidence': 0,
                    'damageTypes': {},
                    'monthlyTrends': [],
                    'severityBreakdown': {},
                    'recentAnalyses': [],
                    'topDamageType': 'N/A'
                }

            # Convert history to list only once
            analyses = []
            if isinstance(history, dict):
                for key, value in history.items():
                    if isinstance(value, dict):
                        value['id'] = key
                        analyses.append(value)
            
            total_analyses = len(analyses)
            if total_analyses == 0:
                return {
                    'totalAnalyses': 0,
                    'avgConfidence': 0,
                    'damageTypes': {},
                    'monthlyTrends': [],
                    'severityBreakdown': {},
                    'recentAnalyses': [],
                    'topDamageType': 'N/A'
                }
            
            # Sort by timestamp once for recent analyses
            analyses.sort(
                key=lambda x: x.get('timestamp', x.get('uploadedAt', x.get('created_at', '1970-01-01T00:00:00'))), 
                reverse=True
            )
            recent_analyses = analyses[:5]
            
            # Single pass through data for all calculations
            confidences = []
            damage_types = {}
            severity_breakdown = {}
            monthly_trends = {}
            
            for item in analyses:
                # Extract confidence
                confidence = item.get('result', {}).get('confidence') or item.get('confidence')
                if confidence is not None:
                    confidences.append(float(confidence))
                
                # Extract damage type
                damage_type = item.get('result', {}).get('damageType') or item.get('damageType')
                if damage_type:
                    damage_types[damage_type] = damage_types.get(damage_type, 0) + 1
                
                # Extract severity
                severity = item.get('result', {}).get('severity') or item.get('severity')
                if severity:
                    severity_breakdown[severity] = severity_breakdown.get(severity, 0) + 1
                
                # Extract monthly trend
                timestamp_str = item.get('uploadedAt') or item.get('created_at') or item.get('timestamp')
                if timestamp_str:
                    try:
                        analysis_date = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        month_key = analysis_date.strftime('%Y-%m')
                        
                        if month_key not in monthly_trends:
                            monthly_trends[month_key] = {'count': 0, 'totalCost': 0, 'costEntries': 0}
                        
                        monthly_trends[month_key]['count'] += 1
                        
                        # Simplified cost extraction - only parse if we have a cost
                        repair_estimate_str = (item.get('result', {}).get('repairEstimate') or 
                                             item.get('repairEstimate'))
                        if repair_estimate_str:
                            try:
                                # Quick numeric extraction
                                import re
                                numbers = re.findall(r'\d+(?:\.\d+)?', str(repair_estimate_str))
                                if numbers:
                                    cost = sum(float(n) for n in numbers) / len(numbers)
                                    monthly_trends[month_key]['totalCost'] += cost
                                    monthly_trends[month_key]['costEntries'] += 1
                            except (ValueError, IndexError):
                                pass  # Skip cost parsing errors
                    except (ValueError, TypeError):
                        pass  # Skip date parsing errors

            # Calculate results
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            top_damage_type = max(damage_types, key=damage_types.get) if damage_types else 'N/A'
            
            # Format monthly trends
            formatted_trends = sorted([
                {
                    'month': key,
                    'count': value['count'],
                    'avgCost': (value['totalCost'] / value['costEntries']) if value['costEntries'] > 0 else 0
                }
                for key, value in monthly_trends.items()
            ], key=lambda x: x['month'])

            return {
                'totalAnalyses': total_analyses,
                'avgConfidence': avg_confidence,
                'damageTypes': damage_types,
                'monthlyTrends': formatted_trends,
                'severityBreakdown': severity_breakdown,
                'recentAnalyses': recent_analyses,
                'topDamageType': top_damage_type
            }
            
        except Exception as e:
            logger.error(f"Error getting user stats: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def get_user_stats_fast(self, uid, id_token):
        """Get user statistics with minimal processing for dashboard."""
        try:
            history = self.get_analysis_history(uid, id_token)
            
            if not history:
                return {
                    'totalAnalyses': 0,
                    'avgConfidence': 0,
                    'damageTypes': {},
                    'monthlyTrends': [],
                    'severityBreakdown': {},
                    'recentAnalyses': [],
                    'topDamageType': 'N/A'
                }

            # Convert to list and get count quickly
            analyses = []
            if isinstance(history, dict):
                for key, value in history.items():
                    if isinstance(value, dict):
                        value['id'] = key
                        analyses.append(value)
            
            total_analyses = len(analyses)
            if total_analyses == 0:
                return {
                    'totalAnalyses': 0,
                    'avgConfidence': 0,
                    'damageTypes': {},
                    'monthlyTrends': [],
                    'severityBreakdown': {},
                    'recentAnalyses': [],
                    'topDamageType': 'N/A'
                }
            
            # Sort only once and take top 5 for recent analyses
            analyses.sort(
                key=lambda x: x.get('timestamp', x.get('uploadedAt', x.get('created_at', '1970-01-01T00:00:00'))), 
                reverse=True
            )
            recent_analyses = analyses[:5]
            
            # Quick calculations on limited data
            confidences = []
            damage_types = {}
            
            # Process only first 20 items for speed
            sample_size = min(20, len(analyses))
            for item in analyses[:sample_size]:
                # Extract confidence
                confidence = item.get('result', {}).get('confidence') or item.get('confidence')
                if confidence is not None:
                    confidences.append(float(confidence))
                
                # Extract damage type
                damage_type = item.get('result', {}).get('damageType') or item.get('damageType')
                if damage_type:
                    damage_types[damage_type] = damage_types.get(damage_type, 0) + 1

            # Calculate basic stats
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            top_damage_type = max(damage_types, key=damage_types.get) if damage_types else 'N/A'
            
            # Simple monthly trends (current month only)
            current_month = datetime.now().strftime('%Y-%m')
            monthly_trends = [{
                'month': current_month,
                'count': total_analyses,
                'avgCost': 25000  # Simplified average cost
            }]

            return {
                'totalAnalyses': total_analyses,
                'avgConfidence': avg_confidence,
                'damageTypes': damage_types,
                'monthlyTrends': monthly_trends,
                'severityBreakdown': {'moderate': total_analyses},  # Simplified
                'recentAnalyses': recent_analyses,
                'topDamageType': top_damage_type
            }
            
        except Exception as e:
            logger.error(f"Error getting fast user stats: {str(e)}")
            # Return empty stats instead of failing
            return {
                'totalAnalyses': 0,
                'avgConfidence': 0,
                'damageTypes': {},
                'monthlyTrends': [],
                'severityBreakdown': {},
                'recentAnalyses': [],
                'topDamageType': 'N/A'
            }