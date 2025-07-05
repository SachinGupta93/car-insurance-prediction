# Multi-AI Provider Car Damage Analysis System
import os
import logging
import traceback
from dotenv import load_dotenv
from datetime import datetime
import json

# Import different AI providers
from .car_damage_rag import CarDamageRAG
from .openai_car_damage_rag import OpenAICarDamageRAG
from .claude_car_damage_rag import ClaudeCarDamageRAG

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class MultiAICarDamageRAG:
    def __init__(self):
        """Initialize the Multi-AI Car Damage Analysis system"""
        self.providers = {}
        self.primary_provider = None
        
        # Available providers in order of preference
        self.provider_configs = [
            {
                'name': 'openai',
                'class': OpenAICarDamageRAG,
                'env_key': 'OPENAI_API_KEY',
                'description': 'OpenAI GPT-4 Vision'
            },
            {
                'name': 'claude',
                'class': ClaudeCarDamageRAG,
                'env_key': 'CLAUDE_API_KEY',
                'description': 'Claude 3 Vision'
            },
            {
                'name': 'gemini',
                'class': CarDamageRAG,
                'env_key': 'GEMINI_API_KEY',
                'description': 'Google Gemini Vision'
            }
        ]
        
        # Initialize available providers
        self.initialize_providers()
        
    def initialize_providers(self):
        """Initialize all available AI providers"""
        for config in self.provider_configs:
            try:
                api_key = os.getenv(config['env_key'])
                if api_key:
                    provider_instance = config['class']()
                    self.providers[config['name']] = {
                        'instance': provider_instance,
                        'description': config['description'],
                        'status': 'active'
                    }
                    if not self.primary_provider:
                        self.primary_provider = config['name']
                    logger.info(f"Initialized {config['description']} successfully")
                else:
                    logger.warning(f"API key not found for {config['description']} ({config['env_key']})")
            except Exception as e:
                logger.error(f"Failed to initialize {config['description']}: {str(e)}")
                
        if not self.providers:
            logger.error("No AI providers could be initialized! Please check your API keys.")
            raise Exception("No AI providers available")
            
        logger.info(f"MultiAI system initialized with {len(self.providers)} providers")
        logger.info(f"Primary provider: {self.primary_provider}")
        logger.info(f"Available providers: {list(self.providers.keys())}")
    
    def get_provider_status(self):
        """Get status of all providers"""
        return {
            'primary_provider': self.primary_provider,
            'providers': {name: {'description': info['description'], 'status': info['status']} 
                         for name, info in self.providers.items()}
        }
    
    def analyze_image_with_fallback(self, image_path, preferred_provider=None):
        """Analyze image with automatic fallback to other providers"""
        providers_to_try = []
        
        # Determine the order of providers to try
        if preferred_provider and preferred_provider in self.providers:
            providers_to_try.append(preferred_provider)
        
        # Add primary provider if not already added
        if self.primary_provider not in providers_to_try:
            providers_to_try.append(self.primary_provider)
        
        # Add all other providers
        for provider_name in self.providers:
            if provider_name not in providers_to_try:
                providers_to_try.append(provider_name)
        
        last_error = None
        
        for provider_name in providers_to_try:
            try:
                if provider_name not in self.providers:
                    continue
                    
                provider = self.providers[provider_name]
                
                if provider['status'] != 'active':
                    logger.warning(f"Skipping inactive provider: {provider_name}")
                    continue
                
                logger.info(f"Attempting analysis with {provider['description']}")
                
                # Try the analysis
                if hasattr(provider['instance'], 'analyze_damage_comprehensive'):
                    result = provider['instance'].analyze_damage_comprehensive(image_path)
                else:
                    result = provider['instance'].analyze_image(image_path)
                
                logger.info(f"Analysis successful with {provider['description']}")
                return {
                    'result': result,
                    'provider_used': provider_name,
                    'provider_description': provider['description']
                }
                
            except Exception as e:
                last_error = e
                logger.warning(f"Analysis failed with {provider_name}: {str(e)}")
                
                # Mark provider as temporary failure if quota exceeded
                if "quota" in str(e).lower() or "429" in str(e):
                    logger.warning(f"Quota exceeded for {provider_name}, marking as temporary failure")
                    self.providers[provider_name]['status'] = 'quota_exceeded'
                    
                continue
        
        # If all providers failed, raise the last error
        if last_error:
            raise Exception(f"All AI providers failed. Last error: {str(last_error)}")
        else:
            raise Exception("No active AI providers available")
    
    def analyze_image(self, image_path, preferred_provider=None):
        """Main analysis method with fallback support"""
        try:
            logger.info(f"Starting multi-AI analysis for image: {image_path}")
            
            result = self.analyze_image_with_fallback(image_path, preferred_provider)
            
            logger.info(f"Analysis completed successfully using {result['provider_used']}")
            return result['result']
            
        except Exception as e:
            logger.error(f"Multi-AI analysis failed: {str(e)}")
            logger.error(traceback.format_exc())
            raise Exception(f"Multi-AI analysis failed: {str(e)}")
    
    def analyze_damage_comprehensive(self, image_path, include_vehicle_id=True, include_cost_analysis=True, preferred_provider=None):
        """
        Comprehensive damage analysis with all features and fallback support
        """
        try:
            logger.info(f"[MultiAI] Starting comprehensive damage analysis")
            
            # Perform the analysis with fallback
            result = self.analyze_image_with_fallback(image_path, preferred_provider)
            
            # Log success
            logger.info(f"[MultiAI] Comprehensive damage analysis completed successfully using {result['provider_used']}")
            
            return result['result']
            
        except Exception as e:
            logger.error(f"[MultiAI] Comprehensive analysis failed: {str(e)}")
            logger.error(traceback.format_exc())
            raise Exception(f"Comprehensive analysis failed: {str(e)}")
    
    def reset_provider_status(self, provider_name=None):
        """Reset provider status (useful for quota resets)"""
        if provider_name:
            if provider_name in self.providers:
                self.providers[provider_name]['status'] = 'active'
                logger.info(f"Reset status for {provider_name}")
        else:
            # Reset all providers
            for name in self.providers:
                self.providers[name]['status'] = 'active'
            logger.info("Reset status for all providers")
    
    def switch_primary_provider(self, new_primary):
        """Switch the primary provider"""
        if new_primary in self.providers:
            self.primary_provider = new_primary
            logger.info(f"Switched primary provider to {new_primary}")
        else:
            logger.error(f"Provider {new_primary} not available")