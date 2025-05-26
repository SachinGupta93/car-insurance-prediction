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
                # Try current available model versions in order of preference
                try:
                    model_options = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-1.0-pro-vision-latest"]
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
            
            # Generate comprehensive vehicle information using Gemini with Indian market focus
            response = self.model.generate_content([
                f"""🚗 INDIAN AUTOMOTIVE MARKET EXPERT & VEHICLE INTELLIGENCE SPECIALIST

You are a certified automotive consultant with 25+ years of experience specializing in the Indian automotive market, vehicle specifications, insurance optimization, and ownership costs across all major Indian cities.

🔍 COMPREHENSIVE VEHICLE ANALYSIS FOR: {query}

🇮🇳 INDIAN MARKET CONTEXT:
MARKET POSITIONING & AVAILABILITY:
- Launch date in Indian market and current availability status
- Popular variants sold in India (Base, Mid, Top, specific trim levels)
- Regional availability (Metro cities vs Tier-2/3 cities)
- Import vs locally manufactured status
- Market competition and positioning

INDIAN PRICING STRUCTURE:
- Ex-showroom prices across major cities (Mumbai, Delhi, Bangalore, Chennai, Pune)
- On-road price variations by state (registration, insurance, taxes)
- Regional price differences explanation
- Financing options and popular EMI structures
- Resale value trends in Indian market

📋 DETAILED TECHNICAL SPECIFICATIONS:
ENGINE & PERFORMANCE (INDIAN VARIANTS):
- Engine specifications for Indian market variants (displacement, cylinders, horsepower, torque)
- Fuel system details and efficiency ratings for Indian driving conditions
- Transmission options available in India (manual, automatic, CVT, AMT)
- Performance metrics relevant to Indian roads (city mileage, highway efficiency, ground clearance)
- Emission compliance (BS6, E20 fuel compatibility)

DIMENSIONS & CAPACITY (INDIAN RELEVANCE):
- Precise dimensions suitable for Indian parking spaces and roads
- Boot space and practicality for Indian families
- Ground clearance importance for Indian road conditions
- Seating configuration and space optimization

💰 COMPREHENSIVE COST ANALYSIS (DUAL CURRENCY):
PURCHASE COSTS:
- Ex-showroom price: ₹XX,XX,XXX ($XX,XXX USD)
- On-road price range: ₹XX,XX,XXX - ₹XX,XX,XXX ($XX,XXX - $XX,XXX USD)
- Insurance premium estimates: ₹XX,XXX ($XXX USD) annually
- Extended warranty costs: ₹XX,XXX ($XXX USD)

OWNERSHIP COSTS (5-YEAR PROJECTION):
- Annual maintenance costs: ₹XX,XXX ($XXX USD)
- Parts availability and pricing in India
- Authorized service center network coverage
- Fuel costs based on Indian consumption patterns
- Depreciation analysis for Indian market

🛠️ MAINTENANCE & RELIABILITY (INDIAN CONDITIONS):
INDIAN DRIVING CONDITIONS ANALYSIS:
- Performance in Indian traffic conditions (stop-go traffic, hill driving)
- Durability against Indian weather conditions (monsoon, extreme heat, dust)
- Common issues specific to Indian driving patterns
- Maintenance requirements for Indian conditions

SERVICE NETWORK & COSTS:
- Authorized service center coverage across India
- Average service costs at authorized centers vs local garages
- Parts availability timeline and pricing
- Warranty coverage and claim process in India

🏥 INSURANCE & PROTECTION (INDIAN MARKET):
INSURANCE CONSIDERATIONS:
- Typical insurance premium for this vehicle category
- IDV depreciation schedule for Indian market
- Popular insurance providers for this vehicle segment
- Cashless garage network availability
- NCB benefits and claim impact analysis

VEHICLE-SPECIFIC INSURANCE INSIGHTS:
- Insurance company preferences for this brand/model
- Common claim scenarios and settlement patterns
- Anti-theft device benefits and discounts
- Regional insurance cost variations

🏆 SAFETY & RATINGS (INDIAN STANDARDS):
SAFETY ANALYSIS:
- Global NCAP or IIHS ratings (if available)
- Indian safety standards compliance
- Standard vs optional safety features in Indian variants
- Comparison with competitors in safety equipment

SECURITY FEATURES:
- Anti-theft systems and effectiveness in Indian context
- Parking assistance for Indian city conditions
- Insurance-approved security systems

📊 MARKET COMPARISON & ALTERNATIVES:
COMPETITIVE ANALYSIS (INDIAN MARKET):
- Direct competitors available in India with pricing comparison
- Value proposition analysis for Indian buyers
- Popular alternatives in same price range
- Market share and popularity trends in India

RECOMMENDATION MATRIX:
- Best suited customer profile for Indian market
- City vs highway driving suitability
- Family size recommendations
- Budget alternatives and upgrade options

⚠️ BUYING RECOMMENDATIONS (INDIA-SPECIFIC):
PURCHASE STRATEGY:
- Best time to buy (discount seasons, new model launches)
- Recommended variants for different use cases
- Financing vs cash purchase analysis
- Trade-in value optimization

REGIONAL CONSIDERATIONS:
- Best cities to purchase (pricing advantages)
- State-specific benefits and incentives
- Registration and taxation implications
- After-sales service accessibility

FORMAT REQUIREMENTS:
- Provide all costs in ₹ (primary) with USD equivalent in parentheses
- Include HTML formatting for maximum readability
- Focus on Indian market relevance throughout
- Provide actionable insights for Indian buyers
- Include region-specific recommendations"""
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
        
        # Mock response for UI testing with Indian market context
        specs_html = """
        <h3>2020 Maruti Suzuki Swift ZXI Specifications (Indian Market)</h3>
        
        <h4>🇮🇳 Indian Market Information</h4>
        <ul>
            <li><strong>Launch Year in India:</strong> 2005 (Current Gen: 2017)</li>
            <li><strong>Manufacturing:</strong> Locally manufactured in Gurugram, Haryana</li>
            <li><strong>Market Position:</strong> Premium hatchback segment leader</li>
            <li><strong>Competition:</strong> Hyundai Grand i10 NIOS, Tata Tiago, Nissan Micra</li>
        </ul>
        
        <h4>💰 Indian Pricing (2020 Model)</h4>
        <ul>
            <li><strong>Ex-showroom Delhi:</strong> ₹7,25,000 ($8,700 USD)</li>
            <li><strong>On-road Delhi:</strong> ₹8,15,000 ($9,800 USD)</li>
            <li><strong>Price Range:</strong> ₹5,85,000 - ₹8,67,000 ($7,000 - $10,400 USD)</li>
            <li><strong>Insurance (Annual):</strong> ₹35,000 - ₹45,000 ($420 - $540 USD)</li>
        </ul>
        
        <h4>🔧 Technical Specifications</h4>
        <ul>
            <li><strong>Engine:</strong> 1.2L K-Series VVT Petrol</li>
            <li><strong>Power:</strong> 83 PS @ 6,000 rpm</li>
            <li><strong>Torque:</strong> 113 Nm @ 4,200 rpm</li>
            <li><strong>Transmission:</strong> 5-speed Manual / AMT</li>
            <li><strong>Drivetrain:</strong> Front-wheel drive</li>
            <li><strong>Fuel Economy:</strong> 21.21 kmpl (ARAI certified)</li>
            <li><strong>Dimensions:</strong> 3,845mm L x 1,735mm W x 1,530mm H</li>
            <li><strong>Ground Clearance:</strong> 163mm (ideal for Indian roads)</li>
            <li><strong>Boot Space:</strong> 268 liters</li>
            <li><strong>Safety Features:</strong> Dual airbags, ABS with EBD, rear parking sensors</li>
        </ul>
        
        <h4>🛠️ Indian Service Network</h4>
        <ul>
            <li><strong>Service Centers:</strong> 3,000+ authorized centers across India</li>
            <li><strong>Service Cost:</strong> ₹3,500 - ₹6,000 ($42 - $72 USD) per service</li>
            <li><strong>Parts Availability:</strong> Excellent (same-day in metros, 1-2 days in smaller cities)</li>
            <li><strong>Extended Warranty:</strong> ₹15,000 - ₹25,000 ($180 - $300 USD)</li>
        </ul>
        
        <h4>📊 Market Value & Depreciation</h4>
        <p><strong>Current Market Value (2020 model in 2024):</strong> ₹4,50,000 - ₹6,20,000 ($5,400 - $7,440 USD) depending on condition and mileage</p>
        <p><strong>Depreciation Rate:</strong> 15-20% annually (better than segment average)</p>
        
        <h4>🏥 Insurance Recommendations</h4>
        <ul>
            <li><strong>Preferred Insurers:</strong> ICICI Lombard, Bajaj Allianz, HDFC ERGO</li>
            <li><strong>IDV Range:</strong> ₹4,80,000 - ₹6,50,000 ($5,760 - $7,800 USD)</li>
            <li><strong>Cashless Garages:</strong> 4,500+ network garages</li>
            <li><strong>NCB Benefit:</strong> Up to 50% discount on renewal</li>
        </ul>
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
            
            # Generate cost estimate using Gemini with Indian market focus
            response = self.model.generate_content([
                f"""🚗 INDIAN AUTOMOTIVE REPAIR COST SPECIALIST

You are a certified automotive repair cost estimator with 20+ years of experience in the Indian automotive market, specializing in accurate cost estimation across different cities and service types.

📋 REPAIR COST ANALYSIS FOR: {make} {model} - {damage_type} Damage

🇮🇳 INDIAN MARKET REPAIR COST STRUCTURE:

REGIONAL COST VARIATIONS:
- Metro Cities (Mumbai, Delhi, Bangalore, Chennai): Higher labor rates, premium parts
- Tier-1 Cities (Pune, Hyderabad, Ahmedabad, Kolkata): Moderate pricing
- Tier-2/3 Cities: Lower labor costs, competitive parts pricing

SERVICE TYPE COMPARISON:
🏢 AUTHORIZED SERVICE CENTER:
- OEM parts guarantee and warranty coverage
- Standardized labor rates and procedures
- Insurance company preferred network
- Premium pricing with quality assurance

🔧 MULTI-BRAND SERVICE CENTER:
- Competitive pricing with genuine/OEM parts
- Experienced technicians across brands
- Moderate pricing tier
- Good balance of cost and quality

🛠️ LOCAL GARAGE:
- Significantly lower labor costs
- Aftermarket parts options
- Variable quality and warranty
- Budget-friendly option

💰 DETAILED COST BREAKDOWN (DUAL CURRENCY):

PARTS COST ANALYSIS:
- OEM Parts: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Genuine Parts: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Aftermarket Parts: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Parts availability timeline: X-X days

LABOR COST STRUCTURE:
- Authorized Center: ₹XXX-₹XXX/hour ($XX-$XX USD/hour)
- Multi-brand Center: ₹XXX-₹XXX/hour ($XX-$XX USD/hour)
- Local Garage: ₹XXX-₹XXX/hour ($XX-$XX USD/hour)
- Estimated labor hours: X-X hours

TOTAL REPAIR ESTIMATES:

🏢 AUTHORIZED SERVICE CENTER:
- Conservative Estimate: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Comprehensive Repair: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Premium/Show Quality: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)

🔧 MULTI-BRAND SERVICE CENTER:
- Conservative Estimate: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Comprehensive Repair: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)

🛠️ LOCAL GARAGE:
- Basic Repair: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)
- Quality Repair: ₹XX,XXX - ₹XX,XXX ($XXX - $XXX USD)

🔍 VEHICLE-SPECIFIC CONSIDERATIONS:

BRAND-SPECIFIC FACTORS:
- Parts availability for {make} in Indian market
- Common pricing patterns for {model}
- Typical repair complexity for this vehicle
- Dealer network coverage across India

DAMAGE-SPECIFIC ANALYSIS:
- Repair complexity rating: [1-5 scale]
- Special tools or equipment required
- Paint matching requirements for {make} {model}
- Potential hidden damage considerations

⚠️ ADDITIONAL COST FACTORS:

REGIONAL CONSIDERATIONS:
- Metro city premium: 20-30% higher costs
- State tax variations on parts
- Transportation costs for remote areas
- Seasonal demand fluctuations

INSURANCE IMPLICATIONS:
- Cashless claim coverage limits
- Depreciation impact on claim amount
- Preferred garage network availability
- Own damage vs third-party coverage

🎯 RECOMMENDATIONS:

COST OPTIMIZATION STRATEGY:
- Best value service option for this repair
- Quality vs cost trade-off analysis
- Timeline optimization recommendations
- Insurance vs self-pay decision matrix

CONFIDENCE LEVEL: [High/Medium/Low] based on:
- Parts availability certainty
- Labor time estimation accuracy
- Regional cost data reliability
- Vehicle-specific repair history

FORMAT REQUIREMENTS:
- All costs in ₹ (primary) with USD reference
- Clear breakdown by service type
- Regional cost variations highlighted
- Actionable recommendations included"""
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
        
        # Mock estimates based on damage type with Indian pricing
        estimates = {
            "Scratch": {
                "estimate": "₹25,000 - ₹65,000 ($300 - $800 USD)", 
                "labor_hours": "2-4",
                "authorized_center": "₹35,000 - ₹75,000 ($420 - $900 USD)",
                "local_garage": "₹15,000 - ₹45,000 ($180 - $540 USD)"
            },
            "Dent": {
                "estimate": "₹37,000 - ₹1,00,000 ($450 - $1,200 USD)", 
                "labor_hours": "3-6",
                "authorized_center": "₹50,000 - ₹1,25,000 ($600 - $1,500 USD)",
                "local_garage": "₹25,000 - ₹75,000 ($300 - $900 USD)"
            },
            "Crack": {
                "estimate": "₹54,000 - ₹1,25,000 ($650 - $1,500 USD)", 
                "labor_hours": "4-8",
                "authorized_center": "₹75,000 - ₹1,65,000 ($900 - $2,000 USD)",
                "local_garage": "₹35,000 - ₹85,000 ($420 - $1,020 USD)"
            },
            "Broken Light": {
                "estimate": "₹20,000 - ₹50,000 ($250 - $600 USD)", 
                "labor_hours": "1-2",
                "authorized_center": "₹30,000 - ₹65,000 ($360 - $780 USD)",
                "local_garage": "₹12,000 - ₹35,000 ($145 - $420 USD)"
            },
            "Paint Damage": {
                "estimate": "₹33,000 - ₹83,000 ($400 - $1,000 USD)", 
                "labor_hours": "3-5",
                "authorized_center": "₹45,000 - ₹1,08,000 ($540 - $1,300 USD)",
                "local_garage": "₹20,000 - ₹58,000 ($240 - $700 USD)"
            }
        }
        
        return estimates.get(damage_type, {
            "estimate": "₹42,000 - ₹1,25,000 ($500 - $1,500 USD)", 
            "labor_hours": "3-6",
            "authorized_center": "₹60,000 - ₹1,50,000 ($720 - $1,800 USD)",
            "local_garage": "₹25,000 - ₹83,000 ($300 - $1,000 USD)"
        })
        
    def analyze_query(self, query, context=""):
        """Analyze a text query about vehicles using Gemini"""
        try:
            if hasattr(self, "_use_mock") and self._use_mock:
                return self._mock_query_analysis(query)
                
            logger.info(f"Analyzing vehicle query: {query}")
            
            # Generate analysis using Gemini with Indian market focus
            logger.info("Sending vehicle query to Gemini for analysis")
            response = self.model.generate_content([
                f"""🚗 INDIAN AUTOMOTIVE MARKET CONSULTANT & VEHICLE EXPERT

You are an expert automotive consultant with decades of experience specializing in the Indian automotive market, vehicle ownership, maintenance, and insurance optimization.

🇮🇳 QUERY ANALYSIS FOR INDIAN MARKET:
Question: {query}

{f"Additional context: {context}" if context else ""}

COMPREHENSIVE INDIAN MARKET ANALYSIS:

🔍 VEHICLE-SPECIFIC INSIGHTS (if applicable):
- Indian market availability and variants
- Popular trim levels and configurations sold in India
- Regional preferences and market positioning
- Local manufacturing vs import status

💰 COST ANALYSIS (DUAL CURRENCY):
- Provide all costs in ₹ (primary) with USD equivalent in parentheses
- Include regional price variations (Metro vs Tier-2/3 cities)
- Authorized vs independent service cost comparison
- Insurance implications and cost factors

🛠️ MAINTENANCE & SERVICE (INDIAN CONDITIONS):
- Service network availability across India
- Parts availability and pricing in Indian market
- Maintenance requirements for Indian driving conditions
- Common issues specific to Indian climate and roads

🏥 INSURANCE & PROTECTION:
- Popular insurance providers for this vehicle category
- Typical insurance costs and IDV considerations
- Cashless garage network availability
- NCB benefits and claim optimization strategies

🌏 REGIONAL CONSIDERATIONS:
- State-specific regulations and benefits
- Regional service quality and availability
- Climate-specific recommendations (monsoon, heat, dust)
- Urban vs rural suitability analysis

🎯 ACTIONABLE RECOMMENDATIONS:
- Best practices for Indian vehicle ownership
- Cost optimization strategies
- Maintenance schedules adapted for Indian conditions
- Purchase/ownership decision optimization

FORMAT REQUIREMENTS:
- Provide detailed, accurate, and helpful response
- Include specific Indian market details and recommendations
- Use ₹ (primary) with USD reference for all costs
- Focus on practical applicability for Indian consumers
- Include region-specific insights where relevant"""
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
