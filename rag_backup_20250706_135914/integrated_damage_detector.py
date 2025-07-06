import os
import tensorflow as tf
import google.generativeai as genai
from PIL import Image
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv
import json
import numpy as np

# Load environment variables
load_dotenv()

class IntegratedDamageDetector:
    def __init__(self, cnn_model_path, severity_model_path, claim_model_path):
        # Initialize Gemini API
        self.api_key = os.getenv('GEMINI_API_KEY')
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-pro-vision')
        
        # Load CNN models
        self.damage_model = tf.keras.models.load_model(cnn_model_path)
        self.severity_model = tf.keras.models.load_model(severity_model_path)
        self.claim_model = tf.keras.models.load_model(claim_model_path)
        
        # Initialize ChromaDB
        self.chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory="car_damage_knowledge"
        ))
        
        # Create or get collection
        self.collection = self.chroma_client.get_or_create_collection(
            name="car_damage_knowledge"
        )
        
        # Initialize knowledge base
        self._initialize_knowledge_base()
    
    def _initialize_knowledge_base(self):
        """Initialize the knowledge base with car damage information"""
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
                }
            }
        ]
        
        # Add documents to ChromaDB
        for damage in damage_types:
            self.collection.add(
                documents=[json.dumps(damage)],
                metadatas=[{"type": damage["type"]}],
                ids=[f"damage_{damage['type']}"]
            )
    
    def preprocess_image(self, image_path):
        """Preprocess image for CNN models"""
        img = Image.open(image_path)
        img = img.resize((224, 224))  # Standard size for most CNN models
        img_array = np.array(img) / 255.0  # Normalize
        return np.expand_dims(img_array, axis=0)
    
    def analyze_damage(self, image_path):
        """Analyze car damage using CNN models, Gemini API, and RAG"""
        # Preprocess image
        processed_image = self.preprocess_image(image_path)
        
        # Get CNN predictions
        damage_pred = self.damage_model.predict(processed_image)
        severity_pred = self.severity_model.predict(processed_image)
        claim_pred = self.claim_model.predict(processed_image)
        
        # Get Gemini analysis
        image = Image.open(image_path)
        gemini_response = self.model.generate_content([
            "Analyze this car image for damage. Describe any visible damage in detail.",
            image
        ])
        
        # Query knowledge base
        results = self.collection.query(
            query_texts=[gemini_response.text],
            n_results=2
        )
        
        # Combine all analyses
        combined_analysis = {
            "cnn_predictions": {
                "damage_type": damage_pred[0].tolist(),
                "severity": severity_pred[0].tolist(),
                "claim_probability": float(claim_pred[0][0])
            },
            "gemini_analysis": gemini_response.text,
            "knowledge_base_info": json.loads(results["documents"][0][0]),
            "confidence_score": float(results["distances"][0])
        }
        
        return combined_analysis
    
    def get_detailed_report(self, analysis):
        """Generate a detailed damage report with repair recommendations"""
        damage_info = analysis["knowledge_base_info"]
        cnn_pred = analysis["cnn_predictions"]
        
        # Determine severity level based on CNN prediction
        severity_index = np.argmax(cnn_pred["severity"])
        severity_levels = ["light", "medium", "severe"]
        predicted_severity = severity_levels[severity_index]
        
        # Get cost estimate
        cost_estimate = damage_info["estimated_costs"].get(predicted_severity, "Unknown")
        
        return {
            "damage_type": damage_info["type"],
            "severity": predicted_severity,
            "description": damage_info["description"],
            "recommended_repair_methods": damage_info["repair_methods"],
            "estimated_cost": cost_estimate,
            "claim_probability": f"{cnn_pred['claim_probability']*100:.2f}%",
            "confidence_score": f"{analysis['confidence_score']*100:.2f}%"
        }

# Example usage
if __name__ == "__main__":
    # Initialize the integrated detector
    detector = IntegratedDamageDetector(
        cnn_model_path="models/damage_model.h5",
        severity_model_path="models/severity_model.h5",
        claim_model_path="models/claim_model.h5"
    )
    
    # Analyze an image
    analysis = detector.analyze_damage("path_to_car_image.jpg")
    
    # Get detailed report
    report = detector.get_detailed_report(analysis)
    print("Damage Report:", json.dumps(report, indent=2)) 