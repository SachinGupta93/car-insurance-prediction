#!/usr/bin/env python3
"""
Module to control analysis mode preferences (real AI vs demo mode)
"""

import os
import logging
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from backend/.env
backend_env = Path(__file__).parent / '.env'
logger = logging.getLogger(__name__)
logger.info(f"AnalysisMode: Loading environment from: {backend_env}")
load_dotenv(backend_env)

class AnalysisModeManager:
    """
    Manages analysis mode preferences between real Gemini AI and demo mode
    """
    
    def __init__(self):
        # Check for explicit mode settings in environment variables
        self.force_real_ai = os.environ.get('FORCE_REAL_AI', '').lower() == 'true'
        self.force_demo_mode = os.environ.get('FORCE_DEMO_MODE', '').lower() == 'true'
        
        # Internal state
        self.real_ai_available = False
        self.demo_fallback_enabled = True
        
        # Log initial configuration
        if self.force_real_ai:
            logger.info("🤖 FORCED REAL AI MODE enabled - will only use real Gemini AI")
        elif self.force_demo_mode:
            logger.info("🎭 FORCED DEMO MODE enabled - will only use demo data")
        else:
            logger.info("🔄 AUTOMATIC MODE enabled - will try real AI first, fall back to demo if needed")
    
    def set_real_ai_availability(self, available: bool):
        """Set whether real AI is available based on API keys and model initialization"""
        self.real_ai_available = available
        logger.info(f"Real AI availability set to: {available}")
    
    def should_use_real_ai(self) -> bool:
        """
        Determine if real AI should be used based on configuration and availability
        """
        if self.force_demo_mode:
            logger.debug("Using demo mode (forced by configuration)")
            return False
            
        if self.force_real_ai:
            logger.debug("Using real AI mode (forced by configuration)")
            return True
            
        # Default behavior: use real AI if available
        return self.real_ai_available
    
    def should_fallback_to_demo(self) -> bool:
        """
        Determine if fallback to demo mode is allowed
        """
        if self.force_real_ai:
            logger.debug("Demo fallback disabled (forced real AI)")
            return False
        
        return self.demo_fallback_enabled
    
    def toggle_demo_fallback(self, enabled: bool):
        """Enable or disable demo mode fallback"""
        self.demo_fallback_enabled = enabled
        logger.info(f"Demo fallback {'enabled' if enabled else 'disabled'}")

# Global instance
analysis_mode_manager = AnalysisModeManager()
