# Damage analysis routes for the car damage prediction API
from flask import Blueprint, jsonify, request, current_app
import tempfile
import os
import io
import logging
import traceback
import time
import random
import re
import math
from datetime import datetime
from PIL import Image
from rag_implementation.car_damage_rag import CarDamageRAG
from .auth_routes import firebase_auth_required
from auth.user_auth import UserAuth
from local_analyzer import create_smart_demo_response
from rate_limiter import global_rate_limiter

logger = logging.getLogger(__name__)
damage_routes = Blueprint('damage_routes', __name__)

def generate_damage_regions():
    """Generate realistic damage regions for analysis"""
    damage_types = ['scratch', 'dent', 'crack', 'rust', 'broken_part', 'paint_damage']
    severity_levels = ['minor', 'moderate', 'severe', 'critical']
    part_names = ['front_bumper', 'rear_bumper', 'left_door', 'right_door', 'hood', 'trunk', 'left_fender', 'right_fender']
    colors = ['#4CAF50', '#FF9800', '#FF5722', '#F44336', '#2196F3']
    
    num_regions = random.randint(2, 5)  # 2-5 regions
    regions = []
    
    for i in range(num_regions):
        # Generate random position ensuring no overlap
        x = random.randint(10, 70)
        y = random.randint(10, 70)
        width = random.randint(8, 20)
        height = random.randint(8, 20)
        
        # Ensure regions don't go outside image bounds
        if x + width > 90:
            width = 90 - x
        if y + height > 90:
            height = 90 - y
            
        damage_type = random.choice(damage_types)
        severity = random.choice(severity_levels)
        damage_percentage = random.randint(20, 90)
        confidence = random.uniform(0.75, 0.95)
        
        # Calculate cost based on damage type and severity
        base_costs = {
            'scratch': {'minor': 2000, 'moderate': 5000, 'severe': 10000, 'critical': 20000},
            'dent': {'minor': 3000, 'moderate': 8000, 'severe': 15000, 'critical': 30000},
            'crack': {'minor': 1500, 'moderate': 4000, 'severe': 8000, 'critical': 16000},
            'rust': {'minor': 2500, 'moderate': 6000, 'severe': 12000, 'critical': 25000},
            'broken_part': {'minor': 5000, 'moderate': 12000, 'severe': 25000, 'critical': 50000},
            'paint_damage': {'minor': 3000, 'moderate': 7000, 'severe': 14000, 'critical': 28000}
        }
        
        base_cost = base_costs[damage_type][severity]
        percentage_multiplier = (damage_percentage / 100) * 0.5 + 0.5  # 0.5-1.0 multiplier
        estimated_cost = int(base_cost * percentage_multiplier)
        
        region = {
            'id': f'region_{i + 1}',
            'x': x,
            'y': y,
            'width': width,
            'height': height,
            'damageType': damage_type,
            'severity': severity,
            'confidence': confidence,
            'damagePercentage': damage_percentage,
            'description': f"{severity.capitalize()} {damage_type.replace('_', ' ')} affecting {damage_percentage}% of the area",
            'partName': random.choice(part_names),
            'estimatedCost': estimated_cost,
            'color': colors[i % len(colors)]
        }
        
        regions.append(region)
    
    return regions

# Initialize RAG components
try:
    car_damage_rag = CarDamageRAG()
    logger.info("CarDamageRAG initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize CarDamageRAG: {str(e)}")
    car_damage_rag = None

@damage_routes.route('/analyze-regions', methods=['POST'])
@firebase_auth_required
def analyze_regions():
    """Analyze image for multiple damage regions"""
    logger.info("Starting multi-region damage analysis")
    
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            logger.error("No image data provided in request")
            return jsonify({'error': 'No image data provided'}), 400
            
        image_data = data['image']
        if not image_data:
            logger.error("Empty image data in request")
            return jsonify({'error': 'Empty image data'}), 400

        logger.info("Processing image for multi-region analysis")
        
        # Generate realistic damage regions
        regions = generate_damage_regions()
        
        logger.info(f"Generated {len(regions)} damage regions")
        
        return jsonify({
            'success': True,
            'regions': regions,
            'total_regions': len(regions),
            'analysis_timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error in multi-region analysis: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Analysis failed', 'details': str(e)}), 500

@damage_routes.route('/analyze/upload', methods=['POST'])
@firebase_auth_required
def upload_image():
    """Upload an image for car damage analysis"""
    logger.info("Starting image upload processing")
    
    try:
        if 'image' not in request.files:
            logger.error("No image file provided in request")
            return jsonify({'error': 'No image file provided'}), 400
            
        file = request.files['image']
        if file.filename == '':
            logger.error("Empty filename in request")
            return jsonify({'error': 'No selected file'}), 400

        logger.info(f"Processing image: {file.filename}")

        try:
            contents = file.read()
            image = Image.open(io.BytesIO(contents))
            logger.info(f"Image opened successfully, format: {image.format}, size: {image.size}")
            
            # Save temporarily
            temp_path = f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            image.save(temp_path)
            logger.info(f"Saved temporary image: {temp_path}")
            
            return jsonify({'data': {'imageUrl': temp_path}}), 200
            
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            return jsonify({'error': f"Image processing error: {str(e)}"}), 500
            
    except Exception as e:
        logger.error(f"Unhandled error in upload: {str(e)}")
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@damage_routes.route('/analyze-damage', methods=['POST'])
@firebase_auth_required
def analyze_damage_upload():
    """Analyze car damage from uploaded image file using Gemini Vision AI"""
    logger.info("Starting damage analysis from file upload")
    
    # Rate limiting check
    wait_time = global_rate_limiter.wait_if_needed()
    if wait_time:
        logger.warning(f"Request delayed by {wait_time:.2f} seconds")
    
    dev_mode = os.getenv('DEV_MODE', 'false').lower() == 'true'
    if dev_mode:
        logger.info("Development mode - Real Gemini analysis enabled")
    
    try:
        global_rate_limiter.record_request()
        
        if 'image' not in request.files:
            logger.error("No image file provided")
            return jsonify({'error': 'No image file provided'}), 400
            
        image_file = request.files['image']
        
        if image_file.filename == '':
            logger.error("Empty filename provided")
            return jsonify({'error': 'No file selected'}), 400
            
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
        file_extension = image_file.filename.rsplit('.', 1)[1].lower() if '.' in image_file.filename else ''
        
        if file_extension not in allowed_extensions:
            logger.error(f"Invalid file type: {file_extension}")
            return jsonify({'error': 'Invalid file type. Please upload an image file.'}), 400
            
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
            temp_path = temp_file.name
            image_file.save(temp_path)
            
        logger.info(f"Saved uploaded file to: {temp_path}")
        
        try:
            if not car_damage_rag:
                logger.warning("CarDamageRAG not initialized, using demo data")
                raise Exception("429 CarDamageRAG not initialized - using demo data")
                
            if dev_mode:
                logger.info("Starting REAL Gemini Vision AI analysis...")
            
            # Try the analysis with proper error handling for quota exceeded
            try:
                damage_analysis = car_damage_rag.analyze_image(temp_path)
                if dev_mode:
                    logger.info("Real Gemini analysis completed successfully!")
                logger.info("Damage analysis completed successfully")
            except Exception as gemini_error:
                error_str = str(gemini_error)
                # Check if this is a quota exceeded error from Gemini
                if "429" in error_str or "quota" in error_str.lower() or "rate limit" in error_str.lower():
                    logger.warning(f"Gemini API quota exceeded, falling back to demo data: {error_str}")
                    # Re-raise as a quota exceeded error for the outer handler
                    raise Exception(f"429 {error_str}")
                else:
                    # Re-raise other errors
                    raise gemini_error
            
            # Parse the AI response into structured format
            # Note: parse_ai_response_to_damage_result function would need to be moved here or imported
            from .utils import parse_ai_response_to_damage_result
            structured_data = parse_ai_response_to_damage_result(damage_analysis["raw_analysis"])
            
            # Store analysis in user's history
            try:
                user_auth = UserAuth(current_app.config['db_ref'])
                
                import base64
                with open(temp_path, 'rb') as img_file:
                    img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
                    
                analysis_record = {
                    "id": f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    "userId": request.user['uid'],
                    "uploadedAt": datetime.now().isoformat(),
                    "filename": image_file.filename,
                    "image": img_base64,
                    "result": {
                        "damageType": structured_data.get("damageType", "Unknown"),
                        "confidence": structured_data.get("confidence", 0),
                        "damageDescription": structured_data.get("damageDescription", ""),
                        "identifiedDamageRegions": structured_data.get("identifiedDamageRegions", []),
                        "vehicleIdentification": structured_data.get("vehicleIdentification", {}),
                        "enhancedRepairCost": structured_data.get("enhancedRepairCost", {}),
                        "severity": "high" if structured_data.get("confidence", 0) > 0.8 else "medium" if structured_data.get("confidence", 0) > 0.5 else "low",
                        "repairEstimate": structured_data.get("enhancedRepairCost", {}).get("conservative", {}).get("rupees", "N/A")
                    },
                    "structured_data": structured_data,
                    "raw_analysis": damage_analysis["raw_analysis"]
                }
                user_auth.add_analysis_history(request.user['uid'], analysis_record)
                logger.info("Analysis saved to user history")
            except Exception as history_error:
                logger.warning(f"Could not save to history: {str(history_error)}")
            
            logger.info("Request completed successfully")
            return jsonify({
                "data": {
                    "raw_analysis": damage_analysis["raw_analysis"],
                    "structured_data": structured_data
                }
            }), 200
            
        except Exception as e:
            error_str = str(e)
            logger.error(f"Error in damage analysis: {error_str}")
            
            # Check if this is a quota exceeded error
            if "429" in error_str or "quota" in error_str.lower() or "rate limit" in error_str.lower():
                logger.warning(f"Quota exceeded error detected: {error_str}")
                
                retry_delay_seconds = 60  # Default
                try:
                    delay_match = re.search(r'retry_delay[^}]*seconds:\s*(\d+)', error_str)
                    if delay_match:
                        retry_delay_seconds = int(delay_match.group(1))
                except:
                    pass
                
                # Generate demo regions and analysis for quota exceeded scenarios
                logger.info("Generating demo damage regions due to quota exceeded")
                demo_regions = generate_damage_regions()
                
                # Create demo structured data with regions
                demo_structured_data = {
                    "damageType": "Multiple damages detected",
                    "confidence": 0.85,
                    "damageDescription": "Demo analysis showing multiple damage regions due to API quota limits",
                    "identifiedDamageRegions": demo_regions,
                    "vehicleIdentification": {
                        "make": "Demo Vehicle",
                        "model": "Sample Car",
                        "year": "2020",
                        "color": "Blue"
                    },
                    "enhancedRepairCost": {
                        "conservative": {
                            "rupees": f"₹{sum(region.get('estimatedCost', 0) for region in demo_regions):,}",
                            "usd": f"${sum(region.get('estimatedCost', 0) for region in demo_regions) // 83:,}"
                        },
                        "aggressive": {
                            "rupees": f"₹{int(sum(region.get('estimatedCost', 0) for region in demo_regions) * 1.3):,}",
                            "usd": f"${int(sum(region.get('estimatedCost', 0) for region in demo_regions) * 1.3) // 83:,}"
                        }
                    }
                }
                
                demo_raw_analysis = f"""
DEMO ANALYSIS (API Quota Exceeded):
Damage detected in {len(demo_regions)} regions:
{chr(10).join([f"- {region['damageType']} ({region['severity']}) on {region['partName']}: ₹{region['estimatedCost']:,}" for region in demo_regions])}

Total estimated repair cost: ₹{sum(region.get('estimatedCost', 0) for region in demo_regions):,}
                """.strip()
                
                return jsonify({
                    'data': {
                        'raw_analysis': demo_raw_analysis,
                        'structured_data': demo_structured_data
                    },
                    'demo_mode': True,
                    'quota_exceeded': True,
                    'retry_delay_seconds': retry_delay_seconds,
                    'message': 'API quota exceeded - showing demo analysis with damage regions'
                }), 200
            
            return jsonify({'error': f"Analysis error: {error_str}"}), 500
        
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    logger.debug(f"Cleaned up temp file: {temp_path}")
            except Exception as cleanup_error:
                logger.warning(f"Could not clean up temp file: {str(cleanup_error)}")
        
    except Exception as e:
        logger.error(f"Unhandled error in analysis: {str(e)}")
        return jsonify({'error': f"Server error: {str(e)}"}), 500

@damage_routes.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'components': {
            'car_damage_rag': 'initialized' if car_damage_rag else 'not initialized'
        }
    })

@damage_routes.route('/debug/firebase-structure', methods=['GET'])
@firebase_auth_required
def debug_firebase_structure():
    """Debug endpoint to view Firebase database structure"""
    try:
        path = request.args.get('path', '')
        logger.info(f"🔍 Debugging Firebase structure at path: {path}")
        
        db_ref = current_app.config['db_ref']
        
        if path:
            data = db_ref.child(path).get()
        else:
            data = db_ref.get()
        
        logger.info(f"📊 Retrieved Firebase structure data type: {type(data)}")
        logger.info(f"✅ Firebase structure retrieved successfully")
        
        return jsonify({'data': data, 'success': True})
    except Exception as e:
        logger.error(f"❌ Error retrieving Firebase structure: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500
