# Multi-Gemini API Key Car Damage Analysis System
import os
import logging
import traceback
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
        if USE_API_KEY_MANAGER:
            # Use new API key manager
            self.initialize_with_key_manager()
        else:
            # Use legacy system
            self.initialize_legacy()
        
        # Available models in order of preference
        self.model_options = [
            "gemini-1.5-pro-latest",
            "gemini-1.5-pro", 
            "gemini-pro-vision",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest"
        ]
        
        self.current_model = None
        self.initialize_gemini()
    
    def initialize_with_key_manager(self):
        """Initialize using the new API key manager"""
        self.using_key_manager = True
        logger.info(f"🔑 Initialized with {api_key_manager.get_status_report()['total_keys']} API keys")
    
    def initialize_legacy(self):
        """Initialize using legacy key management"""
        self.using_key_manager = False
        self.api_keys = []
        self.current_key_index = 0
        self.key_status = {}
        self.quota_reset_time = {}
        self.load_gemini_keys_legacy()
    
    def load_gemini_keys_legacy(self):
        """Load multiple Gemini API keys from environment (legacy method)"""
        # Primary key
        primary_key = os.getenv("GEMINI_API_KEY")
        if primary_key:
            self.api_keys.append(primary_key)
            self.key_status[primary_key] = 'active'
            
        # Backup keys from comma-separated string
        backup_keys_str = os.getenv("GEMINI_BACKUP_KEYS", "")
        if backup_keys_str:
            backup_keys = [key.strip() for key in backup_keys_str.split(',') if key.strip()]
            for key in backup_keys:
                self.api_keys.append(key)
                self.key_status[key] = 'active'
            
        # Additional keys (GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.)
        i = 2
        while True:
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if key:
                self.api_keys.append(key)
                self.key_status[key] = 'active'
                i += 1
            else:
                break
                
        logger.info(f"Loaded {len(self.api_keys)} Gemini API keys (legacy)")
        
        if not self.api_keys:
            raise Exception("No Gemini API keys found! Please set GEMINI_API_KEY in your .env file")
            self.key_status[primary_key] = 'active'
            
        # Additional keys (GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.)
        i = 2
        while True:
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if key:
                self.api_keys.append(key)
                self.key_status[key] = 'active'
                i += 1
            else:
                break
                
        logger.info(f"Loaded {len(self.api_keys)} Gemini API keys")
        
        if not self.api_keys:
            raise Exception("No Gemini API keys found! Please set GEMINI_API_KEY in your .env file")
    
    def get_current_api_key(self):
        """Get current API key using appropriate method"""
        if self.using_key_manager:
            return api_key_manager.get_current_key()
        else:
            return self.get_next_available_key_legacy()
    
    def handle_quota_exceeded(self):
        """Handle quota exceeded using appropriate method"""
        if self.using_key_manager:
            return api_key_manager.record_quota_exceeded()
        else:
            current_key = self.api_keys[self.current_key_index]
            self.mark_key_quota_exceeded_legacy(current_key)
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            return True
    
    def record_success(self):
        """Record successful request"""
        if self.using_key_manager:
            api_key_manager.record_successful_request()
    
    def get_next_available_key_legacy(self):
        """Get the next available API key - Sequential usage (primary first, then backups)"""
        # Always try primary key first
        primary_key = self.api_keys[0]
        if self.key_status.get(primary_key, 'active') == 'active':
            logger.info(f"[Multi-Gemini] Using primary API key (ending in ...{primary_key[-4:]})")
            return primary_key
            
        # Check if primary key quota reset time has passed
        if primary_key in self.quota_reset_time:
            if datetime.now() > self.quota_reset_time[primary_key]:
                self.key_status[primary_key] = 'active'
                del self.quota_reset_time[primary_key]
                logger.info(f"[Multi-Gemini] Primary key quota reset, using primary key")
                return primary_key
        
        # Only if primary key is exhausted, try backup keys sequentially
        for i in range(1, len(self.api_keys)):
            backup_key = self.api_keys[i]
            
            # Check if backup key is available
            if self.key_status.get(backup_key, 'active') == 'active':
                logger.info(f"[Multi-Gemini] Primary key exhausted, using backup key #{i} (ending in ...{backup_key[-4:]})")
                return backup_key
                
            # Check if backup key quota reset time has passed
            if backup_key in self.quota_reset_time:
                if datetime.now() > self.quota_reset_time[backup_key]:
                    self.key_status[backup_key] = 'active'
                    del self.quota_reset_time[backup_key]
                    logger.info(f"[Multi-Gemini] Backup key #{i} quota reset, using it")
                    return backup_key
        
        # If all keys are exhausted, return None to trigger fallback mode
        logger.warning("[Multi-Gemini] All API keys exhausted, triggering intelligent fallback mode")
        return None

    def mark_key_quota_exceeded_legacy(self, api_key):
        """Mark a key as quota exceeded (legacy method)"""
        self.key_status[api_key] = 'quota_exceeded'
        # Set reset time to 1 hour from now (Gemini quota typically resets hourly)
        self.quota_reset_time[api_key] = datetime.now() + timedelta(hours=1)
        logger.warning(f"Key {api_key[:10]}... marked as quota exceeded, reset at {self.quota_reset_time[api_key]}")

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
                    logger.info(f"Quota reset for key {current_key[:10]}...")
                    return current_key
            
            # Move to next key
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            attempts += 1
            
        # If all keys are exhausted, reset the oldest one
        oldest_key = min(self.quota_reset_time.keys(), 
                        key=lambda k: self.quota_reset_time[k], 
                        default=self.api_keys[0])
        self.key_status[oldest_key] = 'active'
        logger.warning(f"All keys exhausted, resetting oldest key: {oldest_key[:10]}...")
        return oldest_key
    
    def mark_key_quota_exceeded(self, api_key):
        """Mark a key as quota exceeded"""
        self.key_status[api_key] = 'quota_exceeded'
        # Set reset time to 1 hour from now (Gemini quota typically resets hourly)
        self.quota_reset_time[api_key] = datetime.now() + timedelta(hours=1)
        logger.warning(f"Key {api_key[:10]}... marked as quota exceeded, reset at {self.quota_reset_time[api_key]}")
    
    def initialize_gemini(self):
        """Initialize Gemini with available API key"""
        current_key = self.get_current_api_key()
        
        if not current_key:
            raise Exception("No Gemini API keys available")
        
        try:
            genai.configure(api_key=current_key)
            
            # Try to initialize a model
            for model_name in self.model_options:
                try:
                    self.current_model = genai.GenerativeModel(model_name)
                    logger.info(f"Multi-Gemini RAG initialized with {model_name} using key ending in ...{current_key[-4:]}")
                    break
                except Exception as model_error:
                    logger.warning(f"Could not initialize {model_name}: {str(model_error)}")
                    continue
            
            if not self.current_model:
                raise Exception("No suitable Gemini models available")
                
        except Exception as e:
            logger.error(f"Error initializing Gemini: {str(e)}")
            raise
    
    def analyze_with_retry(self, image_path, max_retries=None):
        """Analyze image with automatic key rotation on quota exceeded"""
        if self.using_key_manager:
            max_retries = max_retries or api_key_manager.get_status_report()['total_keys']
        else:
            max_retries = max_retries or len(self.api_keys)
            
        for attempt in range(max_retries):
            try:
                current_key = self.get_current_api_key()
                if not current_key:
                    raise Exception("No API keys available")
                
                genai.configure(api_key=current_key)
                
                logger.info(f"🔄 Attempt {attempt + 1} using key ending in ...{current_key[-4:]}")
                
                # Perform the analysis
                result = self.analyze_damage_comprehensive(image_path)
                
                # Record successful request
                self.record_success()
                logger.info(f"✅ Analysis successful with key ending in ...{current_key[-4:]}")
                return result
                
            except Exception as e:
                error_msg = str(e).lower()
                
                # Check if it's a quota error
                if any(keyword in error_msg for keyword in ['quota', 'limit', 'exceeded', '429', 'rate', 'resource_exhausted']):
                    logger.warning(f"🔄 Quota exceeded for key ending in ...{current_key[-4:]}, rotating to next key")
                    
                    # Handle quota exceeded and try to rotate
                    if not self.handle_quota_exceeded():
                        logger.error("❌ All API keys exhausted")
                        break
                    
                    # Reinitialize with new key
                    try:
                        self.initialize_gemini()
                    except Exception as init_error:
                        logger.error(f"❌ Failed to initialize with new key: {str(init_error)}")
                        continue
                        
                    continue
                else:
                    # Non-quota error, propagate it
                    logger.error(f"❌ Non-quota error: {str(e)}")
                    raise
        
        # If all retries exhausted
        total_keys = api_key_manager.get_status_report()['total_keys'] if self.using_key_manager else len(self.api_keys)
        raise Exception(f"All {total_keys} Gemini API keys have exceeded quota. Please wait or add more keys.")
    
    def analyze_damage_comprehensive(self, image_path, include_vehicle_id=True, include_cost_analysis=True):
        """
        Comprehensive damage analysis with sequential API key usage and intelligent fallback
        """
        try:
            logger.info(f"[Multi-Gemini] Starting comprehensive damage analysis for image: {image_path}")
            
            # Load and validate image
            if isinstance(image_path, str):
                image = Image.open(image_path)
                image_name = os.path.basename(image_path)
            else:
                image = image_path
                image_name = "uploaded_image.jpg"
            
            # Try to get an available API key (sequential usage)
            api_key = self.get_current_api_key()
            
            if api_key is None:
                logger.warning("[Multi-Gemini] All API keys exhausted, using intelligent fallback system")
                return self._use_intelligent_fallback(image_path, image_name)
            
            # Configure the model with current API key
            genai.configure(api_key=api_key)
            self.current_model = genai.GenerativeModel('gemini-1.5-flash')
            
            logger.info(f"[Multi-Gemini] Using API key ending in ...{api_key[-4:]} for analysis")
            
            # Enhanced prompt for Indian market
            prompt = f"""
            You are an expert automotive damage assessment specialist with deep knowledge of the Indian automotive market. 
            Analyze this car image comprehensively and provide detailed assessment in the exact JSON format below.
            
            Focus on:
            1. Accurate vehicle identification (make, model, year) - very important for Indian market
            2. Precise damage assessment with confidence levels and detailed damage regions
            3. Realistic repair cost estimates in Indian Rupees (₹) and USD ($)
            4. Insurance recommendations specific to Indian market
            5. Regional cost variations across Indian metros and tier-2 cities
            
            Return ONLY valid JSON in this exact format:
            {{
                "vehicleIdentification": {{
                    "make": "Exact brand name",
                    "model": "Exact model name", 
                    "year": "Year or year range",
                    "trimLevel": "Trim level if identifiable",
                    "bodyStyle": "Sedan/Hatchback/SUV/etc",
                    "engineSize": "Engine size if identifiable",
                    "fuelType": "Petrol/Diesel/CNG/Electric",
                    "marketSegment": "Entry/Premium/Luxury",
                    "idvRange": "Typical IDV range in India",
                    "confidence": 0.85,
                    "identificationDetails": "Detailed explanation of identification"
                }},
                "damageAnalysis": {{
                    "damageType": "Primary damage type",
                    "confidence": 0.9,
                    "severity": "Minor/Moderate/Major",
                    "damageDescription": "Detailed description of damage observed",
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
                    "documentationRequired": ["Required documents for claim"]
                }},
                "safetyAssessment": {{
                    "drivability": "SAFE/CAUTION/UNSAFE",
                    "safetySystemImpacts": ["Any affected safety systems"],
                    "recommendations": ["Safety-related recommendations"]
                }}
            }}
            
            Important: Provide realistic Indian market pricing. For reference:
            - Minor scratches: ₹2,000-₹15,000
            - Dent repair: ₹5,000-₹25,000  
            - Bumper replacement: ₹15,000-₹40,000
            - Paint work: ₹10,000-₹30,000 per panel
            
            For damage regions, provide exact pixel coordinates that correspond to visible damage areas in the image.
            """
            
            # Generate content with retry logic
            try:
                response = self.current_model.generate_content([prompt, image])
                
                if not response or not response.text:
                    raise Exception("Empty response from Gemini model")
                
                # Record successful request
                self.record_success()
                
                logger.info("[Multi-Gemini] Analysis completed successfully")
                logger.debug(f"Response length: {len(response.text)} characters")
                
                # Parse and return JSON response
                try:
                    json_response = json.loads(response.text)
                    return json_response
                except json.JSONDecodeError as json_error:
                    logger.warning(f"[Multi-Gemini] JSON parsing failed: {str(json_error)}")
                    # Try to extract JSON from response text
                    return self._extract_json_from_response(response.text)
                
            except Exception as api_error:
                if "429" in str(api_error) or "quota" in str(api_error).lower():
                    logger.warning(f"[Multi-Gemini] Quota exceeded for key ending in ...{api_key[-4:]}")
                    self.handle_quota_exceeded()
                    
                    # Try next available key
                    next_key = self.get_current_api_key()
                    if next_key and next_key != api_key:
                        logger.info(f"[Multi-Gemini] Retrying with backup key ending in ...{next_key[-4:]}")
                        return self.analyze_damage_comprehensive(image_path, include_vehicle_id, include_cost_analysis)
                    else:
                        logger.warning("[Multi-Gemini] All API keys exhausted, using intelligent fallback")
                        return self._use_intelligent_fallback(image_path, image_name)
                else:
                    logger.error(f"[Multi-Gemini] API error: {str(api_error)}")
                    raise api_error
                    
        except Exception as e:
            logger.error(f"[Multi-Gemini] Comprehensive analysis failed: {str(e)}")
            logger.warning("[Multi-Gemini] Using intelligent fallback due to error")
            return self._use_intelligent_fallback(image_path, image_name if 'image_name' in locals() else "unknown_image.jpg")
    
    def _use_intelligent_fallback(self, image_path, image_name):
        """Use intelligent fallback system when all API keys fail"""
        try:
            from .intelligent_fallback_analyzer import IntelligentFallbackAnalyzer
            
            logger.info("[Multi-Gemini] Initializing intelligent fallback analyzer")
            fallback_analyzer = IntelligentFallbackAnalyzer()
            
            # Use intelligent analysis
            fallback_result = fallback_analyzer.analyze_damage_comprehensive(image_path, image_name)
            
            logger.info("[Multi-Gemini] Intelligent fallback analysis completed successfully")
            return fallback_result
            
        except Exception as fallback_error:
            logger.error(f"[Multi-Gemini] Intelligent fallback failed: {str(fallback_error)}")
            return self._emergency_response(image_name)
    
    def _emergency_response(self, image_name):
        """Emergency response when everything fails"""
        logger.warning("[Multi-Gemini] Using emergency response system")
        
        return {
            "vehicleIdentification": {
                "make": "Unknown",
                "model": "Analysis Required",
                "confidence": 0.5,
                "identificationDetails": "Emergency mode: Professional inspection required"
            },
            "damageAnalysis": {
                "damageType": "Vehicle Damage Detected",
                "confidence": 0.7,
                "severity": "Assessment Required",
                "damageDescription": "Emergency analysis mode: Damage detected, professional assessment recommended",
                "affectedParts": ["Professional assessment required"],
                "identifiedDamageRegions": [{
                    "x": 150, "y": 200, "width": 200, "height": 150,
                    "damageType": "General Damage", "confidence": 0.7, "severity": "unknown"
                }]
            },
            "repairCostAnalysis": {
                "conservative": {"rupees": "₹10,000", "dollars": "$120"},
                "comprehensive": {"rupees": "₹25,000", "dollars": "$300"},
                "laborHours": "Assessment required"
            },
            "recommendations": [
                "System temporarily unavailable - using emergency analysis",
                "Contact professional auto body shop for detailed assessment",
                "Professional inspection strongly recommended"
            ],
            "safetyAssessment": {
                "drivability": "CAUTION",
                "safetySystemImpacts": ["Professional assessment required"],
                "recommendations": ["Professional inspection before driving"]
            },
            "analysisMetadata": {
                "analysisType": "Emergency Response System",
                "reliability": "Limited - Professional assessment required"
            }
        }
    
    def analyze_image(self, image_path):
        """Main analysis method with key rotation"""
        return self.analyze_with_retry(image_path)
    
    def get_status(self):
        """Get status of all API keys"""
        status = {
            'total_keys': len(self.api_keys),
            'active_keys': sum(1 for status in self.key_status.values() if status == 'active'),
            'quota_exceeded_keys': sum(1 for status in self.key_status.values() if status == 'quota_exceeded'),
            'current_key_index': self.current_key_index,
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
    
    def get_api_status(self):
        """Get API status using appropriate method"""
        if self.using_key_manager:
            status = api_key_manager.get_status_report()
            status['system_type'] = 'multi_key_manager'
            return status
        else:
            # Legacy status format
            return {
                'total_keys': len(self.api_keys),
                'current_key_index': self.current_key_index,
                'all_keys_exhausted': all(self.key_status.get(key) == 'quota_exceeded' for key in self.api_keys),
                'system_type': 'multi_key_legacy',
                'keys': [
                    {
                        'index': i,
                        'key_suffix': f"...{key[-4:]}",
                        'is_current': i == self.current_key_index,
                        'quota_exceeded': self.key_status.get(key) == 'quota_exceeded',
                        'available': self.key_status.get(key, 'active') == 'active',
                        'requests_made': 0,  # Not tracked in legacy system
                        'errors': 0  # Not tracked in legacy system
                    }
                    for i, key in enumerate(self.api_keys)
                ]
            }
    
    def reset_quotas(self):
        """Reset all quotas using appropriate method"""
        if self.using_key_manager:
            api_key_manager.reset_all_quotas()
        else:
            # Legacy quota reset
            for key in self.api_keys:
                self.key_status[key] = 'active'
            if key in self.quota_reset_time:
                del self.quota_reset_time[key]
            self.current_key_index = 0
        
        # Reinitialize model
        self.initialize_gemini()
        logger.info("🔄 All API quotas reset and model reinitialized")
    
    def _extract_json_from_response(self, response_text):
        """Extract JSON from Gemini response text when parsing fails"""
        try:
            # Try to find JSON within the response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                logger.warning("[Multi-Gemini] No JSON found in response, using emergency fallback")
                return self._emergency_response("response_parsing_failed.jpg")
        except Exception as e:
            logger.error(f"[Multi-Gemini] JSON extraction failed: {str(e)}")
            return self._emergency_response("json_extraction_failed.jpg")