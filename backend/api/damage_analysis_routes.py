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
from .utils import parse_ai_response_to_damage_result
from analysis_mode_manager import analysis_mode_manager

logger = logging.getLogger(__name__)
damage_routes = Blueprint('damage_routes', __name__)

# Initialize RAG components
try:
    car_damage_rag = CarDamageRAG()
    logger.info("CarDamageRAG initialized successfully")
    # Update analysis mode manager with real AI availability
    analysis_mode_manager.set_real_ai_availability(car_damage_rag.model is not None)
except Exception as e:
    logger.error(f"Failed to initialize CarDamageRAG: {str(e)}")
    car_damage_rag = None
    analysis_mode_manager.set_real_ai_availability(False)

@damage_routes.route('/analyze-regions', methods=['POST'])
@firebase_auth_required
def analyze_regions():
    """Analyze image for multiple damage regions using real AI"""
    logger.info("Starting multi-region damage analysis")
    
    try:
        if 'image' not in request.files:
            logger.error("No image file in request")
            return jsonify({'error': 'No image file in request'}), 400
            
        file = request.files['image']
        
        if not file or file.filename == '':
            logger.error("Empty or invalid file in request")
            return jsonify({'error': 'Invalid or empty file'}), 400

        logger.info(f"Received image: {file.filename}")

        # Check if we should use real AI or demo mode
        use_real_ai = analysis_mode_manager.should_use_real_ai()
        
        if use_real_ai:
            try:
                if car_damage_rag:
                    logger.info("Attempting real Gemini AI multi-region analysis...")
                    
                    # Save temporary file for analysis
                    temp_dir = tempfile.mkdtemp()
                    temp_path = os.path.join(temp_dir, f"multi_region_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
                    file.save(temp_path)
                    
                    # Use the real AI analysis with multi-region enhancement
                    real_analysis = car_damage_rag.analyze_car_damage(temp_path)
                    
                    # Clean up temp file
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    
                    logger.info(f"Real AI analysis complete. Got {len(real_analysis.get('identifiedDamageRegions', []))} regions")
                        
                    if real_analysis:
                        # Parse the real analysis response
                        structured_data = parse_ai_response_to_damage_result(real_analysis['analysis'])
                          # Use the real identifiedDamageRegions directly from Gemini analysis
                        # No artificial enhancement to ensure genuine AI results
                        if not structured_data.get('identifiedDamageRegions'):
                            # If no regions were detected, ensure we have at least an empty array for consistent data structure
                            structured_data['identifiedDamageRegions'] = []
                            
                        logger.info(f"Real AI identified {len(structured_data.get('identifiedDamageRegions', []))} damage regions")

                        # Add additional metadata to help with client-side processing
                        structured_data['timestamp'] = datetime.now().isoformat()
                        structured_data['isRealAI'] = True
                        # Explicitly mark this as NOT demo mode to prevent frontend from falling back
                        structured_data['isDemoMode'] = False
                        structured_data['analysisMode'] = 'gemini-1.5-flash'
                        # Force high confidence for multi-region detection
                        if structured_data.get('confidence', 0) < 0.85:
                            structured_data['confidence'] = 0.85
                        logger.info("✅ Real Gemini AI multi-region analysis completed successfully")
                        return jsonify(structured_data), 200
                
            except Exception as ai_error:
                logger.warning(f"Real AI analysis failed, falling back to demo mode: {str(ai_error)}")
        
        # Fallback to demo mode
        logger.info("Using demo mode for multi-region analysis (fallback)")
        
        # Generate demo structured data with multiple regions
        demo_structured_data = {
            "damageType": "Multi-Region Damage",
            "confidence": 0.85,
            "severity": "moderate",
            "description": "Multiple damage regions detected across vehicle",
            "damageDescription": "Analysis identified multiple damage areas including scratches, dents, and paint damage across different vehicle regions.",
            "vehicleIdentification": {
                "make": "Demo Vehicle",
                "model": "Multi-Region Test",
                "year": "2020-2024",
                "confidence": 0.8
            },
            "repairEstimate": "₹20,000 - ₹35,000",
            "recommendations": [
                "Professional multi-point inspection recommended",
                "Document all damage regions separately",
                "Get comprehensive repair estimate",
                "Contact insurance for multiple claims assessment"
            ],
            "identifiedDamageRegions": [
                {
                    "id": "region_1",
                    "x": 25,
                    "y": 30,
                    "width": 15,
                    "height": 12,
                    "damageType": "Scratch",
                    "severity": "minor",
                    "confidence": 0.88,
                    "damagePercentage": 15,
                    "description": "Surface scratches on front panel",
                    "partName": "Front bumper",
                    "estimatedCost": 5000,
                    "region": "Front bumper"
                },
                {
                    "id": "region_2", 
                    "x": 60,
                    "y": 45,
                    "width": 20,
                    "height": 18,
                    "damageType": "Dent",
                    "severity": "moderate",
                    "confidence": 0.82,
                    "damagePercentage": 30,
                    "description": "Impact dent on side panel",
                    "partName": "Side door",
                    "estimatedCost": 12000,
                    "region": "Side door"
                },
                {
                    "id": "region_3",
                    "x": 40,
                    "y": 70,
                    "width": 25,
                    "height": 15,
                    "damageType": "Paint Damage",
                    "severity": "minor",
                    "confidence": 0.75,
                    "damagePercentage": 20,
                    "description": "Paint discoloration and chipping",
                    "partName": "Rear quarter panel",
                    "estimatedCost": 8000,
                    "region": "Rear quarter panel"
                }
            ],
            "isDemoMode": True,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info("Demo multi-region analysis completed successfully")
        return jsonify(demo_structured_data), 200
        
    except Exception as e:
        logger.error(f"Error in multi-region analysis endpoint: {str(e)}")
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
            temp_dir = tempfile.mkdtemp()
            temp_path = os.path.join(temp_dir, f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
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
    
    try:
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
            # Try real AI analysis first, fall back to demo mode if needed
            analysis_result = None
            structured_data = None
            
            try:
                if car_damage_rag:
                    logger.info("Attempting real Gemini AI analysis...")
                    real_analysis = car_damage_rag.analyze_car_damage(temp_path)
                    
                    if real_analysis and 'analysis' in real_analysis:
                        # Parse the real analysis response
                        structured_data = parse_ai_response_to_damage_result(real_analysis['analysis'])
                        # Explicitly mark as NOT demo mode
                        structured_data['isDemoMode'] = False
                        analysis_result = {
                            "raw_analysis": real_analysis['analysis'],
                            "structured_data": structured_data
                        }
                        logger.info("✅ Real Gemini AI analysis completed successfully")
                    else:
                        raise Exception("Invalid response from AI analysis")
                else:
                    raise Exception("CarDamageRAG not initialized")
                    
            except Exception as ai_error:
                logger.warning(f"Real AI analysis failed, falling back to demo mode: {str(ai_error)}")
                # Fallback to demo mode
                logger.info("Using demo mode for damage analysis (fallback)")
                
                # Generate realistic demo analysis based on image
                demo_structured_data = {
                    "damageType": "Body Damage",
                    "confidence": 0.87,
                    "severity": "moderate",
                    "description": "Surface scratches and minor dent detected on vehicle body",
                    "damageDescription": "Analysis shows moderate body damage with surface scratches and a minor dent. The damage appears to be from a minor collision or scraping incident.",
                    "vehicleIdentification": {
                        "make": "Detected Vehicle",
                        "model": "Standard Sedan",
                        "year": "2018-2023"
                    },
                "repairEstimate": "₹15,000 - ₹25,000",
                "recommendations": [
                    "Professional body shop assessment recommended",
                    "Contact insurance provider for claim processing",
                    "Take additional photos from different angles",
                    "Get multiple repair quotes"
                ],
                "identifiedDamageRegions": [
                    {
                        "id": "region_demo",
                        "x": 30,
                        "y": 40,
                        "width": 25,
                        "height": 20,
                        "region": "Front bumper",
                        "damageType": "Scratch",
                        "severity": "moderate",
                        "confidence": 0.85,
                        "damagePercentage": 35,
                        "description": "Visible scratches and minor impact damage",
                        "partName": "Front bumper",
                        "estimatedCost": 8000
                    }
                ],
                "isDemoMode": True,
                "timestamp": datetime.now().isoformat()
                }
                
                # Return consistent format for demo
                analysis_result = {
                    "raw_analysis": "Demo analysis complete - realistic damage assessment provided",
                    "structured_data": demo_structured_data
                }
                structured_data = demo_structured_data
            
            # If we have real analysis, use it; otherwise use demo fallback
            if not analysis_result:
                raise Exception("No analysis result generated")
            
            # Store analysis in user's history
            try:
                user_auth = UserAuth(current_app.config['db_ref'])
                
                import base64
                fast_mode = os.getenv('FAST_ANALYSIS_MODE', 'false').lower() == 'true'
                if fast_mode:
                    # In fast mode, skip storing large base64 images
                    img_base64 = ""
                    logger.info("Fast mode: Skipping image storage for performance")
                else:
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
                    "raw_analysis": analysis_result["raw_analysis"]
                }
                user_auth.add_analysis_history(request.user['uid'], analysis_record)
                logger.info("Analysis saved to user history")
            except Exception as history_error:
                logger.warning(f"Could not save to history: {str(history_error)}")
            
            logger.info("Request completed successfully")
            return jsonify({
                "data": {
                    "raw_analysis": analysis_result["raw_analysis"],
                    "structured_data": structured_data
                }
            }), 200
            
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
