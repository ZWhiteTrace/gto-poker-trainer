"""
Unified Progress Tracking Service for GTO Poker Trainer.

Handles progress tracking for all quiz modes with:
- Local session state for current session
- localStorage sync for anonymous users
- Supabase sync for logged-in users
"""

import streamlit as st
from typing import Dict, Any, Optional
from datetime import datetime
import json

# Progress types for Supabase
PROGRESS_TYPE_QUIZ = "quiz_progress"
PROGRESS_TYPE_DRILL = "drill_progress"
PROGRESS_TYPE_LEARNING = "learning_progress"


def get_default_quiz_progress() -> Dict[str, Any]:
    """Return default quiz progress structure."""
    return {
        "equity": {"total": 0, "correct": 0, "best_accuracy": 0},
        "outs": {"total": 0, "correct": 0, "best_accuracy": 0},
        "ev": {"total": 0, "correct": 0, "best_accuracy": 0},
        "logic": {"total": 0, "correct": 0, "best_accuracy": 0},
        "postflop": {"total": 0, "correct": 0, "best_accuracy": 0},
        "last_updated": None
    }


def get_default_drill_progress() -> Dict[str, Any]:
    """Return default drill progress structure."""
    return {
        "best_streak": 0,
        "total_hands_all_time": 0,
        "total_correct_all_time": 0,
        "total_acceptable_all_time": 0,
        "last_updated": None
    }


def get_default_learning_progress() -> Dict[str, Any]:
    """Return default learning progress structure."""
    return {
        "preflop_completed": [],  # List of completed lesson IDs
        "postflop_completed": [],  # List of completed lesson IDs
        "concepts_viewed": [],  # List of viewed concept IDs
        "last_updated": None
    }


def init_progress_tracking():
    """Initialize progress tracking in session state."""
    if "quiz_progress" not in st.session_state:
        st.session_state.quiz_progress = get_default_quiz_progress()

    if "drill_progress_data" not in st.session_state:
        st.session_state.drill_progress_data = get_default_drill_progress()

    if "learning_progress_data" not in st.session_state:
        st.session_state.learning_progress_data = get_default_learning_progress()


def update_quiz_progress(quiz_type: str, is_correct: bool, save: bool = True):
    """
    Update progress for a specific quiz type.

    Args:
        quiz_type: One of 'equity', 'outs', 'ev', 'logic', 'postflop'
        is_correct: Whether the answer was correct
        save: Whether to save to storage immediately
    """
    init_progress_tracking()

    if quiz_type not in st.session_state.quiz_progress:
        st.session_state.quiz_progress[quiz_type] = {"total": 0, "correct": 0, "best_accuracy": 0}

    progress = st.session_state.quiz_progress[quiz_type]
    progress["total"] += 1
    if is_correct:
        progress["correct"] += 1

    # Update best accuracy if improved
    if progress["total"] >= 5:  # Minimum 5 questions for best accuracy
        current_accuracy = (progress["correct"] / progress["total"]) * 100
        if current_accuracy > progress.get("best_accuracy", 0):
            progress["best_accuracy"] = current_accuracy

    st.session_state.quiz_progress["last_updated"] = datetime.utcnow().isoformat()

    if save:
        save_all_progress()


def update_drill_progress(is_correct: bool, is_acceptable: bool = False, new_streak: int = 0, save: bool = True):
    """
    Update drill mode progress.

    Args:
        is_correct: Whether the answer was correct
        is_acceptable: Whether the answer was acceptable (but not optimal)
        new_streak: Current streak count
        save: Whether to save to storage immediately
    """
    init_progress_tracking()

    progress = st.session_state.drill_progress_data
    progress["total_hands_all_time"] += 1

    if is_correct:
        progress["total_correct_all_time"] += 1
    elif is_acceptable:
        progress["total_acceptable_all_time"] += 1

    if new_streak > progress["best_streak"]:
        progress["best_streak"] = new_streak

    progress["last_updated"] = datetime.utcnow().isoformat()

    if save:
        save_all_progress()


def update_learning_progress(lesson_type: str, lesson_id: str, save: bool = True):
    """
    Update learning completion progress.

    Args:
        lesson_type: One of 'preflop', 'postflop', 'concepts'
        lesson_id: The ID of the completed lesson
        save: Whether to save to storage immediately
    """
    init_progress_tracking()

    progress = st.session_state.learning_progress_data

    if lesson_type == "preflop":
        if lesson_id not in progress["preflop_completed"]:
            progress["preflop_completed"].append(lesson_id)
    elif lesson_type == "postflop":
        if lesson_id not in progress["postflop_completed"]:
            progress["postflop_completed"].append(lesson_id)
    elif lesson_type == "concepts":
        if lesson_id not in progress["concepts_viewed"]:
            progress["concepts_viewed"].append(lesson_id)

    progress["last_updated"] = datetime.utcnow().isoformat()

    if save:
        save_all_progress()


def get_quiz_stats(quiz_type: str) -> Dict[str, Any]:
    """Get statistics for a specific quiz type."""
    init_progress_tracking()

    if quiz_type not in st.session_state.quiz_progress:
        return {"total": 0, "correct": 0, "accuracy": 0, "best_accuracy": 0}

    progress = st.session_state.quiz_progress[quiz_type]
    total = progress.get("total", 0)
    correct = progress.get("correct", 0)
    accuracy = (correct / total * 100) if total > 0 else 0

    return {
        "total": total,
        "correct": correct,
        "accuracy": round(accuracy, 1),
        "best_accuracy": round(progress.get("best_accuracy", 0), 1)
    }


def get_all_quiz_stats() -> Dict[str, Dict[str, Any]]:
    """Get statistics for all quiz types."""
    return {
        "equity": get_quiz_stats("equity"),
        "outs": get_quiz_stats("outs"),
        "ev": get_quiz_stats("ev"),
        "logic": get_quiz_stats("logic"),
        "postflop": get_quiz_stats("postflop")
    }


def get_drill_stats() -> Dict[str, Any]:
    """Get drill mode statistics."""
    init_progress_tracking()

    progress = st.session_state.drill_progress_data
    total = progress.get("total_hands_all_time", 0)
    correct = progress.get("total_correct_all_time", 0)
    acceptable = progress.get("total_acceptable_all_time", 0)

    accuracy = (correct / total * 100) if total > 0 else 0

    return {
        "total_hands": total,
        "correct": correct,
        "acceptable": acceptable,
        "accuracy": round(accuracy, 1),
        "best_streak": progress.get("best_streak", 0)
    }


def get_learning_stats() -> Dict[str, Any]:
    """Get learning completion statistics."""
    init_progress_tracking()

    progress = st.session_state.learning_progress_data

    return {
        "preflop_completed": len(progress.get("preflop_completed", [])),
        "postflop_completed": len(progress.get("postflop_completed", [])),
        "concepts_viewed": len(progress.get("concepts_viewed", []))
    }


def save_all_progress():
    """Save all progress to localStorage and Supabase (if logged in)."""
    init_progress_tracking()

    # Combine all progress into one object for localStorage
    combined_progress = {
        "quiz": st.session_state.quiz_progress,
        "drill": st.session_state.drill_progress_data,
        "learning": st.session_state.learning_progress_data,
        "version": "2.0",  # Progress schema version
        "last_saved": datetime.utcnow().isoformat()
    }

    # Save to localStorage
    _save_to_local_storage(combined_progress)

    # If logged in, also save to Supabase
    user = st.session_state.get("user")
    if user:
        _save_to_supabase(user["id"], combined_progress)


def load_all_progress():
    """Load progress from localStorage and merge with Supabase data (if logged in)."""
    init_progress_tracking()

    # First, load from localStorage
    local_progress = _load_from_local_storage()

    # If logged in, also load from Supabase and merge
    user = st.session_state.get("user")
    if user:
        cloud_progress = _load_from_supabase(user["id"])
        if cloud_progress:
            # Merge: take the more recent/higher values
            local_progress = _merge_progress(local_progress, cloud_progress)

    # Apply loaded progress to session state
    if local_progress:
        if "quiz" in local_progress:
            st.session_state.quiz_progress = local_progress["quiz"]
        if "drill" in local_progress:
            st.session_state.drill_progress_data = local_progress["drill"]
        if "learning" in local_progress:
            st.session_state.learning_progress_data = local_progress["learning"]

    return local_progress


def _merge_progress(local: Dict[str, Any], cloud: Dict[str, Any]) -> Dict[str, Any]:
    """Merge local and cloud progress, taking higher/more recent values."""
    if not local:
        return cloud
    if not cloud:
        return local

    merged = {}

    # Merge quiz progress
    local_quiz = local.get("quiz", {})
    cloud_quiz = cloud.get("quiz", {})
    merged["quiz"] = {}

    for quiz_type in ["equity", "outs", "ev", "logic", "postflop"]:
        local_data = local_quiz.get(quiz_type, {"total": 0, "correct": 0, "best_accuracy": 0})
        cloud_data = cloud_quiz.get(quiz_type, {"total": 0, "correct": 0, "best_accuracy": 0})

        # Take cumulative totals (sum them since they might be from different sessions)
        merged["quiz"][quiz_type] = {
            "total": max(local_data.get("total", 0), cloud_data.get("total", 0)),
            "correct": max(local_data.get("correct", 0), cloud_data.get("correct", 0)),
            "best_accuracy": max(local_data.get("best_accuracy", 0), cloud_data.get("best_accuracy", 0))
        }

    # Merge drill progress (take higher values)
    local_drill = local.get("drill", {})
    cloud_drill = cloud.get("drill", {})
    merged["drill"] = {
        "best_streak": max(local_drill.get("best_streak", 0), cloud_drill.get("best_streak", 0)),
        "total_hands_all_time": max(local_drill.get("total_hands_all_time", 0), cloud_drill.get("total_hands_all_time", 0)),
        "total_correct_all_time": max(local_drill.get("total_correct_all_time", 0), cloud_drill.get("total_correct_all_time", 0)),
        "total_acceptable_all_time": max(local_drill.get("total_acceptable_all_time", 0), cloud_drill.get("total_acceptable_all_time", 0)),
        "last_updated": cloud_drill.get("last_updated") or local_drill.get("last_updated")
    }

    # Merge learning progress (union of completed items)
    local_learning = local.get("learning", {})
    cloud_learning = cloud.get("learning", {})
    merged["learning"] = {
        "preflop_completed": list(set(local_learning.get("preflop_completed", []) + cloud_learning.get("preflop_completed", []))),
        "postflop_completed": list(set(local_learning.get("postflop_completed", []) + cloud_learning.get("postflop_completed", []))),
        "concepts_viewed": list(set(local_learning.get("concepts_viewed", []) + cloud_learning.get("concepts_viewed", []))),
        "last_updated": cloud_learning.get("last_updated") or local_learning.get("last_updated")
    }

    merged["version"] = "2.0"
    merged["last_saved"] = datetime.utcnow().isoformat()

    return merged


def _save_to_local_storage(progress: Dict[str, Any]):
    """Save progress to browser localStorage."""
    from ui.components.storage import save_progress_to_storage

    # Convert to the existing format expected by storage.py
    # but include all our new data
    flat_progress = {
        # Old format fields (for backward compatibility)
        "best_streak": progress.get("drill", {}).get("best_streak", 0),
        "total_hands_all_time": progress.get("drill", {}).get("total_hands_all_time", 0),
        "total_correct_all_time": progress.get("drill", {}).get("total_correct_all_time", 0),
        "total_acceptable_all_time": progress.get("drill", {}).get("total_acceptable_all_time", 0),
        # New unified format
        "quiz_progress": progress.get("quiz", {}),
        "learning_progress": progress.get("learning", {}),
        "version": progress.get("version", "2.0"),
        "last_saved": progress.get("last_saved")
    }

    save_progress_to_storage(flat_progress)


def _load_from_local_storage() -> Optional[Dict[str, Any]]:
    """Load progress from browser localStorage."""
    from ui.components.storage import load_progress_from_storage

    saved = load_progress_from_storage()
    if not saved:
        return None

    # Convert from flat format to nested format
    progress = {
        "drill": {
            "best_streak": saved.get("best_streak", 0),
            "total_hands_all_time": saved.get("total_hands_all_time", 0),
            "total_correct_all_time": saved.get("total_correct_all_time", 0),
            "total_acceptable_all_time": saved.get("total_acceptable_all_time", 0),
            "last_updated": saved.get("last_saved")
        },
        "quiz": saved.get("quiz_progress", get_default_quiz_progress()),
        "learning": saved.get("learning_progress", get_default_learning_progress()),
        "version": saved.get("version", "1.0")
    }

    return progress


def _save_to_supabase(user_id: str, progress: Dict[str, Any]):
    """Save progress to Supabase cloud storage."""
    try:
        from services.auth import save_user_progress

        # Save all progress types
        save_user_progress(user_id, PROGRESS_TYPE_QUIZ, progress.get("quiz", {}))
        save_user_progress(user_id, PROGRESS_TYPE_DRILL, progress.get("drill", {}))
        save_user_progress(user_id, PROGRESS_TYPE_LEARNING, progress.get("learning", {}))

    except Exception as e:
        print(f"Failed to save progress to Supabase: {e}")


def _load_from_supabase(user_id: str) -> Optional[Dict[str, Any]]:
    """Load progress from Supabase cloud storage."""
    try:
        from services.auth import load_user_progress

        quiz = load_user_progress(user_id, PROGRESS_TYPE_QUIZ) or get_default_quiz_progress()
        drill = load_user_progress(user_id, PROGRESS_TYPE_DRILL) or get_default_drill_progress()
        learning = load_user_progress(user_id, PROGRESS_TYPE_LEARNING) or get_default_learning_progress()

        return {
            "quiz": quiz,
            "drill": drill,
            "learning": learning,
            "version": "2.0"
        }

    except Exception as e:
        print(f"Failed to load progress from Supabase: {e}")
        return None


def sync_progress_on_login():
    """Called when user logs in to sync progress from cloud."""
    user = st.session_state.get("user")
    if not user:
        return

    # Load and merge progress
    load_all_progress()

    # Save merged progress back to both stores
    save_all_progress()


def reset_session_quiz_scores():
    """Reset current session quiz scores (not cumulative progress)."""
    st.session_state.equity_score = {"correct": 0, "total": 0}
    st.session_state.outs_score = {"correct": 0, "total": 0}
    st.session_state.ev_score = {"correct": 0, "total": 0}
    st.session_state.logic_score = {"correct": 0, "total": 0}
    st.session_state.postflop_score = {"correct": 0, "total": 0}
