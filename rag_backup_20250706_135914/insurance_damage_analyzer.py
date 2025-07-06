import os
import google.generativeai as genai
from PIL import Image
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv
import json
from datetime import datetime

# Load environment variables
load_dotenv()

class InsuranceDamageAnalyzer:
    def __init__(self):
        # Initialize Gemini API
        self.api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-pro-vision')
        
        # Initialize ChromaDB
        self.chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory="car_damage_knowledge"
        ))
        
        # Create collections for different types of data
        self.damage_collection = self.chroma_client.get_or_create_collection(
            name="damage_knowledge"
        )
        self.insurance_collection = self.chroma_client.get_or_create_collection(
            name="insurance_history"
        )
        
        # Initialize knowledge bases
        self._initialize_knowledge_base()
    
    def _initialize_knowledge_base(self):
        """Initialize the knowledge bases with damage and insurance information"""
        # Damage types knowledge base
        damage_types = [
            {
                "type": "scratch",
                "description": "A scratch is a linear mark on the car's surface, typically caused by sharp objects or contact with other surfaces.",
                "severity_levels": ["light", "medium", "deep"],
                "repair_methods": ["polishing", "touch-up paint", "panel replacement"],
                "estimated_costs": {
                    "light": "100-300",
                    "medium": "300-800",
                    "deep": "800-2000"
                },
                "insurance_coverage": {
                    "comprehensive": "Usually covered",
                    "collision": "Usually covered",
                    "liability": "Not covered"
                }
            },
            {
                "type": "dent",
                "description": "A dent is a depression in the car's surface, usually caused by impact or pressure.",
                "severity_levels": ["minor", "moderate", "severe"],
                "repair_methods": ["paintless dent repair", "body filler", "panel replacement"],
                "estimated_costs": {
                    "minor": "150-400",
                    "moderate": "400-1000",
                    "severe": "1000-3000"
                },
                "insurance_coverage": {
                    "comprehensive": "Usually covered",
                    "collision": "Usually covered",
                    "liability": "Not covered"
                }
            },
            {
                "type": "crack",
                "description": "A crack is a break in the car's surface, often in glass or plastic components.",
                "severity_levels": ["small", "medium", "large"],
                "repair_methods": ["sealant", "replacement", "professional repair"],
                "estimated_costs": {
                    "small": "200-500",
                    "medium": "500-1500",
                    "large": "1500-4000"
                },
                "insurance_coverage": {
                    "comprehensive": "Usually covered",
                    "collision": "Usually covered",
                    "liability": "Not covered"
                }
            },
            {
                "type": "paint_damage",
                "description": "Damage to the car's paint surface, including fading, peeling, or chipping.",
                "severity_levels": ["surface", "moderate", "severe"],
                "repair_methods": ["touch-up", "partial repaint", "full repaint"],
                "estimated_costs": {
                    "surface": "200-500",
                    "moderate": "500-1500",
                    "severe": "1500-4000"
                },
                "insurance_coverage": {
                    "comprehensive": "Usually covered",
                    "collision": "Usually covered",
                    "liability": "Not covered"
                }
            }
        ]
        
        # Add damage documents to ChromaDB
        for damage in damage_types:
            self.damage_collection.add(
                documents=[json.dumps(damage)],
                metadatas=[{"type": damage["type"]}],
                ids=[f"damage_{damage['type']}"]
            )
    
    def add_insurance_history(self, user_id, history_data):
        """Add or update user's insurance history"""
        self.insurance_collection.add(
            documents=[json.dumps(history_data)],
            metadatas=[{"user_id": user_id, "timestamp": datetime.now().isoformat()}],
            ids=[f"insurance_{user_id}_{datetime.now().timestamp()}"]
        )
    
    def analyze_damage(self, image_path, user_id=None):
        """Analyze car damage using Gemini API and RAG"""
        # Get Gemini analysis
        image = Image.open(image_path)
        gemini_response = self.model.generate_content([
            "Analyze this car image for damage. Describe any visible damage in detail, including location and severity.",
            image
        ])
        
        # Query damage knowledge base
        damage_results = self.damage_collection.query(
            query_texts=[gemini_response.text],
            n_results=2
        )
        
        # Get insurance history if user_id provided
        insurance_info = None
        if user_id:
            insurance_results = self.insurance_collection.query(
                query_texts=[f"user_id:{user_id}"],
                n_results=1
            )
            if insurance_results["documents"]:
                insurance_info = json.loads(insurance_results["documents"][0])
        
        # Combine analyses
        combined_analysis = {
            "damage_analysis": {
                "description": gemini_response.text,
                "damage_info": json.loads(damage_results["documents"][0]),
                "confidence_score": float(damage_results["distances"][0])
            }
        }
        
        if insurance_info:
            combined_analysis["insurance_info"] = insurance_info
        
        return combined_analysis
    
    def get_detailed_report(self, analysis, user_id=None):
        """Generate a detailed damage report with repair recommendations and insurance analysis"""
        damage_info = analysis["damage_analysis"]["damage_info"]
        insurance_info = analysis.get("insurance_info")
        
        report = {
            "damage_details": {
                "type": damage_info["type"],
                "description": damage_info["description"],
                "severity_levels": damage_info["severity_levels"],
                "recommended_repair_methods": damage_info["repair_methods"],
                "estimated_costs": damage_info["estimated_costs"]
            },
            "insurance_coverage": damage_info["insurance_coverage"],
            "confidence_score": f"{analysis['damage_analysis']['confidence_score']*100:.2f}%"
        }
        
        if insurance_info:
            report["user_insurance_history"] = {
                "policy_type": insurance_info.get("policy_type"),
                "claim_history": insurance_info.get("claim_history", []),
                "coverage_details": insurance_info.get("coverage_details", {}),
                "deductible": insurance_info.get("deductible")
            }
            
            # Add claim recommendation based on history
            if insurance_info.get("claim_history"):
                recent_claims = len([c for c in insurance_info["claim_history"] 
                                   if (datetime.now() - datetime.fromisoformat(c["date"])).days < 365])
                report["claim_recommendation"] = "Consider filing a claim" if recent_claims < 2 else "Consider paying out of pocket"
        
        return report

# Example usage
if __name__ == "__main__":
    analyzer = InsuranceDamageAnalyzer()
    
    # Example insurance history
    sample_insurance_history = {
        "policy_type": "comprehensive",
        "claim_history": [
            {
                "date": "2023-01-15T00:00:00",
                "type": "scratch",
                "amount": 500
            }
        ],
        "coverage_details": {
            "comprehensive": True,
            "collision": True,
            "liability": True
        },
        "deductible": 500
    }
    
    # Add sample insurance history
    analyzer.add_insurance_history("user123", sample_insurance_history)
    
    # Analyze an image
    analysis = analyzer.analyze_damage("path_to_car_image.jpg", "user123")
    
    # Get detailed report
    report = analyzer.get_detailed_report(analysis, "user123")
    print("Damage Report:", json.dumps(report, indent=2)) 