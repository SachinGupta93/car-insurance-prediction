# filepath: d:\Car-damage-prediction\backend\rag_implementation\insurance_rag.py
import os
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv
import json
from datetime import datetime
import logging
import traceback
import time
from dataclasses import dataclass

# Configure logging with structured format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class InsuranceConfig:
    """Configuration class for Insurance RAG system"""
    max_retries: int = 3
    retry_delay_base: int = 2  # Base delay for exponential backoff
    max_tokens: int = 2048
    temperature: float = 0.2
    timeout_seconds: int = 30
    
    # Indian market specific settings
    default_currency: str = "₹"
    market_context: str = "Indian Motor Insurance Market"
    
    # Model preferences in priority order
    model_preferences: List[str] = None
    
    def __post_init__(self):
        if self.model_preferences is None:
            self.model_preferences = [
                "gemini-1.5-flash",      # Fast and cost-effective
                "gemini-1.5-pro",        # High capability
                "gemini-2.0-flash",      # Latest if available
                "gemini-1.0-pro-vision-latest"  # Fallback
            ]

class InsuranceRAG:
    """
    Insurance RAG system for car damage analysis with Azure-ready architecture
    Provides intelligent insurance recommendations with proper error handling and retry logic
    """
    
    def __init__(self, config: Optional[InsuranceConfig] = None):
        """Initialize InsuranceRAG with proper error handling and retry logic"""
        self.config = config or InsuranceConfig()
        self.model = None
        self._use_mock = True
        self._initialization_time = datetime.now()
        
        try:
            load_dotenv()
            
            # Initialize Gemini with proper error handling and retry logic
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found in environment. Using mock implementation.")
                self._use_mock = True
                return
            
            # Validate API key format
            if not self._validate_api_key(api_key):
                logger.error("Invalid API key format. Using mock implementation.")
                self._use_mock = True
                return
            
            # Configure Gemini with retry logic
            genai.configure(api_key=api_key)
            
            # Initialize model with fallback priority
            self._initialize_model()
                
        except Exception as e:
            logger.error(f"Error initializing InsuranceRAG: {str(e)}")
            logger.error(traceback.format_exc())
            logger.warning("Falling back to mock implementation")
            self._use_mock = True
    
    def _initialize_model(self):
        """Initialize the Gemini model with retry logic"""
        for model_name in self.config.model_preferences:
            try:
                logger.info(f"Attempting to initialize model: {model_name}")
                test_model = genai.GenerativeModel(model_name)
                
                # Test the model with a simple query to ensure it's working
                test_response = test_model.generate_content(
                    "Test query: What is motor insurance?",
                    generation_config={
                        "temperature": 0.1, 
                        "max_output_tokens": 50
                    }
                )
                
                if test_response and test_response.text:
                    self.model = test_model
                    self._use_mock = False
                    logger.info(f"Insurance RAG system initialized successfully with Gemini {model_name}")
                    return
                else:
                    logger.warning(f"Model {model_name} failed test query")
                    
            except Exception as model_error:
                logger.warning(f"Could not initialize {model_name}: {str(model_error)}")
                continue
        
        logger.error("All Gemini models failed initialization")
        self._use_mock = True
        logger.warning("Using mock implementation due to model unavailability")
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get system health information for monitoring"""
        return {
            "status": "healthy" if not self._use_mock else "mock_mode",
            "model_available": not self._use_mock,
            "initialization_time": self._initialization_time.isoformat(),
            "uptime_seconds": (datetime.now() - self._initialization_time).total_seconds(),
            "market_context": self.config.market_context,
            "config": {
                "max_retries": self.config.max_retries,
                "max_tokens": self.config.max_tokens,
                "temperature": self.config.temperature
            }
        }
    def __init__(self):
        """Initialize InsuranceRAG with proper error handling and retry logic"""
        try:
            load_dotenv()
            
            # Initialize Gemini with proper error handling and retry logic
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found in environment. Using mock implementation.")
                self._use_mock = True
                return
            
            # Validate API key format
            if not self._validate_api_key(api_key):
                logger.error("Invalid API key format. Using mock implementation.")
                self._use_mock = True
                return
            
            # Configure Gemini with retry logic
            genai.configure(api_key=api_key)
            
            # Use supported current models with fallback priority
            model_options = [
                "gemini-1.5-flash",      # Fast and cost-effective
                "gemini-1.5-pro",        # High capability
                "gemini-2.0-flash",      # Latest if available
                "gemini-1.0-pro-vision-latest"  # Fallback
            ]
            
            self.model = None
            self._use_mock = True
            
            for model_name in model_options:
                try:
                    logger.info(f"Attempting to initialize model: {model_name}")
                    test_model = genai.GenerativeModel(model_name)
                    
                    # Test the model with a simple query to ensure it's working
                    test_response = test_model.generate_content(
                        "Test query: What is motor insurance?",
                        generation_config={"temperature": 0.1, "max_output_tokens": 50}
                    )
                    
                    if test_response and test_response.text:
                        self.model = test_model
                        self._use_mock = False
                        logger.info(f"Insurance RAG system initialized successfully with Gemini {model_name}")
                        break
                    else:
                        logger.warning(f"Model {model_name} failed test query")
                        
                except Exception as model_error:
                    logger.warning(f"Could not initialize {model_name}: {str(model_error)}")
                    continue
            
            if not self.model:
                logger.error("All Gemini models failed initialization")
                self._use_mock = True
                logger.warning("Using mock implementation due to model unavailability")
                
        except Exception as e:
            logger.error(f"Error initializing InsuranceRAG: {str(e)}")
            logger.error(traceback.format_exc())
            logger.warning("Falling back to mock implementation")
            self._use_mock = True
    
    def _validate_api_key(self, api_key: str) -> bool:
        """Validate API key format"""
        if not api_key or not isinstance(api_key, str):
            return False
        
        # Basic validation - API key should be non-empty and reasonable length
        if len(api_key) < 20 or len(api_key) > 200:
            return False
        
        # Check for placeholder values
        placeholder_values = ["your_api_key", "api_key_here", "replace_with_key"]
        if api_key.lower() in placeholder_values:
            return False
        
        return True
    
    def add_insurance_data(self, text: str, metadata: Dict[str, Any]) -> str:
        """Add new insurance data to the database"""
        try:
            doc_id = str(datetime.now().timestamp())
            logger.info(f"Mock adding insurance data with id {doc_id}")
            return doc_id
        except Exception as e:
            logger.error(f"Error adding insurance data: {str(e)}")
            return "error_id"
    
    def query_insurance_data(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Query the insurance database - mock implementation"""
        logger.info(f"Mock querying insurance data: {query}")
        return [
            {
                "text": "Insurance covers most types of car damage including scratches, dents, and broken lights.",
                "metadata": {"source": "mock", "relevance": 0.95},
                "id": "mock_1"
            },
            {
                "text": "For minor damage, it's often better to pay out of pocket rather than filing a claim.",
                "metadata": {"source": "mock", "relevance": 0.85},
                "id": "mock_2"
            }
        ]
    
    def get_insurance_recommendations(self, damage_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Get insurance recommendations based on damage assessment with retry logic"""
        try:
            if hasattr(self, "_use_mock") and self._use_mock:
                return self._mock_insurance_recommendations(damage_assessment)
            
            # Validate input
            if not damage_assessment or not isinstance(damage_assessment, dict):
                logger.error("Invalid damage assessment provided")
                return self._mock_insurance_recommendations({})
            
            # Extract key information from damage assessment
            severity = damage_assessment.get("severity", "unknown")
            damage_type = damage_assessment.get("damage_type", "unknown")
            estimated_cost = damage_assessment.get("estimated_cost", "unknown")
            
            # Generate detailed, comprehensive recommendations using Gemini with retry logic
            logger.info(f"Generating comprehensive insurance recommendations with Gemini for {damage_type} damage")
            
            # Enhanced prompt for Indian market
            prompt = f"""You are an expert insurance advisor with 20+ years of experience in the Indian automotive insurance market. 
            Provide extremely detailed and comprehensive insurance recommendations for a vehicle with {severity} {damage_type} damage with estimated repair cost of {estimated_cost}.
            
            Include thorough analysis with costs in Indian Rupees (₹) as primary currency:
            1. Claim filing recommendation - Should the customer file a claim? Provide detailed reasoning with pros/cons analysis considering Indian insurance practices
            2. Comprehensive coverage analysis - Analyze exactly what would be covered under Indian motor insurance policies (Own Damage, Third Party, etc.)
            3. Premium impact calculation - Detailed analysis of how filing a claim would impact premiums over the next 3-5 years in Indian market context
            4. NCB (No Claim Bonus) impact - Specific analysis of NCB loss and recovery timeline
            5. IDV (Insured Declared Value) considerations - How this claim affects IDV calculations
            6. Cashless vs reimbursement - Analysis of network garage cashless claims vs reimbursement process
            7. Authorized service center vs local garage - Cost and coverage differences in Indian market
            8. Regional variations - Consider Metro vs Tier-2/3 city differences in costs and procedures
            9. Insurance company comparison - Analysis of major Indian insurers (ICICI Lombard, Bajaj Allianz, HDFC ERGO, etc.)
            10. Claims process guidance - Step-by-step instructions for optimal claim filing in India
            
            Format the response with costs primarily in ₹ (Rupees) and include practical advice for Indian customers.
            Structure the response with proper HTML formatting including headers, lists, and tables for better readability."""
            
            response = self._execute_gemini_query(prompt)
            
            if response:
                return {
                    "recommendations": response,
                    "timestamp": datetime.now().isoformat(),
                    "market_context": "Indian Motor Insurance Market",
                    "source": "Gemini AI Analysis"
                }
            
        except Exception as e:
            logger.error(f"Error getting insurance recommendations: {str(e)}")
            logger.error(traceback.format_exc())
        
        return self._mock_insurance_recommendations(damage_assessment)
            
    def _mock_insurance_recommendations(self, damage_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Generate mock insurance recommendations for testing"""
        logger.info("Using mock insurance recommendations")
        
        # Extract information from assessment
        severity = damage_assessment.get("severity", "Minor")
        damage_type = damage_assessment.get("damage_type", "Unknown")
        
        # Generate mock HTML recommendations based on damage type and severity
        recommendations_html = f"""
        <h3>Insurance Recommendations for {damage_type} Damage</h3>
        
        <h4>Should You File a Claim?</h4>
        <p>Based on the {severity.lower()} severity of this {damage_type.lower()} damage, we recommend:</p>
        
        <ul>
            {"<li><strong>Consider paying out of pocket</strong> since the repair cost is likely below your deductible, and filing a claim may raise your premiums.</li>" if severity == "Minor" else ""}
            {"<li><strong>File an insurance claim</strong> as the moderate damage will likely exceed most standard deductibles.</li>" if severity == "Moderate" else ""}
            {"<li><strong>Definitely file an insurance claim</strong> as the repair costs for severe damage will significantly exceed typical deductibles.</li>" if severity == "Severe" else ""}
        </ul>
        
        <h4>Documentation Needed</h4>
        <ul>
            <li>Multiple photos of damage from different angles</li>
            <li>Police report (if applicable)</li>
            <li>Details of incident (date, time, location)</li>
            <li>Repair estimate from a certified body shop</li>
        </ul>
        
        <h4>Potential Premium Impact</h4>
        <p>Filing this claim may increase your premium by approximately:
            {"5-10% for minor damage claims" if severity == "Minor" else 
            "10-20% for moderate damage claims" if severity == "Moderate" else 
            "20-30% for severe damage claims"}
        </p>
        
        <h4>Next Steps</h4>
        <ol>
            <li>Document the damage thoroughly</li>
            <li>Contact your insurance agent</li>
            <li>Schedule an inspection</li>
            <li>Obtain repair estimates</li>
            <li>Proceed with claim if repair costs exceed deductible</li>
        </ol>
        """
        
        return {
            "recommendations": recommendations_html,
            "timestamp": datetime.now().isoformat()
        }
    
    def check_coverage(self, user_id, vehicle_info, damage_analysis):
        """Check insurance coverage - With Gemini integration if available"""
        try:
            logger.info(f"Checking insurance coverage for user {user_id}")
            
            if hasattr(self, "_use_mock") and self._use_mock:
                return self._mock_coverage()
                
            # Generate coverage assessment using Gemini
            damage_type = damage_analysis.get("damage_type", "Unknown")
            severity = damage_analysis.get("severity", "Minor")
            
            response = self.model.generate_content([
                f"Provide an insurance coverage assessment for {severity} {damage_type} car damage:",
                "Please include:",
                "1. Policy coverage applicability",
                "2. Deductible information",
                "3. Out-of-pocket costs",
                "4. Next steps for the claim process",
                "Format the response as HTML with tables, headers and lists for better readability."
            ])
            
            return {
                "recommendations": response.text,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error checking insurance coverage: {str(e)}")
            logger.error(traceback.format_exc())
            return self._mock_coverage()
    
    def analyze_query(self, query, context=""):
        """Analyze a text query about insurance using Gemini with retry logic and proper error handling"""
        try:
            if hasattr(self, "_use_mock") and self._use_mock:
                return self._mock_query_analysis(query)
                
            logger.info(f"Analyzing insurance query: {query}")
            
            # Validate input parameters
            if not query or not isinstance(query, str):
                raise ValueError("Invalid query parameter: must be a non-empty string")
            
            # Generate analysis using Gemini with retry logic
            logger.info("Sending insurance query to Gemini for analysis")
            
            # Enhanced prompt with Indian market specifics
            prompt = f"""You are an expert insurance advisor specializing in car insurance and damage claims in the Indian market. 
            Answer the following question about car insurance:
            
            Question: {query}
            
            {f"Additional context: {context}" if context else ""}
            
            Provide a detailed, accurate, and helpful response based on your expertise in car insurance,
            claims processing, coverage details, and best practices. Include specific details and 
            recommendations where appropriate.
            
            Consider Indian market specifics:
            - Indian Motor Tariff provisions
            - IRDAI regulations
            - Popular insurers (ICICI Lombard, Bajaj Allianz, HDFC ERGO, etc.)
            - NCB (No Claim Bonus) implications
            - IDV (Insured Declared Value) considerations
            - Cashless vs reimbursement processes
            
            Format the response clearly with proper structure and Indian currency (₹) where applicable."""
            
            response = self._execute_gemini_query(prompt)
            
            if response:
                # Enhanced sources for Indian market
                sources = [
                    {
                        "title": "Indian Motor Insurance Guidelines",
                        "content": "Comprehensive guide to motor insurance in India including IRDAI regulations and tariff provisions.",
                        "url": "https://www.irdai.gov.in/motor-insurance-guidelines"
                    },
                    {
                        "title": "Claims Processing in India",
                        "content": "Step-by-step guide to filing and processing insurance claims for vehicle damage in India.",
                        "url": "https://www.irdai.gov.in/claims-processing-guide"
                    },
                    {
                        "title": "No Claim Bonus (NCB) Guide",
                        "content": "Complete guide to NCB benefits and transfer procedures in Indian motor insurance.",
                        "url": "https://www.irdai.gov.in/ncb-guide"
                    }
                ]
                
                return {
                    "answer": response,
                    "sources": sources,
                    "timestamp": datetime.now().isoformat(),
                    "market_context": "Indian Motor Insurance Market"
                }
            
        except Exception as e:
            logger.error(f"Error during insurance query analysis: {str(e)}")
            logger.error(traceback.format_exc())
        
        return self._mock_query_analysis(query)
    
    def _mock_query_analysis(self, query):
        """Generate mock query analysis for testing with Indian market context"""
        logger.info(f"Using mock analysis for query: {query}")
        
        answer = """
        Car insurance in India typically covers damage to your vehicle depending on the type of coverage you have:
        
        1. **Comprehensive Coverage**: Covers damage from non-collision incidents like theft, vandalism, natural disasters, or hitting an animal. This is optional but highly recommended in India.
        
        2. **Own Damage (OD) Coverage**: Covers damage to your own vehicle in case of accidents. This is part of comprehensive insurance.
        
        3. **Third Party Liability**: Mandatory by law in India. Only covers damage to other people's property and injury, not your own vehicle.
        
        **Important Considerations for Indian Market:**
        - **IDV (Insured Declared Value)**: The maximum sum assured by the insurer in case of total loss/theft
        - **NCB (No Claim Bonus)**: Discount on premium for claim-free years (up to 50% after 5 years)
        - **Deductibles**: Amount you pay before insurance kicks in (typically ₹2,000-₹15,000)
        - **Network Garages**: Cashless repairs at authorized service centers
        
        **Claim Process in India:**
        1. Report the claim immediately (within 24-48 hours)
        2. File FIR if required (for theft/third-party claims)
        3. Submit documents to insurance company
        4. Vehicle inspection by surveyor
        5. Repair authorization and completion
        
        **Premium Impact**: Filing claims may increase your premium by 10-25% and you'll lose NCB benefits.
        
        **Major Insurers in India**: ICICI Lombard, Bajaj Allianz, HDFC ERGO, Reliance General, New India Assurance, etc.
        """
        
        sources = [
            {
                "title": "Indian Motor Insurance Basics",
                "content": "Overview of different types of motor insurance coverage in India and regulatory requirements.",
                "url": "https://www.irdai.gov.in/motor-insurance-basics"
            },
            {
                "title": "Filing Motor Insurance Claims in India",
                "content": "Step-by-step guide to filing and processing motor insurance claims in India.",
                "url": "https://www.irdai.gov.in/filing-claims"
            },
            {
                "title": "NCB and IDV Guide",
                "content": "Understanding No Claim Bonus and Insured Declared Value in Indian motor insurance.",
                "url": "https://www.irdai.gov.in/ncb-idv-guide"
            }
        ]
        
        return {
            "answer": answer,
            "sources": sources,
            "timestamp": datetime.now().isoformat(),
            "market_context": "Indian Motor Insurance Market"
        }
        
    def _mock_coverage(self):
        """Generate mock coverage information for testing with Indian market context"""
        logger.info("Using mock insurance coverage with Indian market context")
        
        # Mock HTML content for insurance coverage display with Indian specifics
        coverage_html = """
        <h3>Insurance Coverage Assessment - Indian Motor Insurance</h3>
        
        <h4>Policy Coverage Overview</h4>
        <table class="w-full border-collapse border border-gray-300">
            <thead>
                <tr class="bg-gray-100">
                    <th class="border border-gray-300 px-4 py-2 text-left">Coverage Type</th>
                    <th class="border border-gray-300 px-4 py-2 text-left">Sum Insured</th>
                    <th class="border border-gray-300 px-4 py-2 text-left">Deductible</th>
                    <th class="border border-gray-300 px-4 py-2 text-left">Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="border border-gray-300 px-4 py-2">Own Damage (OD)</td>
                    <td class="border border-gray-300 px-4 py-2">₹8,50,000 (IDV)</td>
                    <td class="border border-gray-300 px-4 py-2">₹5,000</td>
                    <td class="border border-gray-300 px-4 py-2 text-green-600">✓ Covered</td>
                </tr>
                <tr>
                    <td class="border border-gray-300 px-4 py-2">Third Party Liability</td>
                    <td class="border border-gray-300 px-4 py-2">Unlimited</td>
                    <td class="border border-gray-300 px-4 py-2">Nil</td>
                    <td class="border border-gray-300 px-4 py-2 text-green-600">✓ Active</td>
                </tr>
                <tr>
                    <td class="border border-gray-300 px-4 py-2">Personal Accident</td>
                    <td class="border border-gray-300 px-4 py-2">₹15,00,000</td>
                    <td class="border border-gray-300 px-4 py-2">Nil</td>
                    <td class="border border-gray-300 px-4 py-2 text-green-600">✓ Included</td>
                </tr>
                <tr>
                    <td class="border border-gray-300 px-4 py-2">Zero Depreciation</td>
                    <td class="border border-gray-300 px-4 py-2">Add-on Cover</td>
                    <td class="border border-gray-300 px-4 py-2">₹2,000</td>
                    <td class="border border-gray-300 px-4 py-2 text-blue-600">Optional</td>
                </tr>
            </tbody>
        </table>
        
        <h4 class="mt-4">Coverage Assessment</h4>
        <div class="bg-green-50 p-4 rounded border border-green-200">
            <p><strong>✓ This damage is covered</strong> under your Own Damage (OD) policy.</p>
            <p>You will be responsible for the deductible amount of <strong>₹5,000</strong>.</p>
        </div>
        
        <h4 class="mt-4">NCB (No Claim Bonus) Status</h4>
        <div class="bg-blue-50 p-4 rounded border border-blue-200">
            <p><strong>Current NCB:</strong> 35% (3 claim-free years)</p>
            <p><strong>Impact:</strong> Filing this claim will reset your NCB to 0%</p>
            <p><strong>Premium Impact:</strong> Next year's premium may increase by ₹8,000-₹12,000</p>
        </div>
        
        <h4 class="mt-4">Cost Analysis</h4>
        <table class="w-full border-collapse border border-gray-300 mt-2">
            <tr>
                <td class="border border-gray-300 px-4 py-2 font-semibold">Estimated Repair Cost</td>
                <td class="border border-gray-300 px-4 py-2">₹25,000</td>
            </tr>
            <tr>
                <td class="border border-gray-300 px-4 py-2 font-semibold">Your Deductible</td>
                <td class="border border-gray-300 px-4 py-2">₹5,000</td>
            </tr>
            <tr>
                <td class="border border-gray-300 px-4 py-2 font-semibold">Insurance Payment</td>
                <td class="border border-gray-300 px-4 py-2">₹20,000</td>
            </tr>
            <tr>
                <td class="border border-gray-300 px-4 py-2 font-semibold">NCB Loss Impact (Next 3 years)</td>
                <td class="border border-gray-300 px-4 py-2">₹30,000</td>
            </tr>
            <tr class="bg-yellow-50">
                <td class="border border-gray-300 px-4 py-2 font-semibold">Net Impact</td>
                <td class="border border-gray-300 px-4 py-2 font-semibold">₹35,000</td>
            </tr>
        </table>
        
        <h4 class="mt-4">Claim Process - Next Steps</h4>
        <ol class="list-decimal ml-6 space-y-2">
            <li><strong>Immediate Action:</strong> Report the claim within 24 hours via app/toll-free number</li>
            <li><strong>Documentation:</strong> Upload photos, policy documents, and driving license</li>
            <li><strong>Survey:</strong> Insurance surveyor will inspect the vehicle (usually within 2-3 days)</li>
            <li><strong>Repair Authorization:</strong> Get approval for repair at network garage</li>
            <li><strong>Cashless Repair:</strong> Drop vehicle at authorized service center</li>
            <li><strong>Settlement:</strong> Claim settlement within 7-15 days after repair completion</li>
        </ol>
        
        <h4 class="mt-4">Network Garages Available</h4>
        <p>✓ 150+ cashless garages in your city<br>
        ✓ Authorized service centers available<br>
        ✓ 24x7 helpline support</p>
        
        <div class="mt-4 p-4 bg-amber-50 border border-amber-200 rounded">
            <p><strong>💡 Recommendation:</strong> Given the repair cost (₹25,000) vs total impact (₹35,000), 
            consider if paying out of pocket might be more economical to preserve your NCB.</p>
        </div>
        """
        
        return {
            "recommendations": coverage_html,
            "timestamp": datetime.now().isoformat(),
            "market_context": "Indian Motor Insurance Market",
            "source": "Mock Analysis"
        }
    
    def _execute_gemini_query(self, prompt: str, generation_config: Optional[Dict] = None) -> Optional[str]:
        """Execute Gemini query with retry logic and proper error handling"""
        if self._use_mock:
            return None
        
        if not prompt:
            raise ValueError("Prompt cannot be empty")
        
        # Default generation config
        if generation_config is None:
            generation_config = {
                "temperature": self.config.temperature,
                "max_output_tokens": self.config.max_tokens,
                "candidate_count": 1
            }
        
        # Implement retry logic with exponential backoff
        for retry_count in range(self.config.max_retries):
            try:
                logger.info(f"Executing Gemini query (attempt {retry_count + 1}/{self.config.max_retries})")
                
                response = self.model.generate_content(
                    [prompt],
                    generation_config=generation_config
                )
                
                if response and response.text:
                    return response.text
                else:
                    raise ValueError("Empty response from Gemini")
                    
            except Exception as retry_error:
                logger.warning(f"Gemini query attempt {retry_count + 1} failed: {str(retry_error)}")
                
                if retry_count >= self.config.max_retries - 1:
                    logger.error(f"All {self.config.max_retries} retries exhausted: {str(retry_error)}")
                    raise retry_error
                
                # Exponential backoff
                delay = self.config.retry_delay_base ** (retry_count + 1)
                logger.info(f"Waiting {delay} seconds before retry...")
                time.sleep(delay)
        
        return None
