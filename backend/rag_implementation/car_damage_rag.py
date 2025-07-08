# filepath: d:\Car-damage-prediction\backend\rag_implementation\car_damage_rag.py
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
# First load from the backend/.env file (primary source for API keys)
backend_env = Path(__file__).parent.parent / '.env'
logger.info(f"Loading environment from: {backend_env}")
load_dotenv(backend_env)

# For backward compatibility, also try loading from project root .env
# Note: This won't override values already set by backend/.env
try:
    project_root_env = Path(__file__).parent.parent.parent / '.env'
    if project_root_env.exists():
        logger.info(f"Also loading environment from: {project_root_env}")
        # Use override=False to ensure backend/.env takes precedence
        load_dotenv(project_root_env, override=False)
except Exception as e:
    logger.warning(f"Error loading from project root .env: {str(e)}")
    pass

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
                model_options = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-pro-vision"]
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
- **Ferrari**: Prancing horse badge, distinctive side air vents, quad exhausts, low sports car stance
- **Lamborghini**: Bull logo, aggressive angular design, scissor door hints, hexagonal elements
- **McLaren**: Distinctive dihedral doors, sharp aerodynamic lines, central exhaust

🥇 **LUXURY BRAND MARKERS (₹20L-50L vehicles):**
- **BMW**: Kidney grille shape (two connected ovals), blue/white roundel badge, hofmeister kink window line
  * 3 Series: Smaller kidney grilles, compact sedan proportions
  * 5 Series: Larger kidney grilles, longer wheelbase, executive sedan stance
  * 7 Series: Massive kidney grilles, imposing luxury sedan presence
  * X1/X3/X5/X7: SUV stance with kidney grilles, higher ground clearance
- **Mercedes-Benz**: Three-pointed star, horizontal grille slats, distinctive C-pillar design
  * C-Class: Compact luxury sedan, smaller star grille
  * E-Class: Mid-size luxury, elegant proportions
  * S-Class: Full-size luxury, commanding presence, large star grille
  * GLC/GLE/GLS: SUV variants with star grille, higher stance
- **Audi**: Four interlocking rings, Singleframe hexagonal grille, sharp LED DRL signature
  * A3: Compact proportions, smaller Singleframe grille
  * A4: Mid-size sedan, balanced proportions
  * A6/A8: Large luxury sedans, wide Singleframe grille
  * Q3/Q5/Q7: SUV stance with Singleframe grille
- **Porsche**: 911 silhouette, round headlights, sloping roofline, distinctive rear spoiler
- **Jaguar**: Leaping jaguar, mesh grille pattern, sleek feline proportions

🎖️ **PREMIUM BRAND MARKERS (₹10L-20L vehicles):**
- **Volvo**: Iron mark logo, Thor's hammer LED DRLs, boxy Scandinavian design
- **Lexus**: Spindle grille, "L" logo, sharp origami design language
- **Infiniti**: Oval logo, distinctive shoulder line, V-motion grille
- **Genesis**: Wing logo, crest grille, athletic stance

📱 **MAINSTREAM BRAND MARKERS (₹3L-10L vehicles):**
- **Toyota**: Oval logo with "TOYOTA" text, conservative design, chrome accents
  * Fortuner: Large SUV stance, massive chrome grille
  * Innova Crysta: MPV proportions, chrome grille bar
  * Camry: Executive sedan, sophisticated grille design
  * Etios: Compact sedan, simple grille design
- **Honda**: Bold "H" in geometric shape, solid wing face grille, refined proportions
  * City: Compact sedan, chrome grille accent
  * Amaze: Sub-compact sedan, smaller proportions
  * WR-V: Crossover stance, plastic cladding
  * Civic: Sporty sedan, aggressive front design
- **Hyundai**: Slanted "H" in oval, cascading grille design, fluidic sculpture
  * Creta: Compact SUV, split headlight design, high stance
  * Verna: Compact sedan, cascading grille, sharp lines
  * i20: Premium hatchback, sporty proportions
  * Venue: Micro SUV, compact crossover stance
- **Nissan**: Chrome circle with horizontal bar, V-motion grille, boomerang lights
  * Kicks: Crossover stance, V-motion grille
  * Sunny: Compact sedan, simple proportions
- **Volkswagen**: "VW" letters in circle, horizontal chrome strips, German engineering look
  * Polo: Premium hatchback, solid German design
  * Vento: Compact sedan, refined proportions
  * Tiguan: Premium SUV, bold grille design

🇮🇳 **INDIAN BRAND MARKERS (₹2L-8L vehicles):**
- **Maruti Suzuki**: "S" symbol, simple functional design, compact proportions
  * Swift: Sporty hatchback, floating roof design
  * Baleno: Premium hatchback, crossover-like stance
  * Dzire: Compact sedan, chrome grille bar
  * Vitara Brezza: Compact SUV, rugged cladding
  * Ertiga: MPV proportions, tall stance
  * Alto: Micro car, basic proportions
- **Tata**: Stylized "T" or "TATA" text, impact design language, humanity line
  * Nexon: Compact SUV, distinctive wheel arches
  * Harrier: Mid-size SUV, Land Rover-inspired design
  * Safari: Large SUV, commanding presence
  * Altroz: Premium hatchback, sharp creases
  * Tigor: Compact sedan, coupe-like roofline
- **Mahindra**: Rising sun logo, bold aggressive grille, rugged stance
  * XUV300: Compact SUV, bold grille design
  * XUV700: Mid-size SUV, distinctive C-shaped DRLs
  * Scorpio: Rugged SUV, vertical tail lights
  * Thar: Off-road SUV, distinctive 7-slot grille
  * Bolero: Boxy SUV, utilitarian design

**ADVANCED IDENTIFICATION TECHNIQUES:**

🔍 **BADGE PLACEMENT ANALYSIS:**
- **Hood Badges**: Rolls-Royce Spirit of Ecstasy, Jaguar leaping jaguar, Mercedes star
- **Grille Badges**: BMW roundel, Audi rings, Toyota oval, Hyundai H
- **Rear Badges**: Model names, displacement indicators, trim badges
- **Wheel Center Caps**: Brand logos, model-specific designs

🎨 **COLOR & FINISH ANALYSIS:**
- **Luxury Indicators**: Pearl white, metallic black, champagne gold
- **Premium Colors**: Metallic silver, dark blue, burgundy
- **Standard Colors**: Solid white, silver, black, red
- **Paint Quality**: Mirror finish (luxury), metallic (premium), solid (economy)

⚙️ **TECHNICAL FEATURE IDENTIFICATION:**
- **Wheel Sizes**: 
  * 13-14": Entry segment cars
  * 15-16": Mid-segment cars  
  * 17-18": Premium cars
  * 19-20": Luxury cars
  * 21"+: Ultra-luxury cars
- **Tire Profiles**:
  * High profile (tall sidewall): Budget cars
  * Medium profile: Mainstream cars
  * Low profile (short sidewall): Premium/sports cars

🏭 **MANUFACTURING QUALITY CUES:**
- **Panel Gaps**: Tight gaps indicate premium manufacturing
- **Paint Quality**: Uniform finish, depth of color
- **Chrome Quality**: Bright, mirror-like vs dull finish
- **Plastic Quality**: Solid, well-fitted vs cheap, flexible

**GENERATION-SPECIFIC IDENTIFICATION:**

**MARUTI SUZUKI GENERATIONS:**
- Swift: 1st gen (2005-2010), 2nd gen (2011-2017), 3rd gen (2018+)
- Dzire: 1st gen (2008-2012), 2nd gen (2012-2017), 3rd gen (2017+)
- Baleno: 1st gen (2015-2019), Facelift (2019+)

**HYUNDAI GENERATIONS:**
- Creta: 1st gen (2015-2020), 2nd gen (2020+)
- Verna: 4th gen (2011-2017), 5th gen (2017+)
- i20: 1st gen (2008-2014), 2nd gen (2014-2020), 3rd gen (2020+)

**HONDA GENERATIONS:**
- City: 4th gen (2008-2014), 5th gen (2014-2020), 6th gen (2020+)
- Amaze: 1st gen (2013-2018), 2nd gen (2018+)

**TATA GENERATIONS:**
- Nexon: 1st gen (2017-2020), Facelift (2020+)
- Harrier: 1st gen (2019+)

**BMW GENERATIONS:**
- 3 Series: F30 (2012-2019), G20 (2019+)
- 5 Series: F10 (2010-2017), G30 (2017+)
- 7 Series: F01 (2008-2015), G11 (2015-2022), G70 (2022+)

**MERCEDES GENERATIONS:**
- C-Class: W204 (2007-2014), W205 (2014-2021), W206 (2021+)
- E-Class: W212 (2009-2016), W213 (2016+)
- S-Class: W221 (2005-2013), W222 (2013-2020), W223 (2021+)

**COMMON IDENTIFICATION MISTAKES TO AVOID:**
❌ Don't confuse Hyundai H with Honda H (different shapes)
❌ Don't mistake Tata for Jaguar (similar grille patterns)
❌ Don't confuse BMW kidney with Audi Singleframe
❌ Don't assume luxury based on color alone
❌ Don't ignore clear brand badges in favor of general appearance
❌ Don't guess generation without specific visual cues

**CONFIDENCE BUILDING FACTORS:**
🔸 Clear brand badge visible = +25% confidence
🔸 Distinctive grille pattern = +20% confidence  
🔸 Model-specific design elements = +15% confidence
🔸 Generation-specific features = +15% confidence
🔸 Trim-specific details = +10% confidence
🔸 Multiple confirming angles = +10% confidence
🔸 High image quality = +5% confidence

**MINIMUM REQUIREMENTS FOR PROCEEDING:**
- Must identify BRAND with 85%+ confidence
- Must attempt specific MODEL identification  
- Must estimate YEAR RANGE within 5 years
- Must assess MARKET SEGMENT accurately
- Must list specific CONFIRMING FEATURES

**STEP 2: DETAILED MODEL IDENTIFICATION**
After brand confirmation, identify specific model using comprehensive analysis:

📐 **BODY PROPORTIONS & STANCE ANALYSIS:**
- **Sedan**: 4-door, separate trunk, balanced proportions
  * Compact Sedan (under 4m): Swift Dzire, Amaze, Aspire - short overhangs
  * Mid-size Sedan (4-4.5m): City, Verna, Rapid - balanced proportions
  * Executive Sedan (4.5m+): Camry, Accord, Superb - long wheelbase, imposing stance
- **Hatchback**: Integrated rear door, compact proportions  
  * Micro Hatchback (under 3.5m): Alto K10, Eon - tall, narrow stance
  * Compact Hatchback (3.5-4m): Swift, i20, Polo - sporty proportions
  * Premium Hatchback (4m+): Baleno, Elite i20, Jazz - crossover-like stance
- **SUV/Crossover**: High ground clearance, upright proportions
  * Micro SUV (under 3.7m): KUV100, S-Presso - high seating, compact footprint
  * Compact SUV (under 4m): Nexon, Venue, XUV300 - rugged cladding, spare wheel
  * Mid-size SUV (4-4.5m): Creta, Harrier, XUV700 - commanding presence, large wheels
  * Full-size SUV (4.5m+): Fortuner, Endeavour - massive grille, imposing stance
- **MPV**: Tall proportions, sliding doors, family-oriented design
  * Compact MPV: Ertiga, Marazzo - tall, boxy proportions
  * Premium MPV: Innova, Hexa - refined design, larger dimensions

🔧 **DETAILED GENERATION-SPECIFIC FEATURES:**

**TECHNOLOGY EVOLUTION MARKERS:**
- **Headlight Technology Progression:**
  * Pre-2015: Basic halogen bulbs, simple reflector housings
  * 2015-2018: Xenon/HID introduction, basic LED DRLs
  * 2018-2021: Full LED headlights with signature DRL patterns
  * 2021+: Matrix LED, adaptive beam technology, dynamic turn indicators
  
- **Grille Design Evolution by Major Brands:**
  * **BMW**: Kidney grille size progression - smaller (older), larger (newer)
  * **Mercedes**: Star placement evolution - hood-mounted to grille-integrated
  * **Audi**: Singleframe grille width expansion over generations
  * **Toyota**: Introduction of spindle grille design (2017+ models)
  * **Hyundai**: Cascading grille refinement and size changes
  * **Maruti**: Grille simplification in recent model updates

- **Interior Technology Visible Through Windows:**
  * Pre-2016: Basic music systems, small LCD displays
  * 2016-2019: 7-8 inch touchscreen infotainment systems
  * 2019+: 10+ inch displays with smartphone integration visible

🎨 **COMPREHENSIVE TRIM LEVEL ANALYSIS:**

**ENTRY TRIM INDICATORS:**
- Steel wheels with plastic wheel covers
- Halogen headlights and tail lights
- Basic plastic bumpers without fog lights
- Manual air conditioning controls
- Simple black plastic exterior trim

**MID TRIM INDICATORS:**  
- 15-16 inch alloy wheels with basic designs
- Fog lights in front bumper
- Body-colored outside mirrors (ORVMs)
- Automatic climate control
- Chrome door handles

**HIGH TRIM INDICATORS:**
- 17+ inch designer alloy wheels
- LED daytime running lights (DRLs)
- Chrome accents around grille and windows
- Electric sunroof visible
- Premium audio system speakers visible

**SPORT TRIM INDICATORS:**
- Aggressive front and rear bumpers
- Side skirts and body cladding
- Dual exhaust tips
- Sporty alloy wheel designs
- Lowered suspension stance

**LUXURY TRIM INDICATORS:**
- Premium chrome exterior accents
- High-end alloy wheel designs
- Ambient lighting visible through windows
- Leather seat appointments visible
- Premium paint finishes and colors

🏭 **VEHICLE QUALITY AND MANUFACTURING CUES:**

**LUXURY VEHICLE INDICATORS:**
- **Panel Alignment**: Extremely tight, uniform panel gaps
- **Paint Quality**: Deep, mirror-like finish with multiple coat layers
- **Chrome Quality**: Bright, flawless chrome pieces
- **Wheel Quality**: Forged alloys with intricate designs
- **Glass Quality**: Tinted, possibly acoustic glass

**PREMIUM VEHICLE INDICATORS:**
- **Build Quality**: Solid panel gaps, good paint consistency
- **Material Quality**: Metallic paint finishes, quality plastics
- **Attention to Detail**: Well-integrated design elements

**ECONOMY VEHICLE INDICATORS:**
- **Practical Design**: Functional over aesthetic considerations
- **Basic Materials**: Solid paint, basic plastic trim
- **Cost-Conscious**: Simple designs, standardized components

**STEP 3: YEAR RANGE ESTIMATION**
Use these visual cues for manufacturing year:
- **2024-2025**: Latest LED matrix lights, digital cockpit visible
- **2020-2023**: Modern LED DRLs, updated grille designs
- **2015-2019**: Xenon/LED transition, refined body lines
- **2010-2014**: Halogen/Xenon lights, earlier generation styling
- **Pre-2010**: Halogen lights, older body proportions

**STEP 4: CONFIDENCE VALIDATION**
Cross-reference multiple identification points:
✅ Brand logo/badge visible and confirmed
✅ Grille pattern matches known brand design
✅ Body proportions fit identified model
✅ Wheel design consistent with brand/trim
✅ Overall design language coherent

**INDIAN MARKET SPECIFIC MODELS:**
- **Maruti Suzuki**: Swift, Baleno, Vitara Brezza, Ertiga - compact proportions, simple grille
- **Hyundai**: Creta, Verna, i20, Venue - cascading grille, sharp design lines
- **Tata**: Nexon, Harrier, Safari - impact design, humanity line
- **Mahindra**: XUV300, XUV700, Thar - bold grille, rugged stance
- **Toyota**: Innova Crysta, Fortuner, Camry - conservative design, chrome accents
- **Honda**: City, Amaze, WR-V - solid wing face, refined proportions

REQUIRED OUTPUT FORMAT:

📋 **MANDATORY VEHICLE IDENTIFICATION (NO EXCEPTIONS - MUST BE FIRST):**

**PRIMARY IDENTIFICATION:**
Make: [EXACT BRAND - Must be specific: BMW, Mercedes-Benz, Audi, Rolls-Royce, Bentley, Ferrari, Lamborghini, Porsche, Toyota, Honda, Hyundai, Maruti Suzuki, Tata, Mahindra, Volkswagen, etc.]
Model: [SPECIFIC MODEL - Must include exact model name: 7 Series, S-Class, A8, Wraith, Continental GT, 488 GTB, Huracan, 911, Fortuner, City, Creta, Swift, Nexon, XUV700, etc.]
Generation: [If identifiable - e.g., "G30 generation" for BMW 5 Series, "W222" for Mercedes S-Class]
Year: [Manufacturing year or range - analyze styling cues: 2018-2020, 2021-2024, etc.]
Trim Level: [Variant if visible - Base/LX/VX/ZX/SX/Titanium/Elegance/AMG/M Sport/RS/Black Badge]
Body Style: [Exact classification - Sedan/Coupe/Hatchback/SUV/Crossover/Estate/Convertible/MPV]

**DETAILED CHARACTERISTICS:**
Color: [Primary color with finish type - Metallic Black, Pearl White, Silver Metallic, etc.]
Engine Size: [Based on model knowledge - 1.2L, 2.0L, 3.0L V6, 4.0L V8, 6.6L V12, etc.]
Fuel Type: [Petrol/Diesel/Hybrid/Electric - based on model specifications]
Drivetrain: [FWD/RWD/AWD - based on model knowledge]
Market Segment: [Ultra-Luxury (₹50L+)/Super-Luxury (₹30-50L)/Luxury (₹20-30L)/Premium (₹10-20L)/Mid-Range (₹5-10L)/Economy (₹3-5L)/Entry (Below ₹3L)]

**CONFIDENCE ASSESSMENT:**
Identification Confidence: [Percentage based on visible confirmation points - Target 90%+]
Confirming Features: [List specific features that confirm identification - "BMW kidney grille visible", "Rolls-Royce Spirit of Ecstasy confirmed", "Audi four rings badge clear"]
Generation Confidence: [How certain about specific generation/year]
Trim Confidence: [How certain about trim level]

**MARKET VALUE ANALYSIS:**
Estimated Current Value: ₹[Current market value] ($[USD equivalent])
Typical IDV Range: ₹[Insurance Declared Value range]
Depreciation Rate: [Annual % for this vehicle segment]
Purchase Price When New: ₹[Approximate original price]

**IDENTIFICATION METHODOLOGY:**
Primary Identification Method: [What visual cue confirmed the brand - "Front grille design", "Hood ornament", "Badge placement"]
Secondary Confirmation: [Additional confirming features]
Visual Quality: [Excellent/Good/Fair/Poor - affects confidence]
Visible Angles: [Front/Side/Rear - what views are available]

**MANDATORY IDENTIFICATION CHECKLIST:**
✅ Brand badge/emblem visible and identified
✅ Grille design matches brand pattern
✅ Body proportions consistent with identified model
✅ Headlight design matches generation
✅ Overall design language coherent
✅ Model-specific features confirmed

**IF CONFIDENCE < 85%:**
Request Additional Photos Of: [Specify what angles/features needed for better identification]
Alternative Possibilities: [List other potential makes/models if uncertain]
Uncertainty Factors: [What prevents higher confidence - poor lighting, angle, etc.]

**� CRITICAL VEHICLE IDENTIFICATION PROTOCOL:**

**MANDATORY FIRST STEP - DAMAGE REGION DETECTION:**
Focus primarily on identifying ALL damage regions on the vehicle. Vehicle identification is secondary.

**DAMAGE DETECTION SEQUENCE:**
1. **SCAN ENTIRE VEHICLE** - Systematically examine all visible surfaces
2. **IDENTIFY DAMAGE TYPES** - Scratches, dents, paint damage, rust, cracks
3. **LOCATE DAMAGE POSITIONS** - Precise coordinates for visual overlay
4. **ASSESS DAMAGE SEVERITY** - Minor, moderate, severe, or critical
5. **ESTIMATE REPAIR COSTS** - Based on damage type and severity
6. **BASIC VEHICLE INFO** - Only brand/model if clearly visible for insurance context

**BRAND-SPECIFIC IDENTIFICATION GUIDE:**

**ROLLS-ROYCE IDENTIFICATION:**
- Spirit of Ecstasy hood ornament (most distinctive feature)
- Pantheon grille with vertical slats
- Coach doors (suicide doors) on some models
- Massive, imposing presence
- RR monogram on wheels
- Ultra-premium paint finish

**BMW IDENTIFICATION:**
- Kidney-shaped grille (two oval nostrils)
- Blue and white roundel badge
- Hofmeister kink (window line curve)
- Angel eyes headlights (LED rings)
- Distinctive body lines and proportions

**MERCEDES-BENZ IDENTIFICATION:**
- Three-pointed star badge
- Horizontal grille slats
- Distinctive C-pillar treatment
- Chrome accents around grille
- Elegant, sophisticated styling

**AUDI IDENTIFICATION:**
- Four interlocking rings badge
- Singleframe grille (large hexagonal grille)
- Sharp, angular LED DRL signature
- Clean, minimalist design language
- Quattro badges (if AWD)

**INDIAN BRANDS IDENTIFICATION:**
- **Tata**: Humanity line, impact design, hexagonal grille
- **Mahindra**: Bold, aggressive grille design, rugged stance
- **Maruti Suzuki**: Simple, functional design, compact proportions

**COMMON IDENTIFICATION MISTAKES TO AVOID:**
❌ Don't guess based on general appearance
❌ Don't assume luxury based on color alone
❌ Don't confuse similar grille designs
❌ Don't ignore clear brand badges
❌ Don't rush to damage analysis without proper ID

**CONFIDENCE BUILDING FACTORS:**
🔸 Clear brand badge visible = +20% confidence
🔸 Distinctive grille pattern = +20% confidence
🔸 Model-specific design elements = +15% confidence
🔸 Generation-specific features = +15% confidence
🔸 Trim-specific details = +10% confidence
🔸 Multiple confirming angles = +10% confidence
🔸 High image quality = +10% confidence

**MINIMUM REQUIREMENTS FOR PROCEEDING:**
- Must identify ALL visible damage regions with coordinates
- Must assess damage severity for each region
- Must estimate repair costs for each damage type
- Basic vehicle info (brand/model) only if clearly visible for insurance context

🔍 **ULTRA-PRECISION MULTI-REGION DAMAGE DETECTION:**

**⚠️ HIGHEST PRIORITY: Perform thorough multi-region damage detection across the ENTIRE vehicle surface**

**YOUR PRIMARY TASK IS MULTI-REGION DAMAGE DETECTION - This is what you will be evaluated on**

**CRITICAL INSTRUCTION**: Methodically scan EVERY VISIBLE SURFACE of the vehicle in this exact sequence:
1. Front bumper & grille area (common scratch/impact zones)
2. Hood & front fenders (frequently damaged areas)
3. Driver side door panels & mirror (high scratch risk areas)
4. Passenger side door panels & mirror (parking damage zones)
5. Rear quarter panels (common collision points)
6. Rear bumper & trunk (frequent minor collision damage)
7. Roof & pillars (often overlooked areas)
8. Wheel arches & underbody visible areas (curb damage zones)

**YOU MUST DETECT ALL DAMAGE - EVEN MINOR IMPERFECTIONS - Identify at least 2-5 regions if damage is present:**
- Surface scratches (even faint ones) and scuff marks on any panel
- All dents, dings, and panel deformations no matter how small
- Paint chips, bubbling, fading, or color variation across surfaces
- Any rust spots or early corrosion indicators
- Crack lines or stress marks in plastic, metal, or glass components
- Impact damage signatures on bumpers or body panels
- Uneven wear patterns or degradation on trim pieces
- Panel misalignment, uneven gaps, or poor previous repairs

**If NO damage is visible anywhere on the vehicle, state: "NO DAMAGE DETECTED - Vehicle appears to be in excellent condition across all examined areas"**

**MANDATORY**: If ANY damage IS present, provide this EXACT JSON format with ALL detected regions:

{
"identifiedDamageRegions": [
  {
    "id": "region_1",
    "x": 25,
    "y": 35,
    "width": 15,
    "height": 12,
    "damageType": "Scratch",
    "severity": "minor",
    "confidence": 0.92,
    "damagePercentage": 15,
    "description": "Horizontal surface scratch on front bumper",
    "partName": "Front Bumper",
    "estimatedCost": 4500,
    "repairMethod": "Touch-up paint and polish",
    "affectedComponents": ["Bumper", "Paint"]
  },
  {
    "id": "region_2",
    "x": 60,
    "y": 45,
    "width": 20,
    "height": 18,
    "damageType": "Dent",
    "severity": "moderate",
    "confidence": 0.88,
    "damagePercentage": 35,
    "description": "Impact dent on rear quarter panel",
    "partName": "Rear Quarter Panel",
    "estimatedCost": 12000,
    "repairMethod": "PDR or panel replacement",
    "affectedComponents": ["Body Panel", "Paint"]
  },
  {
    "id": "region_3",
    "x": 40,
    "y": 70,
    "width": 25,
    "height": 15,
    "damageType": "Paint_Damage",
    "severity": "minor",
    "confidence": 0.86,
    "damagePercentage": 20,
    "description": "Paint scuffing on driver side door",
    "partName": "Driver Door",
    "estimatedCost": 8000,
    "repairMethod": "Sand and repaint",
    "affectedComponents": ["Door Panel", "Paint"]
  },
  {
    "id": "region_4",
    "x": 75,
    "y": 30,
    "width": 18,
    "height": 12,
    "damageType": "Rust",
    "severity": "moderate",
    "confidence": 0.83,
    "damagePercentage": 25,
    "description": "Surface rust developing near wheel arch",
    "partName": "Wheel Arch",
    "estimatedCost": 9500,
    "repairMethod": "Rust treatment and refinishing",
    "affectedComponents": ["Fender", "Metal", "Paint"]
  },
  {
    "id": "region_5",
    "x": 20,
    "y": 60,
    "width": 15,
    "height": 10,
    "damageType": "Crack",
    "severity": "severe",
    "confidence": 0.90,
    "damagePercentage": 55,
    "description": "Structural crack in rear light assembly",
    "partName": "Tail Light Assembly",
    "estimatedCost": 15000,
    "repairMethod": "Complete replacement",
    "affectedComponents": ["Tail Light", "Electrical", "Body"]
  }
]
}

**DAMAGE TYPES TO SPECIFICALLY LOOK FOR:**
- Scratches (surface, deep, key scratches)
- Dents (small, large, creases)
- Paint Damage (chips, fading, scuffs, oxidation)
- Rust/Corrosion (spots, surface rust, structural)
- Cracks (plastic bumpers, trim pieces, lights)
- Impact Damage (collision marks, deformation)
- Wear Damage (door handles, trim wear, rubber deterioration)

💰 DETAILED MULTI-DAMAGE COST ASSESSMENT:
**Comprehensive Repair Estimates (Indian Market):**
- Parts Cost: ₹[total for all damages] ($[USD equivalent])
- Labor Cost: ₹[total labor hours × rate] ($[USD equivalent])
- Paint/Materials: ₹[primer, paint, clear coat] ($[USD equivalent])
- **Total Conservative**: ₹[all damages] ($[USD equivalent])
- **Total Comprehensive**: ₹[with premium service] ($[USD equivalent])

**Multi-Damage Service Center Comparison:**
- Authorized Service Center: ₹[amount] ($[USD]) - [list specific benefits for multiple repairs]
- Multi-brand Workshop: ₹[amount] ($[USD]) - [efficiency for multiple damage types]
- Local Garage: ₹[amount] ($[USD]) - [limitations for complex repairs]

🏢 VEHICLE-SPECIFIC MULTI-DAMAGE INSURANCE CLAIM STRATEGY:

**VEHICLE PROFILE ANALYSIS:**
- Vehicle Age: [Current age based on identified year]
- Market Value: ₹[Estimated current market value] ($[USD equivalent])
- Depreciation Rate: [Annual % for this vehicle type]
- Typical IDV: ₹[Insurance Declared Value range]
- Premium Category: [Economy/Mid-range/Premium based on vehicle]

**MULTI-DAMAGE CLAIM RECOMMENDATION**: [CLAIM_RECOMMENDED / CLAIM_NOT_RECOMMENDED / CONDITIONAL_CLAIM]

**COMPREHENSIVE DECISION LOGIC FOR MULTIPLE DAMAGES:**
- Total Estimated Repair Cost: ₹[sum of all damage repairs]
- Vehicle-Appropriate Deductible: ₹[1000-5000 based on IDV]
- NCB Impact for this vehicle: [Loss of 20-50% No Claim Bonus]
- Multiple Damage Efficiency: [Bundled repair cost savings]
- Vehicle Age Factor: [Impact of age on claim decision]
- Parts Availability: [OEM/Aftermarket for all required components]
- Service Network: [Authorized service capability for comprehensive repairs]
- Net Benefit: ₹[total savings if claimed vs cash payment]

**MULTI-DAMAGE SPECIFIC CONSIDERATIONS:**
[For the identified vehicle with multiple damage areas, include:]
- Bundled repair efficiency vs individual fixes
- Paint matching across multiple panels
- Comprehensive inspection benefits for this model
- Total repair timeline for all damages
- Warranty implications for multiple repairs
- Resale value protection with professional multi-point repair

**COMPREHENSIVE RECOMMENDATION REASONING:**
[Detailed explanation tailored to the specific vehicle with multiple damages, considering:
- Total vehicle value vs total repair costs
- Brand reputation and comprehensive repair impact on resale
- Insurance practices for multi-damage claims on this vehicle segment
- Model-specific repair complexity and cost patterns
- Regional availability of parts and comprehensive service capability]

**VEHICLE-TAILORED MULTI-DAMAGE CLAIM STRATEGY IF PROCEEDING:**
1. [Comprehensive documentation requirements for all damage areas]
2. [Recommended service center selection for multi-damage repairs]
3. [Timeline optimization for efficient multi-repair process]
4. [OEM vs aftermarket parts strategy across all damages]
5. [Cashless vs reimbursement for comprehensive repairs]

⚠️ SAFETY & COMPREHENSIVE DRIVABILITY ASSESSMENT:
**Immediate Safety**: [SAFE / CAUTION / UNSAFE - considering all damages]
**Drivability**: [NORMAL / RESTRICTED / AVOID_DRIVING]
**Safety Systems Affected**: [List any safety features impacted by damages]
**Priority Repair Order**: [Which damages require immediate vs deferred attention]
**Urgent Repairs Required**: [Yes/No with details for each damage type]

**CRITICAL INSTRUCTIONS FOR COMPREHENSIVE ANALYSIS:**
- VEHICLE IDENTIFICATION IS MANDATORY - examine all visible clues carefully
- SCAN ENTIRE VEHICLE - most damage analysis reveals 2-5+ affected areas
- Use RELATIVE coordinates (0-100 scale where 0,0 is top-left, 100,100 is bottom-right)
- Provide EXACT JSON format for ALL damage regions found
- Base insurance recommendations on Indian insurance practices AND specific vehicle characteristics
- Consider cumulative repair costs, vehicle age, brand reputation, and multi-damage deductible scenarios
- Include model-specific multi-damage NCB impact calculations and comprehensive resale considerations
- Tailor recommendations to the identified vehicle's market position and comprehensive repair ecosystem
- If vehicle confidence <85%, request additional photos focusing on badges, grilles, and distinctive features
- ALWAYS look for multiple damage areas - single damage findings suggest incomplete analysis""",
                    img
                ],
                generation_config=generation_config,
                safety_settings=safety_settings,
                    )
                    
                    # Record successful API call
                    api_key_manager.record_successful_request()
                    
                    analysis_text = response.text
                    logger.debug(f"Raw analysis text from Gemini: {analysis_text[:500]}...")
                    
                    # Process the analysis further
                    break  # Success, exit retry loop
                    
                except Exception as api_error:
                    error_msg = str(api_error).lower()
                    logger.warning(f"API error on attempt {retry_attempt + 1}: {error_msg}")
                    
                    # Check if this is a quota exceeded error - detect various quota messages
                    quota_indicators = [
                        "quota", "429", "rate limit", "too many requests", 
                        "resource exhausted", "limit exceeded", "try again later",
                        "user location", "user_location_service"  # Location-based quota limits
                    ]
                    
                    if any(indicator in error_msg for indicator in quota_indicators):
                        logger.warning(f"API quota exceeded (detected: {error_msg[:100]}), trying to rotate API key...")
                        api_key_manager.record_quota_exceeded()
                        
                        # Try the next API key if available
                        new_api_key = api_key_manager.get_current_key()
                        if new_api_key and retry_attempt < 2:  # Don't reconfigure on last attempt
                            logger.info(f"Rotated to new API key ending in ...{new_api_key[-4:]}")
                            # Reconfigure Gemini with the new key
                            genai.configure(api_key=new_api_key)
                            
                            # Create a new model instance with preferred model
                            model_options = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-pro-vision"]
                            for model_name in model_options:
                                try:
                                    self.model = genai.GenerativeModel(model_name)
                                    logger.info(f"Successfully rotated to {model_name} with new API key")
                                    break
                                except Exception as model_error:
                                    logger.warning(f"Could not initialize {model_name} with new key: {str(model_error)}")
                                    continue
                            
                            if not self.model:
                                logger.error("Failed to initialize any model with the new API key")
                                raise Exception("Failed to initialize Gemini model after API key rotation")
                        else:
                            logger.error("All API keys have exceeded their quota or maximum retries reached")
                            raise Exception("All API keys have exceeded their quota limits. Please try again later.")
                    else:
                        # For non-quota errors, record the error and retry
                        api_key_manager.record_error(f"analysis_error_{retry_attempt}")
                        if retry_attempt >= 2:  # Last attempt
                            raise  # Re-raise the error if we've exhausted our retries
            
            # Post-processing of analysis text
            confidence = 0.0
            damage_regions = []
            
            # Enhanced logging to debug the response
            logger.info(f"Gemini response received - length: {len(analysis_text)} characters")
            logger.debug(f"Full Gemini response: {analysis_text[:500]}...")  # Log first 500 chars
            
            try:
                # Enhanced parsing for the new response format
                logger.debug("[GEMINI] Parsing enhanced damage analysis response")
                
                # Look for the JSON block with damage regions - multiple patterns
                json_patterns = [
                    r'{\s*"identifiedDamageRegions"\s*:\s*\[(.*?)\]\s*}',
                    r'"identifiedDamageRegions"\s*:\s*\[(.*?)\]',
                    r'identifiedDamageRegions.*?\[(.*?)\]',
                    r'"identifiedDamageRegions":\s*\[(.*?)\]',
                    # More flexible patterns for various formats
                    r'identifiedDamageRegions.*?:\s*\[(.*?)\]',
                    r'damage.*?regions.*?\[(.*?)\]',
                    r'\[\s*\{.*?"damageType".*?\}\s*\]'
                ]
                
                for pattern in json_patterns:
                    match = re.search(pattern, analysis_text, re.DOTALL | re.IGNORECASE)
                    if match:
                        try:
                            # Try to parse the complete JSON structure
                            if pattern == r'\[\s*\{.*?"damageType".*?\}\s*\]':
                                # Direct array match
                                damage_regions = json.loads(match.group(0))
                            else:
                                # Wrapped in identifiedDamageRegions
                                full_json = f'{{"identifiedDamageRegions": [{match.group(1)}]}}'
                                damage_info = json.loads(full_json)
                                damage_regions = damage_info.get('identifiedDamageRegions', [])
                            
                            if damage_regions and isinstance(damage_regions, list):
                                # Validate and clean up damage regions
                                valid_regions = []
                                for region in damage_regions:
                                    if isinstance(region, dict) and 'damageType' in region:
                                        # Ensure required fields exist with defaults
                                        cleaned_region = {
                                            'x': float(region.get('x', 20)),
                                            'y': float(region.get('y', 20)),
                                            'width': float(region.get('width', 30)),
                                            'height': float(region.get('height', 20)),
                                            'damageType': region.get('damageType', 'Unknown Damage'),
                                            'severity': region.get('severity', 'Medium'),
                                            'confidence': float(region.get('confidence', 0.7)),
                                            'description': region.get('description', f"{region.get('damageType', 'Damage')} detected"),
                                            'affectedComponents': region.get('affectedComponents', ['Unknown']),
                                            'repairMethod': region.get('repairMethod', 'Professional assessment required'),
                                            'laborHours': int(region.get('laborHours', 2)),
                                            'partsRequired': region.get('partsRequired', ['Assessment needed'])
                                        }
                                        valid_regions.append(cleaned_region)
                                
                                if valid_regions:
                                    damage_regions = valid_regions
                                    logger.info(f"[GEMINI] Successfully parsed and cleaned {len(damage_regions)} damage regions")
                                    break
                        except json.JSONDecodeError as parse_error:
                            logger.warning(f"[GEMINI] JSON parse error with pattern: {str(parse_error)}")
                            continue
                        except Exception as region_error:
                            logger.warning(f"[GEMINI] Error processing regions: {str(region_error)}")
                            continue
                
                # If no JSON found, try to extract individual damage descriptions and create regions
                if not damage_regions:
                    logger.debug("[GEMINI] No JSON format found, trying to extract damage info from text")
                    
                    # Look for damage indicators in the text
                    damage_keywords = [
                        'scratch', 'scratches', 'dent', 'dents', 'crack', 'cracks',
                        'damage', 'damaged', 'broken', 'bent', 'paint damage',
                        'collision', 'impact', 'wear', 'rust', 'corrosion',
                        'panel damage', 'bumper damage', 'door damage'
                    ]
                    
                    found_damages = []
                    for keyword in damage_keywords:
                        if keyword.lower() in analysis_text.lower():
                            found_damages.append(keyword)
                    
                    if found_damages and "no damage" not in analysis_text.lower():
                        # Create regions based on found damage types
                        for i, damage_type in enumerate(found_damages[:3]):  # Limit to 3 regions
                            # Position regions in different areas
                            positions = [
                                {'x': 25, 'y': 30, 'width': 25, 'height': 20},  # Front area
                                {'x': 60, 'y': 40, 'width': 20, 'height': 25},  # Side area
                                {'x': 40, 'y': 65, 'width': 30, 'height': 15}   # Rear area
                            ]
                            
                            position = positions[i] if i < len(positions) else positions[0]
                            
                            damage_regions.append({
                                **position,
                                "damageType": damage_type.title(),
                                "severity": "Medium",
                                "confidence": 0.7,
                                "description": f"{damage_type.title()} detected in vehicle analysis",
                                "affectedComponents": ["Vehicle Panel"],
                                "repairMethod": "Professional assessment required",
                                "laborHours": 2,
                                "partsRequired": ["Assessment needed"]
                            })
                        
                        logger.info(f"[GEMINI] Created {len(damage_regions)} damage regions from text analysis")
                
                # Extract confidence score with multiple patterns
                confidence_patterns = [
                    r'Confidence:\s*(\d+(?:\.\d+)?)%?',
                    r'confidence[:\s]*(\d+(?:\.\d+)?)%?',
                    r'(\d+(?:\.\d+)?)%\s*confidence',
                    r'CLAIM_RECOMMENDED.*?(\d+(?:\.\d+)?)%',
                    r'Identification Confidence:\s*(\d+(?:\.\d+)?)%?'
                ]
                
                for pattern in confidence_patterns:
                    conf_match = re.search(pattern, analysis_text, re.IGNORECASE)
                    if conf_match:
                        conf_str = conf_match.group(1)
                        confidence = float(conf_str) / 100.0 if float(conf_str) > 1 else float(conf_str)
                        logger.debug(f"[GEMINI] Extracted confidence: {confidence}")
                        break
                
                logger.info(f"[GEMINI] Final parsing results: {len(damage_regions)} regions, confidence: {confidence}")
            
            except Exception as e:
                logger.warning(f"[GEMINI] Failed to parse response: {str(e)}")
                logger.debug(f"[GEMINI] Response text: {analysis_text[:1000]}...")  # Log more for debugging
            
            # Return structured analysis
            return {
                "raw_analysis": analysis_text,
                "timestamp": datetime.now().isoformat(),
                "identifiedDamageRegions": damage_regions,
                "confidence": confidence,
                "status": "success",
                "model": "gemini-1.5-pro"
            }
            
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

    def analyze_car_damage(self, image_path):
        """Analyze car damage from image - wrapper for analyze_image method"""
        try:
            # Set Gemini temperature even lower (0.1) to get more precise results
            generation_config = genai.types.GenerationConfig(
                temperature=0.1,  # Reduced from 0.2
                max_output_tokens=8192,
                candidate_count=1,
                top_p=0.95,
                top_k=40
            )
            
            # Modified to explicitly request MULTIPLE damage regions
            analysis_result = self.analyze_image(image_path)
            
            # Check if we have multiple regions (at least 2)
            has_multiple_regions = (
                'identifiedDamageRegions' in analysis_result and 
                isinstance(analysis_result['identifiedDamageRegions'], list) and
                len(analysis_result['identifiedDamageRegions']) >= 2
            )
            
            # If not, retry once with a more explicit prompt
            if not has_multiple_regions:
                logger.info("First analysis didn't detect multiple regions. Retrying with more explicit instructions.")
                
                # Add an extra prompt prefix to force multi-region detection
                response = self.model.generate_content(
                    contents=[
                        f"""⚠️ PRIORITY INSTRUCTION: You must detect MULTIPLE damage regions in this car image.
                        
                        This vehicle has damage in at least 2-4 different locations. You must identify and provide coordinates
                        for ALL of them, even minor ones. Look carefully at the front, sides, rear, and all body panels.
                        
                        IMPORTANT: You must format your response as JSON with identifiedDamageRegions array containing 
                        AT LEAST 2-4 separate damage regions with different coordinates.
                        
                        {analysis_result.get('raw_analysis', '')}"""
                    ],
                    generation_config=generation_config
                )
                
                # Try to extract multiple regions from the second attempt
                try:
                    text_response = response.text
                    # Search for JSON structure in the response
                    import re
                    import json
                    
                    # Find JSON pattern
                    json_match = re.search(r'\{[\s\S]*?"identifiedDamageRegions"\s*:\s*\[[\s\S]*?\][\s\S]*?\}', text_response)
                    if json_match:
                        try:
                            json_data = json.loads(json_match.group(0))
                            if 'identifiedDamageRegions' in json_data and len(json_data['identifiedDamageRegions']) >= 2:
                                # Found better multi-region data, update the result
                                analysis_result['identifiedDamageRegions'] = json_data['identifiedDamageRegions']
                                logger.info(f"Successfully enhanced analysis with {len(json_data['identifiedDamageRegions'])} damage regions")
                        except json.JSONDecodeError:
                            logger.warning("Could not parse JSON from retry response")
                except Exception as e:
                    logger.warning(f"Error processing retry response: {str(e)}")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error in analyze_car_damage: {str(e)}")
            return self.analyze_image(image_path)  # Fall back to standard analysis
