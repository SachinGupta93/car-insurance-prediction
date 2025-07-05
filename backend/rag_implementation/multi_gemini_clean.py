# Multi-Gemini API Key Car Damage Analysis System - Clean Version
import os
import logging
import traceback
import time
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv
from datetime import datetime, timedelta
import io
import json
import random
import time

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class MultiGeminiCarDamageRAG:
    def __init__(self):
        """Initialize the Multi-Gemini Car Damage Analysis system"""
        self.api_keys = []
        self.current_key_index = 0
        self.key_status = {}
        self.quota_reset_time = {}
        
        # Request throttling
        self.last_request_time = 0
        self.min_request_interval = 2  # Minimum 2 seconds between requests
        
        # Load multiple Gemini API keys
        self.load_gemini_keys()
        
        # Available models in order of preference
        self.model_options = [
            "gemini-1.5-pro-latest",
            "gemini-1.5-pro", 
            "gemini-pro-vision",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest"
        ]
        
        self.current_model = None
        self.current_api_key = None
        self.initialize_gemini()
        
    def load_gemini_keys(self):
        """Load multiple Gemini API keys from environment"""
        loaded_keys = set()  # Use set to avoid duplicates
        
        # Primary key
        primary_key = os.getenv("GEMINI_API_KEY")
        if primary_key and primary_key not in loaded_keys:
            self.api_keys.append(primary_key)
            self.key_status[primary_key] = 'active'
            loaded_keys.add(primary_key)
            logger.info(f"✅ Loaded primary Gemini key: {primary_key[:10]}...")
            
        # Backup keys from comma-separated string
        backup_keys_str = os.getenv("GEMINI_BACKUP_KEYS", "")
        if backup_keys_str:
            backup_keys = [key.strip() for key in backup_keys_str.split(',') if key.strip()]
            for key in backup_keys:
                if key not in loaded_keys:
                    self.api_keys.append(key)
                    self.key_status[key] = 'active'
                    loaded_keys.add(key)
                    logger.info(f"✅ Loaded backup Gemini key: {key[:10]}...")
            
        # Additional keys (GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.) - for backward compatibility
        i = 2
        while True:
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if key:
                if key not in loaded_keys:
                    self.api_keys.append(key)
                    self.key_status[key] = 'active'
                    loaded_keys.add(key)
                    logger.info(f"✅ Loaded Gemini key {i}: {key[:10]}...")
                i += 1
            else:
                break
                
        logger.info(f"🔑 Total loaded: {len(self.api_keys)} unique Gemini API keys for multi-key rotation")
        
        if not self.api_keys:
            raise Exception("❌ No Gemini API keys found! Please set GEMINI_API_KEY in your .env file")
    
    def get_next_available_key(self):
        """Get the next available API key"""
        attempts = 0
        while attempts < len(self.api_keys):
            current_key = self.api_keys[self.current_key_index]
            
            # Check if key is available
            if self.key_status.get(current_key, 'active') == 'active':
                return current_key
                
            # Check if quota reset time has passed
            if current_key in self.quota_reset_time:
                if datetime.now() > self.quota_reset_time[current_key]:
                    self.key_status[current_key] = 'active'
                    logger.info(f"✅ Quota reset for key {current_key[:10]}...")
                    return current_key
            
            # Move to next key
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            attempts += 1
            
        # If all keys are exhausted, reset the oldest one
        if self.quota_reset_time:
            oldest_key = min(self.quota_reset_time.keys(), 
                            key=lambda k: self.quota_reset_time[k])
            self.key_status[oldest_key] = 'active'
            logger.warning(f"⚠️ All keys exhausted, resetting oldest key: {oldest_key[:10]}...")
            return oldest_key
        else:
            # Default to first key
            return self.api_keys[0]
    
    def mark_key_quota_exceeded(self, api_key):
        """Mark a key as quota exceeded"""
        self.key_status[api_key] = 'quota_exceeded'
        # Set reset time to 1 hour from now (Gemini quota typically resets hourly)
        self.quota_reset_time[api_key] = datetime.now() + timedelta(hours=1)
        logger.warning(f"❌ Key {api_key[:10]}... quota exceeded, reset at {self.quota_reset_time[api_key]}")
    
    def initialize_gemini(self):
        """Initialize Gemini with available API key"""
        if not self.api_keys:
            raise Exception("No Gemini API keys available")
            
        current_key = self.get_next_available_key()
        self.current_api_key = current_key
        
        try:
            genai.configure(api_key=current_key)
            
            # Try to initialize a model
            for model_name in self.model_options:
                try:
                    self.current_model = genai.GenerativeModel(model_name)
                    logger.info(f"🚀 Multi-Gemini initialized with {model_name} using key {current_key[:10]}...")
                    break
                except Exception as model_error:
                    logger.warning(f"⚠️ Could not initialize {model_name}: {str(model_error)}")
                    continue
            
            if not self.current_model:
                raise Exception("No suitable Gemini models available")
                
        except Exception as e:
            logger.error(f"❌ Error initializing Gemini: {str(e)}")
            raise
    
    def analyze_with_retry(self, image_path, max_retries=None):
        """Analyze image with automatic key rotation on quota exceeded and rate limiting"""
        if max_retries is None:
            max_retries = len(self.api_keys) * 2  # Try each key twice
            
        for attempt in range(max_retries):
            try:
                current_key = self.get_next_available_key()
                self.current_api_key = current_key
                genai.configure(api_key=current_key)
                
                logger.info(f"🔄 Attempt {attempt + 1}/{max_retries} using key {current_key[:10]}...")
                
                # Add rate limiting delay to prevent rapid requests
                if attempt > 0:
                    delay = min(2 ** (attempt - 1), 10)  # Exponential backoff, max 10 seconds
                    logger.info(f"⏳ Rate limiting: waiting {delay}s before attempt...")
                    time.sleep(delay)
                
                # Perform the analysis
                result = self.analyze_damage_comprehensive(image_path)
                
                logger.info(f"✅ Analysis successful with key {current_key[:10]}...")
                return result
                
            except Exception as e:
                error_msg = str(e).lower()
                
                # Check if it's a quota error
                if any(keyword in error_msg for keyword in ['quota', 'limit', 'exceeded', '429', 'rate', 'resource_exhausted']):
                    logger.warning(f"⚠️ Quota exceeded for key {current_key[:10]}..., trying next key")
                    self.mark_key_quota_exceeded(current_key)
                    
                    # Move to next key
                    self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
                    
                    # Add delay after quota exceeded to prevent hammering
                    time.sleep(2)
                    continue
                else:
                    # Non-quota error, propagate it
                    logger.error(f"❌ Non-quota error: {str(e)}")
                    raise
        
        # If all retries exhausted
        raise Exception(f"All {len(self.api_keys)} Gemini API keys have exceeded quota. Please wait or add more keys.")
    
    def analyze_damage_comprehensive(self, image_path, include_vehicle_id=True, include_cost_analysis=True):
        """
        Comprehensive damage analysis with enhanced Indian market focus and rate limiting
        """
        try:
            # Global rate limiting
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            if time_since_last < self.min_request_interval:
                sleep_time = self.min_request_interval - time_since_last
                logger.info(f"⏳ Global rate limiting: waiting {sleep_time:.1f}s...")
                time.sleep(sleep_time)
            
            self.last_request_time = time.time()
            
            logger.info(f"🔍 [Multi-Gemini] Starting comprehensive damage analysis for image: {image_path}")
            
            # Load and validate image
            if isinstance(image_path, str):
                image = Image.open(image_path)
            else:
                image = image_path
            
            # Enhanced prompt for Indian market with JSON format
            prompt = f"""
            You are an expert automotive damage assessment specialist with deep knowledge of the Indian automotive market. 
            Analyze this car image comprehensively and provide detailed assessment in the exact JSON format below.
            
            Focus on:
            1. Accurate vehicle identification (make, model, year)
            2. Precise damage assessment with confidence levels (0.0 to 1.0)
            3. Realistic repair cost estimates in Indian Rupees (₹) and USD ($)
            4. Specific damage region coordinates for visualization
            5. Insurance recommendations for Indian market
            
            Return ONLY valid JSON in this exact format:
            {{
                "vehicleIdentification": {{
                    "make": "Brand name",
                    "model": "Model name", 
                    "year": "Year or year range",
                    "trimLevel": "Trim level",
                    "bodyStyle": "Sedan/Hatchback/SUV/etc",
                    "engineSize": "Engine size",
                    "fuelType": "Petrol/Diesel/CNG/Electric",
                    "marketSegment": "Entry/Premium/Luxury",
                    "idvRange": "IDV range in India",
                    "confidence": 0.85,
                    "identificationDetails": "Identification explanation"
                }},
                "damageAnalysis": {{
                    "damageType": "Primary damage type",
                    "confidence": 0.9,
                    "severity": "Minor/Moderate/Major",
                    "damageDescription": "Detailed damage description",
                    "affectedParts": ["list of affected parts"],
                    "identifiedDamageRegions": [
                        {{
                            "x": 100,
                            "y": 150,
                            "width": 200,
                            "height": 150,
                            "damageType": "Specific damage type",
                            "confidence": 0.85,
                            "severity": "Minor/Moderate/Major"
                        }}
                    ]
                }},
                "repairCostAnalysis": {{
                    "conservative": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}},
                    "comprehensive": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}},
                    "laborHours": "XX hours",
                    "breakdown": {{
                        "parts": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}},
                        "labor": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}},
                        "materials": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}}
                    }},
                    "serviceTypeComparison": {{
                        "authorizedCenter": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}},
                        "multiBrandCenter": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}},
                        "localGarage": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}}
                    }},
                    "regionalVariations": {{
                        "metro": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}},
                        "tier1": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}},
                        "tier2": {{"rupees": "₹XX,XXX", "dollars": "$XXX"}}
                    }}
                }},
                "recommendations": [
                    "Specific repair and insurance recommendations"
                ],
                "claimStrategy": {{
                    "recommended": "INSURANCE_CLAIM/SELF_PAY/CONDITIONAL",
                    "reasoning": "Detailed reasoning for recommendation",
                    "timelineOptimization": "Timeline suggestions",
                    "documentationRequired": ["Required documents"]
                }},
                "safetyAssessment": {{
                    "drivability": "SAFE/CAUTION/UNSAFE",
                    "safetySystemImpacts": ["Affected safety systems"],
                    "recommendations": ["Safety recommendations"]
                }}
            }}
            
            Important: 
            1. Use confidence values between 0.0 and 1.0 (not percentages)
            2. Provide accurate damage region coordinates
            3. Include realistic Indian market pricing
            4. Return only valid JSON format
            """
            
            # Generate content with proper configuration
            response = self.current_model.generate_content(
                [prompt, image],
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 4000,
                }
            )
            
            if not response or not response.text:
                raise Exception("Empty response from Gemini model")
            
            logger.info(f"✅ [Multi-Gemini] Analysis completed successfully with key {self.current_api_key[:10]}...")
            logger.debug(f"Response length: {len(response.text)} characters")
            
            return response.text
            
        except Exception as e:
            logger.error(f"❌ [Multi-Gemini] Analysis failed: {str(e)}")
            logger.error(traceback.format_exc())
            raise Exception(f"Multi-Gemini analysis failed: {str(e)}")
    
    def analyze_image(self, image_path):
        """Main analysis method with key rotation"""
        return self.analyze_with_retry(image_path)
    
    def get_api_status(self):
        """Get API status in the format expected by routes.py"""
        status = {
            'total_keys': len(self.api_keys),
            'current_key_index': self.current_key_index,
            'all_keys_exhausted': all(self.key_status.get(key, 'active') == 'quota_exceeded' for key in self.api_keys),
            'system_type': 'multi_gemini_clean',
            'keys': []
        }
        
        for i, key in enumerate(self.api_keys):
            key_status = self.key_status.get(key, 'active')
            key_info = {
                'index': i,
                'key_suffix': f"...{key[-4:]}" if key else "N/A",
                'is_current': i == self.current_key_index,
                'quota_exceeded': key_status == 'quota_exceeded',
                'available': key_status == 'active',
                'requests_made': 0,  # Could track this in the future
                'errors': 0  # Could track this in the future
            }
            status['keys'].append(key_info)
        
        return status
    
    def reset_quotas(self):
        """Reset quota status for all keys"""
        logger.warning("🔄 Manually resetting all API key quotas")
        for key in self.api_keys:
            self.key_status[key] = 'active'
            self.quota_reset_time.pop(key, None)
        self.current_key_index = 0
        logger.info("✅ All API quotas reset")
        
    def get_status(self):
        """Get status of all API keys (legacy method)"""
        status = {
            'total_keys': len(self.api_keys),
            'active_keys': sum(1 for status in self.key_status.values() if status == 'active'),
            'quota_exceeded_keys': sum(1 for status in self.key_status.values() if status == 'quota_exceeded'),
            'current_key_index': self.current_key_index,
            'current_api_key': self.current_api_key[:10] + "..." if self.current_api_key else None,
            'keys_status': {}
        }
        
        for i, key in enumerate(self.api_keys):
            key_short = key[:10] + "..."
            status['keys_status'][f'key_{i+1}'] = {
                'key': key_short,
                'status': self.key_status.get(key, 'unknown'),
                'quota_reset': self.quota_reset_time.get(key, 'N/A')
            }
        
        return status