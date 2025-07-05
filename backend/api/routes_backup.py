import math
import re
import json
import requests
import os
import io
import tempfile
import random
import time
from datetime import datetime
from PIL import Image
from flask import Blueprint, jsonify, request
from functools import wraps
from rag_implementation.car_damage_rag import CarDamageRAG
from rag_implementation.insurance_rag import InsuranceRAG
from rag_implementation.vehicle_rag import VehicleRAG
from auth.user_auth import UserAuth
from config.firebase_config import verify_firebase_token
from local_analyzer import create_smart_demo_response
import google.generativeai as genai
import traceback
import logging

logger = logging.getLogger(__name__)

# Initialize Flask Blueprint
api = Blueprint('api', __name__)

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
    logger.debug(f"[PARSER] Raw analysis preview: {raw_analysis[:300]}...")  # Log first 300 characters
    
    # Check if this is a fallback response requesting more images
    if "ENHANCED ANALYSIS REQUEST" in raw_analysis or "LOW CONFIDENCE" in raw_analysis:
        logger.info("[PARSER] Detected fallback response - vehicle identification confidence is low")
        
        # Extract confidence if mentioned
        confidence_match = re.search(r'LOW CONFIDENCE \((\d+)%\)', raw_analysis)
        confidence = float(confidence_match.group(1))/100.0 if confidence_match else 0.3
        
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
        """Extract vehicle identification from AI response with enhanced parsing"""
        try:
            logger.debug("[PARSER] Extracting enhanced vehicle identification")
            
            # Enhanced patterns for vehicle information
            make_patterns = [
                r'Make[:\s]*([^\n,\]]+)',
                r'Brand[:\s]*([^\n,\]]+)',
                r'Manufacturer[:\s]*([^\n,\]]+)'
            ]
            
            model_patterns = [
                r'Model[:\s]*([^\n,\]]+)',
                r'Model Name[:\s]*([^\n,\]]+)'
            ]
            
            year_patterns = [
                r'Year[:\s]*(\d{4})',
                r'Model Year[:\s]*(\d{4})',
                r'Manufacturing Year[:\s]*(\d{4})'
            ]
            
            confidence_patterns = [
                r'Confidence[:\s]*(\d+(?:\.\d+)?%?)',
                r'(?:confidence|certainty)[:\s]*(\d+(?:\.\d+)?%?)',
                r'HIGH CONFIDENCE[:\s]*\((\d+)%\)',
                r'MEDIUM CONFIDENCE[:\s]*\((\d+)%\)',
                r'LOW CONFIDENCE[:\s]*\((\d+)%\)'
            ]
            
            # Enhanced patterns for additional vehicle details
            engine_patterns = [
                r'Engine Size[:\s]*([^\n,\]]+)',
                r'Engine[:\s]*([0-9.]+L)',
                r'(\d\.\d+L|\d+cc)'
            ]
            
            fuel_patterns = [
                r'Fuel Type[:\s]*([^\n,\]]+)',
                r'Fuel[:\s]*([^\n,\]]+)'
            ]
            
            segment_patterns = [
                r'Market Segment[:\s]*([^\n,\]]+)',
                r'Segment[:\s]*([^\n,\]]+)'
            ]
            
            idv_patterns = [
                r'Typical IDV Range[:\s]*([^\n,\]]+)',
                r'IDV[:\s]*₹([0-9,]+)',
                r'Insurance Declared Value[:\s]*([^\n,\]]+)'
            ]
            
            # Extract make/brand
            make = "Unknown"
            for pattern in make_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    make = match.group(1).strip().replace('[', '').replace(']', '')
                    logger.debug(f"[PARSER] Found make: {make}")
                    break
            
            # Extract model
            model = "Unknown"
            for pattern in model_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    model = match.group(1).strip().replace('[', '').replace(']', '')
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
            
            # Extract additional vehicle details
            trim_match = re.search(r'(?:trim|variant)[:\s]*([^\n,\]]+)', text, re.IGNORECASE)
            trim_level = trim_match.group(1).strip().replace('[', '').replace(']', '') if trim_match else "Unknown"
            
            body_style_match = re.search(r'body style[:\s]*([^\n,\]]+)', text, re.IGNORECASE)
            body_style = body_style_match.group(1).strip().replace('[', '').replace(']', '') if body_style_match else "Unknown"
            
            # Extract engine size
            engine_size = "Unknown"
            for pattern in engine_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    engine_size = match.group(1).strip().replace('[', '').replace(']', '')
                    logger.debug(f"[PARSER] Found engine size: {engine_size}")
                    break
            
            # Extract fuel type
            fuel_type = "Unknown"
            for pattern in fuel_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fuel_type = match.group(1).strip().replace('[', '').replace(']', '')
                    logger.debug(f"[PARSER] Found fuel type: {fuel_type}")
                    break
            
            # Extract market segment
            market_segment = "Unknown"
            for pattern in segment_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    market_segment = match.group(1).strip().replace('[', '').replace(']', '')
                    logger.debug(f"[PARSER] Found market segment: {market_segment}")
                    break
            
            # Extract IDV range
            idv_range = "Unknown"
            for pattern in idv_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    idv_range = match.group(1).strip().replace('[', '').replace(']', '')
                    logger.debug(f"[PARSER] Found IDV range: {idv_range}")
                    break
            
            # Create detailed identification
            if confidence > 0.85:
                details = f"High confidence identification: {make} {model} ({year})"
            elif confidence > 0.65:
                details = f"Medium confidence identification: {make} {model}"
            else:
                details = f"Low confidence identification - additional photos recommended"
            
            return {
                "make": make,
                "model": model,
                "year": year,
                "trimLevel": trim_level,
                "bodyStyle": body_style,
                "engineSize": engine_size,
                "fuelType": fuel_type,
                "marketSegment": market_segment,
                "idvRange": idv_range,
                "confidence": confidence,
                "identificationDetails": details
            }
        except Exception as e:
            logger.error(f"[PARSER] Error extracting vehicle identification: {str(e)}")
            return {
                "make": "Unknown", "model": "Unknown", "year": "Unknown",
                "trimLevel": "Unknown", "bodyStyle": "Unknown", 
                "engineSize": "Unknown", "fuelType": "Unknown",
                "marketSegment": "Unknown", "idvRange": "Unknown",
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
        
        logger.debug(f"[PARSER] Analyzing text for damage type: {text_lower[:200]}...")
        
        # Check for demo mode first
        if "demo analysis" in text_lower or "api quota exceeded" in text_lower:
            logger.info("[PARSER] Demo mode detected in response")
            return "API Quota Exceeded", 0.0
        
        # Check for "no damage" scenarios first
        no_damage_indicators = ['no damage', 'good condition', 'no visible damage', 'appears to be in good condition']
        if any(indicator in text_lower for indicator in no_damage_indicators):
            logger.info("[PARSER] No damage detected in text")
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
                logger.info(f"[PARSER] Found damage type '{damage_type}' based on keyword match")
                # Try to extract confidence
                confidence_match = re.search(r'confidence[:\s]*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
                confidence = float(confidence_match.group(1)) / 100 if confidence_match else 0.85
                return damage_type, confidence
        
        logger.info("[PARSER] No specific damage type found, defaulting to 'General Damage'")
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
    
    def extract_insurance_recommendations(text: str, vehicle_info: dict) -> dict:
        """Extract vehicle-specific insurance recommendations from AI response"""
        try:
            logger.debug("[PARSER] Extracting insurance recommendations")
            
            # Extract claim recommendation
            claim_patterns = [
                r'CLAIM RECOMMENDATION[:\s]*([^\n]+)',
                r'RECOMMENDATION[:\s]*([^\n]+)',
                r'(CLAIM_RECOMMENDED|CLAIM_NOT_RECOMMENDED|CONDITIONAL_CLAIM)'
            ]
            
            claim_recommendation = "CONDITIONAL_CLAIM"
            for pattern in claim_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    claim_recommendation = match.group(1).strip().upper()
                    logger.debug(f"[PARSER] Found claim recommendation: {claim_recommendation}")
                    break
            
            # Extract reasoning
            reasoning_patterns = [
                r'RECOMMENDATION REASONING[:\s]*\n(.*?)(?=\n\*\*|$)',
                r'REASONING[:\s]*\n(.*?)(?=\n\*\*|$)',
                r'MODEL-SPECIFIC CONSIDERATIONS[:\s]*\n(.*?)(?=\n\*\*|$)'
            ]
            
            reasoning = "Standard insurance claim analysis"
            for pattern in reasoning_patterns:
                match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
                if match:
                    reasoning = match.group(1).strip()
                    logger.debug(f"[PARSER] Found reasoning: {reasoning[:100]}...")
                    break
            
            # Extract vehicle-specific considerations
            considerations_match = re.search(r'MODEL-SPECIFIC CONSIDERATIONS[:\s]*\n(.*?)(?=\n\*\*|$)', text, re.DOTALL | re.IGNORECASE)
            vehicle_considerations = considerations_match.group(1).strip() if considerations_match else "General considerations apply"
            
            # Extract net benefit
            benefit_match = re.search(r'Net Benefit[:\s]*₹([0-9,]+)', text, re.IGNORECASE)
            net_benefit = benefit_match.group(1) if benefit_match else "0"
            
            # Extract deductible
            deductible_match = re.search(r'(?:Deductible|deductible)[:\s]*₹([0-9,]+)', text, re.IGNORECASE)
            deductible = deductible_match.group(1) if deductible_match else "2000"
            
            # Vehicle-specific insurance logic
            vehicle_make = vehicle_info.get('make', 'Unknown').lower()
            vehicle_year = vehicle_info.get('year', 'Unknown')
            
            # Adjust recommendations based on vehicle characteristics
            premium_brands = ['bmw', 'mercedes', 'audi', 'jaguar', 'volvo', 'lexus']
            economy_brands = ['maruti', 'hyundai', 'tata', 'mahindra']
            
            brand_factor = ""
            if any(brand in vehicle_make for brand in premium_brands):
                brand_factor = "Premium vehicle - higher repair costs, recommend comprehensive insurance coverage"
            elif any(brand in vehicle_make for brand in economy_brands):
                brand_factor = "Economy vehicle - consider repair costs vs vehicle value"
            else:
                brand_factor = "Mid-range vehicle - standard insurance considerations apply"
            
            # Age-based recommendations
            age_factor = ""
            try:
                if vehicle_year != 'Unknown':
                    vehicle_age = 2024 - int(vehicle_year)
                    if vehicle_age <= 3:
                        age_factor = "New vehicle - prioritize OEM parts and authorized service centers"
                    elif vehicle_age <= 7:
                        age_factor = "Mid-age vehicle - balance between OEM and aftermarket parts acceptable"
                    else:
                        age_factor = "Older vehicle - consider total loss threshold and IDV carefully"
            except:
                age_factor = "Vehicle age unknown - standard age considerations"
            
            return {
                "claimRecommendation": claim_recommendation,
                "reasoning": reasoning,
                "vehicleConsiderations": vehicle_considerations,
                "netBenefit": net_benefit,
                "deductible": deductible,
                "brandFactor": brand_factor,
                "ageFactor": age_factor,
                "isVehicleSpecific": True
            }
            
        except Exception as e:
            logger.error(f"[PARSER] Error extracting insurance recommendations: {str(e)}")
            return {
                "claimRecommendation": "CONDITIONAL_CLAIM",
                "reasoning": "Could not parse insurance recommendations",
                "vehicleConsiderations": "Standard considerations apply",
                "netBenefit": "0",
                "deductible": "2000",
                "brandFactor": "Standard vehicle considerations",
                "ageFactor": "Standard age considerations",
                "isVehicleSpecific": False
            }
    
    try:
        # Extract main damage information
        damage_type, confidence = determine_damage_type_and_confidence(raw_analysis)
        vehicle_id = extract_vehicle_identification(raw_analysis)
        repair_costs = extract_repair_costs(raw_analysis)
        damage_regions = extract_damage_regions(raw_analysis)
        recommendations = extract_recommendations(raw_analysis)
        insurance_info = extract_insurance_recommendations(raw_analysis, vehicle_id)
        
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
                },
                "insuranceRecommendations": insurance_info
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
        from flask import current_app
        logger.info(f"📊 get_analysis_history: Request received from user {request.user.get('uid', 'unknown')}")
        logger.info(f"🔍 get_analysis_history: Request headers: {dict(request.headers)}")
        logger.info(f"👤 get_analysis_history: User info: {request.user}")
        
        try:
            # Check if db_ref exists in app config
            if 'db_ref' not in current_app.config:
                logger.error("❌ get_analysis_history: No database reference in app config")
                return jsonify({'error': 'Database reference not configured', 'success': False}), 500
                
            user_auth = UserAuth(current_app.config['db_ref'])
            
            # Make sure user ID is available
            if not request.user or 'uid' not in request.user:
                logger.error("❌ get_analysis_history: No user ID available in request")
                return jsonify({'error': 'User not authenticated', 'success': False}), 401
                
            user_id = request.user['uid']
            
            logger.info(f"🗃️ get_analysis_history: Fetching history for user_id: {user_id}")
            history = user_auth.get_analysis_history(user_id)
            
            logger.info(f"✅ get_analysis_history: Successfully fetched history")
            logger.info(f"📈 get_analysis_history: History type: {type(history)}, length: {len(history) if isinstance(history, (list, dict)) else 'unknown'}")
            
            if isinstance(history, dict):
                logger.info(f"🔑 get_analysis_history: History keys: {list(history.keys())[:5] if history else '[]'}...")
                
                # Convert Firebase-style dict to a list for easier frontend processing
                if history:
                    history_list = []
                    for key, value in history.items():
                        # Add the Firebase key as id field in each item
                        if isinstance(value, dict):
                            value['id'] = key
                        else:
                            value = {'id': key, 'data': value}
                        history_list.append(value)
                    
                    # Sort by timestamp if available
                    history_list.sort(
                        key=lambda x: x.get('timestamp', x.get('created_at', '')), 
                        reverse=True
                    )
                    
                    logger.info(f"📋 get_analysis_history: Converted to list with {len(history_list)} items")
                    return jsonify({'data': history_list, 'success': True}), 200
                else:
                    logger.info("📋 get_analysis_history: No history found, returning empty list")
                    return jsonify({'data': [], 'success': True}), 200
            elif isinstance(history, list):
                logger.info(f"📋 get_analysis_history: History items count: {len(history)}")
                return jsonify({'data': history, 'success': True}), 200
            else:
                logger.warning(f"⚠️ get_analysis_history: Unexpected history type: {type(history)}")
                return jsonify({'data': [], 'success': True}), 200
                
        except Exception as e:
            logger.error(f"💥 get_analysis_history: Unexpected error: {str(e)}")
            logger.error(f"📚 get_analysis_history: Error traceback: {traceback.format_exc()}")
            return jsonify({'error': str(e), 'success': False}), 500
            
        return jsonify(history), 200
        
    except Exception as e:
        logger.error(f"💥 get_analysis_history: Error occurred: {str(e)}")
        logger.error(f"📚 get_analysis_history: Error traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 400

@api.route('/debug/user-data', methods=['GET'])
@firebase_auth_required
def debug_user_data():
    """Debug endpoint to check user data"""
    try:
        from flask import current_app
        user_id = request.user['uid']
        logger.info(f"🔍 debug_user_data: Debug request for user {user_id}")
        
        if 'db_ref' not in current_app.config:
            return jsonify({'error': 'Database reference not configured'}), 500
        
        db_ref = current_app.config['db_ref']
        
        # Check if user exists in database
        user_data = db_ref.child('users').child(user_id).get()
        
        # Check all users in database
        all_users = db_ref.child('users').get()
        user_keys = list(all_users.keys()) if all_users else []
        
        debug_info = {
            'current_user_id': user_id,
    'user_exists': user_data is not None,
            'user_data': user_data,
            'all_user_keys': user_keys,
            'total_users': len(user_keys),
            'auth_info': {
                'email': request.user.get('email'),
                'name': request.user.get('name'),
                'firebase_uid': request.user.get('uid')
            }
        }
        
                logger.info(f"🔍 debug_user_data: Debug info compiled")
        return jsonify(debug_info), 200
        
    except Exception as e:
        logger.error(f"💥 debug_user_data: Error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api.route('/user/profile', methods=['PUT'])
@firebase_auth_required
def update_user_profile():
    """Update user profile"""
    try:
        from flask import current_app
        logger.info(f"🔄 update_user_profile: Request received from user {request.user.get('uid', 'unknown')}")
        
        if 'db_ref' not in current_app.config:
            logger.error("❌ update_user_profile: No database reference in app config")
            return jsonify({'error': 'Database reference not configured', 'success': False}), 500
            
        user_auth = UserAuth(current_app.config['db_ref'])
        user_id = request.user['uid']
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided', 'success': False}), 400
            
        # Add update timestamp
        data['profile_updated'] = datetime.now().isoformat()
        
        user_auth.update_user_profile(user_id, data)
        logger.info(f"✅ update_user_profile: Successfully updated profile for user {user_id}")
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        logger.error(f"💥 update_user_profile: Error occurred: {str(e)}")
        logger.error(f"📚 update_user_profile: Error traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@api.route('/user/ensure-profile', methods=['POST'])
@firebase_auth_required
def ensure_user_profile():
    """Ensure user profile exists, create if it doesn't"""
    try:
        from flask import current_app
        logger.info(f"🔍 ensure_user_profile: Checking profile for user {request.user.get('uid', 'unknown')}")
        
        if 'db_ref' not in current_app.config:
            logger.error("❌ ensure_user_profile: No database reference in app config")
            return jsonify({'error': 'Database reference not configured', 'success': False}), 500
            
        user_id = request.user['uid']
        
        # Check if user profile exists
        profile = current_app.config['db_ref'].child('users').child(user_id).child('profile').get()
        
        if not profile:
            logger.info(f"👤 ensure_user_profile: Creating new profile for user {user_id}")
            
            # Get additional data from request body if provided
            data = request.get_json() or {}
            
            # Create default profile with user data from Firebase Auth
            default_profile = {
                'uid': user_id,
                'email': request.user.get('email', ''),
                'display_name': request.user.get('name', ''),
                'profile_created': datetime.now().isoformat(),
                'profile_updated': datetime.now().isoformat(),
                **data  # Include any additional data provided
            }
            
            # Create the profile
            current_app.config['db_ref'].child('users').child(user_id).child('profile').set(default_profile)
            logger.info(f"✅ ensure_user_profile: Created new profile for user {user_id}")
            
            return jsonify({'data': default_profile, 'success': True, 'created': True}), 200
        else:
            logger.info(f"✅ ensure_user_profile: Profile already exists for user {user_id}")
            return jsonify({'data': profile, 'success': True, 'created': False}), 200
            
    except Exception as e:
        logger.error(f"💥 ensure_user_profile: Error occurred: {str(e)}")
        logger.error(f"📚 ensure_user_profile: Error traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@api.route('/debug/user-data', methods=['GET'])
@firebase_auth_required
def debug_user_data():
    """Debug endpoint to check user data"""
    try:
        from flask import current_app
        user_id = request.user['uid']
        logger.info(f"🔍 debug_user_data: Debug request for user {user_id}")
        
        if 'db_ref' not in current_app.config:
            return jsonify({'error': 'Database reference not configured'}), 500
        
        db_ref = current_app.config['db_ref']
        
        # Check if user exists in database
        user_data = db_ref.child('users').child(user_id).get()
        
        # Check all users in database
        all_users = db_ref.child('users').get()
        user_keys = list(all_users.keys()) if all_users else []
        
        debug_info = {
            'current_user_id': user_id,
            'user_exists': user_data is not None,
            'user_data': user_data,
            'all_user_keys': user_keys,
            'total_users': len(user_keys),
            'auth_info': {
                'email': request.user.get('email'),
                'name': request.user.get('name'),
                'firebase_uid': request.user.get('uid')
            }
        }
        
        logger.info(f"🔍 debug_user_data: Debug info compiled")
        return jsonify(debug_info), 200
        
    except Exception as e:
        logger.error(f"💥 debug_user_data: Error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500



@api.route('/user/profile', methods=['GET'])
@firebase_auth_required
def get_user_profile():
    """Get user profile"""
    try:
        from flask import current_app
        logger.info(f"👤 get_user_profile: Request received from user {request.user.get('uid', 'unknown')}")
        
        if 'db_ref' not in current_app.config:
            logger.error("❌ get_user_profile: No database reference in app config")
            return jsonify({'error': 'Database reference not configured', 'success': False}), 500
            
        user_auth = UserAuth(current_app.config['db_ref'])
        user_id = request.user['uid']
        
        try:
            profile = user_auth.get_user_profile(user_id)
            logger.info(f"✅ get_user_profile: Successfully fetched profile for user {user_id}")
            return jsonify({'data': profile, 'success': True}), 200
        except Exception as e:
            if "User not found" in str(e):
                logger.info(f"👤 get_user_profile: User profile not found, creating new profile for user {user_id}")
                
                # Create default profile with user data from Firebase Auth
                default_profile = {
                    'uid': user_id,
                    'email': request.user.get('email', ''),
                    'display_name': request.user.get('name', ''),
                    'profile_created': datetime.now().isoformat(),
                    'profile_updated': datetime.now().isoformat()
                }
                
                # Create the profile
                current_app.config['db_ref'].child('users').child(user_id).child('profile').set(default_profile)
                logger.info(f"✅ get_user_profile: Created new profile for user {user_id}")
                
                return jsonify({'data': default_profile, 'success': True}), 200
            else:
                logger.error(f"💥 get_user_profile: Error fetching profile: {str(e)}")
                return jsonify({'error': str(e), 'success': False}), 500
                
    except Exception as e:
        logger.error(f"💥 get_user_profile: Error occurred: {str(e)}")
        logger.error(f"📚 get_user_profile: Error traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@api.route('/user/profile', methods=['PUT'])
@firebase_auth_required
def update_user_profile():
    """Update user profile"""
    try:
        from flask import current_app
        logger.info(f"🔄 update_user_profile: Request received from user {request.user.get('uid', 'unknown')}")
        
        if 'db_ref' not in current_app.config:
            logger.error("❌ update_user_profile: No database reference in app config")
            return jsonify({'error': 'Database reference not configured', 'success': False}), 500
            
        user_auth = UserAuth(current_app.config['db_ref'])
        user_id = request.user['uid']
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided', 'success': False}), 400
            
        # Add update timestamp
        data['profile_updated'] = datetime.now().isoformat()
        
        user_auth.update_user_profile(user_id, data)
        logger.info(f"✅ update_user_profile: Successfully updated profile for user {user_id}")
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        logger.error(f"💥 update_user_profile: Error occurred: {str(e)}")
        logger.error(f"📚 update_user_profile: Error traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@api.route('/user/ensure-profile', methods=['POST'])
@firebase_auth_required
def ensure_user_profile():
    """Ensure user profile exists, create if it doesn't"""
    try:
        from flask import current_app
        logger.info(f"🔍 ensure_user_profile: Checking profile for user {request.user.get('uid', 'unknown')}")
        
        if 'db_ref' not in current_app.config:
            logger.error("❌ ensure_user_profile: No database reference in app config")
            return jsonify({'error': 'Database reference not configured', 'success': False}), 500
            
        user_id = request.user['uid']
        
        # Check if user profile exists
        profile = current_app.config['db_ref'].child('users').child(user_id).child('profile').get()
        
        if not profile:
            logger.info(f"👤 ensure_user_profile: Creating new profile for user {user_id}")
            
            # Get additional data from request body if provided
            data = request.get_json() or {}
            
            # Create default profile with user data from Firebase Auth
            default_profile = {
                'uid': user_id,
                'email': request.user.get('email', ''),
                'display_name': request.user.get('name', ''),
                'profile_created': datetime.now().isoformat(),
                'profile_updated': datetime.now().isoformat(),
                **data  # Include any additional data provided
            }
            
            # Create the profile
            current_app.config['db_ref'].child('users').child(user_id).child('profile').set(default_profile)
            logger.info(f"✅ ensure_user_profile: Created new profile for user {user_id}")
            
            return jsonify({'data': default_profile, 'success': True, 'created': True}), 200
        else:
            logger.info(f"✅ ensure_user_profile: Profile already exists for user {user_id}")
            return jsonify({'data': profile, 'success': True, 'created': False}), 200
            
    except Exception as e:
        logger.error(f"💥 ensure_user_profile: Error occurred: {str(e)}")
        logger.error(f"📚 ensure_user_profile: Error traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@api.route('/debug/migrate-data', methods=['POST'])
@firebase_auth_required
def migrate_user_data():
    """Debug endpoint to migrate data from old user ID to new user ID"""
    try:
        from flask import current_app
        current_user_id = request.user['uid']
        data = request.get_json()
        old_user_id = data.get('old_user_id')
        
        if not old_user_id:
            return jsonify({'error': 'old_user_id is required'}), 400
        
        logger.info(f"🔄 migrate_user_data: Migrating data from {old_user_id} to {current_user_id}")
        
        if 'db_ref' not in current_app.config:
            return jsonify({'error': 'Database reference not configured'}), 500
        
        db_ref = current_app.config['db_ref']
        
        # Get old user data
        old_user_data = db_ref.child('users').child(old_user_id).get()
        
        if not old_user_data:
            return jsonify({'error': f'No data found for user {old_user_id}'}), 404
        
        # Copy data to new user ID
        db_ref.child('users').child(current_user_id).set(old_user_data)
        
        # Optionally remove old data (commented out for safety)
        # db_ref.child('users').child(old_user_id).delete()
        
        logger.info(f"✅ migrate_user_data: Successfully migrated data from {old_user_id} to {current_user_id}")
        return jsonify({
            'success': True,
            'migrated_from': old_user_id,
            'migrated_to': current_user_id,
            'data_keys': list(old_user_data.keys()) if isinstance(old_user_data, dict) else []
        }), 200
        
    except Exception as e:
        logger.error(f"💥 migrate_user_data: Error occurred: {str(e)}")
        return jsonify({'error': str(e)}), 500

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
                    
                    logger.debug("[ROUTE: /api/analyze/gemini-only] Opening image with PIL")
                    image = Image.open(io.BytesIO(contents))
                    logger.info(f"[ROUTE: /api/analyze/gemini-only] Image opened successfully, format: {image.format}, size: {image.size}")
                    
                    # Resize if needed to meet Gemini's requirements
                    total_pixels = image.size[0] * image.size[1]
                    if total_pixels > 1920 * 1080:  # If larger than ~2MP
                        ratio = math.sqrt((1920 * 1080) / total_pixels)
                        new_size = tuple(int(dim * ratio) for dim in image.size)
                        image = image.resize(new_size, Image.LANCZOS)
                        logger.info(f"[ROUTE: /api/analyze/gemini-only] Resized image to: {new_size}")
                    
                    # Save temporarily with compression
                    temp_path = f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                    logger.debug(f"[ROUTE: /api/analyze/gemini-only] Saving optimized image to: {temp_path}")
                    image.save(temp_path, 'JPEG', quality=85, optimize=True)
                    logger.info(f"[ROUTE: /api/analyze/gemini-only] Saved optimized image: {temp_path}")
                    
                except Exception as e:
                    logger.error(f"[ROUTE: /api/analyze/gemini-only] Error processing uploaded image: {str(e)}")
                    logger.error(traceback.format_exc())
                    return jsonify({'error': f"Error processing uploaded image: {str(e)}"}), 400
                    
        # If no file uploaded, try image URL
        if not image and 'imageUrl' in request.json:
            image_url = request.json['imageUrl']
            logger.info(f"[ROUTE: /api/analyze/gemini-only] Processing image from URL: {image_url}")
            
            try:
                if image_url.startswith(('http://', 'https://')):
                    # Download image from URL
                    response = requests.get(image_url, timeout=10)
                    response.raise_for_status()
                    image = Image.open(io.BytesIO(response.content))
                elif os.path.exists(image_url):
                    # Load local file
                    image = Image.open(image_url)
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

        # Initialize Car Damage RAG system
        try:
            car_damage_analyzer = CarDamageRAG()
            analysis = car_damage_analyzer.analyze_image(temp_path if temp_path else image_url)
            
            logger.info("[ROUTE: /api/analyze/gemini-only] Successfully analyzed image with Car Damage RAG")
            
            # Extract key information
            confidence = analysis.get('confidence', 0.4)
            damage_regions = analysis.get('identifiedDamageRegions', [])
            raw_analysis = analysis.get('raw_analysis', '')
            
            # Parse recommendations from analysis text
            recommendations = []
            current_analysis = []
            section_lines = raw_analysis.split('\n')
            in_recommendations = False
            
            for line in section_lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Look for recommendation sections
                if any(keyword in line.lower() for keyword in ['recommendation', 'suggest', 'should', 'repair', 'next steps']):
                    in_recommendations = True
                elif line.startswith(('💰', '⚠️', '📋')):  # New section markers
                    in_recommendations = False
                
                if in_recommendations:
                    if line.startswith(('•', '-', '*', '1.', '2.', '3.', '4.', '5.')):
                        clean_line = line.lstrip('•-* 123456789.').strip()
                        if clean_line:
                            recommendations.append(clean_line)
                else:
                    current_analysis.append(line)
            
            # If no specific recommendations found, create default ones
            if not recommendations:
                if damage_regions:
                    recommendations = [
                        "Professional inspection recommended for detailed assessment",
                        "Document all damage with photos for insurance",
                        "Get multiple repair quotes from certified shops",
                        "Check impact on safety systems and structural integrity"
                    ]
                else:
                    recommendations = [
                        "No immediate action required - vehicle appears undamaged",
                        "Continue regular maintenance schedule",
                        "Keep photo record for future reference",
                        "Consider periodic professional inspections"
                    ]
            
            # Clean up temp file if it exists
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                    logger.debug(f"[ROUTE: /api/analyze/gemini-only] Cleaned up temp file: {temp_path}")
                except Exception as e:
                    logger.warning(f"[ROUTE: /api/analyze/gemini-only] Error removing temp file: {str(e)}")
            
            # Parse the raw analysis to structured format
            logger.info("[ROUTE: /api/analyze/gemini-only] Converting raw analysis to structured format")
            structured_data = parse_ai_response_to_damage_result(raw_analysis)
            
            # Override with actual analysis data
            structured_data.update({
                'confidence': confidence,
                'identifiedDamageRegions': damage_regions,
                'recommendations': recommendations
            })
            
            # Return structured response in expected format
            return jsonify({
                'data': {
                    'raw_analysis': raw_analysis,
                    'structured_data': structured_data
                }
            }), 200
            
        except Exception as e:
            logger.error(f"[ROUTE: /api/analyze/gemini-only] Error in Gemini analysis: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Check if this is a quota exceeded error (429)
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower() or "ResourceExhausted" in error_str:
                # Extract retry delay if available
                retry_delay_match = re.search(r'retry_delay.*?seconds:\s*(\d+)', error_str)
                retry_delay = retry_delay_match.group(1) if retry_delay_match else "60"
                
                logger.info("[ROUTE: /api/analyze/gemini-only] Quota exceeded, using smart local analysis")
                
                # Use smart local analysis instead of random demo
                try:
                    smart_analysis = create_smart_demo_response(temp_path)
                    demo_analysis = smart_analysis['description']
                    
                    # Use the actual detected regions from local analysis
                    detected_regions = smart_analysis.get('damage_regions', [])
                    
                    # Create structured demo data based on local analysis
                    structured_data = parse_ai_response_to_damage_result(demo_analysis)
                    structured_data.update({
                        'confidence': smart_analysis['confidence'],
                        'damageType': smart_analysis['damageType'],
                        'damageDescription': f"{smart_analysis['damageType']} detected using local analysis",
                        'identifiedDamageRegions': detected_regions,  # Use actual detected regions
                        'recommendations': [
                            "This analysis uses local computer vision (Gemini API unavailable)",
                            "Professional inspection recommended for detailed assessment",
                            "Get multiple repair quotes from certified garages",
                            "Document damage with additional photos for insurance",
                            f"Gemini API quota exceeded - wait {retry_delay} seconds or upgrade plan"
                        ],
                        'isDemoMode': True,
                        'isLocalAnalysis': True
                    })
                    
                    logger.info(f"[ROUTE] Smart local analysis completed: {len(detected_regions)} regions detected")
                    
                except Exception as local_error:
                    logger.error(f"Local analysis failed: {str(local_error)}")
                    # Fallback to simple demo response
                    demo_scenarios = [
                        {
                            "damageType": "Minor Scratch",
                            "description": "Light surface scratch detected on front bumper",
                            "severity": "Minor",
                            "cost_rupees": "₹3,500",
                            "cost_dollars": "$42"
                        },
                        {
                            "damageType": "Small Dent",
                            "description": "Minor dent detected on side panel",
                            "severity": "Minor",
                            "cost_rupees": "₹4,500",
                            "cost_dollars": "$54"
                        },
                        {
                            "damageType": "Paint Damage",
                            "description": "Paint damage detected on rear section",
                            "severity": "Moderate",
                            "cost_rupees": "₹6,000",
                            "cost_dollars": "$72"
                        }
                    ]
                    
                    # Select random scenario for variety
                    scenario = random.choice(demo_scenarios)
                    
                    # Provide a demo response when quota is exceeded
                    demo_analysis = f"""
🚗 DEMO ANALYSIS (API Quota Exceeded)

📋 VEHICLE IDENTIFICATION:
Make: Demo Vehicle
Model: Sample Car
Year: 2020
Confidence: MEDIUM (70%)

🔍 DAMAGE ASSESSMENT:
Primary Damage: {scenario['damageType']}
Location: Vehicle exterior
Severity: {scenario['severity']}
Confidence: 70%

Description: {scenario['description']}

💰 REPAIR COST ESTIMATE:
Conservative: {scenario['cost_rupees']} ({scenario['cost_dollars']})
Comprehensive: ₹{int(scenario['cost_rupees'].replace('₹', '').replace(',', '')) + 2000:,} (${int(scenario['cost_dollars'].replace('$', '')) + 25})

📝 RECOMMENDATIONS:
• This is a demo response due to API quota limits
• Professional inspection recommended for accurate assessment
• Get multiple repair quotes from certified garages
• Document damage with additional photos for insurance
• Consider the extent of damage before filing a claim

⚠️ Note: This is a demonstration response. Actual API quota exceeded.
Please wait {retry_delay} seconds before trying again or upgrade your API plan.

The Gemini API has exceeded its quota. This demo shows sample damage analysis capabilities.
"""
                    
                    # Create structured demo data
                    structured_data = parse_ai_response_to_damage_result(demo_analysis)
                    structured_data.update({
                        'confidence': 0.7,
                        'damageType': scenario['damageType'],
                        'damageDescription': scenario['description'],
                        'identifiedDamageRegions': [
                            {
                                'x': random.randint(50, 150), 
                                'y': random.randint(100, 200), 
                                'width': random.randint(60, 100), 
                                'height': random.randint(40, 80),
                                'damageType': scenario['damageType'], 
                                'confidence': 0.7
                            }
                        ],
                        'recommendations': [
                            "This is a demo response due to API quota limits",
                            "Professional inspection recommended for accurate assessment",
                            "Get multiple repair quotes from certified garages",
                            "Document damage with additional photos for insurance",
                            f"Please wait {retry_delay} seconds before trying again"
                        ],
                        'isDemoMode': True
                    })
                
                return jsonify({
                    'data': {
                        'raw_analysis': demo_analysis,
                        'structured_data': structured_data
                    },
                    'demo_mode': True,
                    'quota_exceeded': True,
                    'retry_delay_seconds': int(retry_delay)
                }), 200
            else:
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

@api.route('/analysis/save', methods=['POST'])
@firebase_auth_required
def save_analysis_result():
    """Save analysis result to user's history"""
    try:
        from flask import current_app
        logger.info(f"💾 save_analysis_result: Request received from user {request.user.get('uid', 'unknown')}")
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        user_auth = UserAuth(current_app.config['db_ref'])
        user_id = request.user['uid']
        
        # Add timestamp and user ID to the analysis data
        analysis_data = {
            'id': data.get('id', f'analysis_{int(time.time())}'),
            'userId': user_id,
            'uploadedAt': data.get('uploadedAt', datetime.now().isoformat()),
            'image': data.get('image', ''),
            'result': data.get('result', {}),
            'damageRegions': data.get('damageRegions', [])
        }
        
        logger.info(f"💾 save_analysis_result: Saving analysis data for user_id: {user_id}")
        logger.info(f"📝 save_analysis_result: Analysis data keys: {list(analysis_data.keys())}")
        
        # Save to database
        analysis_id = user_auth.save_analysis_result(user_id, analysis_data)
        
        logger.info(f"✅ save_analysis_result: Successfully saved with ID: {analysis_id}")
        return jsonify({'id': analysis_id, 'message': 'Analysis saved successfully'}), 200
        
    except Exception as e:
        logger.error(f"💥 save_analysis_result: Error occurred: {str(e)}")
        logger.error(f"📚 save_analysis_result: Error traceback: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 400