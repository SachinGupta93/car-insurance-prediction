import os
import logging
from dotenv import load_dotenv
import firebase_admin
import firebase_admin.auth
from firebase_admin import credentials, db
import requests
import json
import jwt

# Load environment variables from root .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK for authentication and database access."""
    try:
        # Check for development mode
        dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
        
        if not firebase_admin._apps:
            # Look for the service account file
            service_account_paths = [
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'firebase-service-account.json'),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'car-damage-firebase-adminsdk.json'),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'service-account.json'),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'firebase-credentials.json'),
                'firebase-service-account.json',
                'car-damage-firebase-adminsdk.json',
                'service-account.json',
                'firebase-credentials.json'
            ]
            
            service_account_file = None
            for path in service_account_paths:
                if os.path.isfile(path):
                    service_account_file = path
                    logger.info(f"✅ Found service account file: {path}")
                    break
            
            if service_account_file:
                # Initialize with service account for full access
                cred = credentials.Certificate(service_account_file)
                database_url = os.getenv(
                    'FIREBASE_DATABASE_URL', 
                    'https://car-13674-default-rtdb.firebaseio.com'
                )
                
                firebase_admin.initialize_app(cred, {
                    'databaseURL': database_url
                })
                logger.info(f"✅ Firebase Admin SDK initialized with service account")
                return True
            else:
                # No service account file found - use minimal config
                logger.warning("⚠️ No service account file found - using minimal config")
                
                # Try to initialize Firebase with the Web SDK configuration
                project_id = os.getenv('FIREBASE_PROJECT_ID', 'car-13674')
                database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com')
                
                firebase_admin.initialize_app(options={
                    'projectId': project_id,
                    'databaseURL': database_url
                })
                logger.info(f"✅ Firebase Admin SDK initialized with minimal config")
                return True
        
        return True
    except Exception as e:
        logger.error(f"❌ Error initializing Firebase: {str(e)}")
        dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
        if dev_mode:
            # In dev mode, we can continue without Firebase
            logger.warning("DEV MODE: Continuing without Firebase initialization")
            return False
        return False

def verify_firebase_token(token):
    """Verify Firebase ID token."""
    # Check for development mode
    dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
    
    # Special case for development mode with a magic development token
    if dev_mode and token == 'DEVELOPMENT_TOKEN_FOR_TESTING':
        logger.warning("DEV MODE: Using development test token")
        return {
            'uid': 'nCmRw6KPoKZJAxpVcXzFVrHzC5B2',  # Use actual user ID from Firebase data
            'email': 'dev@example.com',
            'name': 'Development User',
            'dev_mode': True
        }
    
    try:
        if not firebase_admin._apps:
            initialize_firebase()
            
        try:
            # Try to verify the actual Firebase token first
            decoded_token = firebase_admin.auth.verify_id_token(token)
            logger.info(f"✅ Firebase token successfully verified for user: {decoded_token.get('uid', 'unknown')}")
            return decoded_token
        except firebase_admin.auth.InvalidIdTokenError:
            logger.error("Invalid Firebase token: The token is malformed or expired")
            if dev_mode:
                logger.warning("DEV MODE: Bypassing invalid token in development mode")
                return {
                    'uid': 'nCmRw6KPoKZJAxpVcXzFVrHzC5B2',  # Use actual user ID from Firebase data
                    'email': 'dev-invalid@example.com',
                    'name': 'Development Invalid Token User',
                    'dev_mode': True
                }
            raise ValueError("Invalid Firebase token: The token is malformed or expired")
        except firebase_admin.auth.ExpiredIdTokenError:
            logger.error("Expired Firebase token: Please sign in again")
            if dev_mode:
                logger.warning("DEV MODE: Bypassing expired token in development mode")
                return {
                    'uid': 'nCmRw6KPoKZJAxpVcXzFVrHzC5B2',  # Use actual user ID from Firebase data
                    'email': 'dev-expired@example.com',
                    'name': 'Development Expired Token User',
                    'dev_mode': True
                }
            raise ValueError("Expired Firebase token: Please sign in again")
        except firebase_admin.auth.RevokedIdTokenError:
            logger.error("Revoked Firebase token: This token has been revoked")
            if dev_mode:
                logger.warning("DEV MODE: Bypassing revoked token in development mode")
                return {
                    'uid': 'nCmRw6KPoKZJAxpVcXzFVrHzC5B2',  # Use actual user ID from Firebase data
                    'email': 'dev-revoked@example.com',
                    'name': 'Development Revoked Token User',
                    'dev_mode': True
                }
            raise ValueError("Revoked Firebase token: This token has been revoked")
        except firebase_admin.auth.CertificateFetchError:
            logger.error("Certificate fetch error: Unable to fetch Google public keys")
            if dev_mode:
                logger.warning("DEV MODE: Bypassing certificate fetch error in development mode")
                return {
                    'uid': 'nCmRw6KPoKZJAxpVcXzFVrHzC5B2',  # Use actual user ID from Firebase data
                    'email': 'dev-cert-error@example.com',
                    'name': 'Development Certificate Error User',
                    'dev_mode': True
                }
            raise ValueError("Firebase verification unavailable: Unable to verify at this time")
    except Exception as e:
        logger.error(f"Error verifying Firebase token: {str(e)}")
        if dev_mode:
            logger.warning(f"DEV MODE: Token verification failed, using default development user")
            return {
                'uid': 'nCmRw6KPoKZJAxpVcXzFVrHzC5B2',  # Use actual user ID from Firebase data
                'email': 'dev@example.com',
                'name': 'Development User',
                'dev_mode': True
            }
        raise ValueError(f"Firebase token verification failed: {str(e)}")

def get_firebase_config():
    """Get Firebase configuration for direct REST API calls."""
    try:
        # Get Firebase project ID from environment or use default
        project_id = os.getenv('FIREBASE_PROJECT_ID', 'car-13674')
        database_url = os.getenv('FIREBASE_DATABASE_URL', f"https://{project_id}-default-rtdb.firebaseio.com")
        
        config = {
            'projectId': project_id,
            'databaseURL': database_url
        }
        
        # Check for service account file for authenticated access
        service_account_paths = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'firebase-service-account.json'),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'car-damage-firebase-adminsdk.json'),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'service-account.json'),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'firebase-credentials.json'),
            'firebase-service-account.json',
            'car-damage-firebase-adminsdk.json',
            'service-account.json',
            'firebase-credentials.json'
        ]
        
        for path in service_account_paths:
            if os.path.isfile(path):
                try:
                    with open(path, 'r') as f:
                        cred_data = json.load(f)
                        config['serviceAccount'] = path
                        logger.info(f"✅ Found service account credentials at {path}")
                        break
                except Exception as e:
                    logger.warning(f"⚠️ Error loading service account from {path}: {str(e)}")
        
        return config
    except Exception as e:
        logger.error(f"Error getting Firebase config: {str(e)}")
        return {
            'projectId': 'car-13674',
            'databaseURL': 'https://car-13674-default-rtdb.firebaseio.com'
        }

def get_firebase_database():
    """Get Firebase database reference with the current configuration."""
    try:
        # Ensure Firebase is initialized
        if not firebase_admin._apps:
            initialize_firebase()
        
        # Return the database reference
        return db.reference()
    except Exception as e:
        logger.error(f"Error getting Firebase database: {str(e)}")
        return None

def get_firebase_authenticated_session():
    """Get an authenticated session for Firebase REST API."""
    try:
        config = get_firebase_config()
        service_account_path = config.get('serviceAccount')
        
        if service_account_path:
            with open(service_account_path, 'r') as f:
                cred_data = json.load(f)
            
            # Create a session with token authentication
            session = requests.Session()
            
            # Get OAuth token for service account
            auth_url = f"https://oauth2.googleapis.com/token"
            
            # Prepare JWT claim
            now = int(time.time())
            
            jwt_claim = {
                "iss": cred_data["client_email"],
                "scope": "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database",
                "aud": auth_url,
                "exp": now + 3600,
                "iat": now
            }
            
            # Sign the JWT claim
            import time
            from cryptography.hazmat.backends import default_backend
            from cryptography.hazmat.primitives.serialization import load_pem_private_key
            import base64
            
            private_key = cred_data["private_key"]
            signer_key = load_pem_private_key(
                private_key.encode('utf-8'), 
                password=None, 
                backend=default_backend()
            )
            
            encoded_jwt = jwt.encode(jwt_claim, private_key, algorithm='RS256')
            
            # Get the token
            token_data = {
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion': encoded_jwt
            }
            
            response = requests.post(auth_url, data=token_data)
            token_json = response.json()
            
            if 'access_token' in token_json:
                access_token = token_json['access_token']
                session.headers.update({
                    'Authorization': f'Bearer {access_token}'
                })
                logger.info("✅ Firebase REST API authenticated with service account")
                return session
            else:
                logger.warning(f"⚠️ Error getting Firebase token: {response.text}")
        
        # If no service account or token fetch failed, return unauthenticated session
        logger.warning("⚠️ Using unauthenticated Firebase REST API session")
        return requests.Session()
    except Exception as e:
        logger.error(f"Error creating authenticated session: {str(e)}")
        return requests.Session()
