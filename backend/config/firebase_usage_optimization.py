#!/usr/bin/env python3
"""
Firebase Usage Optimization Module

This module provides strategies to optimize Firebase usage and handle 
usage limitations for both development and production environments.
"""

import os
import logging
import time
import json
from datetime import datetime, timedelta
from functools import wraps

logger = logging.getLogger(__name__)

# Optimization settings
CACHE_DURATION_SECONDS = 300  # 5 minutes cache for frequently accessed data
REQUEST_THROTTLE_SECONDS = 1  # Minimum time between Firebase requests
DEFAULT_BATCH_SIZE = 20  # Number of documents to fetch in one batch

# Storage for in-memory cache
_data_cache = {}
_last_request_time = {}

def is_production():
    """Check if the application is running in production mode."""
    return os.environ.get('FLASK_ENV') == 'production' and os.environ.get('DEV_MODE') != 'true'

def cached_firestore_query(collection_name, cache_seconds=CACHE_DURATION_SECONDS):
    """
    Decorator for caching Firestore queries
    
    Args:
        collection_name: Name of the collection being queried (for cache key)
        cache_seconds: How long to cache the results
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key based on function name, collection, and arguments
            key = f"{func.__name__}_{collection_name}_{str(args)}_{str(kwargs)}"
            
            # Check if we have a cached result that's not expired
            if key in _data_cache:
                cache_time, cached_data = _data_cache[key]
                if datetime.now() - cache_time < timedelta(seconds=cache_seconds):
                    logger.debug(f"Using cached data for {key}")
                    return cached_data
            
            # Execute the function and cache the result
            result = func(*args, **kwargs)
            _data_cache[key] = (datetime.now(), result)
            return result
        return wrapper
    return decorator

def throttle_requests(collection_name, min_delay=REQUEST_THROTTLE_SECONDS):
    """
    Decorator to throttle requests to Firebase
    
    Args:
        collection_name: Name of the collection for rate limiting key
        min_delay: Minimum delay between requests in seconds
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get last request time for this collection
            last_time = _last_request_time.get(collection_name, 0)
            current_time = time.time()
            
            # If we need to throttle, sleep for the required time
            if current_time - last_time < min_delay:
                sleep_time = min_delay - (current_time - last_time)
                logger.debug(f"Throttling request to {collection_name} for {sleep_time:.2f}s")
                time.sleep(sleep_time)
            
            # Update last request time and execute function
            _last_request_time[collection_name] = time.time()
            return func(*args, **kwargs)
        return wrapper
    return decorator

def batch_process_documents(collection_ref, processor_func, batch_size=DEFAULT_BATCH_SIZE):
    """
    Process Firestore documents in batches to avoid excessive reads
    
    Args:
        collection_ref: Firestore collection reference
        processor_func: Function to process each batch of documents
        batch_size: Number of documents per batch
    
    Returns:
        Combined results from all batches
    """
    # Start with first batch
    query = collection_ref.limit(batch_size)
    docs = list(query.stream())
    results = []
    
    # Process first batch
    if docs:
        batch_results = processor_func(docs)
        results.extend(batch_results)
    
    # Continue processing batches until we run out
    while len(docs) == batch_size:
        # Get the last document from previous batch
        last_doc = docs[-1]
        
        # Create a query for the next batch starting after last doc
        query = collection_ref.start_after(last_doc).limit(batch_size)
        docs = list(query.stream())
        
        # Process this batch
        if docs:
            batch_results = processor_func(docs)
            results.extend(batch_results)
    
    return results

def get_tiered_usage_plan():
    """
    Get the current Firebase usage tier and limits
    """
    # In a real implementation, this might call Firebase Admin API
    # For now, we'll return hardcoded values for the free tier
    return {
        "tier": "free",
        "limits": {
            "document_reads_per_day": 50000,
            "document_writes_per_day": 20000,
            "document_deletes_per_day": 20000,
            "storage_gb": 1,
            "outbound_traffic_gb_per_day": 10
        }
    }

def log_firebase_operation(operation_type, collection, count=1):
    """
    Log Firebase operations for monitoring usage
    
    Args:
        operation_type: Type of operation (read, write, delete)
        collection: Collection being accessed
        count: Number of operations performed
    """
    if is_production():
        logger.info(f"Firebase {operation_type}: {count} ops on {collection}")
    
    # In a real implementation, you might store these metrics 
    # to track against your usage limits

def save_cached_data_to_disk(cache_dir='./cache'):
    """
    Save cached data to disk to persist between restarts
    """
    os.makedirs(cache_dir, exist_ok=True)
    
    cache_to_save = {}
    for key, (timestamp, data) in _data_cache.items():
        try:
            # Only save items that are JSON serializable
            cache_to_save[key] = {
                'timestamp': timestamp.isoformat(),
                'data': data
            }
        except (TypeError, ValueError):
            logger.warning(f"Could not serialize cache item: {key}")
    
    with open(os.path.join(cache_dir, 'firebase_cache.json'), 'w') as f:
        json.dump(cache_to_save, f)

def load_cached_data_from_disk(cache_dir='./cache'):
    """
    Load cached data from disk
    """
    cache_file = os.path.join(cache_dir, 'firebase_cache.json')
    
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r') as f:
                loaded_cache = json.load(f)
                
            for key, item in loaded_cache.items():
                timestamp = datetime.fromisoformat(item['timestamp'])
                data = item['data']
                _data_cache[key] = (timestamp, data)
                
            logger.info(f"Loaded {len(_data_cache)} items from disk cache")
        except Exception as e:
            logger.error(f"Error loading cache from disk: {str(e)}")

def clear_expired_cache(max_age_seconds=3600):
    """
    Clear expired items from the cache
    
    Args:
        max_age_seconds: Maximum age in seconds for cache items
    """
    now = datetime.now()
    expired_keys = []
    
    for key, (timestamp, _) in _data_cache.items():
        if now - timestamp > timedelta(seconds=max_age_seconds):
            expired_keys.append(key)
    
    for key in expired_keys:
        del _data_cache[key]
    
    if expired_keys:
        logger.info(f"Cleared {len(expired_keys)} expired items from cache")
