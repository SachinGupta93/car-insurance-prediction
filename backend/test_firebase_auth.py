#!/usr/bin/env python3
# test_firebase_auth.py - Test Firebase Auth SDK and configuration

import os
import sys
import logging
from dotenv import load_dotenv
# Add the parent directory to the path to allow imports 
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.config.firebase_config import initialize_firebase, verify_firebase_token

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - [%(name)s] - [%(levelname)s] - %(message)s')
logger = logging.getLogger('test_firebase_auth')

def main():
    """Test Firebase configuration and authentication."""
    logger.info("Testing Firebase Authentication Setup...")
    
    # Load environment variables
    load_dotenv()
    
    # Check for GOOGLE_APPLICATION_CREDENTIALS
    creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if not creds_path:
        logger.error("GOOGLE_APPLICATION_CREDENTIALS environment variable not set.")
        logger.info("Please set this variable to point to your Firebase service account JSON file.")
        logger.info("Example: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-file.json")
        return False
    
    if not os.path.exists(creds_path):
        logger.error(f"Service account file not found: {creds_path}")
        return False
    
    logger.info(f"Found service account file at: {creds_path}")
    
    # Try to initialize Firebase Admin SDK
    if not initialize_firebase():
        logger.error("Failed to initialize Firebase Admin SDK.")
        return False
    
    logger.info("Firebase Admin SDK initialized successfully.")
    
    # Check if there's a token to verify
    if len(sys.argv) > 1:
        token = sys.argv[1]
        logger.info("Testing token verification with provided token...")
        try:
            decoded_token = verify_firebase_token(token)
            if decoded_token:
                logger.info("Token verification successful!")
                logger.info(f"User ID: {decoded_token.get('uid')}")
                logger.info(f"Email: {decoded_token.get('email')}")
                return True
            else:
                logger.error("Token verification failed - invalid token.")
                return False
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return False
    else:
        logger.info("No token provided for verification.")
        logger.info("To test token verification, run: python test_firebase_auth.py <your_firebase_token>")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
