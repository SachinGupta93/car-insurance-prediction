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
            # Check for service account file from environment variable
            service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            
            # Check for service account in common locations if environment variable not set
            if not service_account_path or not os.path.exists(service_account_path):
                # Look for service account in project directory
                possible_locations = [
                    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "service-account.json"),
                    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "firebase-service-account.json"),
                    os.path.join(os.path.dirname(os.path.dirname(__file__)), "service-account.json"),
                    os.path.join(os.path.dirname(__file__), "service-account.json")
                ]
                
                for location in possible_locations:
                    if os.path.exists(location):
                        service_account_path = location
                        logger.info(f"Found service account at: {location}")
                        break
            
            if service_account_path and os.path.exists(service_account_path):
                # Initialize with service account if file exists
                try:
                    logger.info(f"Attempting to initialize Firebase with service account: {service_account_path}")
                    cred = firebase_admin.credentials.Certificate(service_account_path)
                    firebase_admin.initialize_app(cred)
                    logger.info(f"Firebase Admin SDK initialized successfully with service account")
                except Exception as cert_error:
                    logger.error(f"Failed to initialize with service account: {str(cert_error)}")
                    if dev_mode:
                        # In dev mode, create a dummy app with minimal config
                        logger.warning("DEV MODE: Initializing Firebase with minimal config for development")
                        firebase_admin.initialize_app(options={
                            'projectId': os.getenv('FIREBASE_PROJECT_ID') or 'dev-project'
                        })
                        logger.info("Firebase Admin SDK initialized with minimal config for development")
                    else:
                        # In production, re-raise the error
                        raise cert_error
            else:
                # Try to initialize without explicit credentials (for development/testing)
                try:
                    # This will work in local development if FIREBASE_API_KEY is set in .env
                    logger.info("No service account found, trying environment variables")
                    firebase_admin.initialize_app(options={
                        'apiKey': os.getenv('FIREBASE_API_KEY'),
                        'projectId': os.getenv('FIREBASE_PROJECT_ID') or 'dev-project'
                    })
                    logger.info("Firebase Admin SDK initialized with environment variables")
                except Exception as inner_e:
                    logger.warning(f"Failed to initialize with environment variables: {str(inner_e)}")
                    
                    if dev_mode:
                        # In dev mode, create a dummy app with minimal config
                        logger.warning("DEV MODE: Initializing Firebase with minimal config for development")
                        firebase_admin.initialize_app(options={
                            'projectId': 'dev-project'
                        })
                        logger.info("Firebase Admin SDK initialized with minimal config for development")
                    else:
                        # In production, try default credentials
                        try:
                            firebase_admin.initialize_app()
                            logger.info("Firebase Admin SDK initialized with application default credentials")
                        except Exception as default_e:
                            logger.error(f"Failed to initialize with default credentials: {str(default_e)}")
                            raise default_e
        return True
    except Exception as e:
        logger.error(f"Error initializing Firebase: {str(e)}")
        if dev_mode:
            # In dev mode, we can continue without Firebase
            logger.warning("DEV MODE: Continuing without Firebase initialization")
            return True
        return False

def verify_firebase_token(token):
    """Verify Firebase ID token."""
    # Check for development mode
    dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
    
    # Special case for development mode with a magic development token
    if dev_mode and token == 'DEVELOPMENT_TOKEN_FOR_TESTING':
        logger.warning("DEV MODE: Using development test token")
        return {
            'uid': 'dev-user-123',
            'email': 'dev@example.com',
            'name': 'Development User',
            'dev_mode': True
        }
    
    try:
        if not firebase_admin._apps:
            initialize_firebase()
            
        try:
            decoded_token = firebase_admin.auth.verify_id_token(token)
            logger.info(f"Firebase token successfully verified for user: {decoded_token.get('uid', 'unknown')}")
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
            logger.warning(f"DEV MODE: Bypassing token verification error in development mode: {str(e)}")
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