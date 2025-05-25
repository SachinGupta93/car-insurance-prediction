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
            
            # Generate analysis using Gemini
            logger.info("Sending image to Gemini for analysis")
            response = self.model.generate_content([
                """You are an expert car damage analyzer. Analyze this car image and provide a detailed report with the following sections:
                1. Damage Assessment:
                   - Type of damage (scratch, dent, crack, etc.)
                   - Severity level (light, moderate, severe)
                   - Location of damage
                   - Extent of damage
                2. Repair Recommendations:
                   - Recommended repair methods
                   - Estimated repair costs
                   - Time required for repair
                3. Safety Implications:
                   - Immediate safety concerns
                   - Long-term implications
                4. Insurance Considerations:
                   - Likely insurance coverage
                   - Claim recommendations
                5. Additional Notes:
                   - Any other relevant observations
                Format the response in a clear, structured manner.""",
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
                f"""You are an expert car damage analyst. Answer the following question about car damage:
                
                Question: {query}
                
                {f"Additional context: {context}" if context else ""}
                
                Provide a detailed, accurate, and helpful response based on your expertise in car damage assessment,
                repair, and insurance. Include specific details and recommendations where appropriate."""
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
