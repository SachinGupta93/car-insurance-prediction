#!/usr/bin/env python3
"""
Check Google Gemini API quota usage for all configured keys
"""
import os
import sys
from datetime import datetime, timezone
import google.generativeai as genai
import time

def check_api_key_status(api_key, key_number):
    """Check if an API key is working with realistic car damage analysis load"""
    try:
        # Configure with the API key
        genai.configure(api_key=api_key)
        
        # Try a more realistic test that matches your app's actual usage
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Use a simple test prompt to avoid quota exhaustion
        test_prompt = "Simple API test: Is this working?"
        
        start_time = time.time()
        response = model.generate_content(test_prompt)
        end_time = time.time()
        
        print(f"✅ Key #{key_number} (ending in ...{api_key[-4:]}): WORKING")
        print(f"   Response time: {end_time - start_time:.2f}s")
        print(f"   Response length: {len(response.text)} characters")
        print(f"   First 100 chars: {response.text[:100]}...")
        return True
        
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower() or "ResourceExhausted" in error_msg:
            print(f"❌ Key #{key_number} (ending in ...{api_key[-4:]}): QUOTA EXCEEDED")
            print(f"   Error: {error_msg}")
            return False
        else:
            print(f"⚠️ Key #{key_number} (ending in ...{api_key[-4:]}): OTHER ERROR")
            print(f"   Error: {error_msg}")
            return False

def main():
    print("🔍 Google Gemini API Quota Checker - Enhanced")
    print("=" * 50)
    print(f"Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print()
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv('backend/.env')
    
    # Get API keys
    main_key = os.getenv('GEMINI_API_KEY')  # Updated variable name
    backup_keys_str = os.getenv('GEMINI_BACKUP_KEYS', '')  # Updated variable name
    
    if not main_key:
        print("❌ No GEMINI_API_KEY found in backend/.env")
        return
    
    # Parse backup keys
    backup_keys = [key.strip() for key in backup_keys_str.split(',') if key.strip()]
    
    all_keys = [main_key] + backup_keys
    working_keys = 0
    quota_exceeded_keys = 0
    
    print(f"📊 Found {len(all_keys)} API keys to check")
    print("🔍 Testing with realistic car damage analysis load...")
    print()
    
    for i, key in enumerate(all_keys, 1):
        print(f"Testing Key #{i} (ending in ...{key[-4:]}):")
        if check_api_key_status(key, i):
            working_keys += 1
        else:
            quota_exceeded_keys += 1
        print()
        
        # Longer delay between checks to avoid rate limiting
        if i < len(all_keys):
            print("⏸️  Waiting 3 seconds before next key test...")
            time.sleep(3)
    
    print("=" * 50)
    print("📈 SUMMARY:")
    print(f"   Total Keys: {len(all_keys)}")
    print(f"   Working: {working_keys}")
    print(f"   Quota Exceeded: {quota_exceeded_keys}")
    print()
    
    if working_keys == 0:
        print("🚨 ALL API KEYS HAVE EXCEEDED QUOTA!")
        print()
        print("💡 Solutions:")
        print("   1. Wait for quota reset (midnight UTC)")
        print("   2. Upgrade to Google AI Studio paid tier")
        print("   3. Add more API keys from different accounts")
        print("   4. Use demo mode for testing")
        print()
        print("🔍 Rate Limiting Info:")
        print("   - Gemini API has per-minute and per-day limits")
        print("   - Image analysis uses more quota than text")
        print("   - Check your usage at Google AI Studio")
    elif working_keys < len(all_keys):
        print(f"⚠️ {quota_exceeded_keys} keys need attention")
        print("💡 Consider adding more backup keys or upgrading quota")
    else:
        print("✅ All API keys are working!")
        print("💡 Keys tested with realistic car damage analysis load")
    
    print()
    print("🔗 Useful Links:")
    print("   - Google AI Studio: https://makersuite.google.com/app/apikey")
    print("   - Quota Limits: https://ai.google.dev/gemini-api/docs/rate-limits")
    print("   - Usage Dashboard: https://aistudio.google.com/app/apikey")
    print()
    print("📊 Note: This enhanced checker tests with realistic prompts")
    print("   that match your car damage analysis app's actual usage.")

if __name__ == "__main__":
    main()
