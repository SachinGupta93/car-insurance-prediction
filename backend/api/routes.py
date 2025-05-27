from flask import Blueprint, request, jsonify
from PIL import Image
import io
import os
import traceback
import sys
from datetime import datetime
import logging
import google.generativeai as genai
import re
import json
from backend.auth.user_auth import UserAuth
from backend.rag_implementation.car_damage_rag import CarDamageRAG
from backend.rag_implementation.insurance_rag import InsuranceRAG
from backend.rag_implementation.vehicle_rag import VehicleRAG
from functools import wraps
from backend.config.firebase_config import verify_firebase_token

# Configure logging with more detail
logging.basicConfig(level=logging.DEBUG, 
                    format='%(asctime)s - [%(name)s] - [%(levelname)s] - %(message)s')
logger = logging.getLogger('api.routes')

# Create blueprint
api = Blueprint('api', __name__)

# Initialize components with try/except to catch initialization errors
try:
    logger.info("Initializing RAG components...")
    car_damage_rag = CarDamageRAG()
    logger.info("CarDamageRAG initialized successfully")
    insurance_rag = InsuranceRAG()
    logger.info("InsuranceRAG initialized successfully")
    vehicle_rag = VehicleRAG()
    logger.info("VehicleRAG initialized successfully")
except Exception as e:
    logger.error(f"Error initializing components: {str(e)}")
    logger.error(traceback.format_exc())

def parse_ai_response_to_damage_result(raw_analysis: str) -> dict:
    """Parse AI response into structured DamageResult format"""
    logger.info("[PARSER] Starting AI response parsing")
    logger.debug(f"[PARSER] Raw analysis length: {len(raw_analysis)} characters")
    
    # Check if this is a fallback response requesting more images
    if "ENHANCED ANALYSIS REQUEST" in raw_analysis or "LOW CONFIDENCE" in raw_analysis:
        logger.info("[PARSER] Detected fallback response - vehicle identification confidence is low")
        
        # Extract confidence if mentioned
        confidence_match = re.search(r'LOW CONFIDENCE \((\d+)%\)', raw_analysis)
        confidence = float(confidence_match.group(1)) / 100 if confidence_match else 0.3
        
        return {
            "damageType": "Vehicle Identification Required",
            "confidence": confidence,
            "description": raw_analysis,
            "damageDescription": f"Vehicle identification needed - current confidence: {int(confidence * 100)}%",
            "recommendations": [
                "Please provide additional photos showing vehicle from different angles",
                "Include front view showing grille and headlights",
                "Include rear view showing taillights and badges", 
                "Include side profile view",
                "Ensure images are clear and well-lit"
            ],
            "identifiedDamageRegions": [],
            "vehicleIdentification": {
                "make": "Identification Required",
                "model": "Additional Photos Needed", 
                "year": "Unknown",
                "trimLevel": "Unknown",
                "bodyStyle": "Unknown",
                "confidence": confidence,
                "identificationDetails": "Low confidence vehicle identification - please provide additional angles"
            },
            "enhancedRepairCost": {
                "conservative": {"rupees": "₹0", "dollars": "$0"},
                "comprehensive": {"rupees": "₹0", "dollars": "$0"},
                "laborHours": "Pending vehicle identification",
                "breakdown": {"parts": {"rupees": "₹0", "dollars": "$0"}, 
                            "labor": {"rupees": "₹0", "dollars": "$0"}, 
                            "materials": {"rupees": "₹0", "dollars": "$0"}},
                "serviceTypeComparison": {"authorizedCenter": {"rupees": "₹0", "dollars": "$0"},
                                        "multiBrandCenter": {"rupees": "₹0", "dollars": "$0"},
                                        "localGarage": {"rupees": "₹0", "dollars": "$0"}},
                "regionalVariations": {"metro": {"rupees": "₹0", "dollars": "$0"},
                                     "tier1": {"rupees": "₹0", "dollars": "$0"},
                                     "tier2": {"rupees": "₹0", "dollars": "$0"}}
            },
            "insuranceProviders": [],
            "regionalInsights": {
                "metroAdvantages": ["Better identification tools available", "More specialized expertise"],
                "tier2Considerations": ["May need to consult regional experts"],
                "regionalCostVariations": {"rupees": "₹0", "dollars": "$0"}
            },
            "marketAnalysis": {
                "currentValue": {"rupees": "₹0", "dollars": "$0"},
                "depreciationImpact": "Cannot assess without vehicle identification",
                "resaleConsiderations": ["Vehicle identification required for market analysis"]
            },
            "claimStrategy": {
                "recommended": "IDENTIFICATION_REQUIRED",
                "reasoning": "Accurate vehicle identification is required for proper damage and cost assessment",
                "timelineOptimization": "Provide additional vehicle photos first",
                "documentationRequired": ["Clear vehicle photos from multiple angles", "Badge/emblem photos", "Interior dashboard view"]
            },
            "safetyAssessment": {
                "drivability": "ASSESSMENT_PENDING",
                "safetySystemImpacts": ["Assessment pending vehicle identification"],
                "recommendations": ["Provide additional vehicle photos for complete safety assessment"]
            }
        }
    
    def extract_damage_regions(text: str) -> list:
        """Extract damage regions from AI response"""
        try:
            # Look for JSON array in various formats
            patterns = [
                r'"identifiedDamageRegions"\s*:\s*(\[[\s\S]*?\])',
                r'identifiedDamageRegions\s*:\s*(\[[\s\S]*?\])',
                r'"identifiedDamageRegions":\s*(\[[\s\S]*?\])'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    try:
                        regions = json.loads(match.group(1))
                        if isinstance(regions, list):
                            # Validate structure
                            valid_regions = []
                            for region in regions:
                                if (isinstance(region, dict) and 
                                    all(k in region for k in ['x', 'y', 'width', 'height', 'damageType', 'confidence'])):
                                    valid_regions.append(region)
                            return valid_regions
                    except json.JSONDecodeError:
                        continue
            
            logger.warning("[PARSER] No valid damage regions found in AI response")
            return []
        except Exception as e:
            logger.error(f"[PARSER] Error extracting damage regions: {str(e)}")
            return []
    
    def extract_vehicle_identification(text: str) -> dict:
        """Extract vehicle identification from AI response"""
        try:
            logger.debug("[PARSER] Extracting vehicle identification")
            
            # Look for vehicle information patterns
            make_patterns = [
                r'Make[:\s]*([^\n,]+)',
                r'Brand[:\s]*([^\n,]+)',
                r'Manufacturer[:\s]*([^\n,]+)'
            ]
            
            model_patterns = [
                r'Model[:\s]*([^\n,]+)',
                r'Model Name[:\s]*([^\n,]+)'
            ]
            
            year_patterns = [
                r'Year[:\s]*(\d{4})',
                r'Model Year[:\s]*(\d{4})',
                r'Manufacturing Year[:\s]*(\d{4})'
            ]
            
            confidence_patterns = [
                r'(?:confidence|certainty)[:\s]*(\d+(?:\.\d+)?%?)',
                r'HIGH CONFIDENCE[:\s]*\((\d+)%\)',
                r'MEDIUM CONFIDENCE[:\s]*\((\d+)%\)',
                r'LOW CONFIDENCE[:\s]*\((\d+)%\)'
            ]
            
            # Extract make/brand
            make = "Unknown"
            for pattern in make_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    make = match.group(1).strip()
                    logger.debug(f"[PARSER] Found make: {make}")
                    break
            
            # Extract model
            model = "Unknown"
            for pattern in model_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    model = match.group(1).strip()
                    logger.debug(f"[PARSER] Found model: {model}")
                    break
            
            # Extract year
            year = "Unknown"
            for pattern in year_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    year = match.group(1).strip()
                    logger.debug(f"[PARSER] Found year: {year}")
                    break
            
            # Extract confidence
            confidence = 0.8  # Default
            for pattern in confidence_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    conf_str = match.group(1).replace('%', '')
                    confidence = float(conf_str) / 100 if float(conf_str) > 1 else float(conf_str)
                    logger.debug(f"[PARSER] Found confidence: {confidence}")
                    break
            
            # Extract trim level
            trim_match = re.search(r'(?:trim|variant)[:\s]*([^\n,]+)', text, re.IGNORECASE)
            trim_level = trim_match.group(1).strip() if trim_match else "Unknown"
            
            # Extract body style
            body_style_match = re.search(r'body style[:\s]*([^\n,]+)', text, re.IGNORECASE)
            body_style = body_style_match.group(1).strip() if body_style_match else "Unknown"
            
            # Create identification details
            if confidence > 0.8:
                details = f"High confidence identification: {make} {model}"
            elif confidence > 0.5:
                details = f"Medium confidence identification: {make} {model}"
            else:
                details = f"Low confidence identification - additional photos recommended"
            
            return {
                "make": make,
                "model": model,
                "year": year,
                "trimLevel": trim_level,
                "bodyStyle": body_style,
                "confidence": confidence,
                "identificationDetails": details
            }
        except Exception as e:
            logger.error(f"[PARSER] Error extracting vehicle identification: {str(e)}")
            return {
                "make": "Unknown", "model": "Unknown", "year": "Unknown",
                "trimLevel": "Unknown", "bodyStyle": "Unknown", 
                "confidence": 0.5, "identificationDetails": "Could not parse vehicle information"
            }
    
    def extract_repair_costs(text: str) -> dict:
        """Extract repair cost information from AI response"""
        try:
            logger.debug("[PARSER] Extracting repair costs from AI response")
            
            # Find all rupee and dollar amounts in the text
            rupee_matches = re.findall(r'₹[\d,]+(?:-\s*₹[\d,]+)?', text)
            dollar_matches = re.findall(r'\$[\d,]+(?:-\s*\$[\d,]+)?', text)
            
            logger.debug(f"[PARSER] Found {len(rupee_matches)} rupee amounts and {len(dollar_matches)} dollar amounts")
            
            # Extract specific cost categories if mentioned
            conservative_rupees = "₹0"
            comprehensive_rupees = "₹0"
            conservative_dollars = "$0"
            comprehensive_dollars = "$0"
            
            # Look for conservative/basic estimates
            conservative_match = re.search(r'conservative[^₹]*₹([\d,]+)', text, re.IGNORECASE)
            if conservative_match:
                conservative_rupees = f"₹{conservative_match.group(1)}"
                logger.debug(f"[PARSER] Found conservative estimate: {conservative_rupees}")
            elif len(rupee_matches) > 0:
                conservative_rupees = rupee_matches[0]
                logger.debug(f"[PARSER] Using first rupee amount as conservative: {conservative_rupees}")
            
            # Look for comprehensive estimates
            comprehensive_match = re.search(r'comprehensive[^₹]*₹([\d,]+)', text, re.IGNORECASE)
            if comprehensive_match:
                comprehensive_rupees = f"₹{comprehensive_match.group(1)}"
                logger.debug(f"[PARSER] Found comprehensive estimate: {comprehensive_rupees}")
            elif len(rupee_matches) > 1:
                comprehensive_rupees = rupee_matches[1]
                logger.debug(f"[PARSER] Using second rupee amount as comprehensive: {comprehensive_rupees}")
            else:
                comprehensive_rupees = conservative_rupees
            
            # Extract USD amounts similarly
            conservative_usd_match = re.search(r'conservative[^$]*\$([\d,]+)', text, re.IGNORECASE)
            if conservative_usd_match:
                conservative_dollars = f"${conservative_usd_match.group(1)}"
            elif len(dollar_matches) > 0:
                conservative_dollars = dollar_matches[0]
            
            comprehensive_usd_match = re.search(r'comprehensive[^$]*\$([\d,]+)', text, re.IGNORECASE)
            if comprehensive_usd_match:
                comprehensive_dollars = f"${comprehensive_usd_match.group(1)}"
            elif len(dollar_matches) > 1:
                comprehensive_dollars = dollar_matches[1]
            else:
                comprehensive_dollars = conservative_dollars
            
            # Extract labor hours
            labor_match = re.search(r'(\d+(?:-\d+)?)\s*hours?', text, re.IGNORECASE)
            labor_hours = labor_match.group(1) + " hours" if labor_match else "2-4 hours"
            
            # Extract parts cost if mentioned
            parts_rupee_match = re.search(r'parts[^₹]*₹([\d,]+)', text, re.IGNORECASE)
            parts_rupees = f"₹{parts_rupee_match.group(1)}" if parts_rupee_match else "₹2,000"
            
            parts_dollar_match = re.search(r'parts[^$]*\$([\d,]+)', text, re.IGNORECASE)
            parts_dollars = f"${parts_dollar_match.group(1)}" if parts_dollar_match else "$25"
            
            # Extract labor cost if mentioned
            labor_rupee_match = re.search(r'labor[^₹]*₹([\d,]+)', text, re.IGNORECASE)
            labor_rupees = f"₹{labor_rupee_match.group(1)}" if labor_rupee_match else "₹3,000"
            
            labor_dollar_match = re.search(r'labor[^$]*\$([\d,]+)', text, re.IGNORECASE)
            labor_dollars = f"${labor_dollar_match.group(1)}" if labor_dollar_match else "$40"
            
            return {
                "conservative": {"rupees": conservative_rupees, "dollars": conservative_dollars},
                "comprehensive": {"rupees": comprehensive_rupees, "dollars": comprehensive_dollars},
                "laborHours": labor_hours,
                "breakdown": {
                    "parts": {"rupees": parts_rupees, "dollars": parts_dollars},
                    "labor": {"rupees": labor_rupees, "dollars": labor_dollars},
                    "materials": {"rupees": "₹500", "dollars": "$5"}
                },
                "serviceTypeComparison": {
                    "authorizedCenter": {"rupees": comprehensive_rupees, "dollars": comprehensive_dollars},
                    "multiBrandCenter": {"rupees": conservative_rupees, "dollars": conservative_dollars},
                    "localGarage": {"rupees": conservative_rupees, "dollars": conservative_dollars}
                },
                "regionalVariations": {
                    "metro": {"rupees": comprehensive_rupees, "dollars": comprehensive_dollars},
                    "tier1": {"rupees": conservative_rupees, "dollars": conservative_dollars},
                    "tier2": {"rupees": conservative_rupees, "dollars": conservative_dollars}
                }
            }
        except Exception as e:
            logger.error(f"[PARSER] Error extracting repair costs: {str(e)}")
            return {
                "conservative": {"rupees": "₹3,000", "dollars": "$40"},
                "comprehensive": {"rupees": "₹5,000", "dollars": "$65"},
                "laborHours": "2-4 hours",
                "breakdown": {"parts": {"rupees": "₹2,000", "dollars": "$25"}, 
                            "labor": {"rupees": "₹2,500", "dollars": "$30"}, 
                            "materials": {"rupees": "₹500", "dollars": "$5"}},
                "serviceTypeComparison": {"authorizedCenter": {"rupees": "₹5,000", "dollars": "$65"},
                                        "multiBrandCenter": {"rupees": "₹4,000", "dollars": "$50"},
                                        "localGarage": {"rupees": "₹3,000", "dollars": "$40"}},
                "regionalVariations": {"metro": {"rupees": "₹4,500", "dollars": "$55"},
                                     "tier1": {"rupees": "₹4,000", "dollars": "$50"},
                                     "tier2": {"rupees": "₹3,500", "dollars": "$45"}}
            }
    
    def determine_damage_type_and_confidence(text: str) -> tuple:
        """Determine primary damage type and confidence from AI response"""
        text_lower = text.lower()
        
        # Check for "no damage" scenarios first
        no_damage_indicators = ['no damage', 'good condition', 'no visible damage', 'appears to be in good condition']
        if any(indicator in text_lower for indicator in no_damage_indicators):
            return "No Damage", 0.9
        
        # Common damage types with keywords
        damage_types = [
            (['scratch', 'scratches', 'scratched'], 'Scratch'),
            (['dent', 'dents', 'dented'], 'Dent'), 
            (['crack', 'cracks', 'cracked'], 'Crack'),
            (['bump', 'bumper'], 'Bumper Damage'),
            (['paint', 'painting'], 'Paint Damage'),
            (['collision', 'impact'], 'Impact Damage')
        ]
        
        for keywords, damage_type in damage_types:
            if any(keyword in text_lower for keyword in keywords):
                # Try to extract confidence
                confidence_match = re.search(r'confidence[:\s]*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
                confidence = float(confidence_match.group(1)) / 100 if confidence_match else 0.85
                return damage_type, confidence
        
        return "General Damage", 0.8
    
    def extract_recommendations(text: str) -> list:
        """Extract recommendations from AI response"""
        try:
            recommendations = []
            lines = text.split('\n')
            
            for line in lines:
                line = line.strip()
                if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                    recommendation = re.sub(r'^[•\-*]\s*', '', line).strip()
                    if recommendation and len(recommendation) > 10:  # Filter out very short items
                        recommendations.append(recommendation)
            
            if not recommendations:
                # Fallback recommendations
                recommendations = [
                    "Professional assessment recommended",
                    "Document damage with clear photos",
                    "Get multiple repair estimates",
                    "Consider insurance claim if repair cost exceeds deductible"
                ]
            
            return recommendations[:5]  # Limit to 5 recommendations
        except Exception as e:
            logger.error(f"[PARSER] Error extracting recommendations: {str(e)}")
            return ["Professional assessment recommended", "Document damage thoroughly"]
    
    try:
        # Extract main damage information
        damage_type, confidence = determine_damage_type_and_confidence(raw_analysis)
        vehicle_id = extract_vehicle_identification(raw_analysis)
        repair_costs = extract_repair_costs(raw_analysis)
        damage_regions = extract_damage_regions(raw_analysis)
        recommendations = extract_recommendations(raw_analysis)
        
        # Use the full AI response as description
        description = raw_analysis.strip()
        
        # Handle "No Damage" scenario
        if damage_type == "No Damage":
            structured_result = {
                "damageType": "No Damage",
                "confidence": confidence,
                "description": "The vehicle appears to be in good condition with no visible damage detected.",
                "damageDescription": "No damage detected",
                "recommendations": [
                    "Vehicle appears to be in good condition",
                    "Regular maintenance is recommended", 
                    "Consider preventive measures to maintain condition"
                ],
                "identifiedDamageRegions": [],
                "vehicleIdentification": vehicle_id,
                "enhancedRepairCost": {
                    "conservative": {"rupees": "₹0", "dollars": "$0"},
                    "comprehensive": {"rupees": "₹0", "dollars": "$0"},
                    "laborHours": "0 hours",
                    "breakdown": {"parts": {"rupees": "₹0", "dollars": "$0"}, 
                                "labor": {"rupees": "₹0", "dollars": "$0"}, 
                                "materials": {"rupees": "₹0", "dollars": "$0"}},
                    "serviceTypeComparison": {"authorizedCenter": {"rupees": "₹0", "dollars": "$0"},
                                            "multiBrandCenter": {"rupees": "₹0", "dollars": "$0"},
                                            "localGarage": {"rupees": "₹0", "dollars": "$0"}},
                    "regionalVariations": {"metro": {"rupees": "₹0", "dollars": "$0"},
                                         "tier1": {"rupees": "₹0", "dollars": "$0"},
                                         "tier2": {"rupees": "₹0", "dollars": "$0"}}
                },
                "insuranceProviders": [],
                "regionalInsights": {
                    "metroAdvantages": [],
                    "tier2Considerations": [],
                    "regionalCostVariations": {"rupees": "₹0", "dollars": "$0"}
                },
                "marketAnalysis": {
                    "currentValue": {"rupees": "₹5,00,000", "dollars": "$6,000"},
                    "depreciationImpact": "No impact - vehicle in good condition",
                    "resaleConsiderations": ["Maintain current condition", "Document regular maintenance"]
                },
                "claimStrategy": {
                    "recommended": "NO_CLAIM_NEEDED",
                    "reasoning": "No damage detected, no insurance claim necessary",
                    "timelineOptimization": "N/A",
                    "documentationRequired": []
                },
                "safetyAssessment": {
                    "drivability": "SAFE",
                    "safetySystemImpacts": [],
                    "recommendations": ["Continue normal operation"]
                }
            }
        else:
            # Regular damage scenario
            structured_result = {
                "damageType": damage_type,
                "confidence": confidence,
                "description": description,
                "damageDescription": f"{damage_type} detected with {int(confidence * 100)}% confidence",
                "recommendations": recommendations,
                "identifiedDamageRegions": damage_regions,
                "vehicleIdentification": vehicle_id,
                "enhancedRepairCost": repair_costs,
                "insuranceProviders": [
                    {
                        "name": "Bajaj Allianz General Insurance",
                        "recommendation": "PRIMARY",
                        "pros": ["Strong network coverage", "Good claim settlement ratio"],
                        "cons": ["Slightly higher premiums"],
                        "vehicleSpecificAdvantages": ["Wide garage network"],
                        "claimExperience": "Generally smooth process",
                        "networkCoverage": "Extensive across India",
                        "digitalCapabilities": "Mobile app available",
                        "recommendedForVehicle": True
                    }
                ],
                "regionalInsights": {
                    "metroAdvantages": ["Better repair facilities", "Faster parts availability"],
                    "tier2Considerations": ["Verify technician expertise", "Parts may take longer"],
                    "regionalCostVariations": repair_costs["regionalVariations"]["metro"]
                },
                "marketAnalysis": {
                    "currentValue": {"rupees": "₹8,00,000", "dollars": "$9,600"},
                    "depreciationImpact": "Minor impact if repaired professionally",
                    "resaleConsiderations": ["Document professional repair", "Quality affects resale value"]
                },
                "claimStrategy": {
                    "recommended": "CONDITIONAL",
                    "reasoning": "Consider repair cost vs deductible and NCB impact",
                    "timelineOptimization": "Get multiple quotes before proceeding",
                    "documentationRequired": ["Damage photos", "Repair estimates", "Police report if applicable"]
                },
                "safetyAssessment": {
                    "drivability": "SAFE",
                    "safetySystemImpacts": ["Monitor for warning indicators"],
                    "recommendations": ["Professional inspection recommended"]
                }
            }
        
        logger.info(f"[PARSER] Successfully parsed AI response into structured format: {damage_type}")
        return structured_result
        
    except Exception as e:
        logger.error(f"[PARSER] Error parsing AI response: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return fallback structure
        return {
            "damageType": "Analysis Error",
            "confidence": 0.0,
            "description": "Error occurred while analyzing the image",
            "damageDescription": "Could not complete analysis",
            "recommendations": ["Please try uploading the image again", "Ensure image is clear and well-lit"],
            "identifiedDamageRegions": [],
            "vehicleIdentification": {"make": "Unknown", "model": "Unknown", "year": "Unknown", "trimLevel": "Unknown", "bodyStyle": "Unknown", "confidence": 0.0, "identificationDetails": "Analysis failed"},
            "enhancedRepairCost": {"conservative": {"rupees": "₹0", "dollars": "$0"}, "comprehensive": {"rupees": "₹0", "dollars": "$0"}, "laborHours": "Unknown", "breakdown": {"parts": {"rupees": "₹0", "dollars": "$0"}, "labor": {"rupees": "₹0", "dollars": "$0"}, "materials": {"rupees": "₹0", "dollars": "$0"}}, "serviceTypeComparison": {"authorizedCenter": {"rupees": "₹0", "dollars": "$0"}, "multiBrandCenter": {"rupees": "₹0", "dollars": "$0"}, "localGarage": {"rupees": "₹0", "dollars": "$0"}}, "regionalVariations": {"metro": {"rupees": "₹0", "dollars": "$0"}, "tier1": {"rupees": "₹0", "dollars": "$0"}, "tier2": {"rupees": "₹0", "dollars": "$0"}}},
            "insuranceProviders": [],
            "regionalInsights": {"metroAdvantages": [], "tier2Considerations": [], "regionalCostVariations": {"rupees": "₹0", "dollars": "$0"}},
            "marketAnalysis": {"currentValue": {"rupees": "₹0", "dollars": "$0"}, "depreciationImpact": "Unknown", "resaleConsiderations": []},
            "claimStrategy": {"recommended": "UNKNOWN", "reasoning": "Analysis failed", "timelineOptimization": "Retry analysis", "documentationRequired": []},
            "safetyAssessment": {"drivability": "UNKNOWN", "safetySystemImpacts": [], "recommendations": ["Retry analysis with clear image"]}
        }

def firebase_auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Check for development mode
        dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
        
        # In development mode, check for dev bypass header
        if dev_mode and request.headers.get('X-Dev-Auth-Bypass') == 'true':
            logger.warning("DEV MODE: Authentication bypassed with X-Dev-Auth-Bypass header")
            request.user = {
                'uid': 'dev-user-123',
                'email': 'dev@example.com',
                'name': 'Development User',
                'dev_mode': True
            }
            return f(*args, **kwargs)
            
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]
        
        if not token:
            # In dev mode, provide a mock user even without token
            if dev_mode:
                logger.warning("DEV MODE: No token provided, using mock user")
                request.user = {
                    'uid': 'dev-user-no-token',
                    'email': 'dev-no-token@example.com',
                    'name': 'Development User (No Token)',
                    'dev_mode': True
                }
                return f(*args, **kwargs)
            
            return jsonify({'error': 'Firebase token is missing'}), 401
        
        try:
            # Verify Firebase token
            decoded_token = verify_firebase_token(token)
            request.user = decoded_token
        except Exception as e:
            return jsonify({'error': str(e)}), 401
        
        return f(*args, **kwargs)
    return decorated

@api.route('/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        user_auth = UserAuth(request.app.config['db_ref'])
        
        user_id = user_auth.create_user(
            email=data['email'],
            password=data['password'],
            user_data={
                'name': data.get('name'),
                'phone': data.get('phone'),
                'role': 'user'
            }
        )
        
        return jsonify({'message': 'User created successfully', 'user_id': user_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/auth/login', methods=['POST'])
def login():
    """Login a user"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = UserAuth.login(email, password)
        if user:
            return jsonify(user), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Authentication failed'}), 500

@api.route('/auth/verify', methods=['POST', 'OPTIONS'])
def verify_token():
    """Verify a Firebase token"""
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return '', 204
    
    # Check for development mode flag
    dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
    
    try:
        # Get token from request body or header
        token = None
        
        # First try JSON body
        if request.is_json:
            data = request.get_json()
            token = data.get('token')
            logger.debug("Extracted token from request body")
        
        # Then try Authorization header
        if not token and 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                logger.debug("Extracted token from Authorization header")
        
        # Finally try query params (not recommended for production)
        if not token and request.args.get('token'):
            token = request.args.get('token')
            logger.debug("Extracted token from query parameters")
        
        if not token:
            logger.error("Token verification failed: No token provided")
            
            # In dev mode, we can allow auth bypass with a special header
            if dev_mode and request.headers.get('X-Dev-Auth-Bypass') == 'true':
                logger.warning("DEV MODE: Authentication bypassed with X-Dev-Auth-Bypass header")
                mock_user = {
                    'uid': 'dev-user-123',
                    'email': 'dev@example.com',
                    'name': 'Development User',
                    'dev_mode': True
                }
                return jsonify({'valid': True, 'user': mock_user, 'dev_mode': True}), 200
                
            return jsonify({'error': 'No token provided - Include token in request body, Authorization header, or query parameter'}), 400
        
        # Debug token format
        logger.debug(f"Token format check: {token[:10]}...{token[-10:]} (Length: {len(token)})")
        
        # Special case for development mode with a magic development token
        if dev_mode and token == 'DEVELOPMENT_TOKEN_FOR_TESTING':
            logger.warning("DEV MODE: Using development test token")
            mock_user = {
                'uid': 'dev-user-123',
                'email': 'dev@example.com',
                'name': 'Development User',
                'dev_mode': True
            }
            return jsonify({'valid': True, 'user': mock_user, 'dev_mode': True}), 200
            
        # Verify token
        try:
            decoded_token = verify_firebase_token(token)
            
            if decoded_token:
                logger.info(f"Token verified successfully for user: {decoded_token.get('uid', 'unknown')}")
                return jsonify({'valid': True, 'user': decoded_token}), 200
            else:
                logger.error("Token verification failed: Invalid token")
                
                # In development mode, provide a workaround for auth failures
                if dev_mode:
                    logger.warning("DEV MODE: Firebase authentication failed, but proceeding with mock user")
                    mock_user = {
                        'uid': 'dev-user-fallback',
                        'email': 'dev-fallback@example.com',
                        'name': 'Development Fallback User',
                        'dev_mode': True
                    }
                    return jsonify({
                        'valid': True, 
                        'user': mock_user, 
                        'dev_mode': True,
                        'warning': 'Using development fallback authentication'
                    }), 200
                
                return jsonify({'valid': False, 'error': 'Invalid token'}), 401
        except ValueError as token_error:
            # Specific Firebase token validation errors
            logger.error(f"Token validation error: {str(token_error)}")
            
            # In development mode, provide a workaround
            if dev_mode:
                logger.warning("DEV MODE: Firebase token validation error, but proceeding with mock user")
                mock_user = {
                    'uid': 'dev-user-error',
                    'email': 'dev-error@example.com',
                    'name': 'Development Error User',
                    'dev_mode': True
                }
                return jsonify({
                    'valid': True, 
                    'user': mock_user, 
                    'dev_mode': True,
                    'warning': f'Using development authentication. Original error: {str(token_error)}'
                }), 200
            
            return jsonify({'valid': False, 'error': str(token_error)}), 401
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        logger.error(f"Error trace: {traceback.format_exc()}")
        
        # In development mode, provide a workaround for exceptions
        if dev_mode:
            logger.warning(f"DEV MODE: Exception during token verification, but proceeding with mock user: {str(e)}")
            mock_user = {
                'uid': 'dev-user-exception',
                'email': 'dev-exception@example.com',
                'name': 'Development Exception User',
                'dev_mode': True
            }
            return jsonify({
                'valid': True, 
                'user': mock_user, 
                'dev_mode': True,
                'warning': f'Using development authentication due to exception: {str(e)}'
            }), 200
            
        return jsonify({'valid': False, 'error': str(e)}), 500

@api.route('/profile', methods=['GET'])
@firebase_auth_required
def get_profile():
    """Get user profile"""
    try:
        user_auth = UserAuth(request.app.config['db_ref'])
        profile = user_auth.get_user_profile(request.user['uid'])
        return jsonify(profile), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/profile', methods=['PUT'])
@firebase_auth_required
def update_profile():
    """Update user profile"""
    try:
        data = request.get_json()
        user_auth = UserAuth(request.app.config['db_ref'])
        user_auth.update_user_profile(request.user['uid'], data)
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/vehicles', methods=['POST'])
@firebase_auth_required
def add_vehicle():
    """Add a vehicle to user's profile"""
    try:
        data = request.get_json()
        user_auth = UserAuth(request.app.config['db_ref'])
        vehicle_id = user_auth.add_vehicle(request.user['uid'], data)
        return jsonify({'message': 'Vehicle added successfully', 'vehicle_id': vehicle_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/vehicles', methods=['GET'])
@firebase_auth_required
def get_vehicles():
    """Get user's vehicles"""
    try:
        user_auth = UserAuth(request.app.config['db_ref'])
        vehicles = user_auth.get_user_vehicles(request.user['uid'])
        return jsonify(vehicles), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/analyze/upload', methods=['POST'])
@firebase_auth_required
def upload_image():
    """Upload an image for car damage analysis"""
    logger.info("[ROUTE: /api/analyze/upload] Starting image upload processing")
    
    try:
        # Check for image file in request
        logger.debug("[ROUTE: /api/analyze/upload] Checking for image in request.files")
        if 'image' not in request.files:
            logger.error("[ROUTE: /api/analyze/upload] No image file provided in request")
            return jsonify({'error': 'No image file provided'}), 400
            
        file = request.files['image']
        if file.filename == '':
            logger.error("[ROUTE: /api/analyze/upload] Empty filename in request")
            return jsonify({'error': 'No selected file'}), 400

        # Debugging information about the file
        logger.info(f"[ROUTE: /api/analyze/upload] Processing image: {file.filename}, " + 
                   f"Content type: {file.content_type}, Size: {file.content_length or 'Unknown'}")

        try:
            # Read and process the image
            logger.debug("[ROUTE: /api/analyze/upload] Reading image file")
            contents = file.read()
            logger.debug(f"[ROUTE: /api/analyze/upload] Image content read, size: {len(contents)} bytes")
            
            logger.debug("[ROUTE: /api/analyze/upload] Opening image with PIL")
            image = Image.open(io.BytesIO(contents))
            logger.info(f"[ROUTE: /api/analyze/upload] Image opened successfully, format: {image.format}, size: {image.size}")
            
            # Save temporarily
            temp_path = f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            logger.debug(f"[ROUTE: /api/analyze/upload] Saving temporary image to: {temp_path}")
            image.save(temp_path)
            logger.info(f"[ROUTE: /api/analyze/upload] Saved temporary image: {temp_path}")
            
            # Return the path to the saved image
            return jsonify({'data': {'imageUrl': temp_path}}), 200
            
        except Exception as e:
            logger.error(f"[ROUTE: /api/analyze/upload] Error processing image: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': f"Image processing error: {str(e)}"}), 500
            
    except Exception as e:
        logger.error(f"[ROUTE: /api/analyze/upload] Unhandled error in upload: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@api.route('/analyze', methods=['POST'])
@firebase_auth_required
def analyze_car_damage():
    """Analyze car damage from image URL using Gemini Vision AI"""
    logger.info("[ROUTE: /api/analyze] Starting damage analysis request processing")
    
    try:
        # Get the request data
        data = request.get_json()
        
        # Check if imageUrl is provided
        if not data or 'imageUrl' not in data:
            logger.error("[ROUTE: /api/analyze] No imageUrl provided in request")
            return jsonify({'error': 'No imageUrl provided'}), 400
            
        image_url = data['imageUrl']
        logger.info(f"[ROUTE: /api/analyze] Processing image URL: {image_url}")
        
        # Check if the file exists
        if not os.path.exists(image_url):
            logger.error(f"[ROUTE: /api/analyze] Image file not found: {image_url}")
            return jsonify({'error': 'Image file not found'}), 404
            
        # Use the provided image path directly
        temp_path = image_url
        logger.info(f"[ROUTE: /api/analyze] Using image path: {temp_path}")
        
        try:
            # Analyze damage using Gemini Vision AI
            logger.debug("[ROUTE: /api/analyze] Calling car_damage_rag.analyze_image")
            damage_analysis = car_damage_rag.analyze_image(temp_path)
            logger.info("[ROUTE: /api/analyze] Damage analysis completed successfully")
            logger.debug(f"[ROUTE: /api/analyze] Damage analysis result: {damage_analysis}")
            
            # Parse the AI response into structured format
            structured_data = parse_ai_response_to_damage_result(damage_analysis["raw_analysis"])
            
            logger.info("[ROUTE: /api/analyze] Request completed successfully, returning result")
            return jsonify({
                "data": {
                    "raw_analysis": damage_analysis["raw_analysis"],
                    "structured_data": structured_data
                }
            }), 200
            
        except Exception as e:
            logger.error(f"[ROUTE: /api/analyze] Error in damage analysis: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': f"Analysis error: {str(e)}"}), 500
        
    except Exception as e:
        logger.error(f"[ROUTE: /api/analyze] Unhandled error in analysis: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Try to clean up temp file if it exists
        try:
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.remove(temp_path)
        except:
            pass
            
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@api.route('/analyze-damage', methods=['POST'])
@firebase_auth_required
def analyze_damage_upload():
    """Analyze car damage from uploaded image file using Gemini Vision AI"""
    logger.info("[ROUTE: /api/analyze-damage] Starting damage analysis from file upload")
    
    try:
        # Check if image file is provided
        if 'image' not in request.files:
            logger.error("[ROUTE: /api/analyze-damage] No image file provided")
            return jsonify({'error': 'No image file provided'}), 400
            
        image_file = request.files['image']
        
        if image_file.filename == '':
            logger.error("[ROUTE: /api/analyze-damage] Empty filename provided")
            return jsonify({'error': 'No file selected'}), 400
            
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
        file_extension = image_file.filename.rsplit('.', 1)[1].lower() if '.' in image_file.filename else ''
        
        if file_extension not in allowed_extensions:
            logger.error(f"[ROUTE: /api/analyze-damage] Invalid file type: {file_extension}")
            return jsonify({'error': 'Invalid file type. Please upload an image file.'}), 400
            
        # Create temporary file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
            temp_path = temp_file.name
            image_file.save(temp_path)
            
        logger.info(f"[ROUTE: /api/analyze-damage] Saved uploaded file to: {temp_path}")
        
        try:
            # Analyze damage using Gemini Vision AI
            logger.debug("[ROUTE: /api/analyze-damage] Calling car_damage_rag.analyze_image")
            damage_analysis = car_damage_rag.analyze_image(temp_path)
            logger.info("[ROUTE: /api/analyze-damage] Damage analysis completed successfully")
            
            # Parse the AI response into structured format
            structured_data = parse_ai_response_to_damage_result(damage_analysis["raw_analysis"])
            
            # Store analysis in user's history if authenticated
            try:
                user_auth = UserAuth(request.app.config['db_ref'])
                analysis_record = {
                    "timestamp": datetime.now().isoformat(),
                    "filename": image_file.filename,
                    "structured_data": structured_data,
                    "raw_analysis": damage_analysis["raw_analysis"]
                }
                user_auth.add_analysis_history(request.user['uid'], analysis_record)
                logger.info("[ROUTE: /api/analyze-damage] Analysis saved to user history")
            except Exception as history_error:
                logger.warning(f"[ROUTE: /api/analyze-damage] Could not save to history: {str(history_error)}")
            
            logger.info("[ROUTE: /api/analyze-damage] Request completed successfully")
            return jsonify({
                "data": {
                    "raw_analysis": damage_analysis["raw_analysis"],
                    "structured_data": structured_data
                }
            }), 200
            
        except Exception as e:
            logger.error(f"[ROUTE: /api/analyze-damage] Error in damage analysis: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': f"Analysis error: {str(e)}"}), 500
        
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    logger.debug(f"[ROUTE: /api/analyze-damage] Cleaned up temp file: {temp_path}")
            except Exception as cleanup_error:
                logger.warning(f"[ROUTE: /api/analyze-damage] Could not clean up temp file: {str(cleanup_error)}")
        
    except Exception as e:
        logger.error(f"[ROUTE: /api/analyze-damage] Unhandled error in analysis: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@api.route('/insurance', methods=['POST'])
@firebase_auth_required
def add_insurance():
    """Add insurance information"""
    try:
        data = request.get_json()
        user_auth = UserAuth(request.app.config['db_ref'])
        insurance_id = user_auth.add_insurance(request.user['uid'], data)
        return jsonify({'message': 'Insurance added successfully', 'insurance_id': insurance_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/insurance', methods=['GET'])
@firebase_auth_required
def get_insurance():
    """Get user's insurance information"""
    try:
        user_auth = UserAuth(request.app.config['db_ref'])
        insurance = user_auth.get_user_insurance(request.user['uid'])
        return jsonify(insurance), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/analysis/history', methods=['GET'])
@firebase_auth_required
def get_analysis_history():
    """Get user's analysis history"""
    try:
        user_auth = UserAuth(request.app.config['db_ref'])
        history = user_auth.get_analysis_history(request.user['uid'])
        return jsonify(history), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/vehicle/info', methods=['GET'])
def get_vehicle_info():
    """Get vehicle information"""
    try:
        make = request.args.get('make', '')
        model = request.args.get('model', '')
        year = request.args.get('year', '')
        
        # Get user ID from token if available
        user_id = request.user['uid'] if hasattr(request, 'user') else "test_user_id"
        
        logger.info(f"Getting vehicle info for {make} {model} {year}")
        vehicle_info = vehicle_rag.get_vehicle_info(user_id, make, model, year)
        return jsonify(vehicle_info), 200
    except Exception as e:
        logger.error(f"Error getting vehicle info: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api.route('/vehicle/repair-cost', methods=['POST'])
def estimate_repair_cost():
    """Estimate repair cost"""
    try:
        data = request.get_json()
        make = data.get('make', '')
        model = data.get('model', '')
        damage_type = data.get('damage_type', '')
        
        logger.info(f"Estimating repair cost for {make} {model} with {damage_type} damage")
        repair_cost = vehicle_rag.estimate_repair_cost(make, model, damage_type)
        return jsonify(repair_cost), 200
    except Exception as e:
        logger.error(f"Error estimating repair cost: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api.route('/insurance/recommendations', methods=['POST'])
def get_insurance_recommendations():
    """Get insurance recommendations"""
    try:
        damage_assessment = request.get_json()
        
        # Get user ID from token if available
        user_id = request.user['uid'] if hasattr(request, 'user') else "test_user_id"
        
        logger.info(f"Getting insurance recommendations for damage assessment")
        recommendations = insurance_rag.get_insurance_recommendations(damage_assessment)
        return jsonify(recommendations), 200
    except Exception as e:
        logger.error(f"Error getting insurance recommendations: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api.route('/damage/recommendations', methods=['POST'])
def get_repair_recommendations():
    """Get repair recommendations"""
    try:
        damage_analysis = request.get_json()
        
        logger.info(f"Getting repair recommendations for damage analysis")
        recommendations = car_damage_rag.get_repair_recommendations(damage_analysis)
        return jsonify(recommendations), 200
    except Exception as e:
        logger.error(f"Error getting repair recommendations: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api.route('/analyze/gemini-only', methods=['POST'])
def analyze_with_gemini_only():
    """Analyze car damage using only Gemini API - no mock data fallbacks"""
    logger.info("[ROUTE: /api/analyze/gemini-only] Starting Gemini-only damage analysis")
    
    try:
        # Enhanced handling for both image file and imageUrl fallback
        logger.debug("[ROUTE: /api/analyze/gemini-only] Checking for image data in request")
        
        image = None
        temp_path = None
        
        # First, try to get image file from request
        if 'image' in request.files:
            file = request.files['image']
            if file.filename != '' and file:
                logger.info(f"[ROUTE: /api/analyze/gemini-only] Processing uploaded image: {file.filename}, " + 
                           f"Content type: {file.content_type}, Size: {file.content_length or 'Unknown'}")
                
                try:
                    # Read and process the uploaded image
                    logger.debug("[ROUTE: /api/analyze/gemini-only] Reading uploaded image file")
                    contents = file.read()
                    logger.debug(f"[ROUTE: /api/analyze/gemini-only] Image content read, size: {len(contents)} bytes")
                    
                    logger.debug("[ROUTE: /api/analyze/gemini-only] Opening image with PIL")
                    image = Image.open(io.BytesIO(contents))
                    logger.info(f"[ROUTE: /api/analyze/gemini-only] Image opened successfully, format: {image.format}, size: {image.size}")
                    
                    # Save temporarily
                    temp_path = f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                    logger.debug(f"[ROUTE: /api/analyze/gemini-only] Saving temporary image to: {temp_path}")
                    image.save(temp_path)
                    logger.info(f"[ROUTE: /api/analyze/gemini-only] Saved temporary image: {temp_path}")
                    
                except Exception as e:
                    logger.error(f"[ROUTE: /api/analyze/gemini-only] Error processing uploaded image: {str(e)}")
                    logger.error(traceback.format_exc())
                    return jsonify({'error': f"Image processing error: {str(e)}"}), 500
        
        # If no uploaded file, try imageUrl parameter as fallback
        if image is None and 'imageUrl' in request.form:
            image_url = request.form['imageUrl']
            logger.info(f"[ROUTE: /api/analyze/gemini-only] Using imageUrl fallback: {image_url}")
            
            try:
                # Check if the file exists
                if os.path.exists(image_url):
                    logger.debug(f"[ROUTE: /api/analyze/gemini-only] Loading image from path: {image_url}")
                    image = Image.open(image_url)
                    temp_path = image_url  # Use existing path
                    logger.info(f"[ROUTE: /api/analyze/gemini-only] Image loaded from path successfully, format: {image.format}, size: {image.size}")
                else:
                    logger.error(f"[ROUTE: /api/analyze/gemini-only] Image file not found at path: {image_url}")
                    return jsonify({'error': f'Image file not found at path: {image_url}'}), 404
                    
            except Exception as e:
                logger.error(f"[ROUTE: /api/analyze/gemini-only] Error loading image from path: {str(e)}")
                logger.error(traceback.format_exc())
                return jsonify({'error': f"Error loading image from path: {str(e)}"}), 500
        
        # If still no image, return error
        if image is None:
            logger.error("[ROUTE: /api/analyze/gemini-only] No valid image provided (neither uploaded file nor valid imageUrl)")
            return jsonify({'error': 'No valid image provided. Please upload an image file or provide a valid image path.'}), 400

        # Check for API key availability
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("[ROUTE: /api/analyze/gemini-only] No Gemini API key found")
            return jsonify({'error': 'Gemini API key not configured. Set GEMINI_API_KEY environment variable.'}), 503
        
        try:
            # Import and use directly with no fallbacks
            from backend.rag_implementation.car_damage_rag import CarDamageRAG
            from backend.rag_implementation.insurance_rag import InsuranceRAG
            from backend.rag_implementation.vehicle_rag import VehicleRAG
            
            # Initialize components
            car_damage_analyzer = CarDamageRAG()
            vehicle_analyzer = VehicleRAG()
            insurance_analyzer = InsuranceRAG()
            
            # Force Gemini use
            if hasattr(car_damage_analyzer, "_use_mock"):
                car_damage_analyzer._use_mock = False
            if hasattr(vehicle_analyzer, "_use_mock"):
                vehicle_analyzer._use_mock = False
            if hasattr(insurance_analyzer, "_use_mock"):
                insurance_analyzer._use_mock = False
            
            # Convert image for direct use with Gemini
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='JPEG')
            img_bytes = img_byte_arr.getvalue()
            
            # Direct API call to Gemini with enhanced insurance prompts
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                contents=[
                    """🚗 EXPERT AUTOMOTIVE DAMAGE ANALYST & INSURANCE SPECIALIST

You are a certified automotive damage assessor and senior insurance specialist with 25+ years of experience. Analyze this vehicle image with the precision of a professional adjuster and provide a comprehensive, actionable report.

📋 VEHICLE IDENTIFICATION & ASSESSMENT:
- FIRST: Identify make, model, year, trim level, and approximate value range
- Document vehicle condition prior to damage assessment
- Note any pre-existing wear, modifications, or maintenance indicators
- Assess overall vehicle age and mileage appearance

🔍 COMPREHENSIVE DAMAGE ANALYSIS:
- Map ALL visible damage with precise locations (use clock positions: 12 o'clock = front, 3 o'clock = passenger side, etc.)
- Categorize each damage type: Surface scratches, deep scratches, paint transfer, dents, creases, cracks, structural deformation
- Rate severity: MINOR (cosmetic only), MODERATE (functional impact possible), SEVERE (safety/structural concerns), CRITICAL (unsafe to drive)
- Identify potential hidden damage based on impact patterns and force distribution
- Assess whether damage extends beyond visible areas (frame, suspension, electrical systems)

💰 DETAILED FINANCIAL ASSESSMENT:
REPAIR COST BREAKDOWN:
- Parts costs (OEM vs aftermarket pricing)
- Labor hours required (body shop rates: $45-120/hour)
- Paint and materials ($200-800 depending on coverage area)
- Specialty services (frame straightening, wheel alignment, etc.)
- Total estimated range: $XXX - $XXX

INSURANCE CLAIM ANALYSIS:
- Claim threshold assessment (typically $500-1500 depending on policy)
- Deductible impact calculation
- Premium increase probability (0-30% for 3-5 years)
- Total cost of ownership impact over 5 years
- Recommendation: CLAIM vs. PAY OUT-OF-POCKET with detailed reasoning

🛠️ EXPERT REPAIR STRATEGY:
REPAIR METHOD RECOMMENDATIONS:
- Paintless Dent Repair (PDR) viability assessment
- Traditional body work requirements
- Parts replacement vs. repair feasibility
- Quality levels: Insurance-grade vs. Premium restoration
- Timeline: Rush (2-3 days) vs. Standard (1-2 weeks) vs. Show Quality (3-4 weeks)

SHOP SELECTION GUIDANCE:
- Certified shops (manufacturer authorized) vs. independent shops
- Insurance Direct Repair Program (DRP) considerations
- Quality indicators to look for in shop selection
- Questions to ask potential repair facilities

⚠️ SAFETY & LEGAL COMPLIANCE:
IMMEDIATE SAFETY ASSESSMENT:
- Vehicle drivability status: SAFE / CAUTION / UNSAFE
- Critical systems affected (lights, mirrors, structural integrity)
- Legal roadworthiness in your jurisdiction
- Emergency repairs needed before driving

REGULATORY COMPLIANCE:
- Inspection requirements post-repair
- Documentation needed for legal compliance
- Safety equipment functionality verification

📞 STEP-BY-STEP INSURANCE CLAIM PROCESS:
1. IMMEDIATE ACTIONS (First 24 hours):
   - Document scene with photos from multiple angles
   - Collect other party information (if applicable)
   - Contact insurance company to report claim
   - Get police report number (if applicable)

2. DOCUMENTATION REQUIRED:
   - High-resolution photos: Overview, close-ups, interior damage, VIN
   - Repair estimates from 2-3 certified shops
   - Police report (if applicable)
   - Witness statements (if applicable)

3. ADJUSTER INTERACTION STRATEGY:
   - Key points to emphasize during inspection
   - Hidden damage areas to highlight
   - Negotiation tactics for maximum coverage
   - When to request re-inspection

4. OPTIMAL TIMING CONSIDERATIONS:
   - Best times to file claim (avoid holiday periods)
   - Coordination with repair shop schedules
   - Rental car arrangement timing

🎯 PERSONALIZED RECOMMENDATIONS:
Based on this specific damage assessment, provide:
- YOUR TOP RECOMMENDATION: Claim or pay out-of-pocket with specific reasoning
- Estimated total financial impact over 5 years
- Preferred repair approach for optimal value
- Timeline recommendations based on urgency
- Preventive measures to avoid similar damage

📊 RISK ASSESSMENT MATRIX:
- Probability of successful claim: XX%
- Expected premium increase: XX% for XX years
- Total 5-year cost impact: $XXX
- Resale value impact: $XXX reduction
- Recommended action confidence level: XX%

FORMAT: Provide response in clearly labeled sections with specific dollar amounts, percentages, and actionable steps. Use emojis for section headers and bullet points for easy scanning. Be precise with all estimates and provide ranges where appropriate.""",
                    {"mime_type": "image/jpeg", "data": img_bytes}
                ]
            )
            
            logger.info("[ROUTE: /api/analyze/gemini-only] Direct Gemini analysis successful")
            
            # Clean up temp file if we created one
            try:
                if temp_path and temp_path.startswith('temp_') and os.path.exists(temp_path):
                    logger.debug(f"[ROUTE: /api/analyze/gemini-only] Removing temporary file: {temp_path}")
                    os.remove(temp_path)
                else:
                    logger.debug(f"[ROUTE: /api/analyze/gemini-only] Skipping cleanup - using existing file or no temp file created")
            except Exception as e:
                logger.warning(f"[ROUTE: /api/analyze/gemini-only] Error removing temp file: {str(e)}")
            
            # Parse the response to extract analysis and recommendations
            analysis_text = response.text
            
            # Try to extract recommendations from the response
            recommendations = []
            analysis_parts = analysis_text.split('\n')
            
            # Look for bullet points or numbered lists that could be recommendations
            in_recommendations = False
            current_analysis = []
            
            for line in analysis_parts:
                line = line.strip()
                if not line:
                    continue
                    
                # Check if this line indicates start of recommendations
                if any(keyword in line.lower() for keyword in ['recommendation', 'suggest', 'should', 'action']):
                    in_recommendations = True
                    
                # If line starts with bullet points, numbers, or dashes, treat as recommendation
                if line.startswith(('•', '-', '*', '1.', '2.', '3.', '4.', '5.')) or in_recommendations:
                    if line.startswith(('•', '-', '*')):
                        recommendations.append(line[1:].strip())
                    elif line[0].isdigit() and '.' in line[:3]:
                        recommendations.append(line.split('.', 1)[1].strip())
                    elif in_recommendations:
                        recommendations.append(line)
                else:
                    current_analysis.append(line)
            
            # If no specific recommendations found, create some based on the analysis
            if not recommendations:
                if 'damage' in analysis_text.lower():
                    recommendations = [
                        "Consult with a professional auto body shop for detailed assessment",
                        "Document all damage with photos for insurance purposes",
                        "Get multiple repair quotes before proceeding",
                        "Check if any safety systems are affected"
                    ]
            
            # Return structured response that matches frontend expectations
            return jsonify({
                'analysis': ' '.join(current_analysis) if current_analysis else analysis_text,
                'recommendations': recommendations,
                'additionalInfo': {
                    'model': 'gemini-1.5-flash',
                    'confidence': 'High',
                    'analysisType': 'Advanced AI Analysis'
                },
                'rawResponse': analysis_text
            }), 200
            
        except Exception as e:
            logger.error(f"[ROUTE: /api/analyze/gemini-only] Error in Gemini analysis: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': f"Gemini API error: {str(e)}"}), 500
        
    except Exception as e:
        logger.error(f"[ROUTE: /api/analyze/gemini-only] Unhandled error: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Try to clean up temp file if it exists
        try:
            if 'temp_path' in locals() and temp_path and temp_path.startswith('temp_') and os.path.exists(temp_path):
                os.remove(temp_path)
                logger.debug(f"[ROUTE: /api/analyze/gemini-only] Cleaned up temp file in error handler: {temp_path}")
        except Exception as cleanup_error:
            logger.warning(f"[ROUTE: /api/analyze/gemini-only] Error during cleanup: {str(cleanup_error)}")
            
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@api.route('/analysis/latest-techniques', methods=['GET'])
def get_latest_analysis_techniques():
    """Get the latest car damage analysis techniques from Gemini API"""
    try:
        logger.info("[ROUTE: /api/analysis/latest-techniques] Fetching latest analysis techniques")
        
        # Check for API key
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return jsonify({'error': 'Gemini API key not configured'}), 503
            
        # Configure and use Gemini directly
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-pro")
        
        # Query for latest techniques
        response = model.generate_content("""
        You are an expert automotive damage assessor. Provide a comprehensive overview of the 
        latest and most advanced techniques for car damage assessment, focusing on:

        1. Modern damage detection technologies
        2. Advanced diagnostic approaches
        3. AI and ML applications in damage assessment
        4. Latest repair methodologies
        5. Industry standards and best practices
        6. Recent innovations in the field
        7. Mobile-based assessment methods
        8. Predictive damage analysis

        Structure your response in a detailed, education style with clear sections and headers.
        Include specific tools, technologies, and methodologies that represent the cutting edge of the field.
        Format as comprehensive HTML with proper headings and organization.
        """)
        
        logger.info("[ROUTE: /api/analysis/latest-techniques] Successfully retrieved data from Gemini")
        
        return jsonify({
            'techniques_html': response.text,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"[ROUTE: /api/analysis/latest-techniques] Error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api.route('/rag/analyze', methods=['POST'])
@firebase_auth_required
def analyze_with_rag():
    """Analyze a query using RAG"""
    logger.info("[ROUTE: /api/rag/analyze] Starting RAG analysis request processing")
    
    try:
        # Get the request data
        data = request.get_json()
        
        # Check if query is provided
        if not data or 'query' not in data:
            logger.error("[ROUTE: /api/rag/analyze] No query provided in request")
            return jsonify({'error': 'No query provided'}), 400
            
        query = data['query']
        context = data.get('context', '')
        logger.info(f"[ROUTE: /api/rag/analyze] Processing query: {query}")
        
        # Determine which RAG system to use based on the query
        if 'insurance' in query.lower():
            logger.info("[ROUTE: /api/rag/analyze] Using insurance RAG")
            response = insurance_rag.analyze_query(query, context)
        elif 'vehicle' in query.lower() or 'car' in query.lower():
            logger.info("[ROUTE: /api/rag/analyze] Using vehicle RAG")
            response = vehicle_rag.analyze_query(query, context)
        else:
            logger.info("[ROUTE: /api/rag/analyze] Using car damage RAG")
            response = car_damage_rag.analyze_query(query, context)
        
        # Create a structured response
        structured_response = {
            "data": {
                "answer": response.get("answer", "I couldn't find an answer to your question."),
                "sources": response.get("sources", [])
            }
        }
        
        logger.info("[ROUTE: /api/rag/analyze] Request completed successfully, returning result")
        return jsonify(structured_response), 200
        
    except Exception as e:
        logger.error(f"[ROUTE: /api/rag/analyze] Error in RAG analysis: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f"RAG analysis error: {str(e)}"}), 500

@api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'components': {
            'car_damage_rag': 'initialized' if 'car_damage_rag' in globals() else 'not initialized',
            'insurance_rag': 'initialized' if 'insurance_rag' in globals() else 'not initialized',
            'vehicle_rag': 'initialized' if 'vehicle_rag' in globals() else 'not initialized'
        }
    })