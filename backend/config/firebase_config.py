import os
import logging
from dotenv import load_dotenv
import firebase_admin
import firebase_admin.auth
from firebase_admin import credentials

# Load environment variables from root .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK for token verification."""
    try:
        # Check for development mode
        dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
        
        if not firebase_admin._apps:
            # For development mode, we still want to connect to the real Firebase
            # but with better error handling
            
            # Try to initialize Firebase with the Web SDK configuration
            logger.info("Attempting to initialize Firebase Admin SDK for development")
            
            # Use the project ID from environment variables
            project_id = os.getenv('FIREBASE_PROJECT_ID', 'car-13674')
            database_url = os.getenv('FIREBASE_DATABASE_URL', 'https://car-13674-default-rtdb.firebaseio.com')
            
            try:
                # Initialize Firebase with minimal config that works with client-side auth
                firebase_admin.initialize_app(options={
                    'projectId': project_id,
                    'databaseURL': database_url
                })
                logger.info(f"Firebase Admin SDK initialized successfully for project: {project_id}")
                return True
                
            except Exception as firebase_error:
                logger.warning(f"Failed to initialize Firebase Admin SDK: {str(firebase_error)}")
                
                if dev_mode:
                    # In development mode, try to create a mock but functional app
                    logger.warning("DEV MODE: Creating minimal Firebase app for development")
                    try:
                        # Create a minimal app that can at least handle the project structure
                        firebase_admin.initialize_app(options={
                            'projectId': project_id
                        })
                        logger.info("Firebase Admin SDK initialized with minimal config for development")
                        return True
                    except Exception as minimal_error:
                        logger.error(f"Failed to create minimal Firebase app: {str(minimal_error)}")
                        return False
                else:
                    # In production, this is a real error
                    raise firebase_error
                    
        return True
    except Exception as e:
        logger.error(f"Error initializing Firebase: {str(e)}")
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
            'uid': 'AWorsS210YShgNlvMCjPFK2nDpg1',  # Use actual user ID from Firebase data
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
                    'uid': 'dev-invalid-token-123',
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
                    'uid': 'dev-expired-token-123',
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
                    'uid': 'dev-revoked-token-123',
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
                    'uid': 'dev-cert-error-123',
                    'email': 'dev-cert-error@example.com',
                    'name': 'Development Certificate Error User',
                    'dev_mode': True
                }
            raise ValueError("Firebase verification unavailable: Unable to verify at this time")
    except Exception as e:
        logger.error(f"Error verifying Firebase token: {str(e)}")
        if dev_mode:
            logger.warning(f"DEV MODE: Token verification failed, extracting user info from token payload: {str(e)}")
            
            # Try to extract user info from the token payload directly (for development)
            try:
                import jwt
                import json
                
                # Decode token without verification (only for development)
                decoded_payload = jwt.decode(token, options={"verify_signature": False})
                
                return {
                    'uid': decoded_payload.get('user_id') or decoded_payload.get('uid') or 'dev-extracted-uid',
                    'email': decoded_payload.get('email', 'dev-extracted@example.com'),
                    'name': decoded_payload.get('name', 'Development Extracted User'),
                    'dev_mode': True,
                    'extracted_from_token': True
                }
            except Exception as decode_error:
                logger.error(f"Failed to decode token payload: {str(decode_error)}")
                return {
                    'uid': 'dev-error-123',
                    'email': 'dev-error@example.com',
                    'name': 'Development Error User',
                    'dev_mode': True
                }
        raise ValueError(f"Firebase verification error: {str(e)}")

def get_firebase_config():
    """Get Firebase configuration for client-side initialization."""
    return {
        "apiKey": os.getenv("FIREBASE_API_KEY"),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.getenv("FIREBASE_PROJECT_ID"),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.getenv("FIREBASE_APP_ID"),
        "databaseURL": os.getenv("FIREBASE_DATABASE_URL"),
        "measurementId": os.getenv("FIREBASE_MEASUREMENT_ID")
    }

# Firebase Realtime Database Rules
FIREBASE_RULES = {
    "rules": {
        "users": {
            "$uid": {
                ".read": "auth != null && auth.uid === $uid",
                ".write": "auth != null && auth.uid === $uid",
                "profile": {
                    ".read": "auth != null && auth.uid === $uid",
                    ".write": "auth != null && auth.uid === $uid"
                },
                "vehicles": {
                    "$vehicle_id": {
                        ".read": "auth != null && auth.uid === $uid",
                        ".write": "auth != null && auth.uid === $uid"
                    }
                },
                "insurance": {
                    "$insurance_id": {
                        ".read": "auth != null && auth.uid === $uid",
                        ".write": "auth != null && auth.uid === $uid"
                    }
                },
                "analysis_history": {
                    "$analysis_id": {
                        ".read": "auth != null && auth.uid === $uid",
                        ".write": "auth != null && auth.uid === $uid"
                    }
                }
            }
        },
        "insurance_companies": {
            ".read": "auth != null",
            ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
        }
    }
} 