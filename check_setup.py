#!/usr/bin/env python3
"""
Check if the development setup is ready
"""
import os
import sys
import subprocess
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_python_requirements():
    """Check if Python requirements are met"""
    logger.info("🐍 Checking Python requirements...")
    
    # Check if requirements.txt exists
    backend_req_path = "backend/requirements.txt"
    if not os.path.exists(backend_req_path):
        logger.error(f"❌ Requirements file not found: {backend_req_path}")
        return False
    
    # Check if Python can import key modules
    try:
        import flask
        logger.info("✅ Flask installed")
    except ImportError:
        logger.error("❌ Flask not installed")
        return False
    
    try:
        import firebase_admin
        logger.info("✅ Firebase Admin SDK installed")
    except ImportError:
        logger.error("❌ Firebase Admin SDK not installed")
        return False
    
    return True

def check_node_requirements():
    """Check if Node.js requirements are met"""
    logger.info("📦 Checking Node.js requirements...")
    
    # Check if package.json exists
    frontend_pkg_path = "frontend/package.json"
    if not os.path.exists(frontend_pkg_path):
        logger.error(f"❌ Package.json not found: {frontend_pkg_path}")
        return False
    
    # Check if node_modules exists
    frontend_modules_path = "frontend/node_modules"
    if not os.path.exists(frontend_modules_path):
        logger.warning(f"⚠️  Node modules not found: {frontend_modules_path}")
        logger.info("💡 Run 'npm install' in the frontend directory")
        return False
    
    logger.info("✅ Node.js setup looks good")
    return True

def check_configuration():
    """Check if configuration files are properly set up"""
    logger.info("⚙️  Checking configuration...")
    
    # Check frontend environment
    frontend_env_path = "frontend/.env.local"
    if not os.path.exists(frontend_env_path):
        logger.error(f"❌ Environment file not found: {frontend_env_path}")
        return False
    
    # Read and check API URL
    with open(frontend_env_path, 'r') as f:
        content = f.read()
        if 'VITE_API_BASE_URL=http://localhost:5174/api' in content:
            logger.info("✅ API URL correctly configured for port 5174")
        else:
            logger.warning("⚠️  API URL might not be configured for port 5174")
    
    return True

def main():
    """Main check function"""
    logger.info("🔍 Car Damage Prediction - Development Setup Check")
    logger.info("=" * 60)
    
    # Change to project directory
    os.chdir("d:/Car-damage-prediction")
    
    checks = [
        ("Python Requirements", check_python_requirements),
        ("Node.js Requirements", check_node_requirements),
        ("Configuration", check_configuration)
    ]
    
    all_passed = True
    
    for check_name, check_func in checks:
        logger.info(f"🔧 Running {check_name} check...")
        if not check_func():
            logger.error(f"❌ {check_name} check failed")
            all_passed = False
        else:
            logger.info(f"✅ {check_name} check passed")
        logger.info("-" * 40)
    
    if all_passed:
        logger.info("🎉 All checks passed! Development setup is ready.")
        logger.info("💡 Next steps:")
        logger.info("  1. Run backend: python backend/main.py")
        logger.info("  2. Run frontend: cd frontend && npm run dev")
        logger.info("  3. Open http://localhost:5173 in your browser")
    else:
        logger.error("❌ Some checks failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == '__main__':
    main()