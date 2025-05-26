# filepath: d:\Car-damage-prediction\backend\rag_implementation\insurance_rag.py
import os
from typing import List, Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv
import json
from datetime import datetime
import logging
import traceback

# Configure logging
logger = logging.getLogger(__name__)

class InsuranceRAG:
    def __init__(self):
        try:
            load_dotenv()
            
            # Initialize Gemini with proper error handling
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found in environment. Using mock implementation.")
                self._use_mock = True
            else:
                genai.configure(api_key=api_key)
                # Use supported current models
                try:
                    model_options = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-1.0-pro-vision-latest"]
                    for model_name in model_options:
                        try:
                            self.model = genai.GenerativeModel(model_name)
                            self._use_mock = False
                            logger.info(f"Insurance RAG system initialized with Gemini {model_name}")
                            break
                        except Exception as specific_error:
                            logger.warning(f"Could not initialize {model_name}: {str(specific_error)}")
                    
                    if not hasattr(self, "model"):
                        raise Exception("No suitable Gemini models available")
                        
                except Exception as model_error:
                    logger.error(f"All Gemini models failed: {str(model_error)}")
                    self._use_mock = True
                    logger.warning("Using mock implementation due to model unavailability")
        except Exception as e:
            logger.error(f"Error initializing InsuranceRAG: {str(e)}")
            logger.error(traceback.format_exc())
            logger.warning("Falling back to mock implementation")
            self._use_mock = True
    
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
        """Get insurance recommendations based on damage assessment"""
        try:
            if hasattr(self, "_use_mock") and self._use_mock:
                return self._mock_insurance_recommendations(damage_assessment)
                
            # Extract key information from damage assessment
            severity = damage_assessment.get("severity", "unknown")
            damage_type = damage_assessment.get("damage_type", "unknown")
            estimated_cost = damage_assessment.get("estimated_cost", "unknown")
            
            # Generate detailed, comprehensive recommendations using Gemini
            logger.info(f"Generating comprehensive insurance recommendations with Gemini for {damage_type} damage")
            response = self.model.generate_content([
                f"You are an expert insurance advisor with 20+ years of experience in the Indian automotive insurance market. Provide extremely detailed and comprehensive insurance recommendations for a vehicle with {severity} {damage_type} damage with estimated repair cost of {estimated_cost}.",
                "Include thorough analysis with costs in Indian Rupees (₹) as primary currency:",
                "1. Claim filing recommendation - Should the customer file a claim? Provide detailed reasoning with pros/cons analysis considering Indian insurance practices",
                "2. Comprehensive coverage analysis - Analyze exactly what would be covered under Indian motor insurance policies (Own Damage, Third Party, etc.)",
                "3. Premium impact calculation - Detailed analysis of how filing a claim would impact premiums over the next 3-5 years in Indian market context",
                "4. NCB (No Claim Bonus) impact - Specific analysis of NCB loss and recovery timeline",
                "5. IDV (Insured Declared Value) considerations - How this claim affects IDV calculations",
                "6. Cashless vs reimbursement - Analysis of network garage cashless claims vs reimbursement process",
                "7. Authorized service center vs local garage - Cost and coverage differences in Indian market",
                "8. Regional variations - Consider Metro vs Tier-2/3 city differences in costs and procedures",
                "9. Insurance company comparison - Analysis of major Indian insurers (ICICI Lombard, Bajaj Allianz, HDFC ERGO, etc.)",
                "10. Claims process guidance - Step-by-step instructions for optimal claim filing in India",
                "Format the response with costs primarily in ₹ (Rupees) and include practical advice for Indian customers."
            ],
            generation_config={"temperature": 0.2, "max_output_tokens": 2048})
            
            return {
                "recommendations": response.text,
                "timestamp": datetime.now().isoformat()
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
        """Analyze a text query about insurance using Gemini"""
        try:
            if hasattr(self, "_use_mock") and self._use_mock:
                return self._mock_query_analysis(query)
                
            logger.info(f"Analyzing insurance query: {query}")
            
            # Generate analysis using Gemini
            logger.info("Sending insurance query to Gemini for analysis")
            response = self.model.generate_content([
                f"""You are an expert insurance advisor specializing in car insurance and damage claims. 
                Answer the following question about car insurance:
                
                Question: {query}
                
                {f"Additional context: {context}" if context else ""}
                
                Provide a detailed, accurate, and helpful response based on your expertise in car insurance,
                claims processing, coverage details, and best practices. Include specific details and 
                recommendations where appropriate."""
            ])
            
            # Mock sources for demonstration purposes
            # In a real implementation, you would retrieve relevant sources from a knowledge base
            sources = [
                {
                    "title": "Car Insurance Coverage Guide",
                    "content": "Comprehensive information about different types of car insurance coverage and what they protect.",
                    "url": "https://example.com/insurance-guide"
                },
                {
                    "title": "Claims Processing Handbook",
                    "content": "Step-by-step guide to filing and processing insurance claims for vehicle damage.",
                    "url": "https://example.com/claims-handbook"
                }
            ]
            
            return {
                "answer": response.text,
                "sources": sources,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error during insurance query analysis: {str(e)}")
            logger.error(traceback.format_exc())
            return self._mock_query_analysis(query)
    
    def _mock_query_analysis(self, query):
        """Generate mock query analysis for testing"""
        logger.info(f"Using mock analysis for query: {query}")
        
        answer = """
        Car insurance typically covers damage to your vehicle depending on the type of coverage you have:
        
        1. Comprehensive coverage: Covers damage from non-collision incidents like theft, vandalism, weather events, or hitting an animal.
        
        2. Collision coverage: Covers damage from accidents with other vehicles or objects regardless of fault.
        
        3. Liability coverage: Only covers damage to other people's property, not your own vehicle.
        
        For most car damage, you'll need to pay your deductible first, and then insurance will cover the rest up to your policy limits.
        
        When filing a claim, document everything thoroughly with photos and detailed descriptions. Get multiple repair estimates if possible.
        
        Remember that filing claims may increase your premiums, so for minor damage below or slightly above your deductible, it might be more cost-effective to pay out of pocket.
        """
        
        sources = [
            {
                "title": "Car Insurance Basics",
                "content": "Overview of different types of car insurance coverage and what they protect.",
                "url": "https://example.com/insurance-basics"
            },
            {
                "title": "Filing an Insurance Claim",
                "content": "Step-by-step guide to filing and processing insurance claims for vehicle damage.",
                "url": "https://example.com/filing-claims"
            }
        ]
        
        return {
            "answer": answer,
            "sources": sources,
            "timestamp": datetime.now().isoformat()
        }
        
    def analyze_query(self, query, context=""):
        """Analyze a text query about insurance using Gemini"""
        try:
            if hasattr(self, "_use_mock") and self._use_mock:
                return self._mock_query_analysis(query)
                
            logger.info(f"Analyzing insurance query: {query}")
            
            # Generate analysis using Gemini
            logger.info("Sending insurance query to Gemini for analysis")
            response = self.model.generate_content([
                f"""You are an expert insurance advisor specializing in car insurance and damage claims. 
                Answer the following question about car insurance:
                
                Question: {query}
                
                {f"Additional context: {context}" if context else ""}
                
                Provide a detailed, accurate, and helpful response based on your expertise in car insurance,
                claims processing, coverage details, and best practices. Include specific details and 
                recommendations where appropriate."""
            ])
            
            # Mock sources for demonstration purposes
            # In a real implementation, you would retrieve relevant sources from a knowledge base
            sources = [
                {
                    "title": "Car Insurance Coverage Guide",
                    "content": "Comprehensive information about different types of car insurance coverage and what they protect.",
                    "url": "https://example.com/insurance-guide"
                },
                {
                    "title": "Claims Processing Handbook",
                    "content": "Step-by-step guide to filing and processing insurance claims for vehicle damage.",
                    "url": "https://example.com/claims-handbook"
                }
            ]
            
            return {
                "answer": response.text,
                "sources": sources,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error during insurance query analysis: {str(e)}")
            logger.error(traceback.format_exc())
            return self._mock_query_analysis(query)
    
    def _mock_query_analysis(self, query):
        """Generate mock query analysis for testing"""
        logger.info(f"Using mock analysis for query: {query}")
        
        answer = """
        Car insurance typically covers damage to your vehicle depending on the type of coverage you have:
        
        1. Comprehensive coverage: Covers damage from non-collision incidents like theft, vandalism, weather events, or hitting an animal.
        
        2. Collision coverage: Covers damage from accidents with other vehicles or objects regardless of fault.
        
        3. Liability coverage: Only covers damage to other people's property, not your own vehicle.
        
        For most car damage, you'll need to pay your deductible first, and then insurance will cover the rest up to your policy limits.
        
        When filing a claim, document everything thoroughly with photos and detailed descriptions. Get multiple repair estimates if possible.
        
        Remember that filing claims may increase your premiums, so for minor damage below or slightly above your deductible, it might be more cost-effective to pay out of pocket.
        """
        
        sources = [
            {
                "title": "Car Insurance Basics",
                "content": "Overview of different types of car insurance coverage and what they protect.",
                "url": "https://example.com/insurance-basics"
            },
            {
                "title": "Filing an Insurance Claim",
                "content": "Step-by-step guide to filing and processing insurance claims for vehicle damage.",
                "url": "https://example.com/filing-claims"
            }
        ]
        
        return {
            "answer": answer,
            "sources": sources,
            "timestamp": datetime.now().isoformat()
        }
        
    def _mock_coverage(self):
        """Generate mock coverage information for testing"""
        logger.info("Using mock insurance coverage")
        
        # Mock HTML content for insurance coverage display
        coverage_html = """
        <h3>Insurance Coverage Assessment</h3>
        
        <h4>Policy Coverage</h4>
        <table class="w-full border-collapse">
            <thead>
                <tr>
                    <th class="border px-4 py-2 text-left">Coverage Type</th>
                    <th class="border px-4 py-2 text-left">Limit</th>
                    <th class="border px-4 py-2 text-left">Deductible</th>
                    <th class="border px-4 py-2 text-left">Applicable</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="border px-4 py-2">Comprehensive</td>
                    <td class="border px-4 py-2">Full value</td>
                    <td class="border px-4 py-2">$500</td>
                    <td class="border px-4 py-2 text-green-600">Yes</td>
                </tr>
                <tr>
                    <td class="border px-4 py-2">Collision</td>
                    <td class="border px-4 py-2">Full value</td>
                    <td class="border px-4 py-2">$1,000</td>
                    <td class="border px-4 py-2 text-green-600">Yes</td>
                </tr>
                <tr>
                    <td class="border px-4 py-2">Liability</td>
                    <td class="border px-4 py-2">$100,000/$300,000</td>
                    <td class="border px-4 py-2">N/A</td>
                    <td class="border px-4 py-2 text-red-600">No</td>
                </tr>
            </tbody>
        </table>
        
        <h4 class="mt-4">Coverage Assessment</h4>
        <p>This damage appears to be covered under your <strong>Comprehensive</strong> policy. You will be responsible for the $500 deductible.</p>
        
        <h4 class="mt-4">Estimated Out-of-Pocket Cost</h4>
        <p>Your estimated out-of-pocket cost: <strong>$500</strong> (deductible)</p>
        
        <h4 class="mt-4">Next Steps</h4>
        <ol>
            <li>File a claim through your online portal or mobile app</li>
            <li>Schedule an inspection with an adjuster</li>
            <li>Obtain repair quotes from approved shops</li>
            <li>Submit all documentation to expedite your claim</li>
        </ol>
        """
        
        return {
            "recommendations": coverage_html,
            "timestamp": datetime.now().isoformat()
        }
