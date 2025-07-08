"""
API Key Manager - Handles rotation between multiple Gemini API keys
when quotas are exceeded to ensure continuous service
"""
import os
import json
import time
import logging
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend/.env (primary source)
backend_env = Path(__file__).parent / '.env'
logger = logging.getLogger(__name__)
logger.info(f"APIKeyManager: Loading environment from: {backend_env}")
load_dotenv(backend_env)

# Also try project root .env as fallback, but don't override backend/.env values
try:
    project_root_env = Path(__file__).parent.parent / '.env'
    if project_root_env.exists():
        logger.info(f"APIKeyManager: Also checking environment from: {project_root_env}")
        load_dotenv(project_root_env, override=False)
except Exception as e:
    logger.warning(f"APIKeyManager: Error loading from project root .env: {str(e)}")
    pass

class APIKeyManager:
    def __init__(self):
        self.primary_key = os.environ.get('GEMINI_API_KEY', '')
        self.backup_keys = self._load_backup_keys()
        self.all_keys = [self.primary_key] + self.backup_keys if self.primary_key else self.backup_keys
        self.current_key_index = 0
        self.key_status = {}  # Track quota status for each key
        self.last_rotation = {}  # Track when keys were last rotated
        
        # Initialize status for all keys
        for i, key in enumerate(self.all_keys):
            self.key_status[i] = {
                'quota_exceeded': False,
                'last_quota_exceeded': None,
                'requests_made': 0,
                'errors': 0
            }
        
        logger.info(f"🔑 APIKeyManager initialized with {len(self.all_keys)} keys")
    
    def _load_backup_keys(self) -> List[str]:
        """Load backup keys from environment variable"""
        backup_keys_str = os.environ.get('GEMINI_BACKUP_KEYS', '')
        if not backup_keys_str:
            return []
        
        # Split by comma and clean up
        keys = [key.strip() for key in backup_keys_str.split(',') if key.strip()]
        logger.info(f"🔄 Loaded {len(keys)} backup API keys")
        return keys
    
    def get_current_key(self) -> Optional[str]:
        """Get the currently active API key"""
        if not self.all_keys:
            logger.error("❌ No API keys available!")
            return None
        
        current_key = self.all_keys[self.current_key_index]
        logger.debug(f"🔑 Using API key #{self.current_key_index + 1} (ending in ...{current_key[-4:]})")
        return current_key
    
    def record_successful_request(self):
        """Record a successful API request"""
        if self.current_key_index in self.key_status:
            self.key_status[self.current_key_index]['requests_made'] += 1
            # Reset quota exceeded status on successful request
            self.key_status[self.current_key_index]['quota_exceeded'] = False
    
    def record_quota_exceeded(self) -> bool:
        """
        Record that current key hit quota and try to rotate to next key
        Returns True if rotation was successful, False if all keys are exhausted
        """
        current_status = self.key_status.get(self.current_key_index, {})
        current_status['quota_exceeded'] = True
        current_status['last_quota_exceeded'] = datetime.now()
        current_status['errors'] = current_status.get('errors', 0) + 1
        
        logger.warning(f"🔄 API key #{self.current_key_index + 1} quota exceeded, attempting rotation...")
        
        # Try to find a working key
        original_index = self.current_key_index
        attempts = 0
        max_attempts = len(self.all_keys)
        
        while attempts < max_attempts:
            # Move to next key
            self.current_key_index = (self.current_key_index + 1) % len(self.all_keys)
            attempts += 1
            
            # Check if this key is available
            key_status = self.key_status.get(self.current_key_index, {})
            
            # Key is available if:
            # 1. It hasn't exceeded quota, OR
            # 2. It exceeded quota more than 1 hour ago (quota might have reset)
            quota_exceeded = key_status.get('quota_exceeded', False)
            last_exceeded = key_status.get('last_quota_exceeded')
            
            if not quota_exceeded or (last_exceeded and datetime.now() - last_exceeded > timedelta(hours=1)):
                logger.info(f"✅ Rotated to API key #{self.current_key_index + 1}")
                self.last_rotation[self.current_key_index] = datetime.now()
                return True
            else:
                logger.debug(f"⏭️ Skipping API key #{self.current_key_index + 1} (quota exceeded recently)")
        
        # All keys are exhausted
        self.current_key_index = original_index  # Return to original
        logger.error("❌ All API keys have exceeded quota!")
        return False
    
    def record_error(self, error_type: str = "general"):
        """Record an error for the current key"""
        if self.current_key_index in self.key_status:
            self.key_status[self.current_key_index]['errors'] += 1
            logger.debug(f"📊 Recorded {error_type} error for key #{self.current_key_index + 1}")
    
    def get_status_report(self) -> Dict:
        """Get detailed status report of all keys"""
        report = {
            'total_keys': len(self.all_keys),
            'current_key_index': self.current_key_index,
            'all_keys_exhausted': all(status.get('quota_exceeded', False) for status in self.key_status.values()),
            'keys': []
        }
        
        for i, key in enumerate(self.all_keys):
            status = self.key_status.get(i, {})
            key_report = {
                'index': i,
                'key_suffix': f"...{key[-4:]}" if key else "N/A",
                'is_current': i == self.current_key_index,
                'quota_exceeded': status.get('quota_exceeded', False),
                'requests_made': status.get('requests_made', 0),
                'errors': status.get('errors', 0),
                'last_quota_exceeded': status.get('last_quota_exceeded').isoformat() if status.get('last_quota_exceeded') else None,
                'available': not status.get('quota_exceeded', False) or 
                           (status.get('last_quota_exceeded') and 
                            datetime.now() - status.get('last_quota_exceeded') > timedelta(hours=1))
            }
            report['keys'].append(key_report)
        
        return report
    
    def reset_all_quotas(self):
        """Reset quota status for all keys (use with caution)"""
        logger.warning("🔄 Manually resetting all API key quotas")
        for key_index in self.key_status:
            self.key_status[key_index]['quota_exceeded'] = False
            self.key_status[key_index]['last_quota_exceeded'] = None
        self.current_key_index = 0
    
    def has_available_keys(self) -> bool:
        """Check if there are any available keys"""
        return any(
            not status.get('quota_exceeded', False) or 
            (status.get('last_quota_exceeded') and 
             datetime.now() - status.get('last_quota_exceeded') > timedelta(hours=1))
            for status in self.key_status.values()
        )

# Global instance
api_key_manager = APIKeyManager()
