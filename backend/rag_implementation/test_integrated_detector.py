import os
from integrated_damage_detector import IntegratedDamageDetector
import json

def test_damage_detection(image_path):
    """Test the integrated damage detection system"""
    # Initialize the detector
    detector = IntegratedDamageDetector(
        cnn_model_path="../../models/damage_model.h5",
        severity_model_path="../../models/severity_model.h5",
        claim_model_path="../../models/claim_model.h5"
    )
    
    try:
        # Analyze the image
        print(f"\nAnalyzing image: {image_path}")
        analysis = detector.analyze_damage(image_path)
        
        # Get detailed report
        report = detector.get_detailed_report(analysis)
        
        # Print results
        print("\n=== Damage Analysis Report ===")
        print(json.dumps(report, indent=2))
        
        # Print Gemini's analysis
        print("\n=== Gemini's Analysis ===")
        print(analysis["gemini_analysis"])
        
        return report
        
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        return None

if __name__ == "__main__":
    # Test with a sample image
    test_image = "../../dataset/test/car_damage_1.jpg"  # Replace with your test image path
    if os.path.exists(test_image):
        test_damage_detection(test_image)
    else:
        print(f"Test image not found: {test_image}") 