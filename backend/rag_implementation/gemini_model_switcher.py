# Gemini Model Switcher - Try Different Models When Quota Exceeded
import os
import logging
import traceback
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv
from datetime import datetime
import io

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class GeminiModelSwitcher:
    def __init__(self):
        """Initialize Gemini with model switching capability"""
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise Exception("GEMINI_API_KEY not found in environment!")
        
        genai.configure(api_key=self.api_key)
        
        # Different Gemini models with different quotas
        self.models = [
            {"name": "gemini-1.5-pro-latest", "quota_type": "pro"},
            {"name": "gemini-1.5-pro", "quota_type": "pro"},
            {"name": "gemini-1.5-flash-latest", "quota_type": "flash"},
            {"name": "gemini-1.5-flash", "quota_type": "flash"},
            {"name": "gemini-pro-vision", "quota_type": "vision"},
            {"name": "gemini-1.5-pro-002", "quota_type": "pro"},
            {"name": "gemini-1.5-flash-002", "quota_type": "flash"},
        ]
        
        self.current_model_index = 0
        self.current_model = None
        self.initialize_model()
    
    def initialize_model(self):
        """Initialize the current model"""
        for i in range(len(self.models)):
            try:
                model_info = self.models[self.current_model_index]
                self.current_model = genai.GenerativeModel(model_info["name"])
                logger.info(f"Initialized Gemini model: {model_info['name']}")
                return True
            except Exception as e:
                logger.warning(f"Failed to initialize {model_info['name']}: {str(e)}")
                self.current_model_index = (self.current_model_index + 1) % len(self.models)
        
        raise Exception("No Gemini models could be initialized")
    
    def switch_to_next_model(self):
        """Switch to the next available model"""
        original_index = self.current_model_index
        
        for _ in range(len(self.models)):
            self.current_model_index = (self.current_model_index + 1) % len(self.models)
            
            try:
                model_info = self.models[self.current_model_index]
                self.current_model = genai.GenerativeModel(model_info["name"])
                logger.info(f"Switched to Gemini model: {model_info['name']}")
                return True
            except Exception as e:
                logger.warning(f"Failed to switch to {model_info['name']}: {str(e)}")
                continue
        
        # If we've tried all models, reset to original
        self.current_model_index = original_index
        return False
    
    def analyze_with_model_switching(self, image_path, max_retries=None):
        """Analyze image with automatic model switching on quota exceeded"""
        if max_retries is None:
            max_retries = len(self.models)
        
        for attempt in range(max_retries):
            try:
                current_model_info = self.models[self.current_model_index]
                logger.info(f"Attempt {attempt + 1} using {current_model_info['name']}")
                
                # Perform the analysis
                result = self.analyze_damage_comprehensive(image_path)
                
                logger.info(f"Analysis successful with {current_model_info['name']}")
                return result
                
            except Exception as e:
                error_msg = str(e).lower()
                
                # Check if it's a quota error
                if any(keyword in error_msg for keyword in ['quota', 'limit', 'exceeded', '429', 'rate']):
                    logger.warning(f"Quota exceeded for {current_model_info['name']}, trying next model")
                    
                    if not self.switch_to_next_model():
                        logger.error("All models exhausted, no more models to try")
                        break
                    continue
                else:
                    # Non-quota error, propagate it
                    logger.error(f"Non-quota error with {current_model_info['name']}: {str(e)}")
                    raise
        
        # If all retries exhausted
        raise Exception(f"All {len(self.models)} Gemini models have exceeded quota or failed")
    
    def analyze_damage_comprehensive(self, image_path, include_vehicle_id=True, include_cost_analysis=True):
        """
        Comprehensive damage analysis
        """
        try:
            logger.info(f"[Gemini-Switcher] Starting analysis for image: {image_path}")
            
            # Load and validate image
            if isinstance(image_path, str):
                image = Image.open(image_path)
            else:
                image = image_path
            
            # Enhanced prompt
            prompt = f"""
            You are an expert automotive damage assessment specialist with deep knowledge of the Indian automotive market. 
            Analyze this car image comprehensively and provide detailed assessment.
            
            Focus on:
            1. Accurate vehicle identification (make, model, year)
            2. Precise damage assessment with confidence levels
            3. Realistic repair cost estimates in Indian Rupees (₹) and USD ($)
            4. Insurance recommendations specific to Indian market
            
            Provide a detailed analysis with:
            - Vehicle identification details
            - Damage type and severity
            - Affected parts list
            - Repair cost estimates (conservative and comprehensive)
            - Insurance claim recommendations
            - Safety assessment
            
            Be specific about Indian market pricing and include regional variations for metro vs tier-2 cities.
            """
            
            # Generate content
            response = self.current_model.generate_content([prompt, image])
            
            if not response or not response.text:
                raise Exception("Empty response from Gemini model")
            
            logger.info("[Gemini-Switcher] Analysis completed successfully")
            return response.text
            
        except Exception as e:
            logger.error(f"[Gemini-Switcher] Analysis failed: {str(e)}")
            raise Exception(f"Gemini analysis failed: {str(e)}")
    
    def analyze_image(self, image_path):
        """Main analysis method with model switching"""
        return self.analyze_with_model_switching(image_path)
    
    def get_current_model_info(self):
        """Get current model information"""
        return self.models[self.current_model_index]