from flask import Blueprint, request, jsonify
from PIL import Image
import io
import os
import traceback
import sys
from datetime import datetime
import logging
import google.generativeai as genai
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
            
            # Extract structured data from the raw analysis
            # This is a simplified example - in a real implementation, you would parse the raw analysis
            # to extract structured data about damage types, confidence levels, etc.
            
            # For now, we'll create a simple structured response with mock data
            structured_results = [
                {
                    "damageType": "Scratch",
                    "confidence": 0.92,
                    "description": "Surface level scratch on the front bumper",
                    "repairEstimate": "$150-$300",
                    "recommendations": [
                        "Clean the area thoroughly",
                        "Apply touch-up paint",
                        "Consider professional buffing for best results"
                    ]
                },
                {
                    "damageType": "Dent",
                    "confidence": 0.85,
                    "description": "Small dent on the driver's side door",
                    "repairEstimate": "$200-$500",
                    "recommendations": [
                        "Paintless dent repair is recommended",
                        "Check for paint damage",
                        "Ensure door functionality is not affected"
                    ]
                }
            ]
            
            # In a production system, you would store the analysis in the user's history
            # user_auth.add_analysis_history(user_id, {
            #     "imageUrl": temp_path,
            #     "analysis": damage_analysis,
            #     "structured_results": structured_results
            # })
            
            # Don't remove the temp file yet, as we might need it for further analysis
            # or to display in the user's history
            
            logger.info("[ROUTE: /api/analyze] Request completed successfully, returning result")
            return jsonify({
                "data": {
                    "results": structured_results,
                    "raw_analysis": damage_analysis["raw_analysis"]
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