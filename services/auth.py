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
    """Get the Google OAuth URL for login."""
    client = get_supabase_client()
    if not client:
        return None

    try:
        redirect_url = os.getenv("REDIRECT_URL", "http://localhost:8501")
        response = client.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": redirect_url
            }
        })
        return response.url if response else None
    except Exception as e:
        print(f"OAuth URL error: {e}")
        return None


def handle_oauth_callback() -> bool:
    """Handle OAuth callback from URL hash fragment.

    Supabase returns tokens in URL hash, but Streamlit can't read hash directly.
    We need to use JavaScript to parse and send it back.
    """
    # Check if we have tokens in query params (after JS redirect)
    params = st.query_params

    access_token = params.get("access_token")
    refresh_token = params.get("refresh_token")

    if access_token:
        client = get_supabase_client()
        if client:
            try:
                # Set the session with the tokens
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
                    # Clear tokens from URL
                    st.query_params.clear()
                    return True
            except Exception as e:
                print(f"OAuth callback error: {e}")

    return False


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

    # Clear user-specific data
    keys_to_clear = ["mock_history", "preflop_completed", "postflop_completed"]
    for key in keys_to_clear:
        if key in st.session_state:
            del st.session_state[key]


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
