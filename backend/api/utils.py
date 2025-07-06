# Utility functions for parsing AI responses
import re
import json
import logging
import traceback
from datetime import datetime

logger = logging.getLogger(__name__)

def parse_ai_response_to_damage_result(raw_analysis: str) -> dict:
    """Parse AI response into structured DamageResult format"""
    logger.info("[PARSER] Starting AI response parsing")
    logger.debug(f"[PARSER] Raw analysis length: {len(raw_analysis)} characters")
    
    def extract_damage_regions(text: str) -> list:
        """Extract damage regions from AI response"""
        try:
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
            make_patterns = [r'Make[:\s]*([^\n,\]]+)', r'Brand[:\s]*([^\n,\]]+)']
            model_patterns = [r'Model[:\s]*([^\n,\]]+)', r'Model Name[:\s]*([^\n,\]]+)']
            year_patterns = [r'Year[:\s]*(\d{4})', r'Model Year[:\s]*(\d{4})']
            
            make = "Unknown"
            model = "Unknown"
            year = "Unknown"
            confidence = 0.5
            
            for pattern in make_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    make = match.group(1).strip()
                    break
            
            for pattern in model_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    model = match.group(1).strip()
                    break
            
            for pattern in year_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    year = match.group(1).strip()
                    break
            
            return {
                "make": make,
                "model": model,
                "year": year,
                "trimLevel": "Unknown",
                "bodyStyle": "Unknown",
                "confidence": confidence,
                "identificationDetails": f"Vehicle identified as {make} {model}"
            }
        except Exception as e:
            logger.error(f"[PARSER] Error extracting vehicle identification: {str(e)}")
            return {"make": "Unknown", "model": "Unknown", "year": "Unknown", "confidence": 0.0}
    
    def extract_repair_costs(text: str) -> dict:
        """Extract repair costs from AI response"""
        try:
            conservative_match = re.search(r'Conservative[:\s]*₹([0-9,]+)', text, re.IGNORECASE)
            comprehensive_match = re.search(r'Comprehensive[:\s]*₹([0-9,]+)', text, re.IGNORECASE)
            
            conservative = conservative_match.group(1) if conservative_match else "3,000"
            comprehensive = comprehensive_match.group(1) if comprehensive_match else "5,000"
            
            return {
                "conservative": {"rupees": f"₹{conservative}", "dollars": "$36"},
                "comprehensive": {"rupees": f"₹{comprehensive}", "dollars": "$60"},
                "laborHours": "2-4 hours",
                "breakdown": {
                    "parts": {"rupees": f"₹{conservative}", "dollars": "$36"},
                    "labor": {"rupees": "₹1,000", "dollars": "$12"},
                    "materials": {"rupees": "₹500", "dollars": "$6"}
                }
            }
        except Exception as e:
            logger.error(f"[PARSER] Error extracting repair costs: {str(e)}")
            return {
                "conservative": {"rupees": "₹3,000", "dollars": "$36"},
                "comprehensive": {"rupees": "₹5,000", "dollars": "$60"}
            }
    
    def determine_damage_type_and_confidence(text: str) -> tuple:
        """Determine primary damage type and confidence from AI response"""
        text_lower = text.lower()
        
        if "demo analysis" in text_lower or "api quota exceeded" in text_lower:
            return "Demo Analysis", 0.85
        
        no_damage_indicators = ['no damage', 'good condition', 'no visible damage']
        if any(indicator in text_lower for indicator in no_damage_indicators):
            return "No Damage", 0.95
        
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
                confidence_match = re.search(r'confidence[:\s]*(\d+(?:\.\d+)?)', text_lower)
                confidence = float(confidence_match.group(1))/100 if confidence_match else 0.8
                if confidence > 1:
                    confidence = confidence / 100
                return damage_type, confidence
        
        return "General Damage", 0.7
    
    def extract_recommendations(text: str) -> list:
        """Extract recommendations from AI response"""
        try:
            recommendations = [
                "Professional inspection recommended",
                "Get multiple repair quotes",
                "Document damage thoroughly"
            ]
            
            if "scratch" in text.lower():
                recommendations.append("Consider touch-up paint for minor scratches")
            elif "dent" in text.lower():
                recommendations.append("Paintless dent repair may be possible")
            
            return recommendations
        except Exception as e:
            logger.error(f"[PARSER] Error extracting recommendations: {str(e)}")
            return ["Please consult a professional"]
    
    try:
        damage_type, confidence = determine_damage_type_and_confidence(raw_analysis)
        vehicle_id = extract_vehicle_identification(raw_analysis)
        repair_costs = extract_repair_costs(raw_analysis)
        damage_regions = extract_damage_regions(raw_analysis)
        recommendations = extract_recommendations(raw_analysis)
        
        description = raw_analysis.strip()
        
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
                    "laborHours": "0 hours"
                }
            }
        else:
            structured_result = {
                "damageType": damage_type,
                "confidence": confidence,
                "description": description,
                "damageDescription": f"{damage_type} detected with {int(confidence * 100)}% confidence",
                "recommendations": recommendations,
                "identifiedDamageRegions": damage_regions,
                "vehicleIdentification": vehicle_id,
                "enhancedRepairCost": repair_costs
            }
        
        logger.info(f"[PARSER] Successfully parsed AI response into structured format: {damage_type}")
        return structured_result
        
    except Exception as e:
        logger.error(f"[PARSER] Error parsing AI response: {str(e)}")
        logger.error(traceback.format_exc())
        
        return {
            "damageType": "Analysis Error",
            "confidence": 0.0,
            "description": "Error occurred while analyzing the image",
            "damageDescription": "Could not complete analysis",
            "recommendations": ["Please try uploading the image again", "Ensure image is clear and well-lit"],
            "identifiedDamageRegions": [],
            "vehicleIdentification": {"make": "Unknown", "model": "Unknown", "year": "Unknown", "confidence": 0.0},
            "enhancedRepairCost": {"conservative": {"rupees": "₹0", "dollars": "$0"}, "comprehensive": {"rupees": "₹0", "dollars": "$0"}}
        }
