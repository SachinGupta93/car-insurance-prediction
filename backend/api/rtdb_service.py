import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Tuple, List, Optional
import requests

from config.firebase_config import verify_firebase_token

TIMEOUT_S = 4


def get_uid_from_request(request) -> Tuple[Optional[str], Optional[str]]:
    """Extract Firebase UID and raw token from the Authorization header.
    Returns (uid, token) where either can be None.
    """
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.replace('Bearer ', '') if auth_header else None
        if not token:
            return None, None
        try:
            decoded = verify_firebase_token(token)
            uid = decoded.get('uid') or decoded.get('user_id') or decoded.get('sub')
            return uid, token
        except Exception as ex:
            logging.warning(f"verify_firebase_token failed: {ex}")
            return None, token
    except Exception:
        return None, None


def _get_json(url: str, params: Dict) -> Tuple[int, Dict]:
    try:
        resp = requests.get(url, params=params, timeout=TIMEOUT_S)
        if resp.status_code == 200:
            try:
                data = resp.json()
            except Exception:
                data = None
            return resp.status_code, (data or {})
        return resp.status_code, {}
    except Exception as ex:
        logging.warning(f"GET {url} failed: {ex}")
        return 0, {}


def get_user_history(firebase_db_url: str, uid: str, token: Optional[str], limit: int = 100) -> Dict:
    """Fetch a user's analysisHistory with robust fallbacks.
    Tries orderBy uploadedAt, then timestamp, then no order.
    """
    if not uid:
        return {}

    base_url = f"{firebase_db_url}/users/{uid}/analysisHistory.json"
    # Try uploadedAt
    params1 = {'orderBy': '"uploadedAt"'}
    if limit and limit > 0:
        params1['limitToLast'] = str(limit)
    if token:
        params1['auth'] = token
    status, data = _get_json(base_url, params1)
    if data:
        return data

    # Try timestamp
    params2 = {'orderBy': '"timestamp"'}
    if limit and limit > 0:
        params2['limitToLast'] = str(limit)
    if token:
        params2['auth'] = token
    status, data = _get_json(base_url, params2)
    if data:
        return data

    # No order
    params3 = {}
    if token:
        params3['auth'] = token
    status, data = _get_json(base_url, params3)
    return data


def get_shallow_users(firebase_db_url: str, token: Optional[str]) -> Tuple[int, Dict]:
    """Shallow fetch of /users to list user IDs. Returns (status_code, data)."""
    url = f"{firebase_db_url}/users.json"
    params = {'shallow': 'true'}
    if token:
        params['auth'] = token
    status, data = _get_json(url, params)
    return status, data


def build_compact_users_data(firebase_db_url: str, uids: List[str], token: Optional[str], per_user_limit: int = 50) -> Dict:
    """Fetch compact users' histories concurrently using requests.Session.
    Returns a mapping { uid: { 'analysisHistory': {...} } }.
    """
    results: Dict[str, Dict] = {}
    if not uids:
        return results

    session = requests.Session()

    def fetch_one(u: str) -> Tuple[str, Dict]:
        url = f"{firebase_db_url}/users/{u}/analysisHistory.json"
        # uploadedAt
        p1 = {'orderBy': '"uploadedAt"', 'limitToLast': str(per_user_limit)}
        if token:
            p1['auth'] = token
        try:
            r1 = session.get(url, params=p1, timeout=TIMEOUT_S)
            if r1.status_code == 200:
                d1 = r1.json() or {}
                if d1:
                    return u, d1
        except Exception as ex:
            logging.warning(f"History fetch failed for user {u} (uploadedAt): {ex}")

        # timestamp
        p2 = {'orderBy': '"timestamp"', 'limitToLast': str(per_user_limit)}
        if token:
            p2['auth'] = token
        try:
            r2 = session.get(url, params=p2, timeout=TIMEOUT_S)
            if r2.status_code == 200:
                d2 = r2.json() or {}
                if d2:
                    return u, d2
        except Exception as ex:
            logging.warning(f"History fetch failed for user {u} (timestamp): {ex}")

        # no order
        p3 = {}
        if token:
            p3['auth'] = token
        try:
            r3 = session.get(url, params=p3, timeout=TIMEOUT_S)
            if r3.status_code == 200:
                return u, (r3.json() or {})
        except Exception as ex:
            logging.warning(f"History fetch failed for user {u} (no order): {ex}")
        return u, {}

    max_workers = min(8, len(uids)) or 1
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(fetch_one, uid): uid for uid in uids}
        for future in as_completed(futures):
            uid, history = future.result()
            results[uid] = {'analysisHistory': history}

    return results
