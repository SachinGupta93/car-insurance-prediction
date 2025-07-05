#!/usr/bin/env python3
"""
Rate limiting utility to prevent API quota exhaustion
"""
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional

class RateLimiter:
    """
    Global rate limiter for API calls
    """
    
    def __init__(self):
        self.requests_per_minute = 15  # Conservative limit
        self.requests_per_hour = 100   # Daily budget management
        self.request_times = []
        self.lock = threading.Lock()
        
    def can_make_request(self) -> bool:
        """Check if we can make a request without exceeding limits"""
        with self.lock:
            now = datetime.now()
            
            # Clean old requests (older than 1 hour)
            self.request_times = [
                req_time for req_time in self.request_times 
                if now - req_time < timedelta(hours=1)
            ]
            
            # Check hourly limit
            if len(self.request_times) >= self.requests_per_hour:
                return False
            
            # Check per-minute limit
            recent_requests = [
                req_time for req_time in self.request_times 
                if now - req_time < timedelta(minutes=1)
            ]
            
            return len(recent_requests) < self.requests_per_minute
    
    def record_request(self):
        """Record that a request was made"""
        with self.lock:
            self.request_times.append(datetime.now())
    
    def wait_if_needed(self) -> Optional[float]:
        """Wait if rate limit would be exceeded, return wait time"""
        if not self.can_make_request():
            # Calculate wait time
            now = datetime.now()
            recent_requests = [
                req_time for req_time in self.request_times 
                if now - req_time < timedelta(minutes=1)
            ]
            
            if len(recent_requests) >= self.requests_per_minute:
                # Wait until oldest request is older than 1 minute
                oldest_recent = min(recent_requests)
                wait_time = 60 - (now - oldest_recent).total_seconds()
                if wait_time > 0:
                    time.sleep(wait_time)
                    return wait_time
        
        return None

# Global rate limiter instance
global_rate_limiter = RateLimiter()
