#!/usr/bin/env python3
"""
Script to check which .env files exist and test environment variable loading
"""
import os
from dotenv import load_dotenv
from pathlib import Path

def check_env_files():
    print('\n CHECKING WHICH .ENV FILES EXIST:')
    print('=' * 50)

    # Check all possible .env file locations
    env_files = [
        Path('.env'),
        Path('../.env'), 
        Path('../.env.development'),
        Path('../.env.production'),
        Path('.env.development'),
        Path('.env.production')
    ]

    for env_file in env_files:
        if env_file.exists():
            print(f' Found: {env_file.absolute()}')
            with open(env_file, 'r') as f:
                content = f.read()
                if 'GEMINI_API_KEY' in content:
                    lines = content.split('\n')
                    for line in lines:
                        if line.startswith('GEMINI_API_KEY'):
                            # Show first part of the key for identification
                            key_value = line.split('=')[1] if '=' in line else 'UNKNOWN_FORMAT'
                            if len(key_value) > 10:
                                display_key = f"{key_value[:4]}...{key_value[-4:]}" 
                            else:
                                display_key = 'INVALID_KEY'
                            print(f'   GEMINI_API_KEY={display_key}')
                            break
                else:
                    print('   No GEMINI_API_KEY found in this file')
        else:
            print(f' Missing: {env_file.absolute()}')

def test_env_loading():
    print('\n TESTING ENVIRONMENT LOADING:')
    print('=' * 50)

    # Test loading from current directory
    print('Before any load_dotenv():')
    api_key = os.getenv("GEMINI_API_KEY", "NOT SET")
    if api_key != "NOT SET" and len(api_key) > 8:
        display_key = f"{api_key[:4]}...{api_key[-4:]}"
    else:
        display_key = api_key
    print(f'GEMINI_API_KEY: {display_key}')

    # Load from backend/.env
    print('\nAfter load_dotenv(".env"):')
    load_dotenv('.env')
    api_key = os.getenv("GEMINI_API_KEY", "NOT SET")
    if api_key != "NOT SET" and len(api_key) > 8:
        display_key = f"{api_key[:4]}...{api_key[-4:]}"
    else:
        display_key = api_key
    print(f'GEMINI_API_KEY: {display_key}')

    # Load from parent directory
    print('\nAfter load_dotenv("../.env"):')
    load_dotenv('../.env')
    api_key = os.getenv("GEMINI_API_KEY", "NOT SET")
    if api_key != "NOT SET" and len(api_key) > 8:
        display_key = f"{api_key[:4]}...{api_key[-4:]}"
    else:
        display_key = api_key
    print(f'GEMINI_API_KEY: {display_key}')
    
    # Show all Gemini-related environment variables
    print('\nAll Gemini-related environment variables:')
    for key, value in os.environ.items():
        if 'GEMINI' in key:
            if len(value) > 8:
                display_value = f"{value[:4]}...{value[-4:]}"
            else:
                display_value = value
            print(f'{key}: {display_value}')

def test_api_key_manager():
    print('\n TESTING API KEY MANAGER:')
    print('=' * 50)
    
    try:
        from api_key_manager import api_key_manager
        
        print('APIKeyManager initialization:')
        key_count = len(api_key_manager.all_keys)
        print(f'Total keys loaded: {key_count}')
        
        if key_count > 0:
            current_key = api_key_manager.get_current_key()
            if current_key and len(current_key) > 8:
                display_key = f"{current_key[:4]}...{current_key[-4:]}"
                print(f'Current key: {display_key}')
            else:
                print(f'Current key: {current_key}')
        
        print('\nAPI key status:')
        status = api_key_manager.get_status_report()
        for i, key_info in enumerate(status['keys']):
            print(f"Key #{i+1}: {key_info['key_suffix']} - " +
                 f"{'Current' if key_info['is_current'] else 'Standby'}, " +
                 f"Available: {key_info['available']}")
        
        # Test key rotation (optional)
        # Uncomment if you want to simulate a key rotation
        # print('\nSimulating key rotation:')
        # rotated = api_key_manager.record_quota_exceeded()
        # print(f'Rotation successful: {rotated}')
        # if rotated:
        #     new_key = api_key_manager.get_current_key()
        #     if new_key and len(new_key) > 8:
        #         display_key = f"{new_key[:4]}...{new_key[-4:]}"
        #     else:
        #         display_key = new_key
        #     print(f'New current key: {display_key}')
        
    except Exception as e:
        print(f'Error in APIKeyManager test: {str(e)}')

if __name__ == "__main__":
    print("\n🔑 ENVIRONMENT CONFIGURATION TEST")
    print("=" * 50)
    check_env_files()
    test_env_loading()
    test_api_key_manager()
    print("\n✅ TEST COMPLETE")
