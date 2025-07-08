import os
import logging
import traceback
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv
from datetime import datetime
import io
import math
import re
import json
import sys
from pathlib import Path

# Add backend directory to path if needed
backend_dir = str(Path(__file__).parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import APIKeyManager after ensuring path is correct
from api_key_manager import api_key_manager

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class CarDamageRAG:
    def __init__(self):
        """Initialize the Car Damage Analysis system"""
        self.model = None
        try:
            # Get API key from APIKeyManager instead of directly from env var
            api_key = api_key_manager.get_current_key()
            
            if not api_key:
                logger.warning("No valid API key available! Set GEMINI_API_KEY and GEMINI_BACKUP_KEYS for full AI functionality.")
            else:
                # Configure Gemini with the current API key
                genai.configure(api_key=api_key)
                
                # Try available models in order of preference
                model_options = ["gemini-1.5-pro", "gemini-pro-vision", "gemini-1.5-pro-vision"]
                for model_name in model_options:
                    try:
                        self.model = genai.GenerativeModel(model_name)
                        logger.info(f"Car Damage RAG system initialized with Gemini {model_name}")
                        # Record successful initialization
                        api_key_manager.record_successful_request()
                        break
                    except Exception as specific_error:
                        logger.warning(f"Could not initialize {model_name}: {str(specific_error)}")
                        # Check if this is a quota error and handle accordingly
                        if "quota" in str(specific_error).lower() or "429" in str(specific_error):
                            api_key_manager.record_quota_exceeded()
                            # Try again with the next key if available
                            api_key = api_key_manager.get_current_key()
                            if api_key:
                                genai.configure(api_key=api_key)
                            else:
                                logger.error("All API keys have exceeded their quota.")
                                break
                        else:
                            api_key_manager.record_error(f"model_init_{model_name}")
                
                if not self.model:
                    raise Exception("No suitable Gemini vision models available with the provided API keys.")
        except Exception as e:
            logger.error(f"Error during Car Damage Analysis initialization: {str(e)}")
            logger.error(traceback.format_exc())
            if not self.model:
                raise
    
    def analyze_image(self, image_path):
        """Analyze car damage from image using Gemini Vision AI"""
        if not self.model:
            logger.error("Gemini model is not initialized.")
            raise Exception("Gemini model is not initialized. Please check API key and model availability.")

        try:
            logger.info(f"Analyzing image: {image_path}")
            
            # Load and process image
            img = Image.open(image_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Optimize image size if needed (max 4MB for Gemini)
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG', quality=85, optimize=True)
            if len(img_byte_arr.getvalue()) > 4000000:
                ratio = math.sqrt(4000000 / len(img_byte_arr.getvalue()))
                new_size = tuple(int(dim * ratio) for dim in img.size)
                img = img.resize(new_size, Image.LANCZOS)
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format='JPEG', quality=85, optimize=True)
            
            # Configure Gemini for optimal analysis
            generation_config = genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=8192,
                candidate_count=1,
                top_p=0.95,
                top_k=40
            )
            
            # Try with up to 3 different API keys if needed
            for retry_attempt in range(3):
                # Set safety settings for the request
                safety_settings = [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_ONLY_HIGH"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_ONLY_HIGH"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_ONLY_HIGH"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_ONLY_HIGH"
                    }
                ]
                
                try:
                    # Send analysis request with enhanced prompt
                    logger.info(f"Sending image to Gemini for analysis (attempt {retry_attempt + 1})")
                    
                    response = self.model.generate_content(
                        contents=[
                        """🚗 MASTER AUTOMOTIVE IDENTIFICATION SPECIALIST & DAMAGE EXPERT

You are the world's leading automotive identification expert with 25+ years specializing in PRECISE VEHICLE IDENTIFICATION across ALL global manufacturers. Your primary mission is ACCURATE VEHICLE IDENTIFICATION before any damage analysis.

🎯 **ABSOLUTE PRIORITY: VEHICLE IDENTIFICATION FIRST**

**METHODOLOGY: SYSTEMATIC VISUAL ANALYSIS**

**STEP 1: MANDATORY BRAND IDENTIFICATION SCAN**
Examine EVERY visible brand indicator with forensic precision:

🏆 **ULTRA-LUXURY BRAND MARKERS (₹50L+ vehicles):**
- **Rolls-Royce**: Spirit of Ecstasy hood ornament (unmistakable), Pantheon grille pattern, coach door handles, "RR" monogram wheels
- **Bentley**: Flying "B" emblem, distinctive matrix grille, Continental/Bentayga body proportions
- **Lamborghini**: Aggressive geometric lines, scissor doors, hexagonal shapes, Y-shaped lighting elements
- **Ferrari**: Prancing horse emblem, distinctive intake grilles, aggressive nose, classic shapes
- **Mercedes-Maybach**: Maybach lettering, upright emblem on hood, dual-tone paint, distinctive massive grille

🛠️ **PRIMARY BRAND IDENTIFICATION (European, Japanese, American, Korean, Chinese makes):**
- **Mercedes-Benz**: Three-pointed star emblem (hood/grille), distinctive grille pattern
- **BMW**: Kidney-shaped grille (distinctive), roundel emblem, Hofmeister kink window design
- **Audi**: Four interlocking rings emblem, distinctive single-frame grille design
- **Volkswagen**: VW circular emblem, conservative styling with precise panel gaps
- **Toyota**: Oval-shaped logo with stylized "T", distinctive brand-specific grille patterns
- **Honda**: "H" emblem, solid reliable design language, distinctive light patterns
- **Ford**: Blue oval with Ford script, distinctive front grille design
- **Chevrolet**: Bowtie emblem, distinctive American styling cues
- **Hyundai**: Stylized "H" emblem, flowing Sensuous Sportiness design language
- **Kia**: Oval emblem with "KIA" script, Tiger Nose grille design pattern
- **MG**: Octagonal emblem with MG script, British-inspired design cues

**STEP 2: MODEL IDENTIFICATION**
- **Precise Model Name**: C-Class, 3 Series, A4, Camry, Civic, etc.
- **Identify Generation/Year**: "This appears to be a 2019-2022 Mercedes C-Class (W205 facelift)"

**STEP 3: DAMAGE ASSESSMENT**

**DETAILED DAMAGE CATEGORIZATION SYSTEM:**

1. **Primary Damage Type** (MUST choose one primary category):
   - Scratches/Paint Damage (surface level)
   - Dents/Deformation (structural but limited)
   - Collision Damage (major structural)
   - Glass/Light Damage (windows/lights)
   - Accessory Damage (non-essential components)

2. **Severity Assessment** (MUST assign one severity level):
   - Minor: Simple repair, no structural issues, purely cosmetic
   - Moderate: Requires professional repair, but no major structural concerns
   - Severe: Significant structural damage requiring extensive repair
   - Critical: Safety-compromising damage, may affect vehicle operation

3. **Repair Complexity** (MUST provide one assessment):
   - DIY Repairable: Can be fixed at home with basic tools
   - Simple Professional Repair: Quick shop visit, basic parts
   - Complex Professional Repair: Extended shop time, specialized tools
   - Component Replacement Required: Full part replacement needed
   - Potential Total Loss: Cost of repair may exceed vehicle value

**STEP 4: DETAILED RESPONSE FORMAT**

```json
{
  "vehicleIdentification": {
    "make": "BRAND",
    "model": "MODEL",
    "year": "ESTIMATED_YEAR_RANGE",
    "confidence": 0.XX,
    "identificationMarkers": ["VISUAL_ELEMENT_1", "VISUAL_ELEMENT_2"]
  },
  "damageAnalysis": {
    "primaryDamageType": "ONE_PRIMARY_TYPE_FROM_ABOVE",
    "severity": "SEVERITY_LEVEL",
    "repairComplexity": "COMPLEXITY_LEVEL",
    "affectedComponents": ["COMPONENT_1", "COMPONENT_2"],
    "structuralDamagePresent": true/false
  },
  "repairAssessment": {
    "estimatedRepairCost": "COST_RANGE_INR",
    "estimatedRepairTime": "TIME_ESTIMATE",
    "specializedToolsRequired": true/false,
    "recommendedAction": "RECOMMENDATION"
  },
  "insuranceClaim": {
    "claimRecommended": true/false,
    "claimJustification": "JUSTIFICATION",
    "depreciationImpact": "IMPACT_DESCRIPTION",
    "additionalNotes": "ANY_SPECIAL_NOTES"
  }
}
```

CRITICAL INSTRUCTIONS:
1. ALWAYS correctly identify the vehicle make and model FIRST
2. Be PRECISE and SPECIFIC about damage type, location, and severity
3. Provide detailed reasoning for your assessment
4. Your response MUST include valid JSON as shown above
5. Add additional text explanation after your JSON if needed
""",
                            img
                        ],
                        generation_config=generation_config,
                        safety_settings=safety_settings
                    )
                    
                    # Record successful API call
                    api_key_manager.record_successful_request()
                    
                    logger.info("✅ Gemini analysis completed successfully!")
                    
                    # Process and return response
                    result_text = response.text
                    return result_text
                    
                except Exception as api_error:
                    error_msg = str(api_error).lower()
                    logger.error(f"Error during analysis (attempt {retry_attempt + 1}): {error_msg}")
                    
                    # Check if this is a quota exceeded error
                    if "quota" in error_msg or "429" in error_msg or "rate limit" in error_msg:
                        logger.warning("API quota exceeded, trying to rotate API key...")
                        api_key_manager.record_quota_exceeded()
                        
                        # Try to get a new API key
                        new_api_key = api_key_manager.get_current_key()
                        if new_api_key:
                            logger.info("Successfully rotated to new API key, retrying analysis")
                            genai.configure(api_key=new_api_key)
                        else:
                            logger.error("All API keys have exceeded their quota")
                            raise Exception("All API keys have exceeded their quota limits. Please try again later.")
                    else:
                        # For non-quota errors, record the error and retry
                        api_key_manager.record_error(error_type="analysis_error")
                        
                        # If this is the last attempt, re-raise the error
                        if retry_attempt == 2:
                            raise
            
            # If all retries failed without raising a specific exception
            raise Exception("Failed to analyze image after multiple attempts")
                    
        except Exception as e:
            logger.error(f"❌ Error analyzing image: {str(e)}")
            logger.error(traceback.format_exc())
            raise
