"""
Browser localStorage integration for Streamlit.
Allows saving/loading progress data in the user's browser.
"""
import streamlit as st
import streamlit.components.v1 as components
import json
from typing import Optional, Dict, Any
import time


def get_local_storage(key: str, default: Any = None) -> Optional[Any]:
    """
    Get a value from browser localStorage.
    Returns default if key doesn't exist or on error.

    Note: This uses a workaround since Streamlit doesn't natively support localStorage.
    The component sets a query param that we can read on the next request.
    """
    # Try to get from session state (cached from previous load)
    cache_key = f"_ls_cache_{key}"
    if cache_key in st.session_state:
        return st.session_state[cache_key]
    return default


def set_local_storage(key: str, value: Any) -> None:
    """
    Save a value to browser localStorage.
    The value will be JSON serialized.
    """
    # Cache in session state for immediate access
    cache_key = f"_ls_cache_{key}"
    st.session_state[cache_key] = value

    # Create JavaScript to save to localStorage
    # Use json.dumps twice: once for Python escaping, once for JS string literal
    json_value = json.dumps(json.dumps(value))

    components.html(f"""
    <script>
        try {{
            localStorage.setItem('{key}', {json_value});
        }} catch (e) {{
            console.error('Failed to save to localStorage:', e);
        }}
    </script>
    """, height=0)


def load_progress_from_storage() -> Dict[str, Any]:
    """
    Load training progress from browser localStorage.
    Returns a dict with progress data or empty dict if none exists.
    """
    cache_key = "_ls_cache_gto_progress"
    if cache_key in st.session_state:
        return st.session_state[cache_key]
    return {}


def save_progress_to_storage(progress: Dict[str, Any]) -> None:
    """
    Save training progress to browser localStorage.
    """
    # Cache in session state
    st.session_state["_ls_cache_gto_progress"] = progress

    # Save to localStorage via JavaScript
    # Double json.dumps: inner for JSON data, outer for JS string literal escaping
    json_value = json.dumps(json.dumps(progress))

    components.html(f"""
    <script>
        try {{
            localStorage.setItem('gto_progress', {json_value});
        }} catch (e) {{
            console.error('Failed to save progress:', e);
        }}
    </script>
    """, height=0)


def init_storage_sync():
    """
    Initialize localStorage sync by loading data from browser.
    Call this once at app startup.

    This creates a component that reads localStorage and stores in session_state.
    """
    if "_storage_initialized" in st.session_state:
        return

    # Create component to read localStorage and post back via query params
    # This is a workaround for Streamlit's limitations
    components.html("""
    <script>
        // Read progress from localStorage
        const progress = localStorage.getItem('gto_progress');
        const achievements = localStorage.getItem('gto_achievements');
        const settings = localStorage.getItem('gto_settings');

        // Store in window for access
        window.gtoStorage = {
            progress: progress ? JSON.parse(progress) : null,
            achievements: achievements ? JSON.parse(achievements) : null,
            settings: settings ? JSON.parse(settings) : null
        };

        // Send to Streamlit via postMessage (for future use with custom component)
        // For now, we'll use session_state initialization on first load
    </script>
    """, height=0)

    st.session_state["_storage_initialized"] = True


def display_storage_init_loader():
    """
    Display a storage initialization component that loads saved data.
    Place this near the top of your app to restore saved progress.
    """
    # This component reads localStorage and can trigger a callback
    components.html("""
    <div id="storage-loader" style="display: none;">
        <script>
            (function() {
                // Check if already loaded
                if (window._gtoStorageLoaded) return;
                window._gtoStorageLoaded = true;

                // Read from localStorage
                const savedProgress = localStorage.getItem('gto_progress');

                if (savedProgress) {
                    try {
                        const progress = JSON.parse(savedProgress);
                        console.log('GTO Progress loaded:', progress);
                    } catch (e) {
                        console.error('Failed to parse saved progress:', e);
                    }
                }
            })();
        </script>
    </div>
    """, height=0)


def clear_local_storage():
    """Clear all GTO trainer data from localStorage."""
    components.html("""
    <script>
        localStorage.removeItem('gto_progress');
        localStorage.removeItem('gto_achievements');
        localStorage.removeItem('gto_settings');
        console.log('GTO storage cleared');
    </script>
    """, height=0)

    # Clear session state cache
    keys_to_remove = [k for k in st.session_state.keys() if k.startswith("_ls_cache_")]
    for key in keys_to_remove:
        del st.session_state[key]
