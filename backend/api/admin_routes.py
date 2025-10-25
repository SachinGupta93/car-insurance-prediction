import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from config.firebase_config import get_firebase_config
from .utils import require_api_key, require_admin

admin_bp = Blueprint('admin', __name__)

# Firebase REST API client
firebase_config = get_firebase_config()
firebase_db_url = firebase_config['databaseURL']
 
# RTDB helper services (lean helpers to simplify routes)
from .rtdb_service import (
    get_uid_from_request,
    get_user_history,
    get_shallow_users,
    build_compact_users_data,
)

def process_insurance_data(users_data):
    """Process user data to create insurance-specific dashboard statistics"""
    # Initialize counters
    total_claims = 0
    total_claim_value = 0
    approved_claims = 0
    pending_claims = 0
    rejected_claims = 0
    coverage_types = {"comprehensive": 0, "collision": 0, "liability": 0}
    claim_statuses = {"approved": 0, "pending": 0, "rejected": 0}
    recent_claims = []
    vehicle_data = {}
    
    current_date = datetime.now()
    current_month = current_date.month
    current_year = current_date.year
    
    # Helper to parse numeric claim amount from various fields
    def _parse_amount(v):
        try:
            if v is None:
                return None
            s = str(v)
            # Try to extract the largest number in the string
            import re
            nums = re.findall(r"\d+[\d,]*", s)
            if nums:
                # Remove commas and convert
                return float(nums[-1].replace(',', ''))
            return float(s.replace(',', '').replace('$', ''))
        except Exception:
            return None

    # Process each user's data
    for user_id, user_data in users_data.items():
        if not isinstance(user_data, dict):
            continue
            
        # Get analysis history (claims data)
        analysis_history = user_data.get('analysisHistory', {})
        if not analysis_history:
            analysis_history = user_data.get('analysis_history', {})
            
        if isinstance(analysis_history, dict):
            for history_id, history_data in analysis_history.items():
                if not isinstance(history_data, dict):
                    continue
                    
                total_claims += 1
                
                # Extract cost information (supports result.repairEstimate)
                estimated_cost = history_data.get('estimatedCost') or history_data.get('estimated_cost')
                if not estimated_cost:
                    result = history_data.get('result') or {}
                    estimated_cost = result.get('repairEstimate')
                amt = _parse_amount(estimated_cost)
                if amt is not None:
                    total_claim_value += amt
                
                # Simulate claim status based on timestamp
                # Use uploadedAt if timestamp missing
                timestamp = history_data.get('timestamp') or history_data.get('uploadedAt') or ''
                if timestamp:
                    try:
                        analysis_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        days_old = (current_date - analysis_date).days
                        
                        if days_old < 2:
                            status = 'pending'
                            pending_claims += 1
                        elif days_old < 30:
                            status = 'approved'
                            approved_claims += 1
                        else:
                            status = 'approved'
                            approved_claims += 1
                    except:
                        status = 'approved'
                        approved_claims += 1
                else:
                    status = 'approved'
                    approved_claims += 1
                
                claim_statuses[status] += 1
                
                # Extract vehicle information
                vehicle_details = history_data.get('vehicleDetails', {})
                if not vehicle_details:
                    vehicle_details = history_data.get('vehicle_details', {})
                    
                if vehicle_details:
                    make = vehicle_details.get('make', 'Unknown')
                    model = vehicle_details.get('model', 'Unknown')
                    key = f"{make} {model}"
                    
                    if key not in vehicle_data:
                        vehicle_data[key] = {
                            'make': make,
                            'model': model,
                            'claims': 0,
                            'totalCost': 0,
                            'avgCost': 0
                        }
                    
                    vehicle_data[key]['claims'] += 1
                    if estimated_cost:
                        try:
                            cost_str = str(estimated_cost).replace('$', '').replace(',', '')
                            cost = float(cost_str)
                            vehicle_data[key]['totalCost'] += cost
                        except:
                            pass
                
                # Add to recent claims
                recent_claims.append({
                    'id': history_id,
                    'vehicleMake': vehicle_details.get('make', 'Unknown'),
                    'vehicleModel': vehicle_details.get('model', 'Unknown'),
                    'claimAmount': amt or 0,
                    'status': status,
                    'timestamp': timestamp,
                    'damageType': (history_data.get('damageAnalysis', {}) or history_data.get('result', {})).get('damageType', 'Unknown')
                })
    
    # Calculate averages for vehicle data
    for key, data in vehicle_data.items():
        if data['claims'] > 0:
            data['avgCost'] = int(data['totalCost'] / data['claims'])
    
    # Sort recent claims by timestamp
    recent_claims.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    recent_claims = recent_claims[:10]  # Get 10 most recent
    
    # Calculate metrics
    approval_rate = approved_claims / total_claims if total_claims > 0 else 0
    avg_claim_value = total_claim_value / total_claims if total_claims > 0 else 0
    
    # Generate monthly trends
    monthly_trends = []
    months = ["2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12"]
    for month in months:
        month_claims = max(1, int(total_claims / 6))  # Distribute claims across months
        monthly_trends.append({
            'month': month,
            'claims': month_claims,
            'settlements': int(month_claims * approval_rate),
            'avgCost': int(avg_claim_value)
        })
    
    # If no data, return an empty but valid structure (no sample fallback)
    if total_claims == 0:
        return {
            "totalClaims": 0,
            "avgClaimValue": 0,
            "topInsuranceType": "N/A",
            "claimsThisMonth": 0,
            "totalInsuranceValue": 0,
            "claimApprovalRate": 0,
            "pendingApprovals": 0,
            "avgProcessingTime": "N/A",
            "monthlyTrends": [],
            "coverageBreakdown": {"comprehensive": 0, "collision": 0, "liability": 0},
            "claimStatusDistribution": {"approved": 0, "pending": 0, "rejected": 0},
            "recentClaims": []
        }
    
    # Process real data - fix field names to match frontend expectations
    return {
        "totalClaims": total_claims,
        "avgClaimValue": int(avg_claim_value),
        "topInsuranceType": "Comprehensive",  # Default value
        "claimsThisMonth": sum(1 for claim in recent_claims if claim.get('timestamp', '').startswith('2024-12')),
        "totalInsuranceValue": int(total_claim_value),
        "claimApprovalRate": round(approval_rate, 2),
        "pendingApprovals": pending_claims,
        "avgProcessingTime": "5-7 days",  # Default value
        "monthlyTrends": [
            {
                "month": trend['month'],
                "claims": trend['claims'],
                "settlements": trend['settlements'],
                "averageCost": trend['avgCost']
            } for trend in monthly_trends
        ],
        "coverageBreakdown": coverage_types,
        "claimStatusDistribution": claim_statuses,
        "recentClaims": [
            {
                "id": claim['id'],
                "submittedAt": claim['timestamp'],
                "claimDetails": {
                    "policyNumber": f"POL-{claim['id'][:3].upper()}",
                    "insuranceProvider": "SafeDrive",
                    "claimAmount": claim['claimAmount'],
                    "status": claim['status'],
                    "vehicleMake": claim['vehicleMake'],
                    "vehicleModel": claim['vehicleModel'],
                    "damageType": claim['damageType'],
                    "premium": int(claim['claimAmount'] * 0.1)  # Approximate premium
                }
            } for claim in recent_claims[:5]
        ]
    }

def process_dashboard_data(users_data):
    """Process user data to create aggregated dashboard statistics"""
    # Initialize counters
    total_analyses = 0
    total_users = len(users_data)
    new_users_this_month = 0
    all_analyses = []
    damage_types = {}
    vehicle_makes = {}
    total_repair_cost = 0
    repair_cost_count = 0
    monthly_counts = {}  # Track analyses by month
    severity_breakdown = {}  # Track severity levels
    
    current_date = datetime.now()
    current_month = current_date.month
    current_year = current_date.year
    
    # Process each user's data
    for user_id, user_data in users_data.items():
        if not isinstance(user_data, dict):
            continue
            
        # Check if user joined this month
        user_profile = user_data.get('profile', {})
        created_at = user_profile.get('createdAt', '')
        if created_at:
            try:
                created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                if created_date.month == current_month and created_date.year == current_year:
                    new_users_this_month += 1
            except:
                pass
        
        # Get analysis history
        analysis_history = user_data.get('analysisHistory', {})
        if not analysis_history:
            analysis_history = user_data.get('analysis_history', {})
        
        if isinstance(analysis_history, dict):
            for history_id, history_data in analysis_history.items():
                if not isinstance(history_data, dict):
                    continue
                    
                total_analyses += 1
                
                # Extract damage information - try multiple possible field names, include 'result'
                damage_info = history_data.get('damageAnalysis', {})
                if not damage_info:
                    damage_info = history_data.get('damage_analysis', {})
                if not damage_info:
                    damage_info = history_data.get('analysis', {})
                if not damage_info and 'result' in history_data:
                    damage_info = history_data.get('result', {})
                    
                # debug: damage info found
                
                if damage_info:
                    damage_type = damage_info.get('damageType', damage_info.get('damage_type', 'Unknown'))
                    damage_types[damage_type] = damage_types.get(damage_type, 0) + 1
                    
                    # Extract severity information - try multiple field names
                    severity = damage_info.get('severity', damage_info.get('damage_severity', 'Unknown'))
                    severity_breakdown[severity] = severity_breakdown.get(severity, 0) + 1
                    
                    # debug: damage_type and severity processed
                else:
                    # debug: no damage info found in expected fields
                    # Try to extract from other possible locations
                    if 'results' in history_data:
                        results = history_data['results']
                        # debug: using results field as fallback
                        if isinstance(results, dict):
                            damage_type = results.get('damage_type', 'Unknown')
                            severity = results.get('severity', 'Unknown')
                            damage_types[damage_type] = damage_types.get(damage_type, 0) + 1
                            severity_breakdown[severity] = severity_breakdown.get(severity, 0) + 1
                
                # Extract vehicle information
                vehicle_details = history_data.get('vehicleDetails', {})
                if not vehicle_details:
                    vehicle_details = history_data.get('vehicle_details', {})
                    
                if vehicle_details:
                    make = vehicle_details.get('make', 'Unknown')
                    vehicle_makes[make] = vehicle_makes.get(make, 0) + 1
                
                # Extract cost information, support result.repairEstimate
                estimated_cost = history_data.get('estimatedCost') or history_data.get('estimated_cost')
                if not estimated_cost and isinstance(damage_info, dict):
                    estimated_cost = damage_info.get('repairEstimate')
                try:
                    if estimated_cost is not None:
                        cost_str = str(estimated_cost)
                        import re
                        nums = re.findall(r"\d+[\d,]*", cost_str)
                        if nums:
                            cost = float(nums[-1].replace(',', ''))
                            total_repair_cost += cost
                            repair_cost_count += 1
                except:
                    pass
                
                # Process monthly trends
                timestamp = history_data.get('timestamp', '')
                if timestamp:
                    try:
                        analysis_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        month_key = analysis_date.strftime('%Y-%m')
                        monthly_counts[month_key] = monthly_counts.get(month_key, 0) + 1
                    except:
                        pass
                
                # Add to recent analyses
                all_analyses.append({
                    'id': history_id,
                    'vehicleMake': vehicle_details.get('make', 'Unknown'),
                    'vehicleModel': vehicle_details.get('model', 'Unknown'),
                    'damageType': (damage_info or {}).get('damageType', 'Unknown'),
                    'confidence': (damage_info or {}).get('confidence', 0),
                    'timestamp': timestamp,
                    'estimatedCost': estimated_cost or 0
                })
    
    # Sort analyses by timestamp (most recent first)
    all_analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    recent_analyses = all_analyses[:5]  # Get 5 most recent
    
    # Calculate aggregated data
    avg_confidence = sum(a.get('confidence', 0) for a in all_analyses) / len(all_analyses) if all_analyses else 0
    top_damage_type = max(damage_types.keys(), key=lambda k: damage_types[k]) if damage_types else 'Unknown'
    popular_vehicle_makes = sorted(vehicle_makes.keys(), key=lambda k: vehicle_makes[k], reverse=True)[:3]
    avg_repair_cost = total_repair_cost / repair_cost_count if repair_cost_count > 0 else 0
    
    # Count analyses this month
    analyses_this_month = 0
    for analysis in all_analyses:
        timestamp = analysis.get('timestamp', '')
        if timestamp:
            try:
                analysis_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                if analysis_date.month == current_month and analysis_date.year == current_year:
                    analyses_this_month += 1
            except:
                pass
    
    # Create monthly trends in the format expected by frontend
    monthly_trends = []
    for month_key in sorted(monthly_counts.keys()):
        try:
            date_obj = datetime.strptime(month_key, '%Y-%m')
            month_name = date_obj.strftime('%B')
            monthly_trends.append({
                'month': month_name,
                'count': monthly_counts[month_key],
                'avgCost': int(avg_repair_cost) if avg_repair_cost > 0 else 0
            })
        except:
            pass
    
    # If no monthly trends, create at least current month
    if not monthly_trends:
        current_month_name = datetime.now().strftime('%B')
        monthly_trends = [{
            'month': current_month_name,
            'count': analyses_this_month,
            'avgCost': int(avg_repair_cost) if avg_repair_cost > 0 else 0
        }]
    
    # If no data, return an empty but valid structure (no sample fallback)
    if total_analyses == 0:
        return {
            "totalAnalyses": 0,
            "avgConfidence": 0,
            "topDamageType": "N/A",
            "analysesThisMonth": 0,
            "totalClaimsValue": 0,
            "claimsSuccessRate": 0,
            "activeClaims": 0,
            "avgClaimTime": "N/A",
            "pendingClaims": 0,
            "resolvedClaims": 0,
            "totalUsers": total_users,
            "newUsersThisMonth": new_users_this_month,
            "popularVehicleMakes": [],
            "avgRepairCost": 0,
            "recentAnalyses": [],
            "damageTypeDistribution": {},
            "monthlyTrends": [],
            "severityBreakdown": {}
        }
    
    return {
        "totalAnalyses": total_analyses,
        "avgConfidence": round(avg_confidence, 2),
        "topDamageType": top_damage_type,
        "analysesThisMonth": analyses_this_month,
        "totalClaimsValue": int(total_repair_cost),
        "claimsSuccessRate": 0.92,  # Default value
        "activeClaims": max(0, int(total_analyses * 0.1)),  # 10% of total as active
        "avgClaimTime": "7 days",
        "pendingClaims": max(0, int(total_analyses * 0.05)),  # 5% as pending
        "resolvedClaims": max(0, int(total_analyses * 0.85)),  # 85% as resolved
        "totalUsers": total_users,
        "newUsersThisMonth": new_users_this_month,
        "popularVehicleMakes": popular_vehicle_makes,
        "avgRepairCost": int(avg_repair_cost),
        "recentAnalyses": recent_analyses,
        "damageTypeDistribution": damage_types,
        "monthlyTrends": monthly_trends,
        "severityBreakdown": severity_breakdown
    }


@admin_bp.route('/admin/aggregated-dashboard-data', methods=['GET', 'OPTIONS'])
@require_api_key
@require_admin
def get_aggregated_dashboard_data():
    """
    Retrieves aggregated data for the main dashboard.
    If admin access fails, fallback to current user's data only.
    """
    try:
        logging.info("Fetching aggregated dashboard data for main dashboard")

        # Use Firebase REST API to access the Realtime Database
        try:
            
            # Get uid and token via helper
            current_user_id, token = get_uid_from_request(request)

            # EARLY USER-FIRST FETCH: try to return user's data fast
            if current_user_id:
                history = get_user_history(firebase_db_url, current_user_id, token, limit=100)
                if history:
                    compact_users_data = {current_user_id: {'analysisHistory': history}}
                    aggregated_data = process_dashboard_data(compact_users_data)
                    return jsonify({
                        "success": True,
                        "data": aggregated_data,
                        "data_source": "real",
                        "message": "Using current user's data"
                    }), 200

            # 1) Try shallow fetch user IDs (admin access)
            status, users_data_compact = get_shallow_users(firebase_db_url, token)
            
            # Check if we got admin access or just user access
            # Also fallback if we get empty data or just the current user
            
            # If we got 401/403 OR empty data OR only current user, use fallback
            should_fallback = (
                status in (401, 403) or 
                not users_data_compact or 
                (isinstance(users_data_compact, dict) and len(users_data_compact) <= 1)
            )
            
            if should_fallback and current_user_id:
                # Limited access or no users, fallback to current user's data only
                logging.info(f"Using fallback: fetching current user's data: {current_user_id} (status: {status}, users: {len(users_data_compact) if isinstance(users_data_compact, dict) else 0})")
                history = get_user_history(firebase_db_url, current_user_id, token, limit=100)

                if history:
                    compact_users_data = {current_user_id: {'analysisHistory': history}}
                    aggregated_data = process_dashboard_data(compact_users_data)
                    return jsonify({
                        "success": True,
                        "data": aggregated_data,
                        "data_source": "real",
                        "message": "Using current user's data"
                    }), 200
                else:
                    logging.warning("No history found for current user via all strategies")
                    aggregated_data = process_dashboard_data({})
                    return jsonify({
                        "success": True,
                        "data": aggregated_data,
                        "data_source": "empty",
                        "message": "No user data available"
                    }), 200
            
            if not isinstance(users_data_compact, dict) or not users_data_compact:
                logging.info("No users found via shallow fetch; returning empty dataset")
                aggregated_data = process_dashboard_data({})
                return jsonify({
                    "success": True,
                    "data": aggregated_data,
                    "data_source": "empty",
                    "message": "No user data available"
                }), 200

            user_ids = list(users_data_compact.keys())
            logging.info(f"Shallow fetched {len(user_ids)} users; fetching limited histories...")

            # 2) For each user, fetch only last N analysisHistory entries ordered by uploadedAt
            per_user_limit = int(request.args.get('per_user_limit', 50))
            max_users = int(request.args.get('max_users', 50))
            selected_user_ids = user_ids[:max_users]

            # Build compact users data concurrently using helper
            compact_users_data = build_compact_users_data(firebase_db_url, selected_user_ids, token, per_user_limit)
            logging.info(f"Built compact users_data for {len(compact_users_data)} users")

            # 3) Process compact data
            aggregated_data = process_dashboard_data(compact_users_data)
            response_data = {
                "success": True,
                "data": aggregated_data,
                "data_source": "real",
                "message": "Using real data from Firebase REST API (compact)"
            }
            logging.info("Successfully returned real (compact) dashboard data")
            return jsonify(response_data), 200

        except Exception as rest_error:
            logging.warning(f"Failed to access Firebase REST API: {rest_error}")
            # Return empty structures on failure
            aggregated_data = process_dashboard_data({})
            return jsonify({
                "success": True,
                "data": aggregated_data,
                "data_source": "empty",
                "message": "Firebase connection error; returning empty data"
            }), 200

    except Exception as e:
        logging.error(f"Error fetching aggregated dashboard data: {e}", exc_info=True)
        # Return empty data even on error to prevent 500 responses
        aggregated_data = process_dashboard_data({})
        return jsonify({
            "success": True,
            "data": aggregated_data,
            "data_source": "empty",
            "message": "Error fetching data; returning empty dataset",
            "error_details": str(e)
        }), 200

 

@admin_bp.route('/admin/insurance-dashboard-data', methods=['GET', 'OPTIONS'])
@require_api_key
@require_admin
def get_insurance_dashboard_data():
    """
    Retrieves insurance-specific dashboard data.
    If admin access fails, fallback to current user's data only.
    """
    try:
        logging.info("Fetching insurance-specific dashboard data")
        # Use Firebase REST API compact strategy
        try:
            # Get uid and token via helper
            current_user_id, token = get_uid_from_request(request)

            # EARLY USER-FIRST FETCH: if we have a current user, try to return their insurance data fast
            if current_user_id:
                history = get_user_history(firebase_db_url, current_user_id, token, limit=100)
                if history:
                    compact_users_data = {current_user_id: {'analysisHistory': history}}
                    insurance_data = process_insurance_data(compact_users_data)
                    return jsonify({
                        "success": True,
                        "data": insurance_data,
                        "data_source": "real",
                        "message": "Using current user's insurance data"
                    }), 200

            # 1) Try shallow fetch user IDs (admin access)
            status, users_data_compact = get_shallow_users(firebase_db_url, token)
            
            # Check if we got admin access or just user access
            # Also fallback if we get empty data or just the current user
            # users_data_compact already parsed
            
            # If we got 401/403 OR empty data OR only current user, use fallback
            should_fallback = (
                status in (401, 403) or 
                not users_data_compact or 
                (isinstance(users_data_compact, dict) and len(users_data_compact) <= 1)
            )
            
            if should_fallback and current_user_id:
                # Limited access or no users, fallback to current user's data only
                logging.info(
                    f"Using insurance fallback: fetching current user's data: {current_user_id} "
                    f"(status: {status}, users: {len(users_data_compact) if isinstance(users_data_compact, dict) else 0})"
                )

                user_history = get_user_history(firebase_db_url, current_user_id, token, limit=100)
                if user_history:
                    compact_users_data = {
                        current_user_id: {'analysisHistory': user_history}
                    }
                    insurance_data = process_insurance_data(compact_users_data)
                    return jsonify({
                        "success": True,
                        "data": insurance_data,
                        "data_source": "real",
                        "message": "Using current user's data"
                    }), 200
                else:
                    logging.warning("Failed to fetch user's own data for insurance")
                    insurance_data = process_insurance_data({})
                    return jsonify({
                        "success": True,
                        "data": insurance_data,
                        "data_source": "empty",
                        "message": "No user data available"
                    }), 200
            
            # Already processed users_data_compact above

            if not isinstance(users_data_compact, dict) or not users_data_compact:
                logging.info("No users found via shallow fetch; returning empty insurance dataset")
                empty_data = process_insurance_data({})
                return jsonify({
                    "success": True,
                    "data": empty_data,
                    "data_source": "empty",
                    "message": "No user data available"
                }), 200

            user_ids = list(users_data_compact.keys())
            logging.info(f"Shallow fetched {len(user_ids)} users; fetching limited histories for insurance...")

            # 2) Limited per-user history
            per_user_limit = int(request.args.get('per_user_limit', 50))
            max_users = int(request.args.get('max_users', 50))
            selected_user_ids = user_ids[:max_users]

            # Build compact users data concurrently using helper
            compact_users_data = build_compact_users_data(firebase_db_url, selected_user_ids, token, per_user_limit)
            logging.info(f"Built compact insurance users_data for {len(compact_users_data)} users")

            # 3) Process compact data
            insurance_data = process_insurance_data(compact_users_data)
            response_data = {
                "success": True,
                "data": insurance_data,
                "data_source": "real",
                "message": "Using real insurance data from Firebase REST API (compact)"
            }
            logging.info("Successfully returned real (compact) insurance dashboard data")
            return jsonify(response_data), 200

        except Exception as rest_error:
            logging.warning(f"Failed to access Firebase REST API for insurance: {rest_error}")
            empty_data = process_insurance_data({})
            return jsonify({
                "success": True,
                "data": empty_data,
                "data_source": "empty",
                "message": "Firebase connection error; returning empty insurance data"
            }), 200

    except Exception as e:
        logging.error(f"Error fetching insurance dashboard data: {e}", exc_info=True)
        empty_data = process_insurance_data({})
        return jsonify({
            "success": True,
            "data": empty_data,
            "data_source": "empty",
            "message": "Error fetching insurance data; returning empty dataset",
            "error_details": str(e)
        }), 200

 
