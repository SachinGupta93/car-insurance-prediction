# filepath: d:\Car-damage-prediction\backend\rag_implementation\vehicle_rag.py
import os
from typing import List, Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime
import logging
import traceback

# Configure logging
logger = logging.getLogger(__name__)

class VehicleRAG:
    def __init__(self):
        try:
            load_dotenv()
            
            # Initialize Gemini with proper error handling
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found in environment! Set this key for full AI functionality.")
                logger.warning("Mock implementation will only be used as a last resort fallback.")
                self._use_mock = True
            else:
                genai.configure(api_key=api_key)
                # Try both model versions in case one is available
                try:
                    model_options = ["gemini-pro", "gemini-1.0-pro", "gemini-1.5-pro"]
                    for model_name in model_options:
                        try:
                            self.model = genai.GenerativeModel(model_name)
                            self._use_mock = False
                            logger.info(f"Vehicle RAG system initialized with Gemini {model_name}")
                            break
                        except Exception as specific_error:
                            logger.warning(f"Could not initialize {model_name}: {str(specific_error)}")
                    
                    if not hasattr(self, "model"):
                        raise Exception("No Gemini models available")
                        
                except Exception as model_error:
                    logger.error(f"All Gemini models failed: {str(model_error)}")
                    self._use_mock = True
                    logger.warning("Using mock implementation due to model unavailability")
        except Exception as e:
            logger.error(f"Error initializing VehicleRAG: {str(e)}")
            logger.error(traceback.format_exc())
            logger.warning("Falling back to mock implementation")
            self._use_mock = True
            
    def get_vehicle_info(self, user_id=None, make=None, model=None, year=None) -> Dict[str, Any]:
        """Get comprehensive vehicle information"""
        try:
            logger.info(f"Getting vehicle info for {make} {model} {year if year else ''}")
            
            # Only use mock if API key missing or no vehicle info provided
            if os.getenv("GEMINI_API_KEY") is None:
                logger.warning("GEMINI_API_KEY not found - using mock data")
                return self._mock_vehicle_info()
            
            if not (make and model):
                logger.warning("Missing vehicle make/model - using mock data")
                return self._mock_vehicle_info()
                
            # Build query based on available information
            query_parts = [make, model]
            if year:
                query_parts.append(year)
            
            query = " ".join(query_parts)
            
            # Generate comprehensive vehicle information using Gemini
            response = self.model.generate_content([
                f"You are an expert automotive consultant with decades of experience. Provide extremely comprehensive and detailed information about the {query}. Your analysis should be exhaustive and include:",
                "1. Complete technical specifications:",
                "   - Detailed engine specifications (displacement, cylinders, horsepower, torque, fuel system)",
                "   - Transmission details (type, gear ratios, drive systems)",
                "   - Performance metrics (0-60 time, top speed, braking distance, handling characteristics)",
                "   - Precise dimensions (length, width, height, wheelbase, ground clearance, cargo capacity)",
                "   - Weight distribution and chassis details",
                "2. Current market valuation:",
                "   - Precise market value ranges based on condition, mileage, and region",
                "   - Depreciation trend analysis",
                "   - Market demand factors affecting this specific model",
                "   - Comparison with similar vehicles in its class",
                "3. Known issues and maintenance profile:",
                "   - Common failure points specific to this model and year",
                "   - Recall history and technical service bulletins",
                "   - Maintenance schedule with detailed costs",
                "   - Long-term reliability projections",
                "4. Comprehensive safety analysis:",
                "   - All safety features and systems",
                "   - Crash test ratings from all major testing organizations",
                "   - Advanced driver assistance systems details",
                "   - Structural safety design elements",
                "5. Detailed fuel efficiency and environmental impact:",
                "   - Real-world fuel economy in various driving conditions",
                "   - Emissions data and environmental ratings",
                "   - Comparison to industry standards and competitors",
                "Format as detailed HTML with tables, lists, and sections for maximum readability and professional presentation."
            ],
            generation_config={"temperature": 0.2, "max_output_tokens": 2048})
            
            return {
                "specifications": response.text,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting vehicle info: {str(e)}")
            return self._mock_vehicle_info()
            
    def _mock_vehicle_info(self) -> Dict[str, Any]:
        """Return mock vehicle information for testing"""
        logger.info("Using mock vehicle info")
        
        # Mock response for UI testing
        specs_html = """
        <h3>2020 Toyota Camry Specifications</h3>
        <ul>
            <li><strong>Engine:</strong> 2.5L 4-Cylinder</li>
            <li><strong>Horsepower:</strong> 203 hp @ 6,600 rpm</li>
            <li><strong>Torque:</strong> 184 lb-ft @ 5,000 rpm</li>
            <li><strong>Transmission:</strong> 8-speed automatic</li>
            <li><strong>Drivetrain:</strong> Front-wheel drive</li>
            <li><strong>Fuel Economy:</strong> 28 city / 39 highway</li>
            <li><strong>Dimensions:</strong> 192.1" L x 72.4" W x 56.9" H</li>
            <li><strong>Curb Weight:</strong> 3,310 lbs</li>
            <li><strong>Safety Features:</strong> Toyota Safety Sense 2.0, 10 airbags, Star Safety System</li>
        </ul>
        <h4>Market Value Range</h4>
        <p>$18,500 - $22,300 depending on condition and mileage</p>
        """
        
        return {
            "specifications": specs_html,
            "timestamp": datetime.now().isoformat()
        }
    
    def estimate_repair_cost(self, make: str, model: str, damage_type: str) -> Dict[str, Any]:
        """Estimate repair costs based on vehicle and damage type"""
        try:
            logger.info(f"Estimating repair cost for {make} {model} with {damage_type} damage")
            
            if hasattr(self, "_use_mock") and self._use_mock:
                return self._mock_repair_cost(damage_type)
            
            # Generate cost estimate using Gemini
            response = self.model.generate_content([
                f"Estimate repair costs for a {make} {model} with {damage_type} damage:",
                "Please provide:",
                "1. Base repair cost",
                "2. Parts cost",
                "3. Labor cost",
                "4. Total estimated cost",
                "5. Confidence level in the estimate"
            ])
            
            return {
                "estimate": response.text,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error estimating repair cost: {str(e)}")
            return self._mock_repair_cost(damage_type)
            
    def _mock_repair_cost(self, damage_type: str) -> Dict[str, Any]:
        """Return mock repair cost estimates for testing"""
        logger.info(f"Using mock repair cost for {damage_type}")
        
        # Mock estimates based on damage type
        estimates = {
            "Scratch": {"estimate": "$300 - $800", "labor_hours": "2-4"},
            "Dent": {"estimate": "$450 - $1,200", "labor_hours": "3-6"},
            "Crack": {"estimate": "$650 - $1,500", "labor_hours": "4-8"},
            "Broken Light": {"estimate": "$250 - $600", "labor_hours": "1-2"},
            "Paint Damage": {"estimate": "$400 - $1,000", "labor_hours": "3-5"}
        }
        
        return estimates.get(damage_type, {"estimate": "$500 - $1,500", "labor_hours": "3-6"})
        
    def analyze_query(self, query, context=""):
        """Analyze a text query about vehicles using Gemini"""
        try:
            if hasattr(self, "_use_mock") and self._use_mock:
                return self._mock_query_analysis(query)
                
            logger.info(f"Analyzing vehicle query: {query}")
            
            # Generate analysis using Gemini
            logger.info("Sending vehicle query to Gemini for analysis")
            response = self.model.generate_content([
                f"""You are an expert automotive consultant with decades of experience. 
                Answer the following question about vehicles:
                
                Question: {query}
                
                {f"Additional context: {context}" if context else ""}
                
                Provide a detailed, accurate, and helpful response based on your expertise in vehicles,
                car specifications, maintenance, repair, and best practices. Include specific details and 
                recommendations where appropriate."""
            ])
            
            # Mock sources for demonstration purposes
            # In a real implementation, you would retrieve relevant sources from a knowledge base
            sources = [
                {
                    "title": "Vehicle Specifications Database",
                    "content": "Comprehensive database of vehicle specifications, features, and technical details.",
                    "url": "https://example.com/vehicle-specs"
                },
                {
                    "title": "Automotive Repair Guide",
                    "content": "Expert guide to vehicle maintenance, repair procedures, and troubleshooting.",
                    "url": "https://example.com/repair-guide"
                }
            ]
            
            return {
                "answer": response.text,
                "sources": sources,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error during vehicle query analysis: {str(e)}")
            logger.error(traceback.format_exc())
            return self._mock_query_analysis(query)
    
    def _mock_query_analysis(self, query):
        """Generate mock query analysis for testing"""
        logger.info(f"Using mock analysis for query: {query}")
        
        answer = """
        Modern vehicles typically have several systems that work together to ensure safety and performance:

        1. Powertrain: Includes the engine, transmission, and drivetrain components that generate and deliver power to the wheels.

        2. Suspension system: Controls the vehicle's ride quality and handling characteristics, consisting of springs, shock absorbers, and linkages.

        3. Braking system: Usually disc brakes in front and either disc or drum brakes in rear, with anti-lock braking systems (ABS) standard on most vehicles.

        4. Electrical system: Powers all electronic components including the starter, ignition, lights, and entertainment systems.

        5. Safety systems: Includes passive safety (airbags, crumple zones) and active safety features (electronic stability control, automatic emergency braking).

        Regular maintenance is crucial for all these systems, with most manufacturers recommending service intervals between 5,000-10,000 miles depending on driving conditions.
        """
        
        sources = [
            {
                "title": "Automotive Systems Overview",
                "content": "Comprehensive guide to the major systems in modern vehicles and how they function.",
                "url": "https://example.com/automotive-systems"
            },
            {
                "title": "Vehicle Maintenance Schedule",
                "content": "Recommended maintenance schedules for different vehicle types and driving conditions.",
                "url": "https://example.com/maintenance-schedule"
            }
        ]
        
        return {
            "answer": answer,
            "sources": sources,
            "timestamp": datetime.now().isoformat()
        }
