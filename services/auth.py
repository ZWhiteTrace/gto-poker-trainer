"""
Supabase Authentication Service for GTO Poker Trainer.

Setup instructions:
1. Go to https://supabase.com and create a project
2. Go to Project Settings -> API to get your URL and anon key
3. Go to Authentication -> Providers -> Enable Google
4. Create a .env file with SUPABASE_URL and SUPABASE_KEY
"""

import os
import streamlit as st
from typing import Optional, Dict, Any
from datetime import datetime

# Try to load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Supabase client singleton
_supabase_client = None


def get_supabase_client():
    """Get or create Supabase client."""
    global _supabase_client

    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL") or st.secrets.get("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY") or st.secrets.get("SUPABASE_KEY", "")

        if not url or not key:
            return None

        try:
            from supabase import create_client
            _supabase_client = create_client(url, key)
        except Exception as e:
            st.error(f"Supabase connection error: {e}")
            return None

    return _supabase_client


def is_supabase_configured() -> bool:
    """Check if Supabase is properly configured."""
    url = os.getenv("SUPABASE_URL") or st.secrets.get("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY") or st.secrets.get("SUPABASE_KEY", "")
    return bool(url and key)


def get_current_user() -> Optional[Dict[str, Any]]:
    """Get current logged-in user from session state."""
    return st.session_state.get("user", None)


def is_logged_in() -> bool:
    """Check if user is logged in."""
    return get_current_user() is not None


def get_google_oauth_url() -> Optional[str]:
    """Get the Google OAuth URL for login using PKCE flow."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        # Try os.getenv first (local), then st.secrets (Streamlit Cloud)
        redirect_url = os.getenv("REDIRECT_URL") or st.secrets.get("REDIRECT_URL", "http://localhost:8501")
        response = client.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": redirect_url,
                "skip_browser_redirect": False,
                "query_params": {
                    "access_type": "offline",
                    "prompt": "consent"
                }
            }
        })
        return response.url if response else None
    except Exception as e:
        print(f"OAuth URL error: {e}")
        return None


def exchange_code_for_session(code: str) -> bool:
    """Exchange authorization code for session (PKCE flow)."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        response = client.auth.exchange_code_for_session({"auth_code": code})
        if response and response.user:
            user = response.user
            st.session_state.user = {
                "id": user.id,
                "email": user.email,
                "name": user.user_metadata.get("full_name") or user.user_metadata.get("name") or user.email.split("@")[0],
                "avatar": user.user_metadata.get("avatar_url", ""),
            }
            return True
    except Exception as e:
        print(f"Code exchange error: {e}")
    return False


def handle_oauth_callback() -> bool:
    """Handle OAuth callback - supports both PKCE (code) and implicit (token) flows."""
    params = st.query_params

    # Method 1: PKCE flow - check for authorization code
    code = params.get("code")
    if code:
        if exchange_code_for_session(code):
            st.query_params.clear()
            # Save session for persistence
            _save_session_to_storage()
            return True

    # Method 2: Implicit flow - check for access_token in query params
    access_token = params.get("access_token")
    refresh_token = params.get("refresh_token")

    if access_token:
        client = get_supabase_client()
        if client:
            try:
                client.auth.set_session(access_token, refresh_token or "")
                user_response = client.auth.get_user(access_token)

                if user_response and user_response.user:
                    user = user_response.user
                    st.session_state.user = {
                        "id": user.id,
                        "email": user.email,
                        "name": user.user_metadata.get("full_name") or user.user_metadata.get("name") or user.email.split("@")[0],
                        "avatar": user.user_metadata.get("avatar_url", ""),
                    }
                    # Store tokens for session persistence
                    st.session_state._auth_tokens = {
                        "access_token": access_token,
                        "refresh_token": refresh_token or ""
                    }
                    st.query_params.clear()
                    # Save session for persistence
                    _save_session_to_storage()
                    return True
            except Exception as e:
                print(f"OAuth callback error: {e}")

    return False


def _save_session_to_storage():
    """Save current session to localStorage for persistence."""
    import streamlit.components.v1 as components
    import json

    user = st.session_state.get("user")
    tokens = st.session_state.get("_auth_tokens", {})

    if user and tokens:
        session_data = {
            "user": user,
            "tokens": tokens
        }
        json_data = json.dumps(json.dumps(session_data))

        components.html(f"""
        <script>
            try {{
                localStorage.setItem('gto_auth_session', {json_data});
                console.log('Session saved to localStorage');
            }} catch (e) {{
                console.error('Failed to save session:', e);
            }}
        </script>
        """, height=0)


def restore_session_from_storage() -> bool:
    """Try to restore session from localStorage. Called on app startup."""
    # Check if already logged in
    if st.session_state.get("user"):
        return True

    # Check if we've already tried to restore this session
    if st.session_state.get("_session_restore_attempted"):
        return False

    st.session_state._session_restore_attempted = True

    # Inject JavaScript to check localStorage and post back
    import streamlit.components.v1 as components

    components.html("""
    <script>
        (function() {
            try {
                var sessionData = localStorage.getItem('gto_auth_session');
                if (sessionData) {
                    var data = JSON.parse(sessionData);
                    // Store in a way the app can read - use query params
                    var currentUrl = window.location.href.split('?')[0].split('#')[0];
                    var newUrl = currentUrl + '?restore_session=' + encodeURIComponent(sessionData);

                    // Only redirect if we haven't already
                    if (!window.location.search.includes('restore_session')) {
                        window.location.href = newUrl;
                    }
                }
            } catch (e) {
                console.error('Failed to restore session:', e);
            }
        })();
    </script>
    """, height=0)

    # Check if restore_session param is present
    params = st.query_params
    restore_data = params.get("restore_session")

    if restore_data:
        try:
            import json
            session_data = json.loads(restore_data)
            user = session_data.get("user")
            tokens = session_data.get("tokens", {})

            if user and tokens.get("access_token"):
                # Verify the token is still valid
                client = get_supabase_client()
                if client:
                    try:
                        user_response = client.auth.get_user(tokens["access_token"])
                        if user_response and user_response.user:
                            # Token is valid, restore session
                            st.session_state.user = user
                            st.session_state._auth_tokens = tokens
                            st.query_params.clear()
                            return True
                    except Exception:
                        # Token expired, try to refresh
                        if tokens.get("refresh_token"):
                            try:
                                response = client.auth.refresh_session(tokens["refresh_token"])
                                if response and response.user:
                                    st.session_state.user = {
                                        "id": response.user.id,
                                        "email": response.user.email,
                                        "name": response.user.user_metadata.get("full_name") or response.user.user_metadata.get("name") or response.user.email.split("@")[0],
                                        "avatar": response.user.user_metadata.get("avatar_url", ""),
                                    }
                                    st.session_state._auth_tokens = {
                                        "access_token": response.session.access_token,
                                        "refresh_token": response.session.refresh_token
                                    }
                                    st.query_params.clear()
                                    _save_session_to_storage()
                                    return True
                            except Exception as e:
                                print(f"Token refresh error: {e}")

                        # Clear invalid session from storage
                        _clear_session_from_storage()
        except Exception as e:
            print(f"Session restore error: {e}")

        st.query_params.clear()

    return False


def _clear_session_from_storage():
    """Clear saved session from localStorage."""
    import streamlit.components.v1 as components

    components.html("""
    <script>
        try {
            localStorage.removeItem('gto_auth_session');
            console.log('Session cleared from localStorage');
        } catch (e) {
            console.error('Failed to clear session:', e);
        }
    </script>
    """, height=0)


def login_with_email(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Login with email and password."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        response = client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        if response.user:
            st.session_state.user = {
                "id": response.user.id,
                "email": response.user.email,
                "name": response.user.user_metadata.get("full_name", email.split("@")[0]),
                "avatar": response.user.user_metadata.get("avatar_url", ""),
            }
            return st.session_state.user
    except Exception as e:
        st.error(f"Login failed: {e}")
    return None


def signup_with_email(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Sign up with email and password."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        response = client.auth.sign_up({
            "email": email,
            "password": password
        })
        if response.user:
            return {"message": "Check your email for confirmation link"}
    except Exception as e:
        st.error(f"Signup failed: {e}")
    return None


def logout():
    """Logout current user."""
    client = get_supabase_client()
    if client:
        try:
            client.auth.sign_out()
        except Exception:
            pass

    if "user" in st.session_state:
        del st.session_state.user

    # Clear auth tokens
    if "_auth_tokens" in st.session_state:
        del st.session_state._auth_tokens

    # Clear user-specific data
    keys_to_clear = ["mock_history", "preflop_completed", "postflop_completed"]
    for key in keys_to_clear:
        if key in st.session_state:
            del st.session_state[key]

    # Clear session from localStorage
    _clear_session_from_storage()


# ═══════════════════════════════════════════════════════════════════════════
# User Data Storage Functions
# ═══════════════════════════════════════════════════════════════════════════

def save_user_progress(user_id: str, progress_type: str, data: Dict[str, Any]) -> bool:
    """Save user progress to Supabase."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        # Upsert progress data
        client.table("user_progress").upsert({
            "user_id": user_id,
            "progress_type": progress_type,
            "data": data,
            "updated_at": datetime.utcnow().isoformat()
        }, on_conflict="user_id,progress_type").execute()
        return True
    except Exception as e:
        print(f"Save progress error: {e}")
        return False


def load_user_progress(user_id: str, progress_type: str) -> Optional[Dict[str, Any]]:
    """Load user progress from Supabase."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        response = client.table("user_progress").select("data").eq(
            "user_id", user_id
        ).eq(
            "progress_type", progress_type
        ).single().execute()

        if response.data:
            return response.data.get("data")
    except Exception:
        pass
    return None


def save_mock_exam_result(user_id: str, result: Dict[str, Any]) -> bool:
    """Save mock exam result to Supabase."""
    client = get_supabase_client()
    if not client:
        return False

    try:
        client.table("mock_exam_history").insert({
            "user_id": user_id,
            "score": result.get("score", 0),
            "total": result.get("total", 0),
            "time_secs": result.get("time_secs", 0),
            "type_stats": result.get("type_stats", {}),
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        return True
    except Exception as e:
        print(f"Save exam result error: {e}")
        return False


def load_mock_exam_history(user_id: str, limit: int = 10) -> list:
    """Load mock exam history from Supabase."""
    client = get_supabase_client()
    if not client:
        return []

    try:
        response = client.table("mock_exam_history").select("*").eq(
            "user_id", user_id
        ).order(
            "created_at", desc=True
        ).limit(limit).execute()

        return response.data or []
    except Exception:
        return []


def get_user_stats(user_id: str) -> Dict[str, Any]:
    """Get aggregated user statistics."""
    client = get_supabase_client()
    if not client:
        return {}

    try:
        # Get exam count and average score
        response = client.table("mock_exam_history").select(
            "score", "total"
        ).eq("user_id", user_id).execute()

        if response.data:
            total_exams = len(response.data)
            total_score = sum(r["score"] for r in response.data)
            total_questions = sum(r["total"] for r in response.data)
            avg_accuracy = (total_score / total_questions * 100) if total_questions > 0 else 0

            return {
                "total_exams": total_exams,
                "total_questions": total_questions,
                "total_correct": total_score,
                "avg_accuracy": avg_accuracy
            }
    except Exception:
        pass

    return {"total_exams": 0, "total_questions": 0, "total_correct": 0, "avg_accuracy": 0}
