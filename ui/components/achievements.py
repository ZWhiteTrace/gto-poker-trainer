"""
Achievement system for GTO Poker Trainer.
Tracks milestones and displays achievement badges.
"""
import streamlit as st
import streamlit.components.v1 as components
from typing import Dict, List, Optional
from datetime import datetime


# Achievement definitions
ACHIEVEMENTS = {
    "first_correct": {
        "id": "first_correct",
        "name_zh": "初學者",
        "name_en": "First Steps",
        "desc_zh": "答對第一題",
        "desc_en": "Get your first correct answer",
        "icon": "🎯",
        "condition": lambda stats: stats.get("total_correct", 0) >= 1,
    },
    "streak_5": {
        "id": "streak_5",
        "name_zh": "熱身完成",
        "name_en": "Warming Up",
        "desc_zh": "連續答對 5 題",
        "desc_en": "Get a 5-answer streak",
        "icon": "🔥",
        "condition": lambda stats: stats.get("best_streak", 0) >= 5,
    },
    "streak_10": {
        "id": "streak_10",
        "name_zh": "火力全開",
        "name_en": "On Fire",
        "desc_zh": "連續答對 10 題",
        "desc_en": "Get a 10-answer streak",
        "icon": "💪",
        "condition": lambda stats: stats.get("best_streak", 0) >= 10,
    },
    "streak_25": {
        "id": "streak_25",
        "name_zh": "不可阻擋",
        "name_en": "Unstoppable",
        "desc_zh": "連續答對 25 題",
        "desc_en": "Get a 25-answer streak",
        "icon": "⚡",
        "condition": lambda stats: stats.get("best_streak", 0) >= 25,
    },
    "hands_50": {
        "id": "hands_50",
        "name_zh": "入門玩家",
        "name_en": "Getting Started",
        "desc_zh": "完成 50 手練習",
        "desc_en": "Complete 50 hands",
        "icon": "📚",
        "condition": lambda stats: stats.get("total_hands", 0) >= 50,
    },
    "hands_100": {
        "id": "hands_100",
        "name_zh": "認真學習",
        "name_en": "Dedicated",
        "desc_zh": "完成 100 手練習",
        "desc_en": "Complete 100 hands",
        "icon": "🎓",
        "condition": lambda stats: stats.get("total_hands", 0) >= 100,
    },
    "hands_500": {
        "id": "hands_500",
        "name_zh": "GTO 專家",
        "name_en": "GTO Expert",
        "desc_zh": "完成 500 手練習",
        "desc_en": "Complete 500 hands",
        "icon": "🏆",
        "condition": lambda stats: stats.get("total_hands", 0) >= 500,
    },
    "accuracy_80": {
        "id": "accuracy_80",
        "name_zh": "穩定發揮",
        "name_en": "Consistent",
        "desc_zh": "正確率達到 80% (最少 20 手)",
        "desc_en": "Achieve 80% accuracy (min 20 hands)",
        "icon": "🎯",
        "condition": lambda stats: (
            stats.get("total_hands", 0) >= 20 and
            stats.get("total_correct", 0) / max(stats.get("total_hands", 1), 1) >= 0.8
        ),
    },
    "accuracy_90": {
        "id": "accuracy_90",
        "name_zh": "精準大師",
        "name_en": "Sharp Shooter",
        "desc_zh": "正確率達到 90% (最少 50 手)",
        "desc_en": "Achieve 90% accuracy (min 50 hands)",
        "icon": "💎",
        "condition": lambda stats: (
            stats.get("total_hands", 0) >= 50 and
            stats.get("total_correct", 0) / max(stats.get("total_hands", 1), 1) >= 0.9
        ),
    },
}


def check_achievements(stats: Dict) -> List[str]:
    """
    Check which achievements have been unlocked.
    Returns list of achievement IDs that are unlocked.
    """
    unlocked = []
    for achievement_id, achievement in ACHIEVEMENTS.items():
        try:
            if achievement["condition"](stats):
                unlocked.append(achievement_id)
        except Exception:
            pass
    return unlocked


def check_new_achievements(stats: Dict, previously_unlocked: List[str]) -> List[str]:
    """
    Check for newly unlocked achievements.
    Returns list of newly unlocked achievement IDs.
    """
    current_unlocked = check_achievements(stats)
    new_achievements = [a for a in current_unlocked if a not in previously_unlocked]
    return new_achievements


def display_achievement_popup(achievement_id: str, language: str = "zh"):
    """Display a celebratory popup for a newly unlocked achievement."""
    achievement = ACHIEVEMENTS.get(achievement_id)
    if not achievement:
        return

    name = achievement["name_zh"] if language == "zh" else achievement["name_en"]
    desc = achievement["desc_zh"] if language == "zh" else achievement["desc_en"]
    icon = achievement["icon"]

    # Create celebratory popup using HTML/CSS animation
    components.html(f"""
    <style>
        @keyframes achievementSlide {{
            0% {{ transform: translateY(-100px); opacity: 0; }}
            20% {{ transform: translateY(0); opacity: 1; }}
            80% {{ transform: translateY(0); opacity: 1; }}
            100% {{ transform: translateY(-100px); opacity: 0; }}
        }}
        @keyframes confetti {{
            0% {{ background-position: 0 0; }}
            100% {{ background-position: 100% 100%; }}
        }}
        .achievement-popup {{
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #000;
            padding: 15px 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(251, 191, 36, 0.5);
            animation: achievementSlide 4s ease-in-out forwards;
            z-index: 9999;
            text-align: center;
            min-width: 250px;
        }}
        .achievement-icon {{
            font-size: 2.5rem;
            margin-bottom: 5px;
        }}
        .achievement-title {{
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            opacity: 0.8;
            margin-bottom: 5px;
        }}
        .achievement-name {{
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        .achievement-desc {{
            font-size: 0.85rem;
            opacity: 0.9;
        }}
    </style>
    <div class="achievement-popup">
        <div class="achievement-icon">{icon}</div>
        <div class="achievement-title">{"成就解鎖" if language == "zh" else "Achievement Unlocked!"}</div>
        <div class="achievement-name">{name}</div>
        <div class="achievement-desc">{desc}</div>
    </div>
    """, height=150)


def display_achievements_grid(unlocked: List[str], language: str = "zh"):
    """Display a grid of all achievements with unlock status."""
    cols_per_row = 3

    # Convert to list for iteration
    achievement_list = list(ACHIEVEMENTS.values())

    for i in range(0, len(achievement_list), cols_per_row):
        cols = st.columns(cols_per_row)
        for j, col in enumerate(cols):
            if i + j < len(achievement_list):
                achievement = achievement_list[i + j]
                is_unlocked = achievement["id"] in unlocked

                name = achievement["name_zh"] if language == "zh" else achievement["name_en"]
                desc = achievement["desc_zh"] if language == "zh" else achievement["desc_en"]
                icon = achievement["icon"]

                with col:
                    if is_unlocked:
                        st.markdown(f"""
                        <div style="
                            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
                            border: 2px solid #fbbf24;
                            border-radius: 10px;
                            padding: 15px;
                            text-align: center;
                            margin-bottom: 10px;
                        ">
                            <div style="font-size: 2rem;">{icon}</div>
                            <div style="font-weight: bold; color: #fbbf24; margin: 5px 0;">{name}</div>
                            <div style="font-size: 0.8rem; color: #94a3b8;">{desc}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    else:
                        st.markdown(f"""
                        <div style="
                            background: #1e293b;
                            border: 2px solid #374151;
                            border-radius: 10px;
                            padding: 15px;
                            text-align: center;
                            margin-bottom: 10px;
                            opacity: 0.5;
                        ">
                            <div style="font-size: 2rem; filter: grayscale(100%);">🔒</div>
                            <div style="font-weight: bold; color: #64748b; margin: 5px 0;">{name}</div>
                            <div style="font-size: 0.8rem; color: #64748b;">{desc}</div>
                        </div>
                        """, unsafe_allow_html=True)


def get_achievement_progress(stats: Dict, language: str = "zh") -> List[Dict]:
    """Get progress towards next achievements."""
    progress = []

    # Streak progress
    current_streak = stats.get("best_streak", 0)
    if current_streak < 5:
        progress.append({
            "name": "熱身完成" if language == "zh" else "Warming Up",
            "current": current_streak,
            "target": 5,
            "type": "streak",
        })
    elif current_streak < 10:
        progress.append({
            "name": "火力全開" if language == "zh" else "On Fire",
            "current": current_streak,
            "target": 10,
            "type": "streak",
        })

    # Hands progress
    total_hands = stats.get("total_hands", 0)
    if total_hands < 50:
        progress.append({
            "name": "入門玩家" if language == "zh" else "Getting Started",
            "current": total_hands,
            "target": 50,
            "type": "hands",
        })
    elif total_hands < 100:
        progress.append({
            "name": "認真學習" if language == "zh" else "Dedicated",
            "current": total_hands,
            "target": 100,
            "type": "hands",
        })

    return progress
