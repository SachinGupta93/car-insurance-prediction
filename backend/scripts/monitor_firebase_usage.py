#!/usr/bin/env python3
"""
Firebase Usage Monitor Script

This script monitors Firebase usage and provides reports/alerts
when approaching or exceeding usage limits.

Run this script periodically to get usage reports and alerts.
"""

import os
import sys
import json
import requests
import logging
import argparse
from datetime import datetime, timedelta
from tabulate import tabulate

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("firebase_usage_monitor.log")
    ]
)

logger = logging.getLogger("firebase-monitor")

# Firebase free tier limits
FIREBASE_FREE_LIMITS = {
    'reads': 50000,  # 50K reads/day
    'writes': 20000,  # 20K writes/day
    'deletes': 20000,  # 20K deletes/day
    'storage': 1,  # 1GB storage
    'bandwidth': 10  # 10GB bandwidth/month
}

# Warning thresholds (percentage of limit)
WARNING_THRESHOLD = 0.75  # 75%
CRITICAL_THRESHOLD = 0.90  # 90%

# Path to store usage data
USAGE_DATA_PATH = os.path.join(os.path.dirname(__file__), 'config', 'firebase_usage.json')

def get_current_usage():
    """Get current usage data or default values if not available"""
    try:
        if os.path.exists(USAGE_DATA_PATH):
            with open(USAGE_DATA_PATH, 'r') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Error loading usage data: {e}")
    
    # Default usage data structure
    return {
        'date': datetime.now().strftime('%Y-%m-%d'),
        'reads': 0,
        'writes': 0,
        'deletes': 0,
        'storage': 0,
        'bandwidth': 0
    }

def get_actual_usage_from_backend():
    """Get actual usage from backend API"""
    try:
        # Attempt to get usage from API (try both common ports)
        for port in [8000, 5000]:
            try:
                api_url = f"http://localhost:{port}/api/admin/firebase-usage"
                response = requests.get(api_url, headers={'X-API-Key': 'dev-api-key-2024'}, timeout=5)
                if response.status_code == 200:
                    logger.info(f"Successfully connected to backend on port {port}")
                    return response.json()
            except requests.exceptions.ConnectionError:
                continue
        
        logger.warning("Could not connect to backend on any port")
    except Exception as e:
        logger.error(f"Could not fetch usage from backend: {e}")
    
    # If API call fails, return the local data
    return {"usage": get_current_usage(), "limits": FIREBASE_FREE_LIMITS}

def calculate_usage_percentages(usage_data):
    """Calculate percentages of usage against limits"""
    usage_percentages = {}
    for key, limit in FIREBASE_FREE_LIMITS.items():
        if key in usage_data:
            usage_percentages[key] = usage_data[key] / (limit * 1000 if key == 'storage' or key == 'bandwidth' else limit)
    return usage_percentages

def check_usage_warnings(usage_data):
    """Check if usage is approaching limits and log warnings"""
    warnings = []
    
    for key, limit in FIREBASE_FREE_LIMITS.items():
        if key in usage_data:
            usage_percent = usage_data[key] / (limit * 1000 if key == 'storage' or key == 'bandwidth' else limit)
            
            if usage_percent >= CRITICAL_THRESHOLD:
                msg = f"CRITICAL: Firebase {key} usage at {usage_percent:.1%} of free tier limit"
                logger.critical(msg)
                warnings.append({'type': key, 'level': 'critical', 'message': msg})
            elif usage_percent >= WARNING_THRESHOLD:
                msg = f"WARNING: Firebase {key} usage at {usage_percent:.1%} of free tier limit"
                logger.warning(msg)
                warnings.append({'type': key, 'level': 'warning', 'message': msg})
    
    return warnings

def format_usage_table(usage_data, percentages, use_plain_text=False):
    """Format usage data into a readable table
    
    Args:
        usage_data: Dictionary of usage metrics
        percentages: Dictionary of usage percentages
        use_plain_text: If True, use plain text status indicators instead of emoji
    """
    table_data = []
    for key, limit in FIREBASE_FREE_LIMITS.items():
        if key in usage_data:
            limit_value = limit * 1000 if key == 'storage' or key == 'bandwidth' else limit
            percent = percentages.get(key, 0)
            
            # Determine status symbol (with plain text fallback)
            if percent >= CRITICAL_THRESHOLD:
                status = "CRITICAL" if use_plain_text else "🔴 CRITICAL"
            elif percent >= WARNING_THRESHOLD:
                status = "WARNING" if use_plain_text else "🟡 WARNING"
            else:
                status = "OK" if use_plain_text else "🟢 OK"
                
            table_data.append([
                key.capitalize(),
                f"{usage_data[key]:,}",
                f"{limit_value:,}",
                f"{percent:.1%}",
                status
            ])
    
    return tabulate(table_data, headers=["Metric", "Current", "Limit", "Usage %", "Status"], tablefmt="grid")

def get_cost_estimate(usage_data):
    """Estimate what this usage would cost on Blaze plan"""
    # Blaze pricing (as of 2025)
    pricing = {
        'reads': 0.06 / 100000,  # $0.06 per 100K reads
        'writes': 0.18 / 100000,  # $0.18 per 100K writes
        'deletes': 0.02 / 100000,  # $0.02 per 100K deletes
        'storage': 0.18,  # $0.18 per GB per month
        'bandwidth': 0.12,  # $0.12 per GB
    }
    
    # Calculate monthly estimates (assuming current daily rate)
    daily_cost = sum(usage_data.get(key, 0) * rate for key, rate in pricing.items() if key in usage_data and key != 'storage')
    monthly_cost = daily_cost * 30 + usage_data.get('storage', 0) * pricing['storage']
    
    return {
        'daily_estimate': daily_cost,
        'monthly_estimate': monthly_cost
    }

def generate_report(usage_info=None, use_plain_text=False):
    """
    Generate a full usage report
    
    Args:
        usage_info: Dictionary with usage data
        use_plain_text: If True, use plain text status indicators instead of emoji
    """
    if not usage_info:
        usage_info = get_actual_usage_from_backend()
    
    usage_data = usage_info.get('usage', {})
    percentages = calculate_usage_percentages(usage_data)
    warnings = check_usage_warnings(usage_data)
    cost_estimate = get_cost_estimate(usage_data)
    
    report = "\n" + "="*60 + "\n"
    report += "FIREBASE USAGE REPORT\n"
    report += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    report += "="*60 + "\n\n"
    
    report += format_usage_table(usage_data, percentages, use_plain_text)
    report += "\n\n"
    
    if warnings:
        report += "WARNING MESSAGES:\n"
        for warning in warnings:
            report += f"- {warning['message']}\n"
        report += "\n"
    
    report += "COST ESTIMATES (Blaze Plan):\n"
    report += f"- Daily estimate: ${cost_estimate['daily_estimate']:.2f}\n"
    report += f"- Monthly estimate: ${cost_estimate['monthly_estimate']:.2f}\n\n"
    
    report += "RECOMMENDATIONS:\n"
    if any(w['level'] == 'critical' for w in warnings):
        report += "- URGENT: Upgrade to Firebase Blaze plan immediately\n"
        report += "- Consider implementing more aggressive data caching\n"
        report += "- Reduce unnecessary database operations\n"
    elif any(w['level'] == 'warning' for w in warnings):
        report += "- Prepare to upgrade to Firebase Blaze plan soon\n"
        report += "- Review code for optimization opportunities\n"
    else:
        report += "- Current usage is within free tier limits\n"
        report += "- Continue monitoring usage as your application grows\n"
    
    return report

def main():
    """Main function for CLI usage"""
    parser = argparse.ArgumentParser(description="Firebase Usage Monitor")
    parser.add_argument("--report", action="store_true", help="Generate a usage report")
    parser.add_argument("--email", action="store_true", help="Email the report to admins")
    parser.add_argument("--check", action="store_true", help="Check for critical usage and exit with error code if found")
    args = parser.parse_args()
    
    usage_info = get_actual_usage_from_backend()
    
    if args.report:
        # Generate report for display (with emojis)
        report = generate_report(usage_info, use_plain_text=False)
        print(report)
        
        # Generate plain text report for file (avoid encoding issues)
        file_report = generate_report(usage_info, use_plain_text=True)
        
        # Save report to file with robust encoding handling
        try:
            with open("firebase_usage_report.txt", "w", encoding="utf-8") as f:
                f.write(file_report)
                logger.info("Report saved to firebase_usage_report.txt")
        except UnicodeEncodeError as e:
            logger.warning(f"UTF-8 encoding failed: {e}. Trying with ASCII fallback.")
            # Fallback to ASCII encoding if UTF-8 fails
            try:
                with open("firebase_usage_report.txt", "w", encoding="ascii", errors="ignore") as f:
                    f.write(file_report)
                    logger.info("Report saved to firebase_usage_report.txt (ASCII encoding)")
            except Exception as e2:
                logger.error(f"Failed to save report with fallback encoding: {str(e2)}")
        except Exception as e:
            logger.error(f"Error saving report to file: {str(e)}")
            # Final fallback - try saving without any special characters
            try:
                # Remove any non-ASCII characters as a last resort
                clean_report = file_report.encode('ascii', 'ignore').decode('ascii')
                with open("firebase_usage_report.txt", "w") as f:
                    f.write(clean_report)
                    logger.info("Report saved to firebase_usage_report.txt (clean ASCII)")
            except Exception as e3:
                logger.error(f"All fallback methods failed: {str(e3)}")
            
    if args.email:
        # This would be implemented with an email library
        # For now, just mention that emailing is not implemented
        print("Email functionality not implemented. Report saved to firebase_usage_report.txt")
    
    if args.check:
        warnings = check_usage_warnings(usage_info.get('usage', {}))
        if any(w['level'] == 'critical' for w in warnings):
            logger.critical("Critical Firebase usage detected. Action required.")
            sys.exit(1)
    
    # If no arguments provided, show brief status
    if not (args.report or args.email or args.check):
        usage_data = usage_info.get('usage', {})
        percentages = calculate_usage_percentages(usage_data)
        warnings = check_usage_warnings(usage_data)
        
        print("\nFirebase Usage Status:")
        print(format_usage_table(usage_data, percentages))
        
        if warnings:
            print("\nWarnings:")
            for warning in warnings:
                print(f"- {warning['message']}")

if __name__ == "__main__":
    main()
