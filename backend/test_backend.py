import os
import requests
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test configuration
BASE_URL = "http://127.0.0.1:8000/api"
TEST_IMAGES_DIR = "test_images"

def ensure_test_images_dir():
    """Create test_images directory if it doesn't exist"""
    if not os.path.exists(TEST_IMAGES_DIR):
        os.makedirs(TEST_IMAGES_DIR)
        logger.info(f"Created directory: {TEST_IMAGES_DIR}")

def test_health_check():
    """Test if the API is running"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        logger.info("Health check passed!")
        return True
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return False

def test_image_upload(image_path):
    """Test image upload and damage analysis"""
    try:
        # Prepare the file
        files = {'image': open(image_path, 'rb')}
        
        # Send the request
        response = requests.post(
            f"{BASE_URL}/analyze",
            files=files
        )
        
        # Check response
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Analysis successful for {image_path}")
            logger.info("Analysis result:")
            logger.info(json.dumps(result, indent=2))
            return result
        else:
            logger.error(f"Analysis failed with status {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error during image upload test: {str(e)}")
        return None

def main():
    """Main test function"""
    # Ensure test images directory exists
    ensure_test_images_dir()
    
    # Test health check
    if not test_health_check():
        logger.error("Backend is not running. Please start the server first.")
        return
    
    # Get list of test images
    test_images = [f for f in os.listdir(TEST_IMAGES_DIR) 
                  if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    if not test_images:
        logger.warning(f"No test images found in {TEST_IMAGES_DIR}")
        logger.info("Please add some car damage images to test with")
        return
    
    # Test each image
    for image_name in test_images:
        image_path = os.path.join(TEST_IMAGES_DIR, image_name)
        logger.info(f"\nTesting image: {image_name}")
        
        # Test damage analysis
        damage_result = test_image_upload(image_path)
        if damage_result:
            logger.info("Damage analysis test passed!")

if __name__ == "__main__":
    main() 