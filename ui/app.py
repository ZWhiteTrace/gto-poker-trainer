"""
GTO Poker Trainer - Main Streamlit Application
"""
import streamlit as st
import streamlit.components.v1 as components
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from core.hand import Hand, random_hand, SUIT_SYMBOLS
from core.position import Position, POSITIONS_6MAX
from core.scenario import Scenario, ActionType
from core.evaluator import Evaluator
from trainer.drill import PreflopDrill, Spot, get_drillable_hands
from core.equity import EquityQuiz, EquityQuestion
from core.outs import OutsQuiz, OutsQuestion, Card
from core.postflop import PostflopDrill, PostflopSpot, PostflopAction, PostflopResult, TEXTURE_NAMES, HeroCard
from trainer.session import TrainingSession, ProgressTracker
from ui.components.range_grid import display_range_grid
from ui.components.table_visual import display_table, display_postflop_table
from ui.components.card_display import display_hand_cards
from ui.components.action_flow import display_action_flow
from ui.components.storage import save_progress_to_storage, load_progress_from_storage, init_storage_sync
# Achievements system removed for simplification

# Equity breakdown data for vs 4-bet scenarios
# Shows equity of common hands against typical 4-bet range hands
EQUITY_VS_4BET_RANGE = {
    # Premium pairs
    "AA": {"vs_range": "AA 對上 4-bet range", "avg_equity": 85, "breakdown": [
        ("KK", 82, "壓制"), ("QQ", 82, "壓制"), ("AKs", 87, "壓制"), ("AKo", 87, "壓制")
    ]},
    "KK": {"vs_range": "KK 對上 4-bet range", "avg_equity": 70, "breakdown": [
        ("AA", 18, "被壓制"), ("QQ", 82, "壓制"), ("AKs", 66, "領先"), ("AKo", 66, "領先")
    ]},
    "QQ": {"vs_range": "QQ 對上 4-bet range", "avg_equity": 55, "breakdown": [
        ("AA", 18, "被壓制"), ("KK", 18, "被壓制"), ("AKs", 54, "硬幣翻"), ("AKo", 54, "硬幣翻"), ("JJ", 82, "壓制")
    ]},
    "JJ": {"vs_range": "JJ 對上 4-bet range", "avg_equity": 45, "breakdown": [
        ("AA", 19, "被壓制"), ("KK", 19, "被壓制"), ("QQ", 18, "被壓制"), ("AKs", 54, "硬幣翻")
    ]},
    "TT": {"vs_range": "TT 對上 4-bet range", "avg_equity": 40, "breakdown": [
        ("AA", 19, "被壓制"), ("KK", 19, "被壓制"), ("QQ", 18, "被壓制"), ("AKs", 54, "硬幣翻")
    ]},
    # AK variations
    "AKs": {"vs_range": "AKs 對上 4-bet range", "avg_equity": 45, "breakdown": [
        ("AA", 12, "被壓制"), ("KK", 34, "被壓制"), ("QQ", 46, "硬幣翻"), ("JJ", 46, "硬幣翻")
    ]},
    "AKo": {"vs_range": "AKo 對上 4-bet range", "avg_equity": 42, "breakdown": [
        ("AA", 12, "被壓制"), ("KK", 30, "被壓制"), ("QQ", 43, "硬幣翻"), ("JJ", 43, "硬幣翻")
    ]},
    # AQ variations
    "AQs": {"vs_range": "AQs 對上 4-bet range", "avg_equity": 38, "breakdown": [
        ("AA", 12, "被壓制"), ("KK", 30, "落後"), ("QQ", 30, "被壓制"), ("AKs", 28, "被壓制"), ("JJ", 46, "硬幣翻")
    ]},
    "AQo": {"vs_range": "AQo 對上 4-bet range", "avg_equity": 35, "breakdown": [
        ("AA", 7, "被壓制"), ("KK", 26, "落後"), ("QQ", 26, "被壓制"), ("AKs", 25, "被壓制"), ("JJ", 43, "硬幣翻")
    ]},
    # AJ variations
    "AJs": {"vs_range": "AJs 對上 4-bet range", "avg_equity": 35, "breakdown": [
        ("AA", 12, "被壓制"), ("KK", 30, "落後"), ("QQ", 30, "落後"), ("AKs", 28, "被壓制"), ("AQs", 28, "被壓制")
    ]},
    # KQ variations
    "KQs": {"vs_range": "KQs 對上 4-bet range", "avg_equity": 35, "breakdown": [
        ("AA", 18, "落後"), ("KK", 27, "被壓制"), ("QQ", 27, "被壓制"), ("AKs", 28, "被壓制")
    ]},
    # Lower pairs
    "99": {"vs_range": "99 對上 4-bet range", "avg_equity": 38, "breakdown": [
        ("AA", 19, "被壓制"), ("KK", 19, "被壓制"), ("AKs", 52, "硬幣翻"), ("AQs", 54, "小幅領先")
    ]},
    "88": {"vs_range": "88 對上 4-bet range", "avg_equity": 36, "breakdown": [
        ("AA", 19, "被壓制"), ("KK", 19, "被壓制"), ("AKs", 52, "硬幣翻")
    ]},
    # KJ - marginal hands that should fold vs 4-bet
    "KJs": {"vs_range": "KJs 對上 4-bet range (應棄牌)", "avg_equity": 32, "breakdown": [
        ("AA", 18, "大幅落後"), ("KK", 27, "被壓制K踢"), ("QQ", 45, "落後對子"),
        ("JJ", 27, "被壓制J踢"), ("AKs", 28, "被壓制"), ("AKo", 30, "被壓制")
    ]},
    "KJo": {"vs_range": "KJo 對上 4-bet range (應棄牌)", "avg_equity": 30, "breakdown": [
        ("AA", 15, "大幅落後"), ("KK", 24, "被壓制"), ("QQ", 43, "落後對子"),
        ("JJ", 24, "被壓制"), ("AKs", 25, "被壓制"), ("AKo", 27, "被壓制")
    ]},
    # Other marginal broadway hands
    "KTs": {"vs_range": "KTs 對上 4-bet range (應棄牌)", "avg_equity": 30, "breakdown": [
        ("AA", 18, "大幅落後"), ("KK", 27, "被壓制"), ("QQ", 32, "落後"),
        ("AKs", 28, "被壓制"), ("JJ", 45, "落後對子")
    ]},
    "QJs": {"vs_range": "QJs 對上 4-bet range (應棄牌)", "avg_equity": 32, "breakdown": [
        ("AA", 19, "落後"), ("KK", 32, "落後"), ("QQ", 27, "被壓制Q踢"),
        ("JJ", 27, "被壓制J踢"), ("AKs", 38, "落後")
    ]},
    "ATs": {"vs_range": "ATs 對上 4-bet range (應棄牌)", "avg_equity": 34, "breakdown": [
        ("AA", 12, "被壓制"), ("KK", 30, "落後"), ("QQ", 30, "落後"),
        ("AKs", 28, "被壓制"), ("AQs", 28, "被壓制")
    ]},
    # A5s/A4s - classic 5-bet bluff hands (blocker + equity)
    "A5s": {"vs_range": "A5s 5-bet bluff (靠棄牌權益)", "avg_equity": 28, "breakdown": [
        ("AA", 12, "被壓制但有blocker"), ("KK", 34, "落後但有活牌"), ("QQ", 33, "落後"),
        ("JJ", 34, "落後"), ("AKs", 35, "被壓制但有順花"), ("AKo", 38, "被壓制")
    ]},
    "A4s": {"vs_range": "A4s 5-bet bluff (靠棄牌權益)", "avg_equity": 27, "breakdown": [
        ("AA", 12, "被壓制但有blocker"), ("KK", 33, "落後但有活牌"), ("QQ", 32, "落後"),
        ("JJ", 33, "落後"), ("AKs", 34, "被壓制"), ("AKo", 37, "被壓制")
    ]},
}


def get_equity_breakdown_html(hand_str: str, lang: str = "zh") -> str:
    """Generate HTML for equity breakdown display."""
    # Normalize hand string (e.g., "AKs" from "AsKs")
    hand = Hand(hand_str)
    normalized = str(hand)  # Gets "AKs", "AKo", "AA" format

    if normalized not in EQUITY_VS_4BET_RANGE:
        return ""

    data = EQUITY_VS_4BET_RANGE[normalized]

    if lang == "zh":
        title = f"📊 {normalized} 對抗典型 4-bet 範圍"
        avg_label = "平均勝率"
    else:
        title = f"📊 {normalized} vs Typical 4-bet Range"
        avg_label = "Average Equity"

    # Build rows as simple divs instead of table
    rows_html = ""
    for opponent, equity, note in data["breakdown"]:
        color = "#22c55e" if equity >= 50 else "#fbbf24" if equity >= 35 else "#ef4444"
        rows_html += f'<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #374151;"><span>{opponent}</span><span style="color:{color};font-weight:bold;">{equity}%</span><span style="color:#94a3b8;font-size:0.85rem;">{note}</span></div>'

    avg_color = "#22c55e" if data["avg_equity"] >= 50 else "#fbbf24" if data["avg_equity"] >= 35 else "#ef4444"

    html = f'<div style="background:#1e293b;border-radius:8px;padding:12px;margin-top:10px;border:1px solid #374151;"><div style="font-weight:bold;color:#e2e8f0;margin-bottom:8px;">{title}</div>{rows_html}<div style="margin-top:8px;padding-top:8px;border-top:1px solid #374151;"><span style="color:#94a3b8;">{avg_label}:</span><span style="color:{avg_color};font-weight:bold;font-size:1.1rem;"> {data["avg_equity"]}%</span></div></div>'
    return html


# Page config
st.set_page_config(
    page_title="GTO Poker Trainer",
    page_icon="🃏",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 1rem;
    }
    .hand-display {
        font-size: 3rem;
        text-align: center;
        padding: 20px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 10px;
        margin: 10px 0;
    }
    .correct-answer {
        background-color: #065f46;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #10b981;
    }
    .wrong-answer {
        background-color: #7f1d1d;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #ef4444;
    }
    .scenario-box {
        background-color: #1e3a5f;
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
    }
    .stats-card {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        padding: 20px;
        border-radius: 10px;
        text-align: center;
    }
    .action-btn {
        font-size: 1.2rem;
        padding: 10px 30px;
    }
    /* Reduce title top spacing - more aggressive */
    .main .block-container {
        padding-top: 0.5rem !important;
        padding-bottom: 0.5rem !important;
    }
    .stApp > header {
        height: 0px !important;
    }
    h1, h2, h3 {
        margin-top: 0 !important;
        padding-top: 0 !important;
    }
    /* Reduce expander spacing */
    .streamlit-expanderHeader {
        padding-top: 0.25rem !important;
        padding-bottom: 0.25rem !important;
    }
    /* Reduce spacing between elements */
    .element-container {
        margin-bottom: 0.25rem !important;
    }
</style>
""", unsafe_allow_html=True)

# Debug mode CSS (visible backgrounds to check clipping)
def apply_debug_css():
    """Apply debug CSS to show visible backgrounds for checking clipping."""
    if st.session_state.get('debug_mode', False):
        st.markdown("""
        <style>
            /* Debug mode - visible backgrounds */
            .stApp {
                background-color: #1a1a2e !important;
            }
            .main .block-container {
                background-color: #252540 !important;
                border: 1px solid #3a3a5a !important;
            }
            iframe {
                background-color: #2d2d4a !important;
                border: 1px dashed #ef4444 !important;
            }
        </style>
        """, unsafe_allow_html=True)


def init_session_state():
    """Initialize session state variables."""
    # Initialize localStorage sync
    init_storage_sync()

    if 'table_format' not in st.session_state:
        st.session_state.table_format = "6max"
    if 'language' not in st.session_state:
        st.session_state.language = "zh"  # Default Chinese
    if 'drill' not in st.session_state:
        st.session_state.drill = PreflopDrill(format=st.session_state.table_format)
    if 'session' not in st.session_state:
        st.session_state.session = TrainingSession()
    if 'current_spot' not in st.session_state:
        st.session_state.current_spot = None
    if 'show_result' not in st.session_state:
        st.session_state.show_result = False
    if 'last_result' not in st.session_state:
        st.session_state.last_result = None
    if 'page' not in st.session_state:
        st.session_state.page = "drill"

    # Debug mode for checking clipping
    if 'debug_mode' not in st.session_state:
        st.session_state.debug_mode = False

    # Timer mode settings
    if 'timer_enabled' not in st.session_state:
        st.session_state.timer_enabled = False
    if 'timer_seconds' not in st.session_state:
        st.session_state.timer_seconds = 10  # Default 10 seconds per question
    if 'timer_start' not in st.session_state:
        st.session_state.timer_start = None

    # Difficulty settings
    if 'difficulty' not in st.session_state:
        st.session_state.difficulty = "medium"  # easy, medium, hard

    # Streak tracking (for achievements)
    if 'current_streak' not in st.session_state:
        st.session_state.current_streak = 0
    if 'best_streak' not in st.session_state:
        st.session_state.best_streak = 0

    # Load saved progress from localStorage (if available)
    saved_progress = load_progress_from_storage()
    if saved_progress:
        if 'best_streak' in saved_progress:
            st.session_state.best_streak = saved_progress['best_streak']
        if 'total_hands_all_time' in saved_progress:
            st.session_state.total_hands_all_time = saved_progress.get('total_hands_all_time', 0)
        if 'total_correct_all_time' in saved_progress:
            st.session_state.total_correct_all_time = saved_progress.get('total_correct_all_time', 0)


# Translations
TEXTS = {
    "zh": {
        "title": "GTO 翻前訓練器",
        "drill_mode": "練習模式",
        "range_viewer": "範圍查看",
        "statistics": "統計分析",
        "settings": "設定",
        "table_format": "桌型",
        "language": "語言",
        "practice_scenarios": "練習場景",
        "positions": "練習位置",
        "total": "總計",
        "correct": "正確",
        "accuracy": "正確率",
        "your_hand": "我的手牌",
        "whats_your_action": "我的動作是？",
        "correct_answer": "正確！",
        "incorrect": "錯誤",
        "your_action": "我的選擇",
        "correct_action": "正確答案",
        "next_hand": "下一手 →",
        "view_range": "查看完整 GTO Range",
        "scenario": "場景",
        "scenario_type": "場景類型",
        "your_position": "我的位置",
        "opponent_position": "對手位置",
        "no_data": "此場景尚無資料",
        "total_hands": "總手數",
        "incorrect_count": "錯誤",
        "no_stats": "尚無資料，完成一些練習來查看統計！",
        "by_position": "按位置",
        "by_action_type": "按場景",
        "recent_mistakes": "最近錯誤",
        "no_mistakes": "還沒有錯誤！繼續保持！",
        "timer_mode": "計時模式",
        "timer_seconds": "秒/題",
        "difficulty": "難度",
        "easy": "簡單",
        "medium": "中等",
        "hard": "困難",
        "current_streak": "連勝",
        "best_streak": "最佳連勝",
        "time_up": "時間到！",
        "streak_broken": "連勝中斷",
        "new_record": "新紀錄！",
        "learning": "學習",
        "unlocked": "已解鎖",
        "locked": "未解鎖",
        "equity_quiz": "權益測驗",
        "equity_question": "哪一手勝率較高？",
        "equity_vs": "vs",
        "equity_correct": "正確！",
        "equity_incorrect": "不太對",
        "equity_actual": "實際勝率",
        "equity_your_answer": "我的答案",
        "equity_next": "下一題 →",
        "equity_category": "題目類型",
        "equity_all_categories": "全部",
        "equity_score": "得分",
        "equity_hero": "我的牌",
        "equity_villain": "對手的牌",
        "equity_hero_wins": "我贏",
        "outs_quiz": "Outs 測驗",
        "outs_question": "你有幾個 outs？",
        "outs_hand": "我的手牌",
        "outs_board": "公牌",
        "outs_correct": "正確！",
        "outs_incorrect": "不對",
        "outs_actual": "實際 outs",
        "outs_turn_pct": "轉牌中牌率",
        "outs_river_pct": "河牌前中牌率",
        "outs_draws": "聽牌類型",
        "outs_next": "下一題 →",
        "outs_score": "得分",
        "postflop": "翻後練習",
        "postflop_cbet": "C-bet 練習",
        "postflop_action": "你的動作？",
        "postflop_sizing": "下注尺度",
        "postflop_check": "過牌",
        "postflop_bet": "下注",
        "postflop_texture": "牌面類型",
        "postflop_correct": "正確！",
        "postflop_incorrect": "不對",
        "postflop_next": "下一題 →",
        "postflop_gto_action": "GTO 動作",
        "postflop_gto_sizing": "GTO 尺度",
        "postflop_frequency": "GTO 頻率",
        "postflop_pot_type": "底池類型",
        "postflop_srp": "單次加注底池",
        "postflop_3bp": "3-Bet 底池",
    },
    "en": {
        "title": "GTO Preflop Trainer",
        "drill_mode": "Drill Mode",
        "range_viewer": "Range Viewer",
        "statistics": "Statistics",
        "settings": "Settings",
        "table_format": "Table Format",
        "language": "Language",
        "practice_scenarios": "Practice Scenarios",
        "positions": "Positions",
        "total": "Total",
        "correct": "Correct",
        "accuracy": "Accuracy",
        "your_hand": "My Hand",
        "whats_your_action": "My action?",
        "correct_answer": "Correct!",
        "incorrect": "Incorrect",
        "your_action": "My action",
        "correct_action": "Correct action",
        "next_hand": "Next Hand →",
        "view_range": "View Full GTO Range",
        "scenario": "Scenario",
        "scenario_type": "Scenario Type",
        "your_position": "My Position",
        "opponent_position": "Opponent Position",
        "no_data": "No range data available for this scenario yet",
        "total_hands": "Total Hands",
        "incorrect_count": "Incorrect",
        "no_stats": "No data yet. Complete some drills to see your statistics!",
        "by_position": "By Position",
        "by_action_type": "By Action Type",
        "recent_mistakes": "Recent Mistakes",
        "no_mistakes": "No mistakes yet! Keep it up!",
        "timer_mode": "Timer Mode",
        "timer_seconds": "sec/question",
        "difficulty": "Difficulty",
        "easy": "Easy",
        "medium": "Medium",
        "hard": "Hard",
        "current_streak": "Streak",
        "best_streak": "Best Streak",
        "time_up": "Time's up!",
        "streak_broken": "Streak broken",
        "new_record": "New record!",
        "learning": "Learning",
        "unlocked": "Unlocked",
        "locked": "Locked",
        "equity_quiz": "Equity Quiz",
        "equity_question": "Which hand has higher equity?",
        "equity_vs": "vs",
        "equity_correct": "Correct!",
        "equity_incorrect": "Not quite",
        "equity_actual": "Actual equity",
        "equity_your_answer": "My answer",
        "equity_next": "Next →",
        "equity_category": "Category",
        "equity_all_categories": "All",
        "equity_score": "Score",
        "equity_hero": "My Hand",
        "equity_villain": "Opponent",
        "equity_hero_wins": "I win",
        "outs_quiz": "Outs Quiz",
        "outs_question": "How many outs do you have?",
        "outs_hand": "My Hand",
        "outs_board": "Board",
        "outs_correct": "Correct!",
        "outs_incorrect": "Incorrect",
        "outs_actual": "Actual outs",
        "outs_turn_pct": "Turn hit %",
        "outs_river_pct": "By river %",
        "outs_draws": "Draw types",
        "outs_next": "Next →",
        "outs_score": "Score",
        "postflop": "Postflop",
        "postflop_cbet": "C-bet Practice",
        "postflop_action": "Your action?",
        "postflop_sizing": "Bet sizing",
        "postflop_check": "Check",
        "postflop_bet": "Bet",
        "postflop_texture": "Board Texture",
        "postflop_correct": "Correct!",
        "postflop_incorrect": "Incorrect",
        "postflop_next": "Next →",
        "postflop_gto_action": "GTO Action",
        "postflop_gto_sizing": "GTO Sizing",
        "postflop_frequency": "GTO Frequency",
        "postflop_pot_type": "Pot Type",
        "postflop_srp": "Single Raised Pot",
        "postflop_3bp": "3-Bet Pot",
    }
}


def t(key: str) -> str:
    """Get translated text."""
    lang = st.session_state.get("language", "zh")
    return TEXTS.get(lang, TEXTS["zh"]).get(key, key)


def get_action_label(action: str, scenario: Scenario, lang: str = "zh") -> str:
    """
    Generate descriptive action button labels with bet sizing.

    Standard bet sizing (100bb cash):
    - Open raise: 2.5bb
    - 3-bet: ~8bb (vs 2.5bb open)
    - 4-bet: ~20bb (vs 8bb 3-bet)
    - 5-bet: All-in (or ~45-50bb)
    """
    action_type = scenario.action_type

    if action == "fold":
        return "FOLD"

    if action_type == ActionType.RFI:
        if action == "raise":
            return "RAISE 2.5bb"

    elif action_type == ActionType.VS_RFI:
        if action == "3bet":
            return "3-BET → 8bb" if lang == "zh" else "3-BET to 8bb"
        elif action == "call":
            return "CALL 2.5bb"

    elif action_type == ActionType.VS_3BET:
        if action == "4bet":
            return "4-BET → 20bb" if lang == "zh" else "4-BET to 20bb"
        elif action == "call":
            return "CALL 8bb"

    elif action_type == ActionType.VS_4BET:
        if action == "5bet":
            return "5-BET ALL-IN"
        elif action == "call":
            return "CALL 20bb"

    # Fallback
    return action.upper()


def main():
    init_session_state()

    # Sidebar
    with st.sidebar:
        # Title
        st.title(f"🃏 {t('title')}")

        # Language toggle on separate line
        current_lang = st.session_state.language
        btn_label = "🌐 English" if current_lang == "zh" else "🌐 中文"
        if st.button(btn_label, key="lang_toggle", help="Switch language / 切換語言", use_container_width=True):
            st.session_state.language = "en" if current_lang == "zh" else "zh"
            st.rerun()

        st.markdown("<div style='height: 5px;'></div>", unsafe_allow_html=True)

        # Navigation
        nav_options = [t("drill_mode"), t("range_viewer"), t("postflop"), t("equity_quiz"), t("outs_quiz"), t("learning"), t("statistics")]
        page_idx = st.radio(
            "Navigate",
            options=range(len(nav_options)),
            format_func=lambda i: nav_options[i],
            key="nav",
            label_visibility="collapsed",
        )
        page = ["Drill Mode", "Range Viewer", "Postflop", "Equity Quiz", "Outs Quiz", "Learning", "Statistics"][page_idx]

        # Settings section (compact)
        st.caption(f"⚙️ {t('settings')}")

        # Table format toggle
        table_format = st.radio(
            t("table_format"),
            options=["6-max", "9-max"],
            index=0 if st.session_state.table_format == "6max" else 1,
            horizontal=True,
            label_visibility="collapsed",
        )
        new_format = "6max" if table_format == "6-max" else "9max"
        if new_format != st.session_state.table_format:
            st.session_state.table_format = new_format
            st.session_state.drill = PreflopDrill(format=new_format)
            st.session_state.current_spot = None
            # Reset drill settings for new format (RFI only for beginners)
            if new_format == "9max":
                st.session_state.drill_action_types = ["RFI"]
                st.session_state.drill_positions = ["UTG", "UTG+1", "UTG+2", "MP", "HJ", "CO", "BTN", "SB", "BB"]
            else:
                st.session_state.drill_action_types = ["RFI"]
                st.session_state.drill_positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]
            st.rerun()

        # Drill settings (collapsed by default for 6-max with complete data)
        if page == "Drill Mode":
            # Initialize persistent drill settings in session state
            # 9-max has RFI, vs Open, vs 3-Bet data (missing vs_4bet)
            if 'drill_action_types' not in st.session_state:
                if st.session_state.table_format == "9max":
                    st.session_state.drill_action_types = ["RFI"]  # Default to RFI only for beginners
                else:
                    st.session_state.drill_action_types = ["RFI"]  # Default to RFI only for beginners
            if 'drill_positions' not in st.session_state:
                if st.session_state.table_format == "9max":
                    st.session_state.drill_positions = ["UTG", "UTG+1", "UTG+2", "MP", "HJ", "CO", "BTN", "SB", "BB"]
                else:
                    st.session_state.drill_positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]

            # Advanced settings in expander (collapsed by default)
            adv_label = "⚙️ 進階設定" if st.session_state.language == "zh" else "⚙️ Advanced Settings"
            with st.expander(adv_label, expanded=False):
                # Action types - 9-max has RFI, vs Open, vs 3-Bet (no vs 4-Bet yet)
                if st.session_state.table_format == "9max":
                    action_options = ["RFI", "vs Open", "vs 3-Bet"]
                    # Filter saved action types to valid options for 9-max
                    valid_action_types = [a for a in st.session_state.drill_action_types if a in action_options]
                    if not valid_action_types:
                        valid_action_types = action_options
                    # Show warning about missing data
                    warning_msg = "⚠️ 9-max 的 vs 4-Bet 資料尚未完成" if st.session_state.language == "zh" else "⚠️ 9-max vs 4-Bet data not yet available"
                    st.caption(warning_msg)
                else:
                    action_options = ["RFI", "vs Open", "vs 3-Bet", "vs 4-Bet"]
                    valid_action_types = st.session_state.drill_action_types

                action_types = st.multiselect(
                    t("practice_scenarios"),
                    options=action_options,
                    default=valid_action_types,
                    key="action_types_select",
                )
                # Save to session state
                st.session_state.drill_action_types = action_types

                # Map to ActionType
                action_map = {
                    "RFI": ActionType.RFI,
                    "vs Open": ActionType.VS_RFI,
                    "vs 3-Bet": ActionType.VS_3BET,
                    "vs 4-Bet": ActionType.VS_4BET,
                }
                st.session_state.drill.enabled_action_types = [
                    action_map[a] for a in action_types
                ]

                # Positions based on table format
                if st.session_state.table_format == "9max":
                    pos_options = ["UTG", "UTG+1", "UTG+2", "MP", "HJ", "CO", "BTN", "SB", "BB"]
                else:
                    pos_options = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]

                # Filter saved positions to valid ones for current format
                valid_saved = [p for p in st.session_state.drill_positions if p in pos_options]
                if not valid_saved:
                    valid_saved = pos_options

                positions = st.multiselect(
                    t("positions"),
                    options=pos_options,
                    default=valid_saved,
                    key="positions_select",
                )
                # Save to session state
                st.session_state.drill_positions = positions

                pos_map = {
                    "UTG": Position.UTG, "HJ": Position.HJ, "CO": Position.CO,
                    "BTN": Position.BTN, "SB": Position.SB, "BB": Position.BB,
                    "UTG+1": Position.UTG1, "UTG+2": Position.UTG2, "MP": Position.MP,
                }
                st.session_state.drill.enabled_positions = [
                    pos_map[p] for p in positions if p in pos_map
                ]

                # Villain position selector (only for non-RFI scenarios)
                non_rfi_selected = [a for a in action_types if a != "RFI"]
                if non_rfi_selected:
                    st.markdown("---")
                    villain_label = "對手位置" if st.session_state.language == "zh" else "Villain Positions"
                    villain_help = "選擇要練習對抗的位置（留空 = 全部）" if st.session_state.language == "zh" else "Select villain positions to practice against (empty = all)"

                    # Initialize villain positions in session state
                    if 'drill_villain_positions' not in st.session_state:
                        st.session_state.drill_villain_positions = []  # Empty = all

                    villain_positions = st.multiselect(
                        villain_label,
                        options=pos_options,
                        default=st.session_state.drill_villain_positions,
                        help=villain_help,
                        key="villain_positions_select",
                    )

                    # Check if villain positions changed
                    if villain_positions != st.session_state.drill_villain_positions:
                        st.session_state.drill_villain_positions = villain_positions
                        st.session_state.current_spot = None  # Clear spot to regenerate

                    # Set villain filter in drill engine
                    if villain_positions:
                        st.session_state.drill.enabled_villain_positions = [
                            pos_map[p] for p in villain_positions if p in pos_map
                        ]
                    else:
                        st.session_state.drill.enabled_villain_positions = None  # None = all

            # Always apply villain filter from session state (even when expander is collapsed)
            if 'drill_villain_positions' in st.session_state and st.session_state.drill_villain_positions:
                pos_map = {
                    "UTG": Position.UTG, "HJ": Position.HJ, "CO": Position.CO,
                    "BTN": Position.BTN, "SB": Position.SB, "BB": Position.BB,
                    "UTG+1": Position.UTG1, "UTG+2": Position.UTG2, "MP": Position.MP,
                }
                st.session_state.drill.enabled_villain_positions = [
                    pos_map[p] for p in st.session_state.drill_villain_positions if p in pos_map
                ]
            elif 'drill_villain_positions' in st.session_state:
                st.session_state.drill.enabled_villain_positions = None

        # Debug mode toggle (for checking clipping)
        debug_label = "🔧 調試模式" if st.session_state.language == "zh" else "🔧 Debug Mode"
        st.session_state.debug_mode = st.checkbox(debug_label, value=st.session_state.debug_mode, help="顯示邊框以檢查裁切" if st.session_state.language == "zh" else "Show borders to check clipping")

        # Footer (compact)
        st.markdown("<br>", unsafe_allow_html=True)
        lang_note = "基於簡化版 GTO 圖表" if st.session_state.language == "zh" else "Based on simplified GTO charts"
        st.caption(f"v0.2 · {lang_note}")

    # Apply debug CSS if enabled
    apply_debug_css()

    # Main content
    if page == "Drill Mode":
        drill_page()
    elif page == "Range Viewer":
        viewer_page()
    elif page == "Postflop":
        postflop_page()
    elif page == "Equity Quiz":
        equity_quiz_page()
    elif page == "Outs Quiz":
        outs_quiz_page()
    elif page == "Learning":
        learning_page()
    elif page == "Statistics":
        stats_page()


def drill_page():
    """Drill mode page."""
    import time

    session = st.session_state.session
    lang = st.session_state.language

    streak = st.session_state.current_streak

    # Generate new spot if needed
    if st.session_state.current_spot is None:
        st.session_state.current_spot = st.session_state.drill.generate_spot()
        st.session_state.show_result = False

    spot = st.session_state.current_spot

    # Show current scenario type
    scenario_type_map = {
        ActionType.RFI: ("RFI (開池)", "RFI (Open Raise)"),
        ActionType.VS_RFI: ("vs Open (面對加注)", "vs Open (Facing Raise)"),
        ActionType.VS_3BET: ("vs 3-Bet (面對3bet)", "vs 3-Bet (Facing 3-Bet)"),
        ActionType.VS_4BET: ("vs 4-Bet (面對4bet)", "vs 4-Bet (Facing 4-Bet)"),
    }
    scenario_label = scenario_type_map.get(spot.scenario.action_type, ("", ""))
    scenario_text = scenario_label[0] if lang == "zh" else scenario_label[1]

    # Compact combined header: scenario + stats (will be inside left column)
    streak_color = "#fbbf24" if streak >= 5 else "#10b981" if streak >= 3 else "#94a3b8"
    accuracy_color = "#10b981" if session.accuracy >= 0.7 else "#f59e0b" if session.accuracy >= 0.5 else "#ef4444"

    header_html = f"""
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 6px 12px; border-radius: 6px; border-left: 3px solid #fbbf24; margin: 0 0 4px 0; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 1rem; font-weight: bold; color: #fbbf24;">🎯 {scenario_text} <span style="color: #94a3b8; font-weight: normal; font-size: 0.9rem;">| {spot.scenario.hero_position.value}</span></span>
        <span style="font-size: 0.75rem; color: #94a3b8;">📊 {session.total_spots} · ✅ {session.correct_count} · <span style="color: {accuracy_color};">{session.accuracy_percent}</span> · <span style="color: {streak_color};">🔥{streak}</span></span>
    </div>
    """

    # Two-column layout: Action Flow + Table (left) | Hand + Buttons (right)
    col_left, col_right = st.columns([1, 1])

    with col_left:
        # Header inside left column only
        st.markdown(header_html, unsafe_allow_html=True)

        # Action flow timeline (shows betting sequence)
        display_action_flow(
            hero_position=spot.scenario.hero_position,
            villain_position=spot.scenario.villain_position,
            action_type=spot.scenario.action_type,
            language=st.session_state.language,
        )

        # Display table visualization
        villain_action = None
        bets = None
        folded_positions = []

        if spot.scenario.action_type == ActionType.VS_RFI:
            villain_action = "Raises 2.5bb"
            bets = {spot.scenario.villain_position: "2.5bb"}
            # In VS_RFI, positions between villain and hero have folded
            # SB/BB haven't acted yet (still show as blinds)
            position_order = [Position.UTG, Position.HJ, Position.CO, Position.BTN, Position.SB, Position.BB]
            try:
                villain_idx = position_order.index(spot.scenario.villain_position)
                hero_idx = position_order.index(spot.scenario.hero_position)
                for i in range(villain_idx + 1, hero_idx):
                    folded_positions.append(position_order[i])
            except ValueError:
                pass  # Position not in 6-max list
        elif spot.scenario.action_type == ActionType.VS_3BET:
            villain_action = "3-Bets"
            bets = {spot.scenario.hero_position: "2.5bb", spot.scenario.villain_position: "8bb"}
            # In 3bet pots, everyone except hero and villain has folded (including SB/BB)
            for pos in [Position.UTG, Position.HJ, Position.CO, Position.BTN, Position.SB, Position.BB]:
                if pos != spot.scenario.hero_position and pos != spot.scenario.villain_position:
                    folded_positions.append(pos)
        elif spot.scenario.action_type == ActionType.VS_4BET:
            villain_action = "4-Bets"
            bets = {spot.scenario.hero_position: "8bb", spot.scenario.villain_position: "20bb"}
            # In 4bet pots, everyone except hero and villain has folded (including SB/BB)
            for pos in [Position.UTG, Position.HJ, Position.CO, Position.BTN, Position.SB, Position.BB]:
                if pos != spot.scenario.hero_position and pos != spot.scenario.villain_position:
                    folded_positions.append(pos)

        display_table(
            hero_position=spot.scenario.hero_position,
            villain_position=spot.scenario.villain_position,
            show_action=villain_action,
            format=st.session_state.table_format,
            bets=bets,
            lang=st.session_state.language,
            folded_positions=folded_positions,
        )

    with col_right:
        # Display hand as visual cards with FIXED suits (seeded by spot)
        st.markdown(f"""
        <div style="text-align: center; font-size: 0.9rem; color: #fbbf24; margin-bottom: 5px;">{t('your_hand')}</div>
        """, unsafe_allow_html=True)

        # Generate consistent suits based on spot identity
        import random
        spot_seed = f"{spot.scenario.hero_position.value}_{spot.scenario.action_type.value}_{spot.hand.notation}"
        rng = random.Random(spot_seed)
        suits = ['s', 'h', 'd', 'c']
        hand = spot.hand

        if hand.is_pair:
            chosen_suits = rng.sample(suits, 2)
            s1, s2 = chosen_suits[0], chosen_suits[1]
        elif hand.is_suited:
            suit = rng.choice(suits)
            s1, s2 = suit, suit
        else:  # offsuit
            chosen_suits = rng.sample(suits, 2)
            s1, s2 = chosen_suits[0], chosen_suits[1]

        # Display cards with fixed suits
        def get_suit_color(suit):
            return {'s': '#1a1a2e', 'h': '#ef4444', 'd': '#3b82f6', 'c': '#22c55e'}.get(suit, '#1a1a2e')

        def fmt_rank(rank):
            return "10" if rank == "T" else rank

        def get_suit_symbol(suit):
            return {'s': '♠', 'h': '♥', 'd': '♦', 'c': '♣'}.get(suit, suit)

        r1 = fmt_rank(hand.rank1)
        r2 = fmt_rank(hand.rank2)
        c1, c2 = get_suit_color(s1), get_suit_color(s2)
        sym1, sym2 = get_suit_symbol(s1), get_suit_symbol(s2)

        cards_html = f'''
        <div style="display:flex;justify-content:center;gap:6px;margin:5px 0;">
            <div style="width:60px;height:85px;background:linear-gradient(145deg,#fff 0%,#f0f0f0 100%);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:{c1};font-weight:bold;box-shadow:0 3px 10px rgba(0,0,0,0.3);transform:rotate(-5deg);">
                <span style="font-size:24px;">{r1}</span><span style="font-size:20px;">{sym1}</span>
            </div>
            <div style="width:60px;height:85px;background:linear-gradient(145deg,#fff 0%,#f0f0f0 100%);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:{c2};font-weight:bold;box-shadow:0 3px 10px rgba(0,0,0,0.3);transform:rotate(5deg);margin-left:-10px;">
                <span style="font-size:24px;">{r2}</span><span style="font-size:20px;">{sym2}</span>
            </div>
        </div>
        <div style="text-align:center;color:#94a3b8;font-size:0.8rem;">({str(hand)})</div>
        '''
        st.markdown(cards_html, unsafe_allow_html=True)

        # Action buttons
        if not st.session_state.show_result:
            actions = spot.scenario.available_actions
            cols = st.columns(len(actions))

            for i, action in enumerate(actions):
                with cols[i]:
                    btn_label = get_action_label(action, spot.scenario, st.session_state.language)
                    if st.button(btn_label, key=f"action_{action}", use_container_width=True,
                                 type="primary" if action in ["raise", "3bet", "4bet", "5bet"] else "secondary"):
                        result = st.session_state.drill.check_answer(spot, action)
                        session.add_result(spot, action, result)
                        st.session_state.last_result = result
                        st.session_state.show_result = True

                        # Update streak
                        if result.is_correct:
                            st.session_state.current_streak += 1
                            if st.session_state.current_streak > st.session_state.best_streak:
                                st.session_state.best_streak = st.session_state.current_streak
                        else:
                            st.session_state.current_streak = 0

                        # Save progress to localStorage
                        progress = {
                            'best_streak': st.session_state.best_streak,
                            'total_hands_all_time': st.session_state.get('total_hands_all_time', 0) + 1,
                            'total_correct_all_time': st.session_state.get('total_correct_all_time', 0) + (1 if result.is_correct else 0),
                        }
                        save_progress_to_storage(progress)

                        st.rerun()
        else:
            # Show result in right column
            result = st.session_state.last_result
            explanation = result.explanation_zh if st.session_state.language == "zh" else result.explanation

            if result.is_correct:
                st.markdown(f"""
                <div style="background: #065f46; padding: 10px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 8px;">
                    <div style="color: #10b981; font-weight: bold; font-size: 1rem;">✅ {t('correct_answer')}</div>
                    <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 4px;">{explanation}</div>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div style="background: #7f1d1d; padding: 10px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 8px;">
                    <div style="color: #ef4444; font-weight: bold; font-size: 1rem;">❌ {t('incorrect')}</div>
                    <div style="font-size: 0.85rem; margin-top: 4px;">{t('your_action')}: <b>{result.player_action.upper()}</b> → {t('correct_action')}: <b>{result.correct_action.upper()}</b></div>
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">{explanation}</div>
                </div>
                """, unsafe_allow_html=True)

            # Next hand button - immediately after result for easy access
            if st.button(t('next_hand'), use_container_width=True, type="primary"):
                st.session_state.current_spot = None
                st.session_state.show_result = False
                st.rerun()

            # Show equity breakdown for vs 4-bet scenarios (below button)
            if spot.scenario.action_type == ActionType.VS_4BET:
                equity_html = get_equity_breakdown_html(str(spot.hand), st.session_state.language)
                if equity_html:
                    st.markdown(equity_html, unsafe_allow_html=True)

    # Show range below (full width) - auto expanded after answer
    if st.session_state.show_result:
        with st.expander(f"📊 {t('view_range')}", expanded=True):
            range_data = st.session_state.drill.get_range_for_spot(spot)
            raise_key = next((k for k in ["raise", "3bet", "4bet", "5bet"] if k in range_data), None)
            raise_hands = range_data.get(raise_key, []) if raise_key else []
            call_hands = range_data.get("call", [])
            drillable_hands = st.session_state.drill.get_drillable_hands_for_spot(spot)

            display_range_grid(
                raise_hands=raise_hands,
                call_hands=call_hands,
                highlight_hand=str(spot.hand),
                drillable_hands=drillable_hands,
            )


def viewer_page():
    """Range viewer page - optimized layout with visual table."""
    evaluator = Evaluator()
    table_format = st.session_state.table_format
    lang = st.session_state.language

    # Get positions based on table format
    if table_format == "9max":
        position_options = ["UTG", "UTG+1", "UTG+2", "MP", "HJ", "CO", "BTN", "SB", "BB"]
    else:
        position_options = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]

    # Initialize viewer session state
    if "viewer_action_type" not in st.session_state:
        st.session_state.viewer_action_type = "RFI"
    if "viewer_hero_pos" not in st.session_state:
        st.session_state.viewer_hero_pos = "BTN"
    if "viewer_villain_pos" not in st.session_state:
        st.session_state.viewer_villain_pos = None

    # Compact header row: Title + context on left, scenario selector on right
    if lang == "zh":
        context_info = "📊 Cash Game · 100bb · 開池 2.5bb"
    else:
        context_info = "📊 Cash Game · 100bb · Open 2.5bb"

    col_header, col_tabs = st.columns([1, 1])

    with col_header:
        st.markdown(f"""
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
            <span style="font-size: 1.3rem; font-weight: bold;">{t('range_viewer')}</span>
            <span style="color: #94a3b8; font-size: 0.85rem;">{context_info}</span>
        </div>
        """, unsafe_allow_html=True)

    with col_tabs:
        # Scenario type selector as segmented control
        if table_format == "9max":
            action_types = ["RFI", "vs Open", "vs 3-Bet"]
        else:
            action_types = ["RFI", "vs Open", "vs 3-Bet", "vs 4-Bet"]

        if "viewer_selected_tab" not in st.session_state:
            st.session_state.viewer_selected_tab = 0

        # Create button row for tab selection
        tab_cols = st.columns(len(action_types))
        for idx, action_type in enumerate(action_types):
            with tab_cols[idx]:
                is_selected = st.session_state.viewer_selected_tab == idx
                btn_type = "primary" if is_selected else "secondary"
                if st.button(action_type, key=f"viewer_tab_{idx}", use_container_width=True, type=btn_type):
                    st.session_state.viewer_selected_tab = idx
                    st.rerun()

    # Content based on selected tab
    i = st.session_state.viewer_selected_tab
    action_type = action_types[i]

    # Filter valid positions for this action type
    if action_type == "RFI":
        # Can open from any position except BB
        valid_positions = [p for p in position_options if p != "BB"]
    elif action_type == "vs Open":
        # Facing open: need someone before you to open, so exclude UTG
        valid_positions = [p for p in position_options if p != "UTG"]
    elif action_type == "vs 3-Bet":
        # You opened, facing 3-bet: you must be able to open, so exclude BB
        valid_positions = [p for p in position_options if p != "BB"]
    else:  # vs 4-Bet
        # You 3-bet, facing 4-bet: need someone before you to open, so exclude UTG
        valid_positions = [p for p in position_options if p != "UTG"]

    # Get stored hero, but validate it's in the current valid positions list
    stored_hero = st.session_state.get(f"viewer_hero_{i}")
    hero_pos = stored_hero if stored_hero in valid_positions else (valid_positions[-1] if valid_positions else "BTN")

    # Two-column layout: Table visual + Position selectors
    col_table, col_select = st.columns([1, 1.2])

    with col_table:
        # Display mini poker table with current selection
        villain_pos = None
        if action_type != "RFI":
            hero_idx = position_options.index(hero_pos) if hero_pos in position_options else 0
            if action_type == "vs Open":
                # Facing open: villain opened from earlier position
                villains = position_options[:hero_idx]
            elif action_type == "vs 3-Bet":
                # You opened, villain 3-bet from later position
                villains = position_options[hero_idx + 1:]
            else:  # vs 4-Bet
                # Villain opened, you 3-bet, villain 4-bet - villain is earlier position
                villains = position_options[:hero_idx]
            # Validate stored villain is in current valid villains list
            stored_villain = st.session_state.get(f"viewer_villain_{i}")
            villain_pos = stored_villain if stored_villain in villains else (villains[0] if villains else None)

        # Show table visualization
        pos_map = {
            "UTG": Position.UTG, "HJ": Position.HJ, "CO": Position.CO,
            "BTN": Position.BTN, "SB": Position.SB, "BB": Position.BB,
            "UTG+1": Position.UTG1, "UTG+2": Position.UTG2, "MP": Position.MP,
        }
        hero_position = pos_map.get(hero_pos)
        villain_position = pos_map.get(villain_pos) if villain_pos else None

        # Build bets and action based on scenario type
        bets = None
        show_action = None
        if action_type == "vs Open" and villain_position:
            show_action = "Raises"
            bets = {villain_position: "2.5bb"}
        elif action_type == "vs 3-Bet" and villain_position:
            show_action = "3-Bets"
            bets = {hero_position: "2.5bb", villain_position: "8bb"}
        elif action_type == "vs 4-Bet" and villain_position:
            show_action = "4-Bets"
            bets = {hero_position: "8bb", villain_position: "20bb"}

        display_table(
            hero_position=hero_position,
            villain_position=villain_position,
            show_action=show_action,
            format=table_format,
            bets=bets,
            lang=st.session_state.language,
        )

    with col_select:
        # Position selection with styled buttons
        st.markdown(f"**{t('your_position')}**")

        # Split positions into two rows for better layout
        if len(valid_positions) > 4:
            row1 = valid_positions[:len(valid_positions)//2 + 1]
            row2 = valid_positions[len(valid_positions)//2 + 1:]
        else:
            row1 = valid_positions
            row2 = []

        # First row of hero positions
        cols1 = st.columns(len(row1))
        for j, pos in enumerate(row1):
            with cols1[j]:
                is_selected = pos == hero_pos
                if st.button(
                    pos,
                    key=f"hero_{i}_{pos}",
                    use_container_width=True,
                    type="primary" if is_selected else "secondary"
                ):
                    st.session_state[f"viewer_hero_{i}"] = pos
                    st.rerun()

        # Second row if needed
        if row2:
            cols2 = st.columns(len(row2))
            for j, pos in enumerate(row2):
                with cols2[j]:
                    is_selected = pos == hero_pos
                    if st.button(
                        pos,
                        key=f"hero_{i}_{pos}",
                        use_container_width=True,
                        type="primary" if is_selected else "secondary"
                    ):
                        st.session_state[f"viewer_hero_{i}"] = pos
                        st.rerun()

        # Villain position (if applicable)
        villain_pos_select = None
        if action_type != "RFI":
            hero_idx = position_options.index(hero_pos) if hero_pos in position_options else 0

            if action_type == "vs Open":
                villains = position_options[:hero_idx]
            elif action_type == "vs 3-Bet":
                villains = position_options[hero_idx + 1:]
            else:  # vs 4-Bet
                villains = position_options[:hero_idx]

            if villains:
                st.markdown(f"**{t('opponent_position')}**")
                stored_villain = st.session_state.get(f"viewer_villain_{i}")
                villain_pos_select = stored_villain if stored_villain in villains else villains[0]

                if len(villains) > 4:
                    v_row1 = villains[:len(villains)//2 + 1]
                    v_row2 = villains[len(villains)//2 + 1:]
                else:
                    v_row1 = villains
                    v_row2 = []

                vcols1 = st.columns(len(v_row1))
                for j, pos in enumerate(v_row1):
                    with vcols1[j]:
                        is_selected = pos == villain_pos_select
                        if st.button(
                            pos,
                            key=f"villain_{i}_{pos}",
                            use_container_width=True,
                            type="primary" if is_selected else "secondary"
                        ):
                            st.session_state[f"viewer_villain_{i}"] = pos
                            st.rerun()

                if v_row2:
                    vcols2 = st.columns(len(v_row2))
                    for j, pos in enumerate(v_row2):
                        with vcols2[j]:
                            is_selected = pos == villain_pos_select
                            if st.button(
                                pos,
                                key=f"villain_{i}_{pos}",
                                use_container_width=True,
                                type="primary" if is_selected else "secondary"
                            ):
                                st.session_state[f"viewer_villain_{i}"] = pos
                                st.rerun()

    # Build and display scenario
    action_map = {
        "RFI": ActionType.RFI,
        "vs Open": ActionType.VS_RFI,
        "vs 3-Bet": ActionType.VS_3BET,
        "vs 4-Bet": ActionType.VS_4BET,
    }
    pos_map = {
        "UTG": Position.UTG, "HJ": Position.HJ, "CO": Position.CO,
        "BTN": Position.BTN, "SB": Position.SB, "BB": Position.BB,
        "UTG+1": Position.UTG1, "UTG+2": Position.UTG2, "MP": Position.MP,
    }

    # Use villain_pos from col_select if available, otherwise from col_table
    final_villain_pos = villain_pos_select if action_type != "RFI" and 'villain_pos_select' in dir() and villain_pos_select else villain_pos

    scenario = Scenario(
        hero_position=pos_map[hero_pos],
        action_type=action_map[action_type],
        villain_position=pos_map.get(final_villain_pos) if final_villain_pos else None,
    )

    # Scenario description with styling - compact
    scenario_desc = scenario.description_zh if lang == "zh" else scenario.description
    st.markdown(f"""
    <div style="
        background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
        padding: 6px 12px;
        border-radius: 6px;
        border-left: 3px solid #fbbf24;
        margin: 4px 0;
    ">
        <span style="color: #fbbf24;">📍</span> {scenario_desc}
    </div>
    """, unsafe_allow_html=True)

    # Get and display range
    ranges = evaluator.load_ranges(table_format)
    range_data = evaluator.get_range_for_scenario(scenario, format=table_format)

    if range_data:
        raise_key = next((k for k in ["raise", "3bet", "4bet", "5bet"] if k in range_data), None)
        raise_hands = range_data.get(raise_key, []) if raise_key else []
        call_hands = range_data.get("call", [])

        # Range statistics
        total_raise = len(raise_hands)
        total_call = len(call_hands)
        total_combos = 169  # Total unique starting hands

        # Calculate combo percentages (approximate)
        raise_pct = (total_raise / total_combos) * 100 if total_combos > 0 else 0
        call_pct = (total_call / total_combos) * 100 if total_combos > 0 else 0

        # Stats display
        stat_cols = st.columns(4)
        with stat_cols[0]:
            action_label = raise_key.upper() if raise_key else "RAISE"
            st.metric(action_label, f"{total_raise} hands", f"~{raise_pct:.1f}%")
        with stat_cols[1]:
            st.metric("CALL", f"{total_call} hands", f"~{call_pct:.1f}%")
        with stat_cols[2]:
            fold_count = total_combos - total_raise - total_call
            fold_pct = (fold_count / total_combos) * 100
            st.metric("FOLD", f"{fold_count} hands", f"~{fold_pct:.1f}%")
        with stat_cols[3]:
            total_play = total_raise + total_call
            play_pct = (total_play / total_combos) * 100
            st.metric("VPIP", f"{total_play} hands", f"~{play_pct:.1f}%")

        # Get drillable hands for visual distinction
        scenario_type = action_type.lower().replace(" ", "_").replace("-", "_")
        drillable_hands = get_drillable_hands(range_data, scenario_type)

        # Display range grid (hide stats since we show them above)
        display_range_grid(
            raise_hands=raise_hands,
            call_hands=call_hands,
            show_stats=False,
            drillable_hands=drillable_hands,
        )
    else:
        st.warning(t("no_data"))


def postflop_page():
    """Postflop C-bet practice page."""
    lang = st.session_state.language

    # Initialize postflop drill
    if 'postflop_drill' not in st.session_state:
        st.session_state.postflop_drill = PostflopDrill()
    if 'postflop_spot' not in st.session_state:
        st.session_state.postflop_spot = None
    if 'postflop_result' not in st.session_state:
        st.session_state.postflop_result = None
    if 'postflop_score' not in st.session_state:
        st.session_state.postflop_score = {"correct": 0, "total": 0}

    drill = st.session_state.postflop_drill

    # Score display
    score = st.session_state.postflop_score
    if score["total"] > 0:
        accuracy = score["correct"] / score["total"] * 100
        score_text = f"{score['correct']}/{score['total']} ({accuracy:.0f}%)"
    else:
        score_text = "0/0"

    # Generate spot if needed
    if st.session_state.postflop_spot is None:
        st.session_state.postflop_spot = drill.generate_spot()
        st.session_state.postflop_result = None

    spot = st.session_state.postflop_spot

    if spot is None:
        st.warning("No postflop scenarios available.")
        return

    scenario = spot.scenario

    # Labels
    pot_type_label = t("postflop_srp") if scenario.pot_type == "srp" else t("postflop_3bp")
    texture_label = scenario.texture_zh if lang == "zh" else TEXTURE_NAMES.get(scenario.texture, ('', scenario.texture.value))[1]

    # Calculate pot and stacks based on pot type
    if scenario.pot_type == "srp":
        pot_size = "5.5bb"
        hero_stack = "97.5bb"
        villain_stack = "97bb" if scenario.villain_position == "BB" else "97.5bb"
    else:  # 3bp
        pot_size = "16bb"
        hero_stack = "92bb"
        villain_stack = "92bb"

    flop_cards = [(c.rank, c.suit) for c in scenario.flop]

    # Two-column layout: Table (left) | Hand + Actions (right)
    col_left, col_right = st.columns([1, 1])

    with col_left:
        # Compact header: title + score on same line
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 6px 12px; border-radius: 6px; border-left: 3px solid #7c3aed; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.95rem; font-weight: bold; color: #7c3aed;">🎯 {t("postflop_cbet")}</span>
            <span style="font-size: 0.75rem; color: #94a3b8;">{t('outs_score')} <span style="color: #22c55e; font-weight: bold;">{score_text}</span></span>
        </div>
        """, unsafe_allow_html=True)

        # Preflop context + tags
        st.markdown(f"""
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="color: #94a3b8; font-size: 0.8rem;">{scenario.preflop}</span>
            <div>
                <span style="background: #3b82f6; color: white; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; margin-right: 4px;">{pot_type_label}</span>
                <span style="background: #7c3aed; color: white; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem;">{texture_label}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Display postflop table
        display_postflop_table(
            hero_position=scenario.hero_position,
            villain_position=scenario.villain_position,
            flop_cards=flop_cards,
            pot_size=pot_size,
            hero_stack=hero_stack,
            villain_stack=villain_stack,
            lang=lang,
        )

    # Generate or use specific hero cards
    if scenario.hero_cards:
        hero_cards_display = scenario.hero_cards
    else:
        # Generate consistent cards based on scenario id
        import random
        rng = random.Random(scenario.id)
        hand = scenario.hero_hand
        suits = ['s', 'h', 'd', 'c']

        if hand.is_pair:
            chosen_suits = rng.sample(suits, 2)
            hero_cards_display = [
                HeroCard(rank=hand.rank1, suit=chosen_suits[0]),
                HeroCard(rank=hand.rank2, suit=chosen_suits[1]),
            ]
        elif hand.is_suited:
            suit = rng.choice(suits)
            hero_cards_display = [
                HeroCard(rank=hand.rank1, suit=suit),
                HeroCard(rank=hand.rank2, suit=suit),
            ]
        else:
            chosen_suits = rng.sample(suits, 2)
            hero_cards_display = [
                HeroCard(rank=hand.rank1, suit=chosen_suits[0]),
                HeroCard(rank=hand.rank2, suit=chosen_suits[1]),
            ]

    def get_suit_color(suit):
        return {'s': '#1a1a2e', 'h': '#ef4444', 'd': '#3b82f6', 'c': '#22c55e'}.get(suit, '#1a1a2e')

    def fmt_rank(rank):
        return "10" if rank == "T" else rank

    def get_suit_symbol(suit):
        return {'s': '♠', 'h': '♥', 'd': '♦', 'c': '♣'}.get(suit, suit)

    result = st.session_state.postflop_result

    with col_right:
        # Hero's hand
        st.markdown(f"<div style='text-align:center;color:#fbbf24;font-weight:bold;font-size:0.85rem;margin-bottom:5px;'>{t('your_hand')}</div>", unsafe_allow_html=True)

        # Build cards HTML
        cards_parts = []
        for card in hero_cards_display:
            color = get_suit_color(card.suit)
            symbol = get_suit_symbol(card.suit)
            cards_parts.append(f'<div style="width:50px;height:70px;background:linear-gradient(145deg,#fff 0%,#f0f0f0 100%);border-radius:6px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;color:{color};font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.3);margin:2px;"><span style="font-size:20px;">{fmt_rank(card.rank)}</span><span style="font-size:16px;">{symbol}</span></div>')

        cards_html = "".join(cards_parts)
        st.markdown(f'<div style="display:flex;justify-content:center;">{cards_html}</div><div style="text-align:center;color:#94a3b8;font-size:0.75rem;margin-top:3px;">({str(scenario.hero_hand)})</div>', unsafe_allow_html=True)

        if result is None:
            # Action buttons - show all options directly
            st.markdown(f"<div style='text-align:center;color:#94a3b8;font-size:0.8rem;margin: 8px 0 5px 0;'>{t('postflop_action')}</div>", unsafe_allow_html=True)

            # Check button (full width)
            if st.button(f"☑️ {t('postflop_check')}", key="postflop_check", use_container_width=True):
                result = drill.check_answer(spot, PostflopAction.CHECK, None, lang)
                st.session_state.postflop_result = result
                st.session_state.postflop_score["total"] += 1
                if result.is_correct:
                    st.session_state.postflop_score["correct"] += 1
                st.rerun()

            # Bet sizing buttons in rows
            sizing_row1 = st.columns(3)
            sizing_row2 = st.columns(3)
            sizings = ["25", "33", "50", "66", "75", "100"]
            for i, sizing in enumerate(sizings[:3]):
                with sizing_row1[i]:
                    if st.button(f"💰 {sizing}%", key=f"sizing_{sizing}", use_container_width=True):
                        result = drill.check_answer(spot, PostflopAction.BET, sizing, lang)
                        st.session_state.postflop_result = result
                        st.session_state.postflop_score["total"] += 1
                        if result.is_correct:
                            st.session_state.postflop_score["correct"] += 1
                        st.rerun()
            for i, sizing in enumerate(sizings[3:]):
                with sizing_row2[i]:
                    if st.button(f"💰 {sizing}%", key=f"sizing_{sizing}", use_container_width=True):
                        result = drill.check_answer(spot, PostflopAction.BET, sizing, lang)
                        st.session_state.postflop_result = result
                        st.session_state.postflop_score["total"] += 1
                        if result.is_correct:
                            st.session_state.postflop_score["correct"] += 1
                        st.rerun()
        else:
            # Show result in right column
            action_label = t("postflop_check") if result.correct_action == PostflopAction.CHECK else t("postflop_bet")
            sizing_label = f" ({result.correct_sizing}%)" if result.correct_sizing else ""

            if result.is_correct:
                st.markdown(f"""
                <div style="padding: 10px; background: #065f46; border-radius: 8px; border-left: 4px solid #10b981; margin: 8px 0;">
                    <div style="color: #10b981; font-weight: bold; font-size: 0.95rem;">✅ {t("postflop_correct")}</div>
                    <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 4px;">{action_label}{sizing_label} ({result.frequency}%)</div>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div style="padding: 10px; background: #7f1d1d; border-radius: 8px; border-left: 4px solid #ef4444; margin: 8px 0;">
                    <div style="color: #ef4444; font-weight: bold; font-size: 0.95rem;">❌ {t("postflop_incorrect")}</div>
                    <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 4px;">{t("postflop_gto_action")}: {action_label}{sizing_label} ({result.frequency}%)</div>
                </div>
                """, unsafe_allow_html=True)

            # Next button - immediately after result
            if st.button(t("postflop_next"), key="postflop_next", use_container_width=True, type="primary"):
                st.session_state.postflop_spot = None
                st.session_state.postflop_result = None
                st.session_state.postflop_bet_clicked = False
                st.rerun()

            # Explanation below
            explain_label = "解釋" if lang == "zh" else "Explanation"
            st.markdown(f"""
            <div style="background: #1e293b; border-radius: 6px; padding: 10px; margin-top: 8px;">
                <div style="color: #94a3b8; font-size: 0.75rem; margin-bottom: 4px;">💡 {explain_label}</div>
                <div style="color: #e2e8f0; font-size: 0.85rem;">{result.explanation}</div>
            </div>
            """, unsafe_allow_html=True)


def stats_page():
    """Statistics page."""
    st.markdown(f'<div class="main-header">{t("statistics")}</div>', unsafe_allow_html=True)

    session = st.session_state.session

    if session.total_spots == 0:
        st.info(t("no_stats"))
        return

    # Overall stats - now includes streak
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.markdown('<div class="stats-card">', unsafe_allow_html=True)
        st.metric(t("total_hands"), session.total_spots)
        st.markdown('</div>', unsafe_allow_html=True)
    with col2:
        st.markdown('<div class="stats-card">', unsafe_allow_html=True)
        st.metric(t("correct"), session.correct_count)
        st.markdown('</div>', unsafe_allow_html=True)
    with col3:
        st.markdown('<div class="stats-card">', unsafe_allow_html=True)
        st.metric(t("incorrect_count"), session.incorrect_count)
        st.markdown('</div>', unsafe_allow_html=True)
    with col4:
        st.markdown('<div class="stats-card">', unsafe_allow_html=True)
        st.metric(t("accuracy"), session.accuracy_percent)
        st.markdown('</div>', unsafe_allow_html=True)
    with col5:
        st.markdown('<div class="stats-card">', unsafe_allow_html=True)
        st.metric(t("best_streak"), f"🔥 {st.session_state.best_streak}")
        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("---")

    # Stats by position
    col1, col2 = st.columns(2)

    with col1:
        st.subheader(t("by_position"))
        pos_stats = session.get_stats_by_position()
        if pos_stats:
            for pos, stats in pos_stats.items():
                acc = stats['accuracy'] * 100
                color = "#10b981" if acc >= 70 else "#f59e0b" if acc >= 50 else "#ef4444"
                st.markdown(f"**{pos}**: {stats['correct']}/{stats['total']} ({acc:.0f}%)")
                st.progress(stats['accuracy'])

    with col2:
        st.subheader(t("by_action_type"))
        action_stats = session.get_stats_by_action_type()
        if action_stats:
            for action_type, stats in action_stats.items():
                acc = stats['accuracy'] * 100
                st.markdown(f"**{action_type.upper()}**: {stats['correct']}/{stats['total']} ({acc:.0f}%)")
                st.progress(stats['accuracy'])

    # Mistakes review
    st.markdown("---")
    st.subheader(t("recent_mistakes"))

    mistakes = session.mistakes[-10:]  # Last 10 mistakes
    if mistakes:
        evaluator = Evaluator()
        for m in reversed(mistakes):
            with st.expander(f"{m.spot.hand} @ {m.spot.scenario.hero_position.value}"):
                scenario_desc = m.spot.scenario.description_zh if st.session_state.language == "zh" else m.spot.scenario.description
                explanation = m.eval_result.explanation_zh if st.session_state.language == "zh" else m.eval_result.explanation

                # Text info
                st.write(f"**{t('scenario')}:** {scenario_desc}")
                st.write(f"**{t('your_action')}:** {m.player_action}")
                st.write(f"**{t('correct_action')}:** {m.eval_result.correct_action}")
                st.write(f"**Explanation:** {explanation}")

                # Visual display: Table + Range Grid
                col_table, col_range = st.columns([1, 1.2])

                with col_table:
                    # Build bets based on action type
                    bets = None
                    villain_action = None
                    if m.spot.scenario.action_type == ActionType.VS_RFI:
                        villain_action = "Raises"
                        bets = {m.spot.scenario.villain_position: "2.5bb"}
                    elif m.spot.scenario.action_type == ActionType.VS_3BET:
                        villain_action = "3-Bets"
                        bets = {m.spot.scenario.hero_position: "2.5bb", m.spot.scenario.villain_position: "8bb"}
                    elif m.spot.scenario.action_type == ActionType.VS_4BET:
                        villain_action = "4-Bets"
                        bets = {m.spot.scenario.hero_position: "8bb", m.spot.scenario.villain_position: "20bb"}

                    display_table(
                        hero_position=m.spot.scenario.hero_position,
                        villain_position=m.spot.scenario.villain_position,
                        show_action=villain_action,
                        format=st.session_state.table_format,
                        bets=bets,
                        lang=st.session_state.language,
                    )

                with col_range:
                    # Get range data for this scenario
                    range_data = evaluator.get_range_for_scenario(m.spot.scenario, format=st.session_state.table_format)
                    if range_data:
                        raise_key = next((k for k in ["raise", "3bet", "4bet", "5bet"] if k in range_data), None)
                        raise_hands = range_data.get(raise_key, []) if raise_key else []
                        call_hands = range_data.get("call", [])
                        scenario_type = m.spot.scenario.action_type.value
                        drillable_hands = get_drillable_hands(range_data, scenario_type)

                        display_range_grid(
                            raise_hands=raise_hands,
                            call_hands=call_hands,
                            highlight_hand=str(m.spot.hand),
                            show_legend=True,
                            show_stats=False,
                            key=f"mistake_range_{m.spot.hand}_{m.spot.scenario.hero_position.value}",
                            drillable_hands=drillable_hands,
                        )
    else:
        st.success(t("no_mistakes") + " 🎉")


def learning_page():
    """Learning page - reference materials for equity and outs."""
    lang = st.session_state.language

    st.markdown(f'<div class="main-header">📚 {t("learning")}</div>', unsafe_allow_html=True)

    # Tabs for different topics
    tab_equity = "權益對抗" if lang == "zh" else "Equity Matchups"
    tab_outs = "Outs 補牌" if lang == "zh" else "Outs Reference"

    tab1, tab2 = st.tabs([tab_equity, tab_outs])

    with tab1:
        _display_equity_learning(lang)

    with tab2:
        _display_outs_learning(lang)


def _display_equity_learning(lang: str):
    """Display equity learning content with visual bars."""

    def equity_matchup_card(hand1: str, hand2: str, eq1: int, eq2: int):
        """Generate HTML for a single equity matchup with visual bar."""
        return f'''
        <div style="background: #1e293b; border-radius: 8px; padding: 10px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #3b82f6; font-weight: bold;">{hand1}</span>
                <span style="color: #94a3b8;">vs</span>
                <span style="color: #ef4444; font-weight: bold;">{hand2}</span>
            </div>
            <div style="display: flex; height: 20px; border-radius: 4px; overflow: hidden; background: #374151;">
                <div style="width: {eq1}%; background: linear-gradient(90deg, #1e40af, #3b82f6); display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 11px; font-weight: bold;">{eq1}%</span>
                </div>
                <div style="width: {eq2}%; background: linear-gradient(90deg, #dc2626, #991b1b); display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 11px; font-weight: bold;">{eq2}%</span>
                </div>
            </div>
        </div>
        '''

    def concept_card(title: str, desc: str, example: str, color: str = "#fbbf24"):
        """Generate HTML for a concept card."""
        return f'''
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 4px solid {color};">
            <div style="color: {color}; font-weight: bold; font-size: 1rem; margin-bottom: 4px;">{title}</div>
            <div style="color: #cbd5e1; font-size: 0.9rem; margin-bottom: 6px;">{desc}</div>
            <div style="color: #94a3b8; font-size: 0.85rem; font-style: italic;">📌 {example}</div>
        </div>
        '''

    # Section titles
    pair_vs_pair = "🎯 對子 vs 對子" if lang == "zh" else "🎯 Pair vs Pair"
    high_vs_low = "🃏 高牌 vs 低牌" if lang == "zh" else "🃏 High Card vs Lower"
    pair_vs_overcards = "⚔️ 對子 vs 高牌" if lang == "zh" else "⚔️ Pair vs Overcards"
    concepts_title = "💡 關鍵概念" if lang == "zh" else "💡 Key Concepts"

    # Two columns for matchups
    col1, col2 = st.columns(2)

    with col1:
        st.markdown(f"**{pair_vs_pair}**")
        matchups_html = ""
        matchups_html += equity_matchup_card("AA", "KK", 82, 18)
        matchups_html += equity_matchup_card("KK", "QQ", 82, 18)
        matchups_html += equity_matchup_card("AA", "22", 83, 17)
        st.markdown(matchups_html, unsafe_allow_html=True)

        st.markdown(f"**{high_vs_low}**")
        matchups_html = ""
        matchups_html += equity_matchup_card("AKs", "AQs", 70, 30)
        matchups_html += equity_matchup_card("AKo", "AQo", 70, 30)
        matchups_html += equity_matchup_card("AKs", "KQs", 72, 28)
        st.markdown(matchups_html, unsafe_allow_html=True)

    with col2:
        st.markdown(f"**{pair_vs_overcards}**")
        matchups_html = ""
        matchups_html += equity_matchup_card("AA", "AKs", 87, 13)
        matchups_html += equity_matchup_card("KK", "AKs", 66, 34)
        matchups_html += equity_matchup_card("QQ", "AKs", 54, 46)
        matchups_html += equity_matchup_card("JJ", "AKs", 54, 46)
        matchups_html += equity_matchup_card("22", "AKs", 48, 52)
        st.markdown(matchups_html, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown(f"### {concepts_title}")

    if lang == "zh":
        concepts_html = ""
        concepts_html += concept_card(
            "壓制 (Domination)",
            "當兩手牌共用一張牌時，較大的那手牌「壓制」較小的",
            "AK vs AQ → AQ 被壓制，只有 ~30% 勝率",
            "#ef4444"
        )
        concepts_html += concept_card(
            "硬幣翻 (Coin Flip)",
            "對子 vs 兩張高牌 約 50/50",
            "QQ vs AKs ≈ 54% vs 46%",
            "#fbbf24"
        )
        concepts_html += concept_card(
            "花色的價值",
            "同花比雜色多 ~3-4% 勝率",
            "AKs vs AKo ≈ 52% vs 48%",
            "#22c55e"
        )
    else:
        concepts_html = ""
        concepts_html += concept_card(
            "Domination",
            "When two hands share a card, the bigger hand dominates",
            "AK vs AQ → AQ is dominated (~30% equity)",
            "#ef4444"
        )
        concepts_html += concept_card(
            "Coin Flip",
            "Pair vs two overcards ≈ 50/50",
            "QQ vs AKs ≈ 54% vs 46%",
            "#fbbf24"
        )
        concepts_html += concept_card(
            "Suited Value",
            "Suited hands have ~3-4% more equity than offsuit",
            "AKs vs AKo ≈ 52% vs 48%",
            "#22c55e"
        )
    st.markdown(concepts_html, unsafe_allow_html=True)


def _display_outs_learning(lang: str):
    """Display outs learning content with visual elements."""

    def outs_card(draw_type: str, outs: int, desc: str, color: str = "#3b82f6"):
        """Generate HTML for an outs card with visual indicator."""
        # Create visual outs dots (max 15)
        dots = ""
        for i in range(min(outs, 15)):
            dots += f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{color};margin:1px;"></span>'

        return f'''
        <div style="background: #1e293b; border-radius: 8px; padding: 10px; margin-bottom: 8px; border-left: 4px solid {color};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="color: #e2e8f0; font-weight: bold;">{draw_type}</span>
                <span style="background: {color}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: bold; font-size: 0.9rem;">{outs} outs</span>
            </div>
            <div style="margin-bottom: 4px;">{dots}</div>
            <div style="color: #94a3b8; font-size: 0.85rem;">{desc}</div>
        </div>
        '''

    def probability_bar(outs: int, turn_pct: int, river_pct: int):
        """Generate HTML for probability visualization."""
        return f'''
        <div style="background: #1e293b; border-radius: 8px; padding: 8px 12px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #fbbf24; font-weight: bold; min-width: 60px;">{outs} outs</span>
                <div style="flex: 1;">
                    <div style="display: flex; gap: 4px; margin-bottom: 2px;">
                        <div style="width: {turn_pct}%; height: 12px; background: linear-gradient(90deg, #7c3aed, #a855f7); border-radius: 3px;"></div>
                        <span style="color: #a855f7; font-size: 11px;">{turn_pct}%</span>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <div style="width: {river_pct}%; height: 12px; background: linear-gradient(90deg, #059669, #10b981); border-radius: 3px;"></div>
                        <span style="color: #10b981; font-size: 11px;">{river_pct}%</span>
                    </div>
                </div>
            </div>
        </div>
        '''

    def tip_card(title: str, desc: str, icon: str = "💡"):
        """Generate HTML for a tip card."""
        return f'''
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; gap: 10px; align-items: flex-start;">
            <span style="font-size: 1.2rem;">{icon}</span>
            <div>
                <div style="color: #fbbf24; font-weight: bold; font-size: 0.9rem;">{title}</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">{desc}</div>
            </div>
        </div>
        '''

    # Intro
    intro = "**Outs** 是指能讓你的牌變成更強牌型的剩餘牌數。" if lang == "zh" else "**Outs** are the remaining cards that will improve your hand."
    st.markdown(intro)

    # Two columns
    col1, col2 = st.columns(2)

    with col1:
        section_title = "🃏 常見聽牌" if lang == "zh" else "🃏 Common Draws"
        st.markdown(f"**{section_title}**")

        if lang == "zh":
            outs_html = ""
            outs_html += outs_card("同花聽牌", 9, "4張該花色 → 差1張成同花", "#3b82f6")
            outs_html += outs_card("兩頭順子 (OESD)", 8, "例如 5-6-7-8，可接 4 或 9", "#22c55e")
            outs_html += outs_card("卡順 (Gutshot)", 4, "例如 5-6-8-9，只能接 7", "#f59e0b")
            outs_html += outs_card("兩張高牌", 6, "各3張可配對", "#8b5cf6")
            outs_html += outs_card("聽暗三", 2, "口袋對等待第三張", "#ef4444")
            outs_html += outs_card("同花+順子", 15, "組合聽牌 (Combo Draw)", "#ec4899")
        else:
            outs_html = ""
            outs_html += outs_card("Flush Draw", 9, "4 cards of suit → need 1 more", "#3b82f6")
            outs_html += outs_card("Open-Ended Straight", 8, "e.g., 5-6-7-8, can hit 4 or 9", "#22c55e")
            outs_html += outs_card("Gutshot", 4, "e.g., 5-6-8-9, only 7 works", "#f59e0b")
            outs_html += outs_card("Two Overcards", 6, "3 cards each to pair", "#8b5cf6")
            outs_html += outs_card("Set Draw", 2, "Pocket pair waiting for third", "#ef4444")
            outs_html += outs_card("Combo Draw", 15, "Flush + Straight draw", "#ec4899")
        st.markdown(outs_html, unsafe_allow_html=True)

    with col2:
        # Rule of 2 and 4
        rule_title = "🧮 二四法則" if lang == "zh" else "🧮 Rule of 2 and 4"
        st.markdown(f"**{rule_title}**")

        rule_html = f'''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
            <div style="display: flex; gap: 15px; justify-content: center;">
                <div style="text-align: center;">
                    <div style="color: #a855f7; font-size: 1.5rem; font-weight: bold;">×2%</div>
                    <div style="color: #94a3b8; font-size: 0.8rem;">{"轉牌" if lang == "zh" else "Turn"}</div>
                </div>
                <div style="text-align: center;">
                    <div style="color: #10b981; font-size: 1.5rem; font-weight: bold;">×4%</div>
                    <div style="color: #94a3b8; font-size: 0.8rem;">{"河牌前" if lang == "zh" else "By River"}</div>
                </div>
            </div>
        </div>
        '''
        st.markdown(rule_html, unsafe_allow_html=True)

        # Probability reference
        prob_title = "📊 機率對照" if lang == "zh" else "📊 Probability Reference"
        st.markdown(f"**{prob_title}**")

        # Legend
        legend = f'''
        <div style="display: flex; gap: 15px; margin-bottom: 8px; font-size: 0.8rem;">
            <span><span style="display:inline-block;width:10px;height:10px;background:#a855f7;border-radius:2px;margin-right:4px;"></span>{"轉牌" if lang == "zh" else "Turn"}</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:2px;margin-right:4px;"></span>{"河牌前" if lang == "zh" else "By River"}</span>
        </div>
        '''
        st.markdown(legend, unsafe_allow_html=True)

        prob_html = ""
        prob_html += probability_bar(2, 4, 8)
        prob_html += probability_bar(4, 9, 17)
        prob_html += probability_bar(8, 17, 32)
        prob_html += probability_bar(9, 19, 35)
        prob_html += probability_bar(15, 32, 54)
        st.markdown(prob_html, unsafe_allow_html=True)

    # Tips section
    st.markdown("---")
    tips_title = "⚠️ 注意事項" if lang == "zh" else "⚠️ Important Notes"
    st.markdown(f"### {tips_title}")

    if lang == "zh":
        tips_html = ""
        tips_html += tip_card("扣除重複 outs", "同花順子雙聽時要扣除重複的牌", "🔄")
        tips_html += tip_card("考慮對手牌", "有些 outs 可能已在對手手中", "👤")
        tips_html += tip_card("反向 outs", "有些牌可能同時幫助對手", "⚔️")
    else:
        tips_html = ""
        tips_html += tip_card("Deduct overlapping outs", "Don't double count combo draws", "🔄")
        tips_html += tip_card("Consider opponent's hand", "Some outs may be in villain's hand", "👤")
        tips_html += tip_card("Reverse outs", "Some cards may also help opponent", "⚔️")
    st.markdown(tips_html, unsafe_allow_html=True)


def equity_quiz_page():
    """Equity quiz page - test preflop hand vs hand equity knowledge."""
    lang = st.session_state.language

    # Initialize equity quiz state
    if 'equity_quiz' not in st.session_state:
        st.session_state.equity_quiz = EquityQuiz()
    if 'equity_question' not in st.session_state:
        st.session_state.equity_question = None
    if 'equity_choices' not in st.session_state:
        st.session_state.equity_choices = None
    if 'equity_show_result' not in st.session_state:
        st.session_state.equity_show_result = False
    if 'equity_score' not in st.session_state:
        st.session_state.equity_score = {"correct": 0, "total": 0}
    if 'equity_category' not in st.session_state:
        st.session_state.equity_category = None
    if 'equity_answered_idx' not in st.session_state:
        st.session_state.equity_answered_idx = None  # Index of selected choice

    quiz = st.session_state.equity_quiz

    # Category options for filter
    categories = quiz.get_categories()
    category_options = [(None, t("equity_all_categories"))] + categories

    # Two-column layout: Cards on left, Choices on right
    col_cards, col_choices = st.columns([3, 2])

    with col_cards:
        # Header with score (left column only)
        score = st.session_state.equity_score
        accuracy = (score["correct"] / score["total"] * 100) if score["total"] > 0 else 0
        st.markdown(f"""
        <div style="
            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
            padding: 6px 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <span style="font-size: 1.1rem; font-weight: bold;">📊 {t("equity_quiz")}</span>
            <span style="color: #fbbf24; font-size: 0.9rem;">
                {score["correct"]}/{score["total"]} ({accuracy:.0f}%)
            </span>
        </div>
        """, unsafe_allow_html=True)

    with col_choices:
        # Category filter in right column
        selected_idx = st.selectbox(
            t("equity_category"),
            options=range(len(category_options)),
            format_func=lambda i: category_options[i][1],
            key="equity_category_select",
            label_visibility="collapsed",
        )
        selected_category = category_options[selected_idx][0]

    # Generate question if needed (after selectbox is defined)
    if st.session_state.equity_question is None or selected_category != st.session_state.equity_category:
        st.session_state.equity_category = selected_category
        st.session_state.equity_question = quiz.generate_question(category=selected_category)
        st.session_state.equity_choices = quiz.generate_choices(st.session_state.equity_question)
        st.session_state.equity_show_result = False
        st.session_state.equity_answered_idx = None

    question = st.session_state.equity_question
    choices = st.session_state.equity_choices

    # Display the matchup with card visuals
    hero_hand = Hand(question.hand1)
    villain_hand = Hand(question.hand2)

    answered_idx = st.session_state.equity_answered_idx
    has_answered = answered_idx is not None

    with col_cards:
        # Category description
        st.markdown(f"""
        <div style="text-align: center; font-size: 0.85rem; color: #94a3b8; margin-bottom: 3px;">
            {quiz.get_category_description(question.category)}
        </div>
        """, unsafe_allow_html=True)

        # Generate consistent seeds for suits
        import random
        question_seed = f"{question.hand1}_{question.hand2}_{question.category}"
        hero_rng = random.Random(f"{question_seed}_hero")
        villain_rng = random.Random(f"{question_seed}_villain")

        # Helper functions
        def get_suit_color(suit):
            return {'s': '#1a1a2e', 'h': '#ef4444', 'd': '#3b82f6', 'c': '#22c55e'}.get(suit, '#1a1a2e')

        def get_suit_symbol(suit):
            return {'s': '♠', 'h': '♥', 'd': '♦', 'c': '♣'}.get(suit, suit)

        def fmt_rank(r):
            return "10" if r == "T" else r

        suits = ['s', 'h', 'd', 'c']

        # Generate hero cards
        def generate_cards_html(hand, rng, card_size="48px", card_height="66px"):
            if hand.is_pair:
                chosen = rng.sample(suits, 2)
                s1, s2 = chosen[0], chosen[1]
            elif hand.is_suited:
                s1 = s2 = rng.choice(suits)
            else:
                chosen = rng.sample(suits, 2)
                s1, s2 = chosen[0], chosen[1]

            html = ""
            for rank, suit in [(hand.rank1, s1), (hand.rank2, s2)]:
                color = get_suit_color(suit)
                symbol = get_suit_symbol(suit)
                html += f'''
                <div style="width:{card_size};height:{card_height};background:linear-gradient(145deg,#ffffff 0%,#f0f0f0 100%);
                            border-radius:5px;display:flex;flex-direction:column;align-items:center;
                            justify-content:center;color:{color};font-weight:bold;
                            box-shadow:0 2px 6px rgba(0,0,0,0.4);">
                    <span style="font-size:18px;line-height:1;">{fmt_rank(rank)}</span>
                    <span style="font-size:16px;line-height:1;">{symbol}</span>
                </div>
                '''
            return html

        villain_cards_html = generate_cards_html(villain_hand, villain_rng)
        hero_cards_html = generate_cards_html(hero_hand, hero_rng)

        hero_label = "我" if lang == "zh" else "ME"
        villain_label = "對手" if lang == "zh" else "OPP"

        # Poker table visual with both hands
        table_html = f'''
        <!DOCTYPE html>
        <html>
        <head>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                background: transparent;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }}
            .equity-container {{
                position: relative;
                width: 100%;
                max-width: 320px;
                height: 280px;
                margin: 0 auto;
            }}
            .table {{
                position: absolute;
                width: 90%;
                height: 50%;
                left: 5%;
                top: 25%;
                background: linear-gradient(145deg, #1a5f3c 0%, #0d3d25 100%);
                border-radius: 50px;
                border: 6px solid #8B4513;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3);
            }}
            .vs-label {{
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #fbbf24;
                font-size: 20px;
                font-weight: bold;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }}
            .player-area {{
                position: absolute;
                display: flex;
                flex-direction: column;
                align-items: center;
            }}
            .villain-area {{
                top: 0;
                left: 50%;
                transform: translateX(-50%);
            }}
            .hero-area {{
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
            }}
            .cards {{
                display: flex;
                gap: 4px;
            }}
            .player-label {{
                font-size: 11px;
                font-weight: bold;
                padding: 2px 10px;
                border-radius: 10px;
                margin: 3px 0;
            }}
            .villain-label {{
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: #fff;
                box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
            }}
            .hero-label {{
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                color: #000;
                box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
            }}
            .hand-notation {{
                font-size: 10px;
                color: #94a3b8;
            }}
        </style>
        </head>
        <body>
            <div class="equity-container">
                <div class="table">
                    <div class="vs-label">⚔️ VS</div>
                </div>
                <div class="player-area villain-area">
                    <div class="player-label villain-label">{villain_label}</div>
                    <div class="cards">{villain_cards_html}</div>
                    <div class="hand-notation">({question.hand2})</div>
                </div>
                <div class="player-area hero-area">
                    <div class="hand-notation">({question.hand1})</div>
                    <div class="cards">{hero_cards_html}</div>
                    <div class="player-label hero-label">{hero_label}</div>
                </div>
            </div>
        </body>
        </html>
        '''
        components.html(table_html, height=290)

    with col_choices:
        # Question prompt
        st.markdown(f"""
        <div style="text-align: center; margin: 10px 0 15px 0; font-size: 1rem; color: #94a3b8;">
            {t("equity_question")}
        </div>
        """, unsafe_allow_html=True)

        # Labels for hero/villain with hand notation
        hero_label = "我" if lang == "zh" else "Me"
        villain_label = "對手" if lang == "zh" else "Opp"
        hero_hand_str = question.hand1
        villain_hand_str = question.hand2

        # Display choices as clickable equity bars with hand notation
        for i, choice in enumerate(choices):
            hero_pct = choice.equity1
            villain_pct = choice.equity2

            # Determine styling based on answer state
            if has_answered:
                if choice.is_correct:
                    indicator = " ✅"
                    border_style = "border: 3px solid #22c55e;"
                elif i == answered_idx:
                    indicator = " ❌"
                    border_style = "border: 3px solid #ef4444;"
                else:
                    indicator = ""
                    border_style = "border: 2px solid #374151; opacity: 0.4;"
            else:
                indicator = ""
                border_style = "border: 2px solid #374151;"

            # Button shows: "我 76s: 22% vs 對手 AA: 78%"
            button_label = f"{hero_label} {hero_hand_str}: {hero_pct}% vs {villain_label} {villain_hand_str}: {villain_pct}%{indicator}"

            if st.button(
                button_label,
                key=f"equity_choice_{i}",
                use_container_width=True,
                disabled=has_answered,
            ):
                st.session_state.equity_answered_idx = i
                st.session_state.equity_score["total"] += 1
                if choice.is_correct:
                    st.session_state.equity_score["correct"] += 1
                st.rerun()

            # Visual bar below button
            st.markdown(f"""
            <div style="
                display: flex;
                height: 6px;
                border-radius: 3px;
                overflow: hidden;
                margin-top: -8px;
                margin-bottom: 6px;
                {border_style}
            ">
                <div style="width: {hero_pct}%; background: linear-gradient(90deg, #1e40af, #3b82f6);"></div>
                <div style="width: {villain_pct}%; background: linear-gradient(90deg, #dc2626, #991b1b);"></div>
            </div>
            """, unsafe_allow_html=True)

        # Next button only (no result message box)
        if has_answered:
            if st.button(t("equity_next"), key="equity_next", use_container_width=True):
                st.session_state.equity_question = quiz.generate_question(category=st.session_state.equity_category)
                st.session_state.equity_choices = quiz.generate_choices(st.session_state.equity_question)
                st.session_state.equity_answered_idx = None
                st.rerun()


def outs_quiz_page():
    """Outs quiz page - test postflop outs calculation skills."""
    lang = st.session_state.language

    # Initialize outs quiz state
    if 'outs_quiz' not in st.session_state:
        st.session_state.outs_quiz = OutsQuiz()
    if 'outs_question' not in st.session_state:
        st.session_state.outs_question = None
    if 'outs_choices' not in st.session_state:
        st.session_state.outs_choices = None
    if 'outs_show_result' not in st.session_state:
        st.session_state.outs_show_result = False
    if 'outs_score' not in st.session_state:
        st.session_state.outs_score = {"correct": 0, "total": 0}

    quiz = st.session_state.outs_quiz

    # Generate question if needed
    if st.session_state.outs_question is None:
        st.session_state.outs_question = quiz.generate_question()
        st.session_state.outs_choices = quiz.generate_choices(st.session_state.outs_question)
        st.session_state.outs_show_result = False

    question = st.session_state.outs_question
    choices = st.session_state.outs_choices

    # Two-column layout: Cards on left, Choices on right
    col_cards, col_choices = st.columns([3, 2])

    with col_cards:
        # Header with score (left column only)
        score = st.session_state.outs_score
        accuracy = (score["correct"] / score["total"] * 100) if score["total"] > 0 else 0
        st.markdown(f"""
        <div style="
            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
            padding: 6px 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <span style="font-size: 1.1rem; font-weight: bold;">🎯 {t("outs_quiz")}</span>
            <span style="color: #fbbf24; font-size: 0.9rem;">
                {score["correct"]}/{score["total"]} ({accuracy:.0f}%)
            </span>
        </div>
        """, unsafe_allow_html=True)

        # Helper functions
        def fmt_rank(r):
            return "10" if r == "T" else r

        def get_suit_color(suit):
            return {'s': '#1a1a2e', 'h': '#ef4444', 'd': '#3b82f6', 'c': '#22c55e'}.get(suit, '#1a1a2e')

        def get_suit_symbol(suit):
            return {'s': '♠', 'h': '♥', 'd': '♦', 'c': '♣'}.get(suit, suit)

        # Build board cards HTML
        board_cards_html = ""
        for c in question.board:
            color = get_suit_color(c.suit)
            symbol = get_suit_symbol(c.suit)
            board_cards_html += f'''
            <div style="width:42px;height:58px;background:linear-gradient(145deg,#ffffff 0%,#f0f0f0 100%);
                        border-radius:5px;display:flex;flex-direction:column;align-items:center;
                        justify-content:center;color:{color};font-weight:bold;
                        box-shadow:0 2px 6px rgba(0,0,0,0.4);">
                <span style="font-size:18px;line-height:1;">{fmt_rank(c.rank)}</span>
                <span style="font-size:16px;line-height:1;">{symbol}</span>
            </div>
            '''

        # Add empty placeholders
        for _ in range(5 - len(question.board)):
            board_cards_html += '''
            <div style="width:42px;height:58px;background:linear-gradient(145deg,#374151 0%,#1f2937 100%);
                        border-radius:5px;display:flex;align-items:center;justify-content:center;
                        color:#6b7280;font-size:16px;font-weight:bold;
                        box-shadow:0 2px 6px rgba(0,0,0,0.4);border:1px dashed #4b5563;">
                ?
            </div>
            '''

        # Build hole cards HTML
        hole_cards_html = ""
        for c in question.hole_cards:
            color = get_suit_color(c.suit)
            symbol = get_suit_symbol(c.suit)
            hole_cards_html += f'''
            <div style="width:48px;height:66px;background:linear-gradient(145deg,#ffffff 0%,#f0f0f0 100%);
                        border-radius:5px;display:flex;flex-direction:column;align-items:center;
                        justify-content:center;color:{color};font-weight:bold;
                        box-shadow:0 3px 8px rgba(0,0,0,0.5);">
                <span style="font-size:20px;line-height:1;">{fmt_rank(c.rank)}</span>
                <span style="font-size:18px;line-height:1;">{symbol}</span>
            </div>
            '''

        # Hand strength label
        hand_desc = question.result.hand_description_zh if lang == "zh" else question.result.hand_description
        hero_label = "我" if lang == "zh" else "ME"

        # Poker table HTML with board and hero's hand
        table_html = f'''
        <!DOCTYPE html>
        <html>
        <head>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                background: transparent;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }}
            .outs-container {{
                position: relative;
                width: 100%;
                max-width: 340px;
                height: 280px;
                margin: 0 auto;
            }}
            .table {{
                position: absolute;
                width: 95%;
                height: 55%;
                left: 2.5%;
                top: 10%;
                background: linear-gradient(145deg, #1a5f3c 0%, #0d3d25 100%);
                border-radius: 50px;
                border: 6px solid #8B4513;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3);
            }}
            .community-cards {{
                position: absolute;
                top: 35%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                gap: 4px;
            }}
            .hand-strength {{
                position: absolute;
                top: 70%;
                left: 50%;
                transform: translateX(-50%);
                color: #fbbf24;
                font-size: 13px;
                font-weight: bold;
                text-shadow: 0 1px 3px rgba(0,0,0,0.5);
                white-space: nowrap;
            }}
            .hero-area {{
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                flex-direction: column;
                align-items: center;
            }}
            .hero-cards {{
                display: flex;
                gap: 6px;
            }}
            .hero-label {{
                margin-top: 4px;
                font-size: 12px;
                font-weight: bold;
                background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
                color: #000;
                padding: 2px 12px;
                border-radius: 10px;
                box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
            }}
        </style>
        </head>
        <body>
            <div class="outs-container">
                <div class="table">
                    <div class="community-cards">
                        {board_cards_html}
                    </div>
                    <div class="hand-strength">{hand_desc}</div>
                </div>
                <div class="hero-area">
                    <div class="hero-cards">
                        {hole_cards_html}
                    </div>
                    <div class="hero-label">{hero_label}</div>
                </div>
            </div>
        </body>
        </html>
        '''
        components.html(table_html, height=290)

    with col_choices:
        if not st.session_state.outs_show_result:
            # Question prompt
            st.markdown(f"""
            <div style="text-align: center; margin: 10px 0 15px 0; font-size: 1rem; color: #94a3b8;">
                {t("outs_question")}
            </div>
            """, unsafe_allow_html=True)

            # Display choices as buttons
            for i, choice in enumerate(choices):
                if st.button(f"{choice} outs", key=f"outs_choice_{i}", use_container_width=True):
                    st.session_state.outs_show_result = True
                    st.session_state.outs_selected = choice
                    st.session_state.outs_score["total"] += 1
                    if choice == question.result.total_outs:
                        st.session_state.outs_score["correct"] += 1
                    st.rerun()
        else:
            # Show result
            selected = st.session_state.outs_selected
            is_correct = selected == question.result.total_outs

            if is_correct:
                result_class = "correct-answer"
                result_icon = "✅"
                result_text = t("outs_correct")
            else:
                result_class = "wrong-answer"
                result_icon = "❌"
                result_text = t("outs_incorrect")

            # Draw type translations
            draw_names = {
                "flush_draw": ("同花聽牌", "Flush Draw"),
                "oesd": ("兩頭順子 (OESD)", "Open-Ended Straight"),
                "gutshot": ("卡順", "Gutshot"),
                "double_gutshot": ("雙卡順", "Double Gutshot"),
                "overcards": ("兩張高牌", "Two Overcards"),
                "one_overcard": ("一張高牌", "One Overcard"),
                "set_draw": ("聽暗三", "Set Draw"),
                "two_pair_draw": ("聽兩對", "Two Pair Draw"),
                "combo_draw": ("組合聽牌", "Combo Draw"),
            }

            # Helper to format rank (T -> 10)
            def fmt_rank(r):
                return "10" if r == "T" else r

            # 4-color deck for outs display
            def get_suit_color(suit):
                colors = {'s': '#94a3b8', 'h': '#ef4444', 'd': '#3b82f6', 'c': '#22c55e'}
                return colors.get(suit, '#94a3b8')

            # Build draws breakdown with specific out cards (4-color)
            draws_breakdown = ""
            for draw_item in question.result.draws:
                # Handle both old format (2 elements) and new format (3 elements)
                if len(draw_item) == 3:
                    draw_type, outs_count, out_cards_list = draw_item
                else:
                    draw_type, outs_count = draw_item
                    out_cards_list = []
                name = draw_names.get(draw_type.value, (draw_type.value, draw_type.value))
                draw_name = name[0] if lang == "zh" else name[1]
                # Format specific out cards with 4-color
                if out_cards_list:
                    cards_str = " ".join([f'<span style="color:{get_suit_color(c.suit)};font-weight:bold;">{fmt_rank(c.rank)}{SUIT_SYMBOLS[c.suit]}</span>' for c in out_cards_list])
                    draws_breakdown += f'<div style="padding:4px 0;border-bottom:1px solid #1e293b;"><div style="display:flex;justify-content:space-between;"><span>{draw_name}</span><span style="color:#fbbf24;font-weight:bold;">{outs_count} outs</span></div><div style="font-size:0.85rem;margin-top:3px;">{cards_str}</div></div>'
                else:
                    draws_breakdown += f'<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>{draw_name}</span><span style="color:#fbbf24;font-weight:bold;">{outs_count} outs</span></div>'

            if not draws_breakdown:
                draws_breakdown = '<span style="color:#94a3b8;">無特殊聽牌</span>'

            # Calculate remaining cards for probability explanation
            remaining_cards = 52 - len(question.board) - 2  # board + 2 hole cards
            total_outs = question.result.total_outs

            # Probability calculation explanation
            if lang == "zh":
                calc_label = "計算方式"
                turn_calc = f"{total_outs} ÷ {remaining_cards} = {question.result.turn_probability}%"
                river_calc = f"Rule of 4: {total_outs} × 4 ≈ {total_outs * 4}%"
            else:
                calc_label = "Calculation"
                turn_calc = f"{total_outs} ÷ {remaining_cards} = {question.result.turn_probability}%"
                river_calc = f"Rule of 4: {total_outs} × 4 ≈ {total_outs * 4}%"

            st.markdown(f'''<div class="{result_class}"><div style="font-size:1.2rem;font-weight:bold;margin-bottom:8px;">{result_icon} {result_text}</div><div style="background:#0f172a;padding:8px;border-radius:6px;margin:8px 0;"><div style="font-weight:bold;color:#e2e8f0;margin-bottom:4px;">📊 Outs 分解</div>{draws_breakdown}<div style="border-top:1px solid #374151;margin-top:6px;padding-top:6px;font-weight:bold;display:flex;justify-content:space-between;"><span>總計</span><span style="color:#22c55e;font-size:1.1rem;">{total_outs} outs</span></div></div><div style="background:#0f172a;padding:8px;border-radius:6px;margin:8px 0;font-size:0.85rem;"><div style="font-weight:bold;color:#e2e8f0;margin-bottom:4px;">🧮 {calc_label}</div><div style="color:#94a3b8;">轉牌: {turn_calc}</div><div style="color:#94a3b8;">河牌前: {river_calc} (實際 {question.result.river_probability}%)</div></div></div>''', unsafe_allow_html=True)

            # Next button
            st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)
            if st.button(t("outs_next"), key="outs_next", use_container_width=True):
                st.session_state.outs_question = quiz.generate_question()
                st.session_state.outs_choices = quiz.generate_choices(st.session_state.outs_question)
                st.session_state.outs_show_result = False
                st.rerun()


if __name__ == "__main__":
    main()
