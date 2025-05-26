# filepath: d:\Car-damage-prediction\backend\rag_implementation\car_damage_rag.py
import os
import logging
import traceback
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class CarDamageRAG:
    def __init__(self):
        """Initialize the Car Damage Analysis system"""
        self.model = None # Initialize model to None
        try:
            # Initialize Gemini with proper error handling
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found in environment! Set this key for full AI functionality.")
                # Don't raise here immediately, allow the object to be created
            else:
                genai.configure(api_key=api_key)
                # Try different model versions
                model_options = ["gemini-1.5-flash", "gemini-pro-vision", "gemini-1.5-pro-vision"]
                for model_name in model_options:
                    try:
                        self.model = genai.GenerativeModel(model_name)
                        logger.info(f"Car Damage RAG system initialized with Gemini {model_name}")
                        break # Exit loop on successful initialization
                    except Exception as specific_error:
                        logger.warning(f"Could not initialize {model_name}: {str(specific_error)}")
                
                if not self.model:
                    # If loop finishes and model is still None, no suitable model was found
                    raise Exception("No suitable Gemini vision models available with the provided API key.")
                
        except Exception as e:
            logger.error(f"Error during Car Damage Analysis initialization: {str(e)}")
            logger.error(traceback.format_exc())
            # Re-raise the exception only if model wasn't successfully initialized
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
            
            # Generate analysis using Gemini with enhanced professional prompt
            logger.info("Sending image to Gemini for analysis")
            response = self.model.generate_content([
                """🚗 ADVANCED AUTOMOTIVE INTELLIGENCE & INSURANCE OPTIMIZATION EXPERT

You are a certified automotive damage assessor with 25+ years of experience specializing in vehicle identification, damage analysis, and insurance claim optimization across all major Indian and international insurance providers.

**ABSOLUTE PRIMARY DIRECTIVE: ACCURATE VEHICLE IDENTIFICATION IS PARAMOUNT.** All subsequent analysis (damage, cost, insurance) is ENTIRELY DEPENDENT on the correctness of this initial step. Misidentification will lead to completely erroneous and useless results.

Your **first and foremost task** is to execute the fully car details like what type of car it is and the car model and when it came to market and then 🔍 CRITICAL VEHICLE IDENTIFICATION PROTOCOL.
**Proceed to subsequent analysis steps (Damage Assessment, Repair Cost, Insurance, etc.) ONLY IF vehicle identification confidence is HIGH (80% or above).**
If vehicle identification confidence is MEDIUM or LOW (below 80%), you MUST strictly follow the 🚨 INTELLIGENT FALLBACK PROTOCOL and **DO NOT proceed with any other analysis.** Your response should then primarily consist of the fallback request.

🔍 CRITICAL VEHICLE IDENTIFICATION PROTOCOL:
MANDATORY IDENTIFICATION CHECKLIST:
- Make & Brand: Identify exact manufacturer (e.g., Maruti Suzuki, Tata Motors, Mahindra, Hyundai, Honda, Toyota, Rolls Royce, BMW, Mercedes-Benz). Be precise.
- Model Name: Specific model (e.g., Swift, Nexon, XUV300, i20, City, Innova, Phantom, 3 Series, C-Class). Be precise.
- Generation/Year: Model generation and approximate manufacturing year.
- Trim Level: Variant (LXI, VXI, ZXI, Base, Mid, Top, etc.), if discernible.
- Body Style: Hatchback, Sedan, SUV, MUV, Coupe, Convertible etc.
- Market Launch Year: When this model was first introduced in the Indian market (if applicable) or globally.
- Current Market Position: Active/Discontinued, general popularity/segment status.

IDENTIFICATION CONFIDENCE ASSESSMENT:
- HIGH CONFIDENCE (80-100%): Clear and unambiguous identification possible.
- MEDIUM CONFIDENCE (50-79%): Partial identification with some uncertainty.
- LOW CONFIDENCE (20-49%): Limited identification, multiple possibilities.
- UNABLE TO IDENTIFY (<20%): Cannot reliably identify vehicle.

🚨 INTELLIGENT FALLBACK PROTOCOL:
IF VEHICLE IDENTIFICATION CONFIDENCE IS BELOW 80%, PROVIDE:
"🔄 ENHANCED ANALYSIS REQUEST:
For more accurate vehicle identification and precise insurance recommendations, please provide:
• Front angle view (showing grille, headlights, badge)
• Rear angle view (showing taillights, badge, model name)
• Side profile view (showing overall proportions and design)
• Interior dashboard view (showing instrument cluster, infotainment)
• Engine bay view (if accessible)
• Any visible badges, emblems, or model designations

With additional angles, I can provide:
✓ Exact model year and variant identification
✓ Precise market value assessment
✓ Variant-specific insurance recommendations
✓ Accurate parts pricing and availability
✓ Model-specific common damage patterns"

**🛑 NO DAMAGE SCENARIO (POST-IDENTIFICATION):**
**IF vehicle identification confidence is HIGH (80% or above) AND you meticulously examine the image and determine there is NO discernible damage to the vehicle, your primary response should be:**
1.  The full vehicle identification details (Make, Model, Year, etc. as per the checklist).
2.  A clear statement such as: "The vehicle appears to be in good condition with no visible damage detected in the provided image."
3.  **DO NOT proceed to Damage Assessment, Repair Cost, or Insurance sections if no damage is found.** You may optionally provide general market value for the identified, undamaged vehicle if requested or appropriate.

📋 COMPREHENSIVE DAMAGE ASSESSMENT (ONLY IF VEHICLE IDENTIFIED AND DAMAGE PRESENT):
DAMAGE MAPPING & CLASSIFICATION:
- Location: Use precise descriptions referencing vehicle-specific body panels
- Type: Categorize as scratch (surface/deep), dent (minor/major), crack, paint transfer, structural deformation
- Severity Scale: 
  * LEVEL 1: Cosmetic only, no functional impact
  * LEVEL 2: Minor functional concern, safe to drive
  * LEVEL 3: Moderate damage, potential safety implications
  * LEVEL 4: Severe damage, immediate professional assessment required
  * LEVEL 5: Critical/structural damage, unsafe to operate

📍 DAMAGE REGION IDENTIFICATION (JSON OUTPUT):
If damage is identified AND vehicle identification confidence is HIGH (>=80%), include a JSON array named "identifiedDamageRegions" in your response. Each object in the array should represent a distinct damaged area on the vehicle image and follow this structure:
{
  "x": <number>,      // x-coordinate of the top-left corner of the bounding box (percentage of image width, 0-100)
  "y": <number>,      // y-coordinate of the top-left corner of the bounding box (percentage of image height, 0-100)
  "width": <number>,  // width of the bounding box (percentage of image width, 0-100)
  "height": <number>, // height of the bounding box (percentage of image height, 0-100)
  "damageType": "<string>", // e.g., "Scratch", "Dent", "Crack"
  "confidence": <number> // Confidence score for this specific region's damage type (0.0 - 1.0)
}
Example:
"identifiedDamageRegions": [
  { "x": 10, "y": 25, "width": 15, "height": 5, "damageType": "Deep Scratch", "confidence": 0.92 },
  { "x": 50, "y": 60, "width": 20, "height": 10, "damageType": "Major Dent", "confidence": 0.85 }
]
If no specific regions can be confidently identified despite overall damage detection, provide an empty array: "identifiedDamageRegions": []

VEHICLE-SPECIFIC ANALYSIS:
- Model-specific vulnerable areas and common damage patterns
- Brand-specific parts availability and pricing
- Manufacturer warranty implications
- Recall or known issues related to damage area

💰 DETAILED REPAIR COST ANALYSIS (VEHICLE-SPECIFIC AND DAMAGE-SPECIFIC):
**Cost estimations MUST be realistic and appropriate for the IDENTIFIED VEHICLE'S MAKE, MODEL, and MARKET SEGMENT (e.g., luxury, budget, mid-range). A minor scratch on a budget car should not cost the same as on a luxury car. Ensure costs reflect this accurately.**
COMPONENT BREAKDOWN:
- Parts Required: List specific parts with OEM vs aftermarket options for identified vehicle
- Model-Specific Labor: Brand-specific repair complexity and time requirements
- Paint & Materials: Color code matching and vehicle-specific paint requirements
- Specialty Services: Model-specific calibration, programming, or alignment needs

COST ESTIMATION (DUAL CURRENCY):
- Conservative Estimate: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Comprehensive Estimate: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Premium/Show Quality: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Labor Rate Assumptions: ₹XXX-₹XXX/hour ($XX-$XX/hour USD)

VEHICLE-SPECIFIC MARKET CONTEXT:
- Authorized dealer vs independent garage pricing for this model
- Parts availability timeline for identified vehicle
- Model-specific insurance considerations
- Resale value impact assessment

🏢 COMPREHENSIVE INSURANCE CLAIM STRATEGY BY PROVIDER:

VEHICLE-BASED INSURANCE ANALYSIS:
- Vehicle Age vs Insurance Coverage: How vehicle age affects claim eligibility
- Model-Specific IDV: Current Insured Declared Value for identified vehicle
- Brand Preference: Insurer preferences for different manufacturers

MAJOR INDIAN INSURANCE PROVIDERS ANALYSIS:
🏛️ ICICI LOMBARD GENERAL INSURANCE:
   - Network garage availability for identified vehicle brand
   - Cashless claim limits and procedures
   - Model-specific settlement patterns
   - Recommended action for this vehicle type

🏛️ BAJAJ ALLIANZ GENERAL INSURANCE:
   - Vehicle brand partnerships and preferred rates
   - Claim settlement ratio for this vehicle category
   - Network garage quality for identified brand
   - Recommended strategy

🏛️ HDFC ERGO GENERAL INSURANCE:
   - Model-specific claim experience
   - Technology integration (app-based claims)
   - Preferred garage network for this vehicle
   - Digital claim process suitability

🏛️ NEW INDIA ASSURANCE:
   - Government insurer advantages for this vehicle type
   - Traditional approach vs modern vehicles
   - Regional presence and accessibility
   - Recommended for this vehicle profile

🏛️ TATA AIG GENERAL INSURANCE:
   - Tata vehicle advantages (if applicable)
   - Technology adoption and claim process
   - Network coverage for this vehicle brand
   - Specialized services

🏛️ ORIENTAL INSURANCE:
   - Traditional insurer approach
   - Regional network strength
   - Vehicle category preferences
   - Recommended scenarios

🏛️ RELIANCE GENERAL INSURANCE:
   - Digital-first approach compatibility
   - Network garage coverage
   - Quick settlement reputation
   - Model-specific recommendations

PROVIDER RECOMMENDATION MATRIX:
Based on identified vehicle, provide:
- PRIMARY RECOMMENDATION: Best insurer for this vehicle type with reasoning
- SECONDARY OPTIONS: Alternative insurers with pros/cons
- AVOID: Insurers less suitable for this vehicle category
- NEGOTIATION POINTS: Vehicle-specific advantages to highlight

CLAIM OPTIMIZATION STRATEGY:
- Vehicle-specific documentation requirements
- Model-based repair authorization process
- Brand-specific parts approval procedures
- Timeline optimization for this vehicle type

⚠️ SAFETY & COMPLIANCE ASSESSMENT:
VEHICLE-SPECIFIC SAFETY STATUS:
- Drivability: SAFE / CAUTION / UNSAFE (based on vehicle type and damage)
- Model-specific safety system impacts
- Manufacturer recall or safety notice relevance
- Vehicle age and safety equipment assessment

📊 MARKET VALUE & DEPRECIATION ANALYSIS:
- Current market value for identified vehicle (year, variant, condition)
- Depreciation impact of damage
- Resale value considerations
- Insurance payout vs repair cost analysis

🎯 EXECUTIVE SUMMARY & RECOMMENDATIONS:
- VEHICLE IDENTIFICATION SUMMARY: Confidence level and details.
- **IF NO DAMAGE:** State "No damage detected. Vehicle in good condition." and omit damage-related summaries.
- **IF DAMAGE PRESENT:**
    - PRIMARY INSURANCE RECOMMENDATION: Best provider for this vehicle with specific reasons
    - FINANCIAL STRATEGY: Optimal financial approach (claim vs self-pay)
    - REPAIR STRATEGY: Best approach for this vehicle type
    - LONG-TERM IMPACT: 5-year cost and value implications

FORMAT REQUIREMENTS:
- Start with vehicle identification confidence level
- If confidence <80%, include fallback request prominently
- Provide costs in ₹ (primary) and $ (reference)
- Include vehicle-specific insights throughout
- Give clear insurance provider rankings for identified vehicle
- Include actionable next steps based on vehicle type""",
                img
            ])
            
            # Process and structure the response
            analysis = {
                "raw_analysis": response.text,
                "timestamp": datetime.now().isoformat()
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error during image analysis: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def get_repair_recommendations(self, damage_analysis):
        """Get repair recommendations based on damage analysis"""
        try:
            # Use Gemini to generate repair recommendations
            response = self.model.generate_content([
                f"""Based on this damage analysis, provide specific repair recommendations:
                {damage_analysis['raw_analysis']}
                
                Focus on:
                1. Step-by-step repair process
                2. Required tools and materials
                3. Estimated costs
                4. Time required
                5. Professional vs DIY options
                
                Format as a clear, actionable plan.""",
            ])
            
            return {
                "recommendations": response.text,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating repair recommendations: {str(e)}")
            logger.error(traceback.format_exc())
            raise
            
    def analyze_query(self, query, context=""):
        """Analyze a text query about car damage using Gemini"""
        if not self.model:
            logger.error("Gemini model is not initialized.")
            raise Exception("Gemini model is not initialized. Please check API key and model availability.")

        try:
            logger.info(f"Analyzing query: {query}")
            
            # Generate analysis using Gemini
            logger.info("Sending query to Gemini for analysis")
            response = self.model.generate_content([
                f"""You are an expert car damage analyst with extensive experience in the Indian automotive market. Answer the following question about car damage:
                
                Question: {query}
                
                {f"Additional context: {context}" if context else ""}
                
                IMPORTANT: Provide costs primarily in Indian Rupees (₹) with USD equivalent in parentheses.
                Consider Indian market conditions including:
                - Local vs imported parts pricing
                - Authorized service centers vs local garages
                - Regional price variations (Metro cities vs Tier-2/3 cities)
                - Indian insurance practices (Cashless, NCB, IDV)
                - Network garage policies
                
                Provide a detailed, accurate, and helpful response based on your expertise in car damage assessment,
                repair, and insurance specific to Indian market conditions. Include specific cost details and recommendations."""
            ])
            
            # Mock sources for demonstration purposes
            # In a real implementation, you would retrieve relevant sources from a knowledge base
            sources = [
                {
                    "title": "Car Damage Assessment Guide",
                    "content": "Excerpt from comprehensive guide on identifying and assessing various types of car damage.",
                    "url": "https://example.com/car-damage-guide"
                },
                {
                    "title": "Repair Cost Estimation Manual",
                    "content": "Information about standard repair costs for different types of vehicle damage.",
                    "url": "https://example.com/repair-costs"
                }
            ]
            
            return {
                "answer": response.text,
                "sources": sources,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error during query analysis: {str(e)}")
            logger.error(traceback.format_exc())
            raise
