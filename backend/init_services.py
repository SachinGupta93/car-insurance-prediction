#!/usr/bin/env python3
"""
Service Initialization Script
Properly initializes all backend services without continuous loading
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from car_damage_rag import CarDamageRAG

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def initialize_services():
    """Initialize all backend services once"""
    logger.info("🚀 Initializing backend services...")
    
    try:
        # Initialize CarDamageRAG
        logger.info("📊 Initializing CarDamageRAG...")
        car_damage_rag = CarDamageRAG()
        
        if car_damage_rag:
            logger.info("✅ CarDamageRAG initialized successfully")
            return car_damage_rag
        else:
            logger.error("❌ CarDamageRAG initialization failed")
            return None
            
    except Exception as e:
        logger.error(f"❌ Service initialization failed: {str(e)}")
        return None

def health_check():
    """Perform a simple health check"""
    logger.info("🔍 Performing health check...")
    
    try:
        # Check if required environment variables are set
        required_env_vars = ['GOOGLE_API_KEY']
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        
        if missing_vars:
            logger.warning(f"⚠️  Missing environment variables: {missing_vars}")
            return False
            
        logger.info("✅ Health check passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        return False

if __name__ == "__main__":
    # Perform health check
    if health_check():
        # Initialize services
        services = initialize_services()
        if services:
            logger.info("🎉 All services initialized successfully")
            logger.info("🔧 Backend is ready to handle requests")
        else:
            logger.error("💥 Service initialization failed")
            sys.exit(1)
    else:
        logger.error("💥 Health check failed")
        sys.exit(1)