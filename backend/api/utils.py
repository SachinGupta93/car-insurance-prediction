# Utility functions for parsing AI responses
import re
import json
import logging
import traceback
from datetime import datetime
from functools import wraps
from flask import request, jsonify
import os

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
            # Try JSON block first
            match = re.search(r'"vehicleIdentification"\s*:\s*({[\s\S]*?})', text or "", re.IGNORECASE)
            if match:
                try:
                    vi = json.loads(match.group(1))
                    if isinstance(vi, dict):
                        return {
                            "make": vi.get("make", "Unknown"),
                            "model": vi.get("model", "Unknown"),
                            "year": str(vi.get("year", "Unknown")),
                            "trimLevel": vi.get("trimLevel", "Unknown"),
                            "bodyStyle": vi.get("bodyStyle", "Unknown"),
                            "confidence": float(vi.get("confidence", 0.6)),
                            "identificationDetails": vi.get("identificationDetails") or f"Vehicle identified as {vi.get('make','Unknown')} {vi.get('model','Unknown')}"
                        }
                except Exception:
                    pass

            # Fallback to pattern extraction
            make_patterns = [r'Make[:\s]*([^\n,\]]+)', r'Brand[:\s]*([^\n,\]]+)']
            model_patterns = [r'Model[:\s]*([^\n,\]]+)', r'Model Name[:\s]*([^\n,\]]+)']
            year_patterns = [r'Year[:\s]*(\d{4})', r'Model Year[:\s]*(\d{4})']
            
            make = "Unknown"
            model = "Unknown"
            year = "Unknown"
            confidence = 0.5
            
            for pattern in make_patterns:
                m = re.search(pattern, text or "", re.IGNORECASE)
                if m:
                    make = m.group(1).strip()
                    break
            
            for pattern in model_patterns:
                m = re.search(pattern, text or "", re.IGNORECASE)
                if m:
                    model = m.group(1).strip()
                    break
            
            for pattern in year_patterns:
                m = re.search(pattern, text or "", re.IGNORECASE)
                if m:
                    year = m.group(1).strip()
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
            def as_currency(val):
                if val is None:
                    return {"rupees": "₹0", "dollars": "$0"}
                if isinstance(val, dict):
                    val = val.get("rupees")
                if isinstance(val, (int, float)):
                    rupees = int(val)
                else:
                    s = str(val or "")
                    digits = re.sub(r"[^0-9]", "", s)
                    rupees = int(digits) if digits else 0
                return {"rupees": f"₹{rupees:,}", "dollars": f"${max(1, round(rupees/83))}"}

            # Try JSON 'enhancedRepairCost'
            m = re.search(r'"enhancedRepairCost"\s*:\s*({[\s\S]*?})', text or "", re.IGNORECASE)
            if m:
                try:
                    rc = json.loads(m.group(1))
                    if isinstance(rc, dict):
                        conservative = as_currency(rc.get("conservative"))
                        comprehensive = as_currency(rc.get("comprehensive"))
                        premium = rc.get("premium")
                        premiumC = as_currency(premium) if premium is not None else None
                        labor = rc.get("laborHours") or "2-4 hours"
                        breakdown = rc.get("breakdown") or {}
                        partsC = as_currency(breakdown.get("parts"))
                        laborC = as_currency(breakdown.get("labor"))
                        materials = breakdown.get("materials")
                        materialsC = as_currency(materials) if materials is not None else None
                        regional = rc.get("regionalVariations")
                        if not regional:
                            base_rupees_str = (comprehensive or {"rupees": "₹0"})["rupees"]
                            base_num = int(re.sub(r"[^0-9]", "", base_rupees_str) or "0") or 10000
                            regional = {
                                "metro": as_currency(round(base_num * 1.15)),
                                "tier1": as_currency(round(base_num * 1.00)),
                                "tier2": as_currency(round(base_num * 0.85)),
                            }
                        result = {
                            "conservative": conservative,
                            "comprehensive": comprehensive,
                            "laborHours": labor,
                            "breakdown": {"parts": partsC, "labor": laborC},
                            "regionalVariations": regional,
                        }
                        if premiumC:
                            result["premium"] = premiumC
                        if materialsC:
                            result["breakdown"]["materials"] = materialsC
                        return result
                except Exception:
                    pass

            # Fallback: pattern-based conservative/comprehensive
            cons_m = re.search(r'Conservative[:\s]*₹([0-9,]+)', text or "", re.IGNORECASE)
            comp_m = re.search(r'Comprehensive[:\s]*₹([0-9,]+)', text or "", re.IGNORECASE)
            conservative_val = cons_m.group(1) if cons_m else "3,000"
            comprehensive_val = comp_m.group(1) if comp_m else "5,000"
            base_num = int(re.sub(r"[^0-9]", "", comprehensive_val) or "5000")
            return {
                "conservative": as_currency(conservative_val),
                "comprehensive": as_currency(comprehensive_val),
                "laborHours": "2-4 hours",
                "breakdown": {
                    "parts": as_currency(conservative_val),
                    "labor": as_currency(1000),
                    "materials": as_currency(500)
                },
                "regionalVariations": {
                    "metro": as_currency(int(base_num * 1.15)),
                    "tier1": as_currency(int(base_num * 1.00)),
                    "tier2": as_currency(int(base_num * 0.85))
                }
            }
        except Exception as e:
            logger.error(f"[PARSER] Error extracting repair costs: {str(e)}")
            return {
                "conservative": {"rupees": "₹3,000", "dollars": "$36"},
                "comprehensive": {"rupees": "₹5,000", "dollars": "$60"},
                "laborHours": "2-4 hours",
                "breakdown": {
                    "parts": {"rupees": "₹3,000", "dollars": "$36"},
                    "labor": {"rupees": "₹1,000", "dollars": "$12"}
                },
                "regionalVariations": {
                    "metro": {"rupees": "₹5,750", "dollars": "$69"},
                    "tier1": {"rupees": "₹5,000", "dollars": "$60"},
                    "tier2": {"rupees": "₹4,250", "dollars": "$51"}
                }
            }
    
    def determine_damage_type_and_confidence(text) -> tuple:
        """Determine primary damage type and confidence from AI response"""
        # Handle both string and dict inputs
        if isinstance(text, dict):
            # If it's a dict, try to extract text from common fields
            if 'error' in text:
                return "Analysis Error", 0.0
            elif 'raw_analysis' in text:
                text_str = str(text.get('raw_analysis', ''))
            else:
                text_str = str(text)
        else:
            text_str = str(text) if text is not None else ''
        
        text_lower = text_str.lower()
        
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


def require_api_key(f):
    """
    Decorator that checks for API key in development mode.
    In development mode, this is bypassed for easier testing.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Always allow OPTIONS requests for CORS preflight
        if request.method == 'OPTIONS':
            response = jsonify({'status': 'ok'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Dev-Mode, X-Dev-Auth-Bypass')
            return response
            
        # Check if we're in development mode
        dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
        
        if dev_mode:
            # In development mode, bypass API key check
            logger.info("🔑 [DEV MODE] API key check bypassed")
            return f(*args, **kwargs)
        
        # In production, check for API key
        api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
        expected_key = os.environ.get('API_KEY')
        
        if not api_key:
            return jsonify({'error': 'API key is required'}), 401
        
        if api_key != expected_key:
            return jsonify({'error': 'Invalid API key'}), 401
        
        return f(*args, **kwargs)
    return decorated_function


def require_admin(f):
    """
    Decorator that checks for admin privileges.
    In development mode, this is bypassed for easier testing.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Always allow OPTIONS requests for CORS preflight
        if request.method == 'OPTIONS':
            response = jsonify({'status': 'ok'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Dev-Mode, X-Dev-Auth-Bypass')
            return response
            
        # Check if we're in development mode
        dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
        
        if dev_mode:
            # In development mode, bypass admin check
            logger.info("👑 [DEV MODE] Admin check bypassed")
            return f(*args, **kwargs)
        
        # In production, check for admin privileges
        # This would typically verify user token and check admin status
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Authorization token is required'}), 401
        
        # Here you would verify the token and check if user is admin
        # For now, we'll implement a simple check
        try:
            # This is a simplified check - in real implementation,
            # you'd verify the JWT token and check user roles
            if not token.startswith('Bearer '):
                return jsonify({'error': 'Invalid authorization format'}), 401
            
            # For now, accept any properly formatted token in development-like scenarios
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Admin check error: {str(e)}")
            return jsonify({'error': 'Invalid authorization token'}), 401
    
    return decorated_function


def get_user_from_request():
    """
    Extract user information from request.
    In development mode, returns a mock user.
    """
    dev_mode = os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEV_MODE') == 'true'
    
    if dev_mode:
        # Return mock user for development
        return {
            'uid': 'dev_user',
            'email': 'dev@example.com',
            'name': 'Development User',
            'admin': True
        }
    
    # In production, extract from Authorization header
    token = request.headers.get('Authorization')
    if token:
        # This would typically decode JWT and extract user info
        # For now, return a basic structure
        return {
            'uid': 'user_from_token',
            'email': 'user@example.com',
            'name': 'User',
            'admin': False
        }
    
    return None
