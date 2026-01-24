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
from trainer.drill import PreflopDrill, Spot, get_drillable_hands, get_drillable_hands_for_scenario
from trainer.tips import format_relevant_range_tip, get_hand_category_tip, RFI_RANGE_TIPS, format_rfi_tip, RANGE_MNEMONICS
from core.equity import EquityQuiz, EquityQuestion
from core.ev_quiz import EVQuiz, EVQuestion
from core.outs import OutsQuiz, OutsQuestion, Card
from core.postflop import PostflopDrill, PostflopSpot, PostflopAction, PostflopResult, TEXTURE_NAMES, HeroCard
from trainer.session import TrainingSession, ProgressTracker
from trainer.logic_quiz import LogicQuizEngine, LogicQuestion
from ui.components.range_grid import display_range_grid
from ui.components.table_visual import display_table, display_postflop_table
from ui.components.card_display import display_hand_cards
from ui.components.action_flow import display_action_flow, RAISE_SIZES
from ui.components.storage import save_progress_to_storage, load_progress_from_storage, init_storage_sync
from ui.components.rfi_chart import display_rfi_charts
from ui.components.push_fold_chart import display_push_fold_chart, display_push_fold_comparison, display_push_fold_drill
from ui.components.hand_review import display_hand_review_page
from ui.components.hand_analysis import display_hand_analysis_page
# Achievements system removed for simplification

# Page URL mappings
PAGE_KEYS = ["drill", "range", "pushfold", "review", "analysis", "postflop", "equity", "outs", "ev", "logic", "learning", "stats"]
PAGE_NAMES = ["Drill Mode", "Range Viewer", "Push/Fold", "Hand Review", "Hand Analysis", "Postflop", "Equity Quiz", "Outs Quiz", "EV Quiz", "Logic Quiz", "Learning", "Statistics"]

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

    # Read page from URL query params
    query_params = st.query_params
    url_page = query_params.get("page", "drill")
    initial_nav = PAGE_KEYS.index(url_page) if url_page in PAGE_KEYS else 0

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
    if 'nav' not in st.session_state:
        st.session_state.nav = initial_nav

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

    # 認真模式 (Serious Mode) - comprehensive drill
    if 'serious_mode' not in st.session_state:
        st.session_state.serious_mode = False
    if 'serious_spots' not in st.session_state:
        st.session_state.serious_spots = []  # All spots to go through
    if 'serious_index' not in st.session_state:
        st.session_state.serious_index = 0  # Current position
    if 'serious_wrong' not in st.session_state:
        st.session_state.serious_wrong = []  # Wrong answers to review
    if 'serious_phase' not in st.session_state:
        st.session_state.serious_phase = "main"  # "main" or "review"

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
        "push_fold": "MTT 短碼",
        "hand_review": "手牌回顧",
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
        "acceptable": "可接受",
        "acceptable_hint": "混合策略，這個選擇也是對的",
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
        "ev_quiz": "EV 測驗",
        "logic_quiz": "邏輯測驗",
        "hand_analysis": "手牌分析",
        "ev_question": "河牌圈是否跟注？",
        "ev_pot": "底池",
        "ev_bet": "對手下注",
        "ev_equity": "你的勝率",
        "ev_call": "跟注",
        "ev_fold": "棄牌",
        "ev_correct": "正確！",
        "ev_incorrect": "錯了",
        "ev_explanation": "解析",
        "ev_pot_odds": "底池賠率",
        "ev_next": "下一題 →",
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
        "push_fold": "MTT Short Stack",
        "hand_review": "Hand Review",
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
        "acceptable": "Acceptable",
        "acceptable_hint": "Mixed strategy, your choice is also valid",
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
        "ev_quiz": "EV Quiz",
        "logic_quiz": "Logic Quiz",
        "hand_analysis": "Hand Analysis",
        "ev_question": "River: Call or Fold?",
        "ev_pot": "Pot",
        "ev_bet": "Opponent bets",
        "ev_equity": "Your equity",
        "ev_call": "Call",
        "ev_fold": "Fold",
        "ev_correct": "Correct!",
        "ev_incorrect": "Wrong",
        "ev_explanation": "Explanation",
        "ev_pot_odds": "Pot Odds",
        "ev_next": "Next →",
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
            # SB raises 3.5bb, others 2.5bb
            if scenario.hero_position == Position.SB:
                return "RAISE 3.5bb"
            return "RAISE 2.5bb"
        elif action == "call":
            # SB limp (complete the blind)
            return "LIMP 0.5bb" if lang == "zh" else "LIMP 0.5bb"

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
        nav_options = [t("drill_mode"), t("range_viewer"), t("push_fold"), t("hand_review"), t("hand_analysis"), t("postflop"), t("equity_quiz"), t("outs_quiz"), t("ev_quiz"), t("logic_quiz"), t("learning"), t("statistics")]
        page_idx = st.radio(
            "Navigate",
            options=range(len(nav_options)),
            format_func=lambda i: nav_options[i],
            key="nav",
            label_visibility="collapsed",
        )
        page = PAGE_NAMES[page_idx]

        # Update URL when page changes
        current_url_page = st.query_params.get("page", "drill")
        new_url_page = PAGE_KEYS[page_idx]
        if current_url_page != new_url_page:
            st.query_params["page"] = new_url_page

        # Drill settings (collapsed by default)
        if page == "Drill Mode":
            # Initialize persistent drill settings in session state
            if 'drill_action_types' not in st.session_state:
                st.session_state.drill_action_types = ["RFI"]  # Default to RFI only for beginners
            if 'drill_positions' not in st.session_state:
                st.session_state.drill_positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]

            # Advanced settings in expander (collapsed by default)
            adv_label = "⚙️ 進階設定" if st.session_state.language == "zh" else "⚙️ Advanced Settings"
            with st.expander(adv_label, expanded=False):
                # Action types - all scenarios available for 6-max
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

                # Positions for 6-max
                pos_options = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]

                # Filter saved positions to valid ones
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

            # 認真模式 toggle (only for RFI)
            st.markdown("---")
            if "RFI" in st.session_state.drill_action_types:
                serious_label = "🎯 認真模式" if st.session_state.language == "zh" else "🎯 Serious Mode"
                serious_help = "跑完所有位置的所有出題範圍，錯題重複直到全對" if st.session_state.language == "zh" else "Go through all drillable hands for all positions, repeat wrong answers until all correct"

                new_serious = st.checkbox(serious_label, value=st.session_state.serious_mode, help=serious_help)

                # If toggling serious mode
                if new_serious != st.session_state.serious_mode:
                    st.session_state.serious_mode = new_serious
                    if new_serious:
                        # Starting serious mode - generate all spots
                        st.session_state.serious_spots = st.session_state.drill.generate_comprehensive_rfi_spots()
                        st.session_state.serious_index = 0
                        st.session_state.serious_wrong = []
                        st.session_state.serious_phase = "main"
                        st.session_state.current_spot = None
                    else:
                        # Exiting serious mode
                        st.session_state.serious_spots = []
                        st.session_state.serious_index = 0
                        st.session_state.serious_wrong = []
                        st.session_state.current_spot = None
                    st.rerun()

                # Show progress if in serious mode
                if st.session_state.serious_mode and st.session_state.serious_spots:
                    total = len(st.session_state.serious_spots)
                    current = st.session_state.serious_index
                    wrong_count = len(st.session_state.serious_wrong)
                    phase = st.session_state.serious_phase

                    if phase == "main":
                        progress_text = f"進度：{current}/{total}" if st.session_state.language == "zh" else f"Progress: {current}/{total}"
                        if wrong_count > 0:
                            progress_text += f" (❌ {wrong_count})"
                    else:
                        review_total = len(st.session_state.serious_wrong)
                        progress_text = f"複習錯題：{current}/{review_total}" if st.session_state.language == "zh" else f"Review: {current}/{review_total}"

                    st.caption(progress_text)
                    st.progress(current / total if total > 0 else 0)

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
    elif page == "Push/Fold":
        push_fold_page()
    elif page == "Hand Review":
        hand_review_page()
    elif page == "Hand Analysis":
        display_hand_analysis_page()
    elif page == "Postflop":
        postflop_page()
    elif page == "Equity Quiz":
        equity_quiz_page()
    elif page == "Outs Quiz":
        outs_quiz_page()
    elif page == "EV Quiz":
        ev_quiz_page()
    elif page == "Logic Quiz":
        logic_quiz_page()
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
        if st.session_state.serious_mode:
            # 認真模式：從預生成的題庫中取題
            spots = st.session_state.serious_spots
            idx = st.session_state.serious_index
            phase = st.session_state.serious_phase

            if phase == "main":
                if idx < len(spots):
                    st.session_state.current_spot = spots[idx]
                else:
                    # 主階段完成，檢查是否有錯題
                    if st.session_state.serious_wrong:
                        # 進入複習階段
                        st.session_state.serious_phase = "review"
                        st.session_state.serious_spots = st.session_state.serious_wrong.copy()
                        st.session_state.serious_wrong = []
                        st.session_state.serious_index = 0
                        import random
                        random.shuffle(st.session_state.serious_spots)
                        st.session_state.current_spot = st.session_state.serious_spots[0]
                    else:
                        # 全部完成！
                        st.session_state.current_spot = None
            elif phase == "review":
                if idx < len(spots):
                    st.session_state.current_spot = spots[idx]
                else:
                    # 複習階段完成，檢查是否還有錯題
                    if st.session_state.serious_wrong:
                        # 繼續複習
                        st.session_state.serious_spots = st.session_state.serious_wrong.copy()
                        st.session_state.serious_wrong = []
                        st.session_state.serious_index = 0
                        import random
                        random.shuffle(st.session_state.serious_spots)
                        st.session_state.current_spot = st.session_state.serious_spots[0]
                    else:
                        # 全部完成！
                        st.session_state.current_spot = None
        else:
            # 一般模式：隨機生成
            st.session_state.current_spot = st.session_state.drill.generate_spot()
        st.session_state.show_result = False

    spot = st.session_state.current_spot

    # 認真模式完成提示
    if st.session_state.serious_mode and spot is None:
        st.balloons()
        complete_msg = "🎉 認真模式完成！所有題目都答對了！" if lang == "zh" else "🎉 Serious Mode Complete! All questions answered correctly!"
        st.success(complete_msg)

        # Reset button
        reset_label = "重新開始" if lang == "zh" else "Start Over"
        if st.button(reset_label, type="primary"):
            st.session_state.serious_spots = st.session_state.drill.generate_comprehensive_rfi_spots()
            st.session_state.serious_index = 0
            st.session_state.serious_wrong = []
            st.session_state.serious_phase = "main"
            st.session_state.current_spot = None
            st.rerun()
        return

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
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 6px 12px; border-radius: 6px; border-left: 3px solid #fbbf24; margin: -1rem 0 4px 0;">
        <span style="font-size: 1rem; font-weight: bold; color: #fbbf24;">🎯 {scenario_text} <span style="color: #94a3b8; font-weight: normal; font-size: 0.9rem;">| {spot.scenario.hero_position.value}</span></span>
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
            villain_size = RAISE_SIZES.get(spot.scenario.villain_position.value, 2.5)
            villain_action = f"Raises {villain_size}bb"
            bets = {spot.scenario.villain_position: f"{villain_size}bb"}
            # In VS_RFI: show as heads-up (everyone except hero and villain has folded)
            # SB/BB should be gray when folded, not blue
            for pos in [Position.UTG, Position.HJ, Position.CO, Position.BTN, Position.SB, Position.BB]:
                if pos != spot.scenario.hero_position and pos != spot.scenario.villain_position:
                    folded_positions.append(pos)
        elif spot.scenario.action_type == ActionType.VS_3BET:
            hero_size = RAISE_SIZES.get(spot.scenario.hero_position.value, 2.5)
            villain_action = "3-Bets"
            bets = {spot.scenario.hero_position: f"{hero_size}bb", spot.scenario.villain_position: "8bb"}
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

    # Generate cards HTML (used in both col_right and buttons section)
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

    # Build cards HTML - centered and larger
    cards_html = f'''
    <div style="display:flex;justify-content:center;gap:6px;align-items:center;">
        <div style="width:55px;height:78px;background:linear-gradient(145deg,#fff 0%,#f0f0f0 100%);border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:{c1};font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(-3deg);">
            <span style="font-size:22px;">{r1}</span><span style="font-size:18px;">{sym1}</span>
        </div>
        <div style="width:55px;height:78px;background:linear-gradient(145deg,#fff 0%,#f0f0f0 100%);border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:{c2};font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(3deg);margin-left:-8px;">
            <span style="font-size:22px;">{r2}</span><span style="font-size:18px;">{sym2}</span>
        </div>
    </div>
    <div style="text-align:center;color:#fbbf24;font-size:0.85rem;margin-top:6px;">{t('your_hand')} <span style="color:#94a3b8;">({str(hand)})</span></div>
    '''

    with col_right:
        # Show cards in right column
        st.markdown(cards_html, unsafe_allow_html=True)

        if st.session_state.show_result:
            # Show result feedback
            result = st.session_state.last_result
            explanation = result.explanation_zh if st.session_state.language == "zh" else result.explanation
            next_label = t('next_hand')

            # Next hand button FIRST (above feedback)
            if st.button(next_label, use_container_width=True, type="primary"):
                # 認真模式：追蹤錯題並推進索引
                if st.session_state.serious_mode:
                    if not result.is_correct:
                        st.session_state.serious_wrong.append(spot)
                    st.session_state.serious_index += 1

                st.session_state.current_spot = None
                st.session_state.show_result = False
                st.rerun()

            # Then show feedback with prominent GTO frequency display
            # Build frequency badge
            freq_badge = ""
            if result.frequency > 0 or result.player_action_frequency > 0:
                freq_parts = []
                if result.correct_action.lower() in ['raise', '3bet', '4bet', '5bet']:
                    action_name = result.correct_action.upper()
                    freq_parts.append(f"{action_name}: {result.frequency}%")
                elif result.correct_action.lower() == 'call':
                    freq_parts.append(f"CALL: {result.frequency}%")
                elif result.correct_action.lower() == 'fold':
                    freq_parts.append(f"FOLD: {result.frequency}%")

                if result.player_action.lower() != result.correct_action.lower() and result.player_action_frequency > 0:
                    player_action_name = result.player_action.upper()
                    freq_parts.append(f"{player_action_name}: {result.player_action_frequency}%")

                freq_badge = f'<div style="background: #1e3a5f; padding: 6px 10px; border-radius: 6px; margin-top: 6px; font-size: 0.9rem;"><span style="color: #60a5fa; font-weight: bold;">📊 GTO:</span> <span style="color: #fbbf24;">{" | ".join(freq_parts)}</span></div>'

            if result.is_correct:
                # ✅ 完全正確 (100% 動作或主要動作)
                st.markdown(f"""
                <div style="background: #065f46; padding: 8px 10px; border-radius: 8px; border-left: 4px solid #10b981; margin: 6px 0;">
                    <span style="color: #10b981; font-weight: bold; font-size: 0.95rem;">✅ {t('correct_answer')}</span>
                    {freq_badge}
                </div>
                """, unsafe_allow_html=True)
            elif result.is_acceptable:
                # 🟡 可接受 (混合策略，你的選擇也有正頻率)
                st.markdown(f"""
                <div style="background: #854d0e; padding: 8px 10px; border-radius: 8px; border-left: 4px solid #fbbf24; margin: 6px 0;">
                    <span style="color: #fbbf24; font-weight: bold; font-size: 0.95rem;">🟡 {t('acceptable')}</span>
                    <div style="font-size: 0.85rem; margin-top: 3px; color: #fef3c7;">{t('acceptable_hint')}</div>
                    <div style="font-size: 0.85rem; margin-top: 3px;">{t('your_action')}: <b>{result.player_action.upper()}</b> ({result.player_action_frequency}%) | 主要: <b>{result.correct_action.upper()}</b> ({result.frequency}%)</div>
                    {freq_badge}
                </div>
                """, unsafe_allow_html=True)
            else:
                # ❌ 錯誤 (0% 動作)
                st.markdown(f"""
                <div style="background: #7f1d1d; padding: 8px 10px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 6px 0;">
                    <span style="color: #ef4444; font-weight: bold; font-size: 0.95rem;">❌ {t('incorrect')}</span>
                    <div style="font-size: 0.85rem; margin-top: 3px;">{t('your_action')}: <b>{result.player_action.upper()}</b> → {t('correct_action')}: <b>{result.correct_action.upper()}</b></div>
                    {freq_badge}
                </div>
                """, unsafe_allow_html=True)

                # Show RFI position tip on error
                if spot.scenario.action_type == ActionType.RFI:
                    position_name = spot.scenario.hero_position.value
                    hand_str = str(spot.hand)

                    # Get hand-specific tip
                    hand_tip = get_hand_category_tip(
                        hand_str,
                        position_name,
                        result.correct_action,
                        st.session_state.language
                    )

                    # Get relevant range tip (only the category for this hand)
                    range_tip = format_relevant_range_tip(hand_str, position_name, st.session_state.language)

                    if hand_tip or range_tip:
                        st.markdown(f"""
                        <div style="background: #1e3a5f; padding: 10px 12px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 8px 0; font-size: 0.85rem; line-height: 1.5;">
                            <div style="color: #93c5fd; margin-bottom: 6px;">🎯 {hand_tip}</div>
                            <div style="color: #cbd5e1;">{range_tip}</div>
                        </div>
                        """, unsafe_allow_html=True)

            # Show equity breakdown for vs 4-bet scenarios
            if spot.scenario.action_type == ActionType.VS_4BET:
                equity_html = get_equity_breakdown_html(str(spot.hand), st.session_state.language)
                if equity_html:
                    st.markdown(equity_html, unsafe_allow_html=True)

    # Action buttons - force horizontal on all screen sizes with CSS override
    if not st.session_state.show_result:
        actions = spot.scenario.available_actions

        def handle_action(action):
            result = st.session_state.drill.check_answer(spot, action)
            session.add_result(spot, action, result)
            st.session_state.last_result = result
            st.session_state.show_result = True

            # Update streak (correct OR acceptable = no break)
            is_not_wrong = result.is_correct or result.is_acceptable
            if is_not_wrong:
                st.session_state.current_streak += 1
                if st.session_state.current_streak > st.session_state.best_streak:
                    st.session_state.best_streak = st.session_state.current_streak
            else:
                st.session_state.current_streak = 0

            # Save progress to localStorage
            # Track: correct (100%), acceptable (mixed), and total
            progress = {
                'best_streak': st.session_state.best_streak,
                'total_hands_all_time': st.session_state.get('total_hands_all_time', 0) + 1,
                'total_correct_all_time': st.session_state.get('total_correct_all_time', 0) + (1 if result.is_correct else 0),
                'total_acceptable_all_time': st.session_state.get('total_acceptable_all_time', 0) + (1 if result.is_acceptable and not result.is_correct else 0),
            }
            save_progress_to_storage(progress)
            st.rerun()

        # CSS to force columns to stay horizontal on mobile
        st.markdown("""
        <style>
        [data-testid="stHorizontalBlock"]:has(button) {
            flex-wrap: nowrap !important;
            gap: 0.5rem !important;
        }
        [data-testid="stHorizontalBlock"]:has(button) > div {
            flex: 1 1 0 !important;
            min-width: 0 !important;
        }
        </style>
        """, unsafe_allow_html=True)

        # Horizontal button layout - 2 columns side by side
        if len(actions) == 2:
            btn_cols = st.columns(2)
            with btn_cols[0]:
                btn_label = get_action_label(actions[0], spot.scenario, st.session_state.language)
                if st.button(btn_label, key=f"action_{actions[0]}", use_container_width=True,
                             type="primary" if actions[0] in ["raise", "3bet", "4bet", "5bet"] else "secondary"):
                    handle_action(actions[0])
            with btn_cols[1]:
                btn_label = get_action_label(actions[1], spot.scenario, st.session_state.language)
                if st.button(btn_label, key=f"action_{actions[1]}", use_container_width=True,
                             type="secondary"):
                    handle_action(actions[1])
        elif len(actions) == 3:
            # Row 1: first two actions side by side
            btn_cols = st.columns(2)
            with btn_cols[0]:
                btn_label = get_action_label(actions[0], spot.scenario, st.session_state.language)
                if st.button(btn_label, key=f"action_{actions[0]}", use_container_width=True,
                             type="primary" if actions[0] in ["raise", "3bet", "4bet", "5bet"] else "secondary"):
                    handle_action(actions[0])
            with btn_cols[1]:
                btn_label = get_action_label(actions[1], spot.scenario, st.session_state.language)
                if st.button(btn_label, key=f"action_{actions[1]}", use_container_width=True,
                             type="secondary"):
                    handle_action(actions[1])
            # Row 2: third action (full width)
            btn_label = get_action_label(actions[2], spot.scenario, st.session_state.language)
            if st.button(btn_label, key=f"action_{actions[2]}", use_container_width=True,
                         type="secondary"):
                handle_action(actions[2])
        else:
            # Fallback for any other number of actions (2 per row)
            btn_cols = st.columns(2)
            for idx, action in enumerate(actions):
                with btn_cols[idx % 2]:
                    btn_label = get_action_label(action, spot.scenario, st.session_state.language)
                    if st.button(btn_label, key=f"action_{action}", use_container_width=True,
                                 type="primary" if action in ["raise", "3bet", "4bet", "5bet"] else "secondary"):
                        handle_action(action)

    # Show range below with stats - no title needed
    if st.session_state.show_result:
        # Stats line next to range (moved from header)
        stats_html = f"<div style='color:#94a3b8;font-size:0.75rem;margin:4px 0;'>📊 {session.total_spots} · ✅ {session.correct_count} · <span style='color:{accuracy_color};'>{session.accuracy_percent}</span> · <span style='color:{streak_color};'>🔥{streak}</span></div>"
        st.markdown(stats_html, unsafe_allow_html=True)

        range_data = st.session_state.drill.get_range_for_spot(spot)
        raise_key = next((k for k in ["raise", "3bet", "4bet", "5bet"] if k in range_data), None)
        raise_hands = range_data.get(raise_key, []) if raise_key else []
        call_hands = range_data.get("call", [])
        drillable_hands = st.session_state.drill.get_drillable_hands_for_spot(spot)

        # Get frequency data for current scenario
        frequencies = {}
        try:
            evaluator = Evaluator()
            frequencies = evaluator.get_frequencies_for_scenario(spot.scenario, format="6max")
        except (AttributeError, Exception):
            frequencies = {}

        display_range_grid(
            raise_hands=raise_hands,
            call_hands=call_hands,
            highlight_hand=str(spot.hand),
            drillable_hands=drillable_hands,
            frequencies=frequencies,
            key="drill_grid",
        )


def viewer_page():
    """Range viewer page - optimized layout with visual table."""
    evaluator = Evaluator()
    table_format = st.session_state.table_format
    lang = st.session_state.language

    # Get positions for 6-max
    position_options = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]

    # Initialize viewer session state
    if "viewer_action_type" not in st.session_state:
        st.session_state.viewer_action_type = "RFI"
    if "viewer_hero_pos" not in st.session_state:
        st.session_state.viewer_hero_pos = "BTN"
    if "viewer_villain_pos" not in st.session_state:
        st.session_state.viewer_villain_pos = None

    # CSS to force all columns on this page to stay horizontal on mobile
    st.markdown("""
    <style>
    /* Force all button columns to stay horizontal on mobile */
    [data-testid="stHorizontalBlock"]:has(button) {
        flex-wrap: nowrap !important;
        gap: 0.25rem !important;
    }
    [data-testid="stHorizontalBlock"]:has(button) > div {
        flex: 1 1 0 !important;
        min-width: 0 !important;
    }
    /* Smaller button padding on mobile */
    @media (max-width: 640px) {
        [data-testid="stHorizontalBlock"]:has(button) button {
            padding: 0.4rem 0.3rem !important;
            font-size: 0.75rem !important;
        }
    }
    </style>
    """, unsafe_allow_html=True)

    # Compact header (full width)
    if lang == "zh":
        context_info = "📊 NL50 · 100bb · 開池 2-2.5bb (SB 3bb)"
    else:
        context_info = "📊 NL50 · 100bb · Open 2-2.5bb (SB 3bb)"

    st.markdown(f"""
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; margin-bottom: 4px;">
        <span style="font-size: 1.2rem; font-weight: bold;">{t('range_viewer')}</span>
        <span style="color: #94a3b8; font-size: 0.8rem;">{context_info}</span>
    </div>
    """, unsafe_allow_html=True)

    # Scenario type selector
    action_types = ["RFI", "vs Open", "vs 3-Bet", "vs 4-Bet"]

    if "viewer_selected_tab" not in st.session_state:
        st.session_state.viewer_selected_tab = 0

    # Create 3-column (or 4-column for 6-max) scenario buttons - single row
    num_actions = len(action_types)
    tab_cols = st.columns(num_actions)
    for idx, tab_name in enumerate(action_types):
        with tab_cols[idx]:
            is_selected = st.session_state.viewer_selected_tab == idx
            btn_type = "primary" if is_selected else "secondary"
            if st.button(tab_name, key=f"viewer_tab_{idx}", use_container_width=True, type=btn_type):
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

    # Determine villain position first (needed for table display)
    villain_pos = None
    villains = []
    if action_type != "RFI":
        hero_idx = position_options.index(hero_pos) if hero_pos in position_options else 0
        if action_type == "vs Open":
            villains = position_options[:hero_idx]
        elif action_type == "vs 3-Bet":
            villains = position_options[hero_idx + 1:]
        else:  # vs 4-Bet
            villains = position_options[:hero_idx]
        stored_villain = st.session_state.get(f"viewer_villain_{i}")
        villain_pos = stored_villain if stored_villain in villains else (villains[0] if villains else None)

    # Position mapping
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
    folded_positions = []
    all_positions = [Position.UTG, Position.HJ, Position.CO, Position.BTN, Position.SB, Position.BB]

    if action_type == "vs Open" and villain_position:
        villain_size = RAISE_SIZES.get(villain_position.value, 2.5)
        show_action = "Raises"
        bets = {villain_position: f"{villain_size}bb"}
        for pos in all_positions:
            if pos != hero_position and pos != villain_position:
                folded_positions.append(pos)
    elif action_type == "vs 3-Bet" and villain_position:
        hero_size = RAISE_SIZES.get(hero_position.value, 2.5)
        show_action = "3-Bets"
        bets = {hero_position: f"{hero_size}bb", villain_position: "8bb"}
        for pos in all_positions:
            if pos != hero_position and pos != villain_position:
                folded_positions.append(pos)
    elif action_type == "vs 4-Bet" and villain_position:
        show_action = "4-Bets"
        bets = {hero_position: "8bb", villain_position: "20bb"}
        for pos in all_positions:
            if pos != hero_position and pos != villain_position:
                folded_positions.append(pos)

    # Display table (centered, full width)
    display_table(
        hero_position=hero_position,
        villain_position=villain_position,
        show_action=show_action,
        format=table_format,
        bets=bets,
        lang=st.session_state.language,
        folded_positions=folded_positions if folded_positions else None,
    )

    # Position buttons below table
    st.markdown(f"<div style='font-size: 0.85rem; color: #94a3b8; margin-top: 8px;'>{t('your_position')}</div>", unsafe_allow_html=True)

    hero_cols = st.columns(len(valid_positions))
    for j, pos in enumerate(valid_positions):
        with hero_cols[j]:
            is_selected = pos == hero_pos
            if st.button(pos, key=f"hero_{i}_{pos}", use_container_width=True, type="primary" if is_selected else "secondary"):
                st.session_state[f"viewer_hero_{i}"] = pos
                st.rerun()

    # Villain position (if applicable)
    villain_pos_select = villain_pos
    if action_type != "RFI" and villains:
        st.markdown(f"<div style='font-size: 0.85rem; color: #94a3b8; margin-top: 6px;'>{t('opponent_position')}</div>", unsafe_allow_html=True)

        villain_cols = st.columns(len(villains))
        for j, pos in enumerate(villains):
            with villain_cols[j]:
                is_selected = pos == villain_pos_select
                if st.button(pos, key=f"villain_{i}_{pos}", use_container_width=True, type="primary" if is_selected else "secondary"):
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
    range_data = evaluator.get_range_for_scenario(scenario, format=table_format)

    if range_data:
        raise_key = next((k for k in ["raise", "3bet", "4bet", "5bet"] if k in range_data), None)
        raise_hands = range_data.get(raise_key, []) if raise_key else []
        call_hands = range_data.get("call", [])

        # Get drillable hands for visual distinction (動態計算)
        scenario_type_map = {"rfi": "rfi", "vs_open": "vs_rfi", "vs_3_bet": "vs_3bet", "vs_4_bet": "vs_4bet"}
        scenario_type_key = action_type.lower().replace(" ", "_").replace("-", "_")
        scenario_type = scenario_type_map.get(scenario_type_key, "rfi")
        drillable_hands = get_drillable_hands_for_scenario(
            evaluator, table_format, scenario_type,
            hero_position=hero_pos,
            villain_position=final_villain_pos if action_type != "RFI" else None
        )

        # Get frequency data for scenarios
        try:
            frequencies = evaluator.get_frequencies_for_scenario(scenario, format=table_format)
        except AttributeError:
            frequencies = {}  # Fallback if method doesn't exist

        # Display range grid first
        display_range_grid(
            raise_hands=raise_hands,
            call_hands=call_hands,
            show_stats=False,
            drillable_hands=drillable_hands,
            frequencies=frequencies,
            key="viewer_grid",
        )

        # Range statistics (below grid, 2-column layout with custom HTML for mobile)
        total_raise = len(raise_hands)
        total_call = len(call_hands)
        total_combos = 169  # Total unique starting hands
        fold_count = total_combos - total_raise - total_call
        total_play = total_raise + total_call

        # Calculate percentages
        raise_pct = (total_raise / total_combos) * 100 if total_combos > 0 else 0
        call_pct = (total_call / total_combos) * 100 if total_combos > 0 else 0
        fold_pct = (fold_count / total_combos) * 100 if total_combos > 0 else 0
        play_pct = (total_play / total_combos) * 100 if total_combos > 0 else 0

        # 2x2 stats display using HTML to maintain columns on mobile
        action_label = raise_key.upper() if raise_key else "RAISE"
        st.markdown(f"""
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
            <div style="background: #1e293b; padding: 10px; border-radius: 6px; text-align: center;">
                <div style="color: #22c55e; font-size: 1.2rem; font-weight: bold;">{total_raise}</div>
                <div style="color: #94a3b8; font-size: 0.75rem;">{action_label} ~{raise_pct:.1f}%</div>
            </div>
            <div style="background: #1e293b; padding: 10px; border-radius: 6px; text-align: center;">
                <div style="color: #3b82f6; font-size: 1.2rem; font-weight: bold;">{total_call}</div>
                <div style="color: #94a3b8; font-size: 0.75rem;">CALL ~{call_pct:.1f}%</div>
            </div>
            <div style="background: #1e293b; padding: 10px; border-radius: 6px; text-align: center;">
                <div style="color: #6b7280; font-size: 1.2rem; font-weight: bold;">{fold_count}</div>
                <div style="color: #94a3b8; font-size: 0.75rem;">FOLD ~{fold_pct:.1f}%</div>
            </div>
            <div style="background: #1e293b; padding: 10px; border-radius: 6px; text-align: center;">
                <div style="color: #fbbf24; font-size: 1.2rem; font-weight: bold;">{total_play}</div>
                <div style="color: #94a3b8; font-size: 0.75rem;">VPIP ~{play_pct:.1f}%</div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.warning(t("no_data"))


def push_fold_page():
    """MTT Push/Fold chart page with practice mode."""
    lang = st.session_state.language

    # Tabs for chart view and practice mode
    tab_labels = ["📊 圖表", "🎯 練習"] if lang == "zh" else ["📊 Charts", "🎯 Practice"]
    tab1, tab2 = st.tabs(tab_labels)

    with tab1:
        # Main chart
        display_push_fold_chart(lang)

        st.markdown("---")

        # Position comparison
        display_push_fold_comparison(lang)

    with tab2:
        # Practice mode
        display_push_fold_drill(lang)


def hand_review_page():
    """Hand history review and analysis page."""
    lang = st.session_state.language
    display_hand_review_page(lang)


def postflop_page():
    """Postflop C-bet practice page."""
    lang = st.session_state.language

    # CSS to force columns and buttons to stay horizontal on mobile, and align columns at bottom
    st.markdown("""
    <style>
    /* Force button columns to stay horizontal */
    [data-testid="stHorizontalBlock"]:has(button) {
        flex-wrap: nowrap !important;
        gap: 0.3rem !important;
    }
    [data-testid="stHorizontalBlock"]:has(button) > div {
        flex: 1 1 0 !important;
        min-width: 0 !important;
    }
    /* Smaller button padding on mobile */
    @media (max-width: 640px) {
        [data-testid="stHorizontalBlock"]:has(button) button {
            padding: 0.5rem 0.2rem !important;
            font-size: 0.8rem !important;
        }
    }
    /* Align main columns at bottom for postflop page */
    [data-testid="stHorizontalBlock"]:first-of-type {
        align-items: flex-end !important;
    }
    </style>
    """, unsafe_allow_html=True)

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

    # Header section - single column at top
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 8px 14px; border-radius: 8px; border-left: 4px solid #7c3aed; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 1.1rem; font-weight: bold; color: #7c3aed;">🎯 {t("postflop_cbet")}</span>
            <span style="font-size: 0.85rem; color: #94a3b8;">{t('outs_score')} <span style="color: #22c55e; font-weight: bold;">{score_text}</span></span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #e2e8f0; font-size: 0.9rem;">{scenario.preflop}</span>
            <div>
                <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-right: 4px;">{pot_type_label}</span>
                <span style="background: #7c3aed; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">{texture_label}</span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Two-column layout: Table (left) | Hand + Actions (right)
    col_left, col_right = st.columns([1, 1])

    with col_left:
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
        # Hero's hand - cards first, then title below
        cards_parts = []
        for card in hero_cards_display:
            color = get_suit_color(card.suit)
            symbol = get_suit_symbol(card.suit)
            cards_parts.append(f'<div style="width:50px;height:70px;background:linear-gradient(145deg,#fff 0%,#f0f0f0 100%);border-radius:6px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;color:{color};font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.3);margin:2px;"><span style="font-size:20px;">{fmt_rank(card.rank)}</span><span style="font-size:16px;">{symbol}</span></div>')

        cards_html = "".join(cards_parts)
        st.markdown(f'''
        <div style="display:flex;justify-content:center;">{cards_html}</div>
        <div style="display:flex;justify-content:center;align-items:center;gap:6px;margin-top:3px;margin-bottom:5px;">
            <span style="color:#fbbf24;font-size:0.8rem;">{t('your_hand')}</span>
            <span style="color:#94a3b8;font-size:0.75rem;">({str(scenario.hero_hand)})</span>
        </div>
        ''', unsafe_allow_html=True)

        if result is None:
            # Action buttons - 2-column layout
            st.markdown(f"<div style='text-align:center;color:#94a3b8;font-size:0.8rem;margin: 3px 0;'>{t('postflop_action')}</div>", unsafe_allow_html=True)

            # All buttons in 2-column grid
            all_actions = [("check", f"☑️ {t('postflop_check')}", None)] + [(f"bet_{s}", f"💰 {s}%", s) for s in ["25", "33", "50", "66", "75", "100"]]

            for row_start in range(0, len(all_actions), 2):
                row_actions = all_actions[row_start:row_start + 2]
                cols = st.columns(2)
                for col_idx, (key, label, sizing) in enumerate(row_actions):
                    with cols[col_idx]:
                        if st.button(label, key=f"pf_{key}", use_container_width=True):
                            if sizing is None:
                                result = drill.check_answer(spot, PostflopAction.CHECK, None, lang)
                            else:
                                result = drill.check_answer(spot, PostflopAction.BET, sizing, lang)
                            st.session_state.postflop_result = result
                            st.session_state.postflop_score["total"] += 1
                            if result.is_correct:
                                st.session_state.postflop_score["correct"] += 1
                            st.rerun()
        else:
            # Show result in right column
            action_label = t("postflop_check") if result.correct_action == PostflopAction.CHECK else t("postflop_bet")
            sizing_label = f" {result.correct_sizing}%" if result.correct_sizing else ""

            # Calculate alternative action frequency
            alt_freq = 100 - result.frequency
            if result.correct_action == PostflopAction.CHECK:
                alt_action = t("postflop_bet") if lang == "zh" else "Bet"
            else:
                alt_action = t("postflop_check") if lang == "zh" else "Check"

            # Format frequency display: "Bet 33% (freq 80%) | Check (20%)"
            freq_display = f"{action_label}{sizing_label} <span style='color:#22c55e'>{result.frequency}%</span>"
            if alt_freq > 0:
                freq_display += f" <span style='color:#6b7280'>|</span> {alt_action} <span style='color:#94a3b8'>{alt_freq}%</span>"

            if result.is_correct:
                st.markdown(f"""
                <div style="padding: 10px; background: #065f46; border-radius: 8px; border-left: 4px solid #10b981; margin: 8px 0;">
                    <div style="color: #10b981; font-weight: bold; font-size: 0.95rem;">✅ {t("postflop_correct")}</div>
                    <div style="color: #e2e8f0; font-size: 0.8rem; margin-top: 4px;">GTO: {freq_display}</div>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div style="padding: 10px; background: #7f1d1d; border-radius: 8px; border-left: 4px solid #ef4444; margin: 8px 0;">
                    <div style="color: #ef4444; font-weight: bold; font-size: 0.95rem;">❌ {t("postflop_incorrect")}</div>
                    <div style="color: #e2e8f0; font-size: 0.8rem; margin-top: 4px;">GTO: {freq_display}</div>
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

    # Overall stats using CSS grid (maintains 2-column on mobile)
    st.markdown(f"""
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: #fbbf24; font-size: 1.5rem; font-weight: bold;">{session.total_spots}</div>
            <div style="color: #94a3b8; font-size: 0.8rem;">{t("total_hands")}</div>
        </div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: #22c55e; font-size: 1.5rem; font-weight: bold;">{session.correct_count}</div>
            <div style="color: #94a3b8; font-size: 0.8rem;">{t("correct")}</div>
        </div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: #ef4444; font-size: 1.5rem; font-weight: bold;">{session.incorrect_count}</div>
            <div style="color: #94a3b8; font-size: 0.8rem;">{t("incorrect_count")}</div>
        </div>
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="color: #3b82f6; font-size: 1.5rem; font-weight: bold;">{session.accuracy_percent}</div>
            <div style="color: #94a3b8; font-size: 0.8rem;">{t("accuracy")}</div>
        </div>
    </div>
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 12px;">
        <div style="color: #fbbf24; font-size: 1.8rem; font-weight: bold;">🔥 {st.session_state.best_streak}</div>
        <div style="color: #94a3b8; font-size: 0.8rem;">{t("best_streak")}</div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")

    # Stats by position/action - use CSS grid (maintains 2-column on mobile)
    pos_stats = session.get_stats_by_position()
    action_stats = session.get_stats_by_action_type()

    # Build position stats HTML (no leading whitespace to avoid markdown code block)
    pos_html = ""
    if pos_stats:
        for pos, stats in pos_stats.items():
            acc = stats['accuracy'] * 100
            color = "#10b981" if acc >= 70 else "#f59e0b" if acc >= 50 else "#ef4444"
            pos_html += f'<div style="margin-bottom: 8px;"><div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span style="color: #e2e8f0; font-weight: bold;">{pos}</span><span style="color: {color};">{stats["correct"]}/{stats["total"]} ({acc:.0f}%)</span></div><div style="background: #374151; border-radius: 4px; height: 6px; overflow: hidden;"><div style="background: {color}; width: {acc}%; height: 100%;"></div></div></div>'

    # Build action stats HTML
    action_html = ""
    if action_stats:
        for action_type, stats in action_stats.items():
            acc = stats['accuracy'] * 100
            color = "#10b981" if acc >= 70 else "#f59e0b" if acc >= 50 else "#ef4444"
            action_html += f'<div style="margin-bottom: 8px;"><div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span style="color: #e2e8f0; font-weight: bold;">{action_type.upper()}</span><span style="color: {color};">{stats["correct"]}/{stats["total"]} ({acc:.0f}%)</span></div><div style="background: #374151; border-radius: 4px; height: 6px; overflow: hidden;"><div style="background: {color}; width: {acc}%; height: 100%;"></div></div></div>'

    by_position_label = t("by_position")
    by_action_label = t("by_action_type")

    st.markdown(f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;"><div><div style="color: #f8fafc; font-size: 1rem; font-weight: bold; margin-bottom: 10px;">{by_position_label}</div>{pos_html}</div><div><div style="color: #f8fafc; font-size: 1rem; font-weight: bold; margin-bottom: 10px;">{by_action_label}</div>{action_html}</div></div>', unsafe_allow_html=True)

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
                        villain_size = RAISE_SIZES.get(m.spot.scenario.villain_position.value, 2.5)
                        villain_action = "Raises"
                        bets = {m.spot.scenario.villain_position: f"{villain_size}bb"}
                    elif m.spot.scenario.action_type == ActionType.VS_3BET:
                        hero_size = RAISE_SIZES.get(m.spot.scenario.hero_position.value, 2.5)
                        villain_action = "3-Bets"
                        bets = {m.spot.scenario.hero_position: f"{hero_size}bb", m.spot.scenario.villain_position: "8bb"}
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

                        # 動態計算出題範圍
                        action_type_map = {"rfi": "rfi", "vs_rfi": "vs_rfi", "vs_3bet": "vs_3bet", "vs_4bet": "vs_4bet"}
                        scenario_type = action_type_map.get(m.spot.scenario.action_type.value, "rfi")
                        hero_pos = m.spot.scenario.hero_position.value
                        villain_pos = m.spot.scenario.villain_position.value if m.spot.scenario.villain_position else None
                        drillable_hands = get_drillable_hands_for_scenario(
                            evaluator, st.session_state.table_format, scenario_type,
                            hero_position=hero_pos, villain_position=villain_pos
                        )

                        # Get frequency data for scenarios
                        frequencies = {}
                        try:
                            frequencies = evaluator.get_frequencies_for_scenario(m.spot.scenario, format="6max")
                        except (AttributeError, Exception):
                            frequencies = {}

                        display_range_grid(
                            raise_hands=raise_hands,
                            call_hands=call_hands,
                            highlight_hand=str(m.spot.hand),
                            show_legend=True,
                            show_stats=False,
                            key=f"mistake_range_{m.spot.hand}_{m.spot.scenario.hero_position.value}",
                            drillable_hands=drillable_hands,
                            frequencies=frequencies,
                        )
    else:
        st.success(t("no_mistakes") + " 🎉")


def logic_quiz_page():
    """Logic Quiz page - WHY-layer GTO reasoning questions."""
    lang = st.session_state.language

    # Initialize logic quiz state
    if 'logic_engine' not in st.session_state:
        st.session_state.logic_engine = LogicQuizEngine()
    if 'logic_question' not in st.session_state:
        st.session_state.logic_question = None
    if 'logic_show_result' not in st.session_state:
        st.session_state.logic_show_result = False
    if 'logic_answered_idx' not in st.session_state:
        st.session_state.logic_answered_idx = None
    if 'logic_score' not in st.session_state:
        st.session_state.logic_score = {"correct": 0, "total": 0}
    if 'logic_scenario' not in st.session_state:
        st.session_state.logic_scenario = None

    engine = st.session_state.logic_engine

    # Header with score
    score = st.session_state.logic_score
    accuracy = (score["correct"] / score["total"] * 100) if score["total"] > 0 else 0

    header_title = "🧠 GTO 邏輯測驗" if lang == "zh" else "🧠 GTO Logic Quiz"
    st.markdown(f"""
    <div style="
        background: linear-gradient(135deg, #4a1d96 0%, #1e1b4b 100%);
        padding: 6px 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    ">
        <span style="font-size: 1.1rem; font-weight: bold;">{header_title}</span>
        <span style="color: #a78bfa; font-size: 0.9rem;">
            {score["correct"]}/{score["total"]} ({accuracy:.0f}%)
        </span>
    </div>
    """, unsafe_allow_html=True)

    # Subtitle
    subtitle = "理解 WHY：為什麼 GTO 選擇這個動作？" if lang == "zh" else "Understanding WHY: Why does GTO choose this action?"
    st.caption(subtitle)

    # Scenario selector
    scenarios = engine.get_available_scenarios()
    if not scenarios:
        no_data_msg = "尚無邏輯題目資料。請確認 data/reasoning/ 目錄中有對應的 JSON 檔案。" if lang == "zh" else "No logic quiz data available. Please ensure JSON files exist in data/reasoning/ directory."
        st.warning(no_data_msg)
        return

    # Format scenario names for display
    def format_scenario_name(s):
        parts = s.replace("_", " ").split()
        if len(parts) >= 3 and parts[1].lower() == "vs":
            return f"{parts[0]} vs {parts[2]}"
        return s.replace("_", " ")

    all_label = "全部場景" if lang == "zh" else "All Scenarios"
    scenario_options = [all_label] + [format_scenario_name(s) for s in scenarios]
    scenario_keys = [None] + scenarios

    col_scenario, col_type = st.columns([2, 1])
    with col_scenario:
        scenario_label = "選擇場景" if lang == "zh" else "Scenario"
        selected_idx = st.selectbox(
            scenario_label,
            options=range(len(scenario_options)),
            format_func=lambda i: scenario_options[i],
            key="logic_scenario_select",
        )
        selected_scenario = scenario_keys[selected_idx]

    with col_type:
        type_label = "題型" if lang == "zh" else "Type"
        type_options = ["A+B", "A", "B"] if lang == "zh" else ["A+B", "A", "B"]
        type_descriptions = [
            "混合" if lang == "zh" else "Mixed",
            "角色辨識" if lang == "zh" else "Role ID",
            "比較推理" if lang == "zh" else "Compare",
        ]
        selected_type = st.selectbox(
            type_label,
            options=range(3),
            format_func=lambda i: f"{type_options[i]} ({type_descriptions[i]})",
            key="logic_type_select",
        )

    # Generate question button or auto-generate
    def generate_new_question():
        scenario = selected_scenario
        if scenario is None:
            scenario = None  # random

        if selected_type == 0:  # Mixed
            q = engine.generate_random_question(scenario=scenario)
        elif selected_type == 1:  # Type A only
            if scenario:
                hands = engine.get_scenario_hands(scenario)
                if hands:
                    import random
                    hand = random.choice(hands)
                    q = engine.generate_type_a(scenario, hand)
                else:
                    q = None
            else:
                q = engine.generate_random_question(scenario=None)
        else:  # Type B only
            if scenario:
                q = engine.generate_type_b(scenario)
            else:
                q = engine.generate_random_question(scenario=None)

        st.session_state.logic_question = q
        st.session_state.logic_show_result = False
        st.session_state.logic_answered_idx = None

    if st.session_state.logic_question is None:
        generate_new_question()

    question = st.session_state.logic_question

    if question is None:
        no_q_msg = "無法生成此類型的題目。請嘗試其他場景或題型。" if lang == "zh" else "Cannot generate this question type. Try another scenario or type."
        st.info(no_q_msg)
        next_label = "重新生成" if lang == "zh" else "Regenerate"
        if st.button(next_label, key="logic_regen"):
            generate_new_question()
            st.rerun()
        return

    # Display question info badge
    type_badge = "A 角色辨識" if question.question_type == "A" else "B 比較推理"
    if lang == "en":
        type_badge = "A Role ID" if question.question_type == "A" else "B Comparison"

    badge_color = "#6366f1" if question.question_type == "A" else "#8b5cf6"
    st.markdown(f"""
    <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
        <span style="background: {badge_color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">
            {type_badge}
        </span>
        <span style="background: #374151; color: #d1d5db; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">
            {question.layer}
        </span>
        <span style="background: #1f2937; color: #9ca3af; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">
            {question.hand}
        </span>
    </div>
    """, unsafe_allow_html=True)

    # Display question text
    st.markdown(f"""
    <div style="
        background: #1e293b;
        border: 1px solid #4a1d96;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        font-size: 1.05rem;
        line-height: 1.6;
    ">
        {question.question_text}
    </div>
    """, unsafe_allow_html=True)

    # Display options as buttons
    has_answered = st.session_state.logic_answered_idx is not None

    for i, option in enumerate(question.options):
        if has_answered:
            is_correct = (i == question.correct_index)
            is_selected = (i == st.session_state.logic_answered_idx)

            if is_correct:
                btn_style = "background: #065f46; border: 2px solid #10b981;"
                icon = "✓ "
            elif is_selected and not is_correct:
                btn_style = "background: #7f1d1d; border: 2px solid #ef4444;"
                icon = "✗ "
            else:
                btn_style = "background: #1f2937; border: 1px solid #374151; opacity: 0.6;"
                icon = ""

            st.markdown(f"""
            <div style="{btn_style} padding: 10px 14px; border-radius: 6px; margin-bottom: 6px; font-size: 0.9rem;">
                {icon}{option}
            </div>
            """, unsafe_allow_html=True)
        else:
            if st.button(f"{chr(65+i)}. {option}", key=f"logic_opt_{i}", use_container_width=True):
                st.session_state.logic_answered_idx = i
                st.session_state.logic_show_result = True
                # Update score
                if i == question.correct_index:
                    st.session_state.logic_score["correct"] += 1
                st.session_state.logic_score["total"] += 1
                st.rerun()

    # Show result and explanation
    if st.session_state.logic_show_result:
        is_correct = st.session_state.logic_answered_idx == question.correct_index

        if is_correct:
            result_msg = "正確！" if lang == "zh" else "Correct!"
            st.success(result_msg)
        else:
            result_msg = "錯誤" if lang == "zh" else "Incorrect"
            st.error(result_msg)

        # Explanation
        explain_header = "解說" if lang == "zh" else "Explanation"
        st.markdown(f"**{explain_header}:**")
        st.markdown(f"""
        <div style="
            background: #0f172a;
            border-left: 3px solid #6366f1;
            padding: 12px 16px;
            border-radius: 0 6px 6px 0;
            margin-bottom: 8px;
            font-size: 0.9rem;
            line-height: 1.7;
            white-space: pre-wrap;
        ">
{question.explanation}
        </div>
        """, unsafe_allow_html=True)

        # Related tags
        if question.tags_involved:
            tags_header = "相關原則標籤" if lang == "zh" else "Related Tags"
            tag_names = [engine._get_tag_name(t) for t in question.tags_involved]
            tags_html = " ".join([
                f'<span style="background: #312e81; color: #c4b5fd; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; margin-right: 4px;">{name}</span>'
                for name in tag_names
            ])
            st.markdown(f"**{tags_header}:** {tags_html}", unsafe_allow_html=True)

        # Next question button
        st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)
        next_label = "下一題 →" if lang == "zh" else "Next →"
        if st.button(next_label, key="logic_next", type="primary", use_container_width=True):
            generate_new_question()
            st.rerun()


def learning_page():
    """Learning page - comprehensive poker strategy reference."""
    lang = st.session_state.language

    st.markdown(f'<div class="main-header">📚 {t("learning")}</div>', unsafe_allow_html=True)

    # Tabs for different topics
    if lang == "zh":
        tabs = ["RFI 速記表", "RFI 範圍提示", "📝 記憶訣竅", "權益對抗", "Outs 補牌", "賠率表", "起手牌", "SPR 法則", "翻後策略", "資金管理", "位置價值", "Blocker", "常見錯誤", "EV 計算"]
    else:
        tabs = ["RFI Charts", "RFI Tips", "📝 Mnemonics", "Equity", "Outs", "Pot Odds", "Starting Hands", "SPR", "Post-flop", "Bankroll", "Position", "Blockers", "Mistakes", "EV Calc"]

    tab0, tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9, tab10, tab11, tab12, tab13 = st.tabs(tabs)

    with tab0:
        evaluator = Evaluator()
        display_rfi_charts(evaluator, lang)

    with tab1:
        _display_rfi_tips_learning(lang)

    with tab2:
        _display_range_mnemonics_learning(lang)

    with tab3:
        _display_equity_learning(lang)

    with tab4:
        _display_outs_learning(lang)

    with tab5:
        _display_pot_odds_learning(lang)

    with tab6:
        _display_starting_hands_learning(lang)

    with tab7:
        _display_spr_learning(lang)

    with tab8:
        _display_postflop_learning(lang)

    with tab9:
        _display_bankroll_learning(lang)

    with tab10:
        _display_position_value_learning(lang)

    with tab11:
        _display_blocker_learning(lang)

    with tab12:
        _display_common_mistakes_learning(lang)

    with tab13:
        _display_ev_calculation_learning(lang)


def _display_rfi_tips_learning(lang: str):
    """Display RFI range tips from tips.py - same data source as error feedback."""

    title = "📊 各位置 RFI 開池範圍提示" if lang == "zh" else "📊 RFI Opening Range Tips by Position"
    subtitle = "這些提示也會在錯題時顯示，方便記憶邊界牌" if lang == "zh" else "These tips are also shown on incorrect answers to help memorize edge hands"

    st.markdown(f"### {title}")
    st.caption(subtitle)

    # Position colors matching RFI chart
    pos_colors = {
        "UTG": "#7f1d1d",
        "HJ": "#b91c1c",
        "CO": "#dc2626",
        "BTN": "#ef4444",
        "SB": "#fca5a5",
    }

    for pos in ["UTG", "HJ", "CO", "BTN", "SB"]:
        tip_data = RFI_RANGE_TIPS.get(pos, {})
        if not tip_data:
            continue

        color = pos_colors.get(pos, "#3b82f6")
        range_pct = tip_data.get("range_pct", "")

        # Header with position and percentage
        st.markdown(f"""
        <div style="background: {color}; padding: 10px 15px; border-radius: 8px 8px 0 0; margin-top: 15px;">
            <span style="color: white; font-weight: bold; font-size: 1.1rem;">{pos}</span>
            <span style="color: rgba(255,255,255,0.8); margin-left: 10px;">{range_pct}</span>
        </div>
        """, unsafe_allow_html=True)

        # Content box
        content_html = '<div style="background: #1e293b; padding: 12px 15px; border-radius: 0 0 8px 8px; border: 1px solid #374151; border-top: none;">'

        # Build content rows
        rows = []

        if lang == "zh":
            field_labels = {
                "pairs": "對子",
                "suited_aces": "同花A",
                "suited_kings": "同花K",
                "suited_queens": "同花Q",
                "suited_jacks": "同花J",
                "suited_broadways": "同花百搭",
                "suited_connectors": "同花連張",
                "offsuit_aces": "不同花A",
                "offsuit_broadways": "不同花百搭",
            }
        else:
            field_labels = {
                "pairs": "Pairs",
                "suited_aces": "Suited Aces",
                "suited_kings": "Suited Kings",
                "suited_queens": "Suited Queens",
                "suited_jacks": "Suited Jacks",
                "suited_broadways": "Suited Broadways",
                "suited_connectors": "Suited Connectors",
                "offsuit_aces": "Offsuit Aces",
                "offsuit_broadways": "Offsuit Broadways",
            }

        for field, label in field_labels.items():
            if field in tip_data:
                value = tip_data[field]
                rows.append(f'<div style="display: flex; margin-bottom: 6px;"><span style="color: #94a3b8; min-width: 100px;">{label}:</span><span style="color: #e2e8f0;">{value}</span></div>')

        content_html += "".join(rows)

        # Edge hands highlight
        if "edge_hands" in tip_data and tip_data["edge_hands"]:
            edge_str = ", ".join(tip_data["edge_hands"])
            edge_label = "⚠️ 邊緣牌" if lang == "zh" else "⚠️ Edge Hands"
            content_html += f'<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #374151;"><span style="color: #fbbf24; font-weight: bold;">{edge_label}:</span><span style="color: #fbbf24; margin-left: 8px;">{edge_str}</span></div>'

        # Memory tip
        tip_key = "tip_zh" if lang == "zh" else "tip_en"
        if tip_key in tip_data:
            tip_label = "📝 記憶提示" if lang == "zh" else "📝 Memory Tip"
            content_html += f'<div style="margin-top: 8px; padding: 8px; background: #0f172a; border-radius: 4px;"><span style="color: #60a5fa;">{tip_label}:</span><span style="color: #cbd5e1; margin-left: 8px;">{tip_data[tip_key]}</span></div>'

        content_html += '</div>'
        st.markdown(content_html, unsafe_allow_html=True)

    # Data source note
    st.markdown("---")
    source_note = "💡 資料來源：`trainer/tips.py` - 修改此檔案可同時更新錯題提示和此頁面" if lang == "zh" else "💡 Data source: `trainer/tips.py` - Edit this file to update both error feedback and this page"
    st.caption(source_note)


def _display_range_mnemonics_learning(lang: str):
    """Display range memory mnemonics - quick patterns to remember when to play each hand type."""

    title = "📝 範圍記憶訣竅" if lang == "zh" else "📝 Range Memory Mnemonics"
    subtitle = "快速記住各類手牌從哪個位置開始開池" if lang == "zh" else "Quick patterns to remember when to open each hand type"

    st.markdown(f"### {title}")
    st.caption(subtitle)

    # Hand type colors
    type_colors = {
        "suited_connectors": "#22c55e",
        "suited_gappers": "#10b981",
        "small_pairs": "#f59e0b",
        "suited_aces": "#3b82f6",
        "suited_kings": "#6366f1",
        "suited_queens": "#8b5cf6",
        "offsuit_aces": "#ef4444",
        "offsuit_broadways": "#f97316",
    }

    # Display order
    display_order = [
        "small_pairs",
        "suited_aces",
        "suited_kings",
        "suited_queens",
        "suited_connectors",
        "suited_gappers",
        "offsuit_aces",
        "offsuit_broadways",
    ]

    for hand_type in display_order:
        if hand_type not in RANGE_MNEMONICS:
            continue

        data = RANGE_MNEMONICS[hand_type]
        color = type_colors.get(hand_type, "#64748b")
        title_key = "title_zh" if lang == "zh" else "title_en"
        mnemonic_key = "mnemonic_zh" if lang == "zh" else "mnemonic_en"

        title_text = data.get(title_key, data.get("title_zh", ""))
        mnemonic = data.get(mnemonic_key, data.get("mnemonic_zh", ""))

        # Header with hand type
        st.markdown(f"""
        <div style="background: {color}; padding: 10px 15px; border-radius: 8px 8px 0 0; margin-top: 15px;">
            <span style="color: white; font-weight: bold; font-size: 1.1rem;">{title_text}</span>
        </div>
        """, unsafe_allow_html=True)

        # Content box with mnemonic and patterns
        content_html = '<div style="background: #1e293b; padding: 12px 15px; border-radius: 0 0 8px 8px; border: 1px solid #374151; border-top: none;">'

        # Mnemonic summary
        content_html += f'<div style="background: #0f172a; padding: 10px; border-radius: 6px; margin-bottom: 12px; border-left: 3px solid {color};"><span style="color: #fbbf24; font-weight: bold;">💡 {mnemonic}</span></div>'

        # Pattern details
        for p in data.get("patterns", []):
            note_key = "note_zh" if lang == "zh" else "note_en"
            note = p.get(note_key, p.get("note_zh", ""))
            hands = p["hands"]
            start_pos = p["start_pos"]

            content_html += f'<div style="display: flex; align-items: baseline; padding: 6px 0; border-bottom: 1px solid #374151;"><span style="color: #fbbf24; font-weight: bold; min-width: 80px;">{hands}</span><span style="color: #22c55e; min-width: 120px;">{start_pos}</span><span style="color: #94a3b8; font-size: 0.9rem;">{note}</span></div>'

        content_html += '</div>'
        st.markdown(content_html, unsafe_allow_html=True)

    # Summary section
    st.markdown("---")

    summary_title = "🎯 快速記憶總結" if lang == "zh" else "🎯 Quick Summary"
    st.markdown(f"### {summary_title}")

    if lang == "zh":
        summary_html = '''
<div style="background: #1e293b; padding: 15px; border-radius: 8px;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">🃏 對子</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • 66+ 全場開<br/>
                • 55 UTG 開<br/>
                • 44 HJ 開<br/>
                • 33 BTN 開<br/>
                • 22 SB 開
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">♠️ 同花 Ax</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • A2s-AKs 全場開<br/>
                • 同花 Ax 通吃！
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">🔗 同花連張</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • T9s UTG (75%)<br/>
                • 98s HJ<br/>
                • 87s CO<br/>
                • 65s BTN
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">↔️ 同花隔張</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • 隔張比連張晚一位！<br/>
                • T8s HJ、97s CO<br/>
                • 53s+ SB 開始玩
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">♦️ 同花 Kx</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • K6 UTG、K4 HJ<br/>
                • K3 CO、K2 BTN
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">♣️ 不同花 Ax</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • ATo UTG<br/>
                • A9o HJ<br/>
                • A8o/A5o CO<br/>
                • A4o BTN
            </div>
        </div>
    </div>
</div>
'''
    else:
        summary_html = '''
<div style="background: #1e293b; padding: 15px; border-radius: 8px;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">🃏 Pairs</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • 66+ always<br/>
                • 55 UTG<br/>
                • 44 HJ<br/>
                • 33 BTN<br/>
                • 22 SB
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">♠️ Suited Ax</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • A2s-AKs everywhere<br/>
                • Suited Ax all positions!
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">🔗 Suited Connectors</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • T9s UTG (75%)<br/>
                • 98s HJ<br/>
                • 87s CO<br/>
                • 65s BTN
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">↔️ Suited Gappers</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • Gappers one position later!<br/>
                • T8s HJ, 97s CO<br/>
                • 53s+ starts at SB
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">♦️ Suited Kx</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • K6 UTG, K4 HJ<br/>
                • K3 CO, K2 BTN
            </div>
        </div>
        <div>
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 8px;">♣️ Offsuit Ax</div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
                • ATo UTG<br/>
                • A9o HJ<br/>
                • A8o/A5o CO<br/>
                • A4o BTN
            </div>
        </div>
    </div>
</div>
'''
    st.markdown(summary_html, unsafe_allow_html=True)

    # Data source note
    st.markdown("---")
    source_note = "💡 資料來源：`trainer/tips.py` - RANGE_MNEMONICS" if lang == "zh" else "💡 Data source: `trainer/tips.py` - RANGE_MNEMONICS"
    st.caption(source_note)


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


def _display_pot_odds_learning(lang: str):
    """Display pot odds learning content with visual tables."""

    def odds_card(bet_size: str, pot_odds: str, equity: str, color: str = "#3b82f6"):
        """Generate HTML for a pot odds card."""
        return f'''<div style="background: #1e293b; border-radius: 6px; padding: 10px 15px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid {color};">
            <span style="color: #e2e8f0; font-weight: bold; min-width: 80px;">{bet_size}</span>
            <span style="color: #fbbf24; min-width: 60px;">{pot_odds}</span>
            <span style="background: {color}; color: white; padding: 3px 12px; border-radius: 12px; font-weight: bold;">{equity}</span>
        </div>'''

    def concept_box(title: str, content: str, color: str = "#3b82f6"):
        """Generate HTML for concept explanation box."""
        return f'''<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 4px solid {color};">
            <div style="color: {color}; font-weight: bold; font-size: 1rem; margin-bottom: 6px;">{title}</div>
            <div style="color: #cbd5e1; font-size: 0.9rem;">{content}</div>
        </div>'''

    # Header
    title = "📊 賠率與權益對照表" if lang == "zh" else "📊 Pot Odds vs Required Equity"
    st.markdown(f"**{title}**")

    # Header row
    header_bet = "下注大小" if lang == "zh" else "Bet Size"
    header_odds = "賠率" if lang == "zh" else "Pot Odds"
    header_equity = "所需權益" if lang == "zh" else "Required Equity"

    header_html = f'''<div style="background: #374151; border-radius: 6px; padding: 10px 15px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #e2e8f0; font-weight: bold; min-width: 80px;">{header_bet}</span>
        <span style="color: #e2e8f0; font-weight: bold; min-width: 60px;">{header_odds}</span>
        <span style="color: #e2e8f0; font-weight: bold;">{header_equity}</span>
    </div>'''
    st.markdown(header_html, unsafe_allow_html=True)

    # Pot odds data as cards
    odds_html = ""
    odds_html += odds_card("25% pot", "5:1", "16.7%", "#22c55e")
    odds_html += odds_card("33% pot", "4:1", "20%", "#22c55e")
    odds_html += odds_card("50% pot", "3:1", "25%", "#3b82f6")
    odds_html += odds_card("66% pot", "2.5:1", "28.5%", "#3b82f6")
    odds_html += odds_card("75% pot", "2.3:1", "30%", "#f59e0b")
    odds_html += odds_card("100% pot", "2:1", "33%", "#f59e0b")
    odds_html += odds_card("150% pot", "1.67:1", "37.5%", "#ef4444")
    odds_html += odds_card("200% pot", "1.5:1", "40%", "#ef4444")
    st.markdown(odds_html, unsafe_allow_html=True)

    st.markdown("")  # Spacer

    # Two columns for concepts
    col1, col2 = st.columns(2)

    with col1:
        formula_title = "🧮 計算公式" if lang == "zh" else "🧮 Formula"
        st.markdown(f"**{formula_title}**")

        formula_html = '''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 8px; padding: 15px; margin-bottom: 12px; text-align: center;">
            <div style="color: #fbbf24; font-size: 1.3rem; font-weight: bold; margin-bottom: 8px;">
                所需權益 = 跟注額 ÷ (底池 + 跟注額)
            </div>
            <div style="color: #94a3b8; font-size: 0.85rem;">
                Required Equity = Call ÷ (Pot + Call)
            </div>
        </div>
        '''
        st.markdown(formula_html, unsafe_allow_html=True)

        if lang == "zh":
            st.markdown(concept_box(
                "範例計算",
                "底池 100，對手下注 50 (50% pot)<br/>跟注需要：50 ÷ (100+50+50) = 25%",
                "#22c55e"
            ), unsafe_allow_html=True)
        else:
            st.markdown(concept_box(
                "Example Calculation",
                "Pot is 100, opponent bets 50 (50% pot)<br/>Need to call: 50 ÷ (100+50+50) = 25%",
                "#22c55e"
            ), unsafe_allow_html=True)

    with col2:
        tips_title = "💡 實戰要點" if lang == "zh" else "💡 Key Tips"
        st.markdown(f"**{tips_title}**")

        if lang == "zh":
            tips_html = ""
            tips_html += concept_box("順/同花聽牌", "9 outs ≈ 35% (河牌前) → 可跟 100% pot", "#3b82f6")
            tips_html += concept_box("卡順聽牌", "4 outs ≈ 17% → 只能跟 33% pot 以下", "#f59e0b")
            tips_html += concept_box("隱含賠率", "考慮中牌後還能贏多少，允許跟注略鬆", "#22c55e")
        else:
            tips_html = ""
            tips_html += concept_box("Flush/Straight Draw", "9 outs ≈ 35% (by river) → can call pot-size", "#3b82f6")
            tips_html += concept_box("Gutshot Draw", "4 outs ≈ 17% → only call 33% pot or less", "#f59e0b")
            tips_html += concept_box("Implied Odds", "Consider future winnings, allows looser calls", "#22c55e")
        st.markdown(tips_html, unsafe_allow_html=True)


def _display_starting_hands_learning(lang: str):
    """Display starting hands learning content - trap hands and strategies."""

    def trap_card(hand: str, name: str, problem: str, advice: str, color: str = "#ef4444"):
        """Generate HTML for a trap hand card."""
        return f'''
        <div style="background: #1e293b; border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 4px solid {color};">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="background: {color}; color: white; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 1.1rem;">{hand}</span>
                <span style="color: #e2e8f0; font-weight: bold;">{name}</span>
            </div>
            <div style="color: #fbbf24; font-size: 0.9rem; margin-bottom: 6px;">⚠️ {problem}</div>
            <div style="color: #94a3b8; font-size: 0.85rem;">✅ {advice}</div>
        </div>
        '''

    def strategy_card(title: str, hands: str, strategy: str, icon: str = "🎯", color: str = "#3b82f6"):
        """Generate HTML for strategy card."""
        return f'''
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 1.2rem;">{icon}</span>
                <span style="color: {color}; font-weight: bold; font-size: 1rem;">{title}</span>
            </div>
            <div style="color: #fbbf24; font-size: 0.9rem; margin-bottom: 6px;">{hands}</div>
            <div style="color: #94a3b8; font-size: 0.85rem;">{strategy}</div>
        </div>
        '''

    # Title
    title = "🚫 起手牌陷阱" if lang == "zh" else "🚫 Starting Hand Traps"
    st.markdown(f"**{title}**")

    col1, col2 = st.columns(2)

    with col1:
        if lang == "zh":
            traps_html = ""
            traps_html += trap_card("A-Rag", "弱 A (A2-A9)",
                "中對時 kicker 極弱，容易被壓制",
                "前位棄牌，後位 suited 可考慮", "#ef4444")
            traps_html += trap_card("KJ/QJ", "百老匯殺手",
                "經常被 AK/AQ/KQ 壓制",
                "限位置玩，避免大底池", "#f59e0b")
            traps_html += trap_card("KTo/QTo", "雜色百老匯",
                "缺乏同花潛力，翻後難打",
                "只在按鈕/盲注位防守", "#f59e0b")
        else:
            traps_html = ""
            traps_html += trap_card("A-Rag", "Weak Aces (A2-A9)",
                "Weak kicker when pairing, often dominated",
                "Fold early position, suited may play late", "#ef4444")
            traps_html += trap_card("KJ/QJ", "Broadway Killers",
                "Often dominated by AK/AQ/KQ",
                "Position-dependent, avoid big pots", "#f59e0b")
            traps_html += trap_card("KTo/QTo", "Offsuit Broadway",
                "No flush potential, hard post-flop",
                "Only BTN/blind defense", "#f59e0b")
        st.markdown(traps_html, unsafe_allow_html=True)

    with col2:
        if lang == "zh":
            traps_html = ""
            traps_html += trap_card("22-66", "小對子",
                "只能靠中 set，機率約 12%",
                "需要好的隱含賠率才能跟注", "#8b5cf6")
            traps_html += trap_card("J9s/T8s", "中間連張",
                "容易做小順子/同花被大牌打敗",
                "深籌碼時有價值，淺籌避免", "#3b82f6")
        else:
            traps_html = ""
            traps_html += trap_card("22-66", "Small Pairs",
                "Only set-mining, ~12% chance",
                "Need good implied odds to call", "#8b5cf6")
            traps_html += trap_card("J9s/T8s", "Middle Connectors",
                "Can make second-best straights/flushes",
                "Valuable deep, avoid shallow", "#3b82f6")
        st.markdown(traps_html, unsafe_allow_html=True)

    st.markdown("---")

    # Raise or Fold principle
    rof_title = "📌 Raise or Fold 法則" if lang == "zh" else "📌 Raise or Fold Principle"
    st.markdown(f"### {rof_title}")

    col1, col2 = st.columns(2)

    with col1:
        if lang == "zh":
            strategy_html = ""
            strategy_html += strategy_card("適合 Raise 的手牌",
                "AA-TT, AK, AQ, AJs+, KQs",
                "強牌主動加注建立底池，逼走邊緣牌", "🚀", "#22c55e")
            strategy_html += strategy_card("適合 Fold 的手牌",
                "A9o-A2o, K9o-K2o, 雜色小牌",
                "這些牌跟注後翻後難打，不如放棄", "🛑", "#ef4444")
        else:
            strategy_html = ""
            strategy_html += strategy_card("Hands to Raise",
                "AA-TT, AK, AQ, AJs+, KQs",
                "Strong hands raise to build pot, fold out marginals", "🚀", "#22c55e")
            strategy_html += strategy_card("Hands to Fold",
                "A9o-A2o, K9o-K2o, offsuit rags",
                "Difficult post-flop, better to fold pre", "🛑", "#ef4444")
        st.markdown(strategy_html, unsafe_allow_html=True)

    with col2:
        if lang == "zh":
            strategy_html = ""
            strategy_html += strategy_card("可以 Limp/Call 的場景",
                "深籌小對、同花連張",
                "只在多人底池、好位置、深籌碼時", "🎯", "#fbbf24")
            strategy_html += strategy_card("位置決定價值",
                "CO/BTN 可以玩更多牌",
                "前位收緊，後位放寬，大盲位防守", "📍", "#3b82f6")
        else:
            strategy_html = ""
            strategy_html += strategy_card("When to Limp/Call",
                "Deep stack small pairs, suited connectors",
                "Only multiway, good position, deep stacks", "🎯", "#fbbf24")
            strategy_html += strategy_card("Position Matters",
                "CO/BTN can play wider",
                "Tight early, loose late, BB defense", "📍", "#3b82f6")
        st.markdown(strategy_html, unsafe_allow_html=True)


def _display_spr_learning(lang: str):
    """Display SPR (Stack-to-Pot Ratio) learning content."""

    def spr_zone(spr_range: str, name: str, hands: str, strategy: str, color: str):
        """Generate HTML for SPR zone card."""
        return f'''
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 8px; padding: 15px; margin-bottom: 12px; border-left: 4px solid {color};">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <span style="background: {color}; color: white; padding: 6px 14px; border-radius: 8px; font-weight: bold; font-size: 1.2rem;">{spr_range}</span>
                <span style="color: #e2e8f0; font-weight: bold; font-size: 1.1rem;">{name}</span>
            </div>
            <div style="color: #fbbf24; font-size: 0.9rem; margin-bottom: 8px;">🎯 適合手牌: {hands}</div>
            <div style="color: #94a3b8; font-size: 0.9rem;">📌 {strategy}</div>
        </div>
        '''

    def example_box(title: str, scenario: str, calculation: str, advice: str):
        """Generate HTML for example box."""
        return f'''
        <div style="background: #1e293b; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 6px;">📝 {title}</div>
            <div style="color: #e2e8f0; font-size: 0.9rem; margin-bottom: 4px;">{scenario}</div>
            <div style="color: #3b82f6; font-size: 0.9rem; margin-bottom: 4px;">🧮 {calculation}</div>
            <div style="color: #22c55e; font-size: 0.85rem;">✅ {advice}</div>
        </div>
        '''

    # Title and formula
    title = "📐 SPR 法則 (Stack-to-Pot Ratio)" if lang == "zh" else "📐 SPR (Stack-to-Pot Ratio)"
    st.markdown(f"**{title}**")

    # Formula box
    formula_html = '''
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 8px; padding: 15px; margin-bottom: 15px; text-align: center;">
        <div style="color: #fbbf24; font-size: 1.4rem; font-weight: bold; margin-bottom: 8px;">
            SPR = 有效籌碼 ÷ 翻牌前底池
        </div>
        <div style="color: #94a3b8; font-size: 0.9rem;">
            SPR = Effective Stack ÷ Pot on Flop
        </div>
    </div>
    '''
    st.markdown(formula_html, unsafe_allow_html=True)

    # Three SPR zones
    if lang == "zh":
        st.markdown(spr_zone("SPR > 6", "深籌碼區",
            "同花連張、小對子、投機牌",
            "追求隱含賠率，可以 set mining，適合詐唬和複雜玩法", "#22c55e"), unsafe_allow_html=True)
        st.markdown(spr_zone("SPR 3-6", "中等籌碼區",
            "強 top pair、兩對、暗三",
            "平衡價值下注與保護，謹慎對待單純的一對", "#fbbf24"), unsafe_allow_html=True)
        st.markdown(spr_zone("SPR < 3", "淺籌碼區",
            "超對、top pair top kicker、sets",
            "簡單打法：中 flop 就全下，不需複雜詐唬", "#ef4444"), unsafe_allow_html=True)
    else:
        st.markdown(spr_zone("SPR > 6", "Deep Stack Zone",
            "Suited connectors, small pairs, speculative hands",
            "Play for implied odds, set mining, complex plays work", "#22c55e"), unsafe_allow_html=True)
        st.markdown(spr_zone("SPR 3-6", "Medium Stack Zone",
            "Strong top pair, two pair, sets",
            "Balance value betting & protection, be cautious with one pair", "#fbbf24"), unsafe_allow_html=True)
        st.markdown(spr_zone("SPR < 3", "Shallow Stack Zone",
            "Overpairs, TPTK, sets",
            "Simple play: hit flop → commit. No fancy bluffs needed", "#ef4444"), unsafe_allow_html=True)

    st.markdown("---")

    # Examples
    examples_title = "📝 實戰範例" if lang == "zh" else "📝 Examples"
    st.markdown(f"### {examples_title}")

    col1, col2 = st.columns(2)

    with col1:
        if lang == "zh":
            st.markdown(example_box("深 SPR 場景",
                "籌碼 200bb，3bet pot 底池 25bb",
                "SPR = 175 ÷ 25 = 7",
                "小對可以追 set，別用 TPGK 全下"), unsafe_allow_html=True)
        else:
            st.markdown(example_box("Deep SPR Scenario",
                "Stack 200bb, 3bet pot is 25bb",
                "SPR = 175 ÷ 25 = 7",
                "Small pairs can set mine, don't stack off with TPGK"), unsafe_allow_html=True)

    with col2:
        if lang == "zh":
            st.markdown(example_box("淺 SPR 場景",
                "籌碼 30bb，單 raise pot 底池 12bb",
                "SPR = 18 ÷ 12 = 1.5",
                "AA/KK 直接 cbet 全下保護"), unsafe_allow_html=True)
        else:
            st.markdown(example_box("Shallow SPR Scenario",
                "Stack 30bb, single raise pot is 12bb",
                "SPR = 18 ÷ 12 = 1.5",
                "AA/KK just cbet shove for protection"), unsafe_allow_html=True)


def _display_postflop_learning(lang: str):
    """Display post-flop learning content - fold signals and strategies."""

    def danger_signal(signal: str, desc: str, action: str, severity: str = "high"):
        """Generate HTML for a danger signal card."""
        colors = {"high": "#ef4444", "medium": "#f59e0b", "low": "#fbbf24"}
        color = colors.get(severity, "#ef4444")
        return f'''
        <div style="background: #1e293b; border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 4px solid {color};">
            <div style="color: {color}; font-weight: bold; font-size: 1rem; margin-bottom: 6px;">🚨 {signal}</div>
            <div style="color: #e2e8f0; font-size: 0.9rem; margin-bottom: 6px;">{desc}</div>
            <div style="color: #94a3b8; font-size: 0.85rem;">✅ 建議: {action}</div>
        </div>
        '''

    def board_type(name: str, example: str, danger: str, color: str = "#ef4444"):
        """Generate HTML for a dangerous board type."""
        return f'''
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="color: {color}; font-weight: bold; font-size: 1rem;">{name}</span>
            </div>
            <div style="color: #fbbf24; font-size: 0.9rem; margin-bottom: 4px;">🃏 {example}</div>
            <div style="color: #94a3b8; font-size: 0.85rem;">⚠️ {danger}</div>
        </div>
        '''

    # Title
    title = "🚨 翻後「必跑」信號" if lang == "zh" else "🚨 Post-flop Fold Signals"
    st.markdown(f"**{title}**")

    col1, col2 = st.columns(2)

    with col1:
        signals_title = "對手行為信號" if lang == "zh" else "Opponent Behavior Signals"
        st.markdown(f"**{signals_title}**")

        if lang == "zh":
            signals_html = ""
            signals_html += danger_signal("緊凶玩家突然加注",
                "平時很少下注的玩家突然 raise 你的 cbet",
                "除非你有 nuts，否則放棄", "high")
            signals_html += danger_signal("被動玩家三條街價值下注",
                "call station 連續三條街主動下注",
                "他有很強的牌，一對通常不夠", "high")
            signals_html += danger_signal("多人底池被加注",
                "3+ 人底池有人 raise",
                "需要更強的牌才能繼續", "medium")
        else:
            signals_html = ""
            signals_html += danger_signal("Nit Suddenly Raises",
                "Tight player who rarely bets suddenly raises your cbet",
                "Fold unless you have the nuts", "high")
            signals_html += danger_signal("Passive Player Value Bets 3 Streets",
                "A call station betting all three streets",
                "They have a strong hand, one pair usually not enough", "high")
            signals_html += danger_signal("Raised in Multiway Pot",
                "Someone raises in a 3+ player pot",
                "Need stronger hands to continue", "medium")
        st.markdown(signals_html, unsafe_allow_html=True)

    with col2:
        boards_title = "危險牌面結構" if lang == "zh" else "Dangerous Board Textures"
        st.markdown(f"**{boards_title}**")

        if lang == "zh":
            boards_html = ""
            boards_html += board_type("四張同花", "A♠ 7♠ 3♠ K♠ x",
                "對手很可能有同花，你的兩對/暗三價值暴跌", "#3b82f6")
            boards_html += board_type("四張順子連牌", "6-7-8-9 或 J-Q-K-A",
                "順子完成機率高，非堅果要小心", "#22c55e")
            boards_html += board_type("對子公共牌", "K-K-7 或 9-9-3",
                "葫蘆/四條可能，頂對 kicker 很重要", "#f59e0b")
        else:
            boards_html = ""
            boards_html += board_type("4-Flush Board", "A♠ 7♠ 3♠ K♠ x",
                "Opponent likely has flush, your two pair/set loses value", "#3b82f6")
            boards_html += board_type("4-Straight Board", "6-7-8-9 or J-Q-K-A",
                "Straight completion likely, careful without nuts", "#22c55e")
            boards_html += board_type("Paired Board", "K-K-7 or 9-9-3",
                "Full house/quads possible, kicker matters with top pair", "#f59e0b")
        st.markdown(boards_html, unsafe_allow_html=True)

    st.markdown("---")

    # Key principles
    principles_title = "💡 核心原則" if lang == "zh" else "💡 Core Principles"
    st.markdown(f"### {principles_title}")

    if lang == "zh":
        principles_html = '''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 8px; padding: 15px; margin-bottom: 10px;">
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 10px;">🎯 判斷是否該棄牌的三個問題：</div>
            <div style="color: #e2e8f0; margin-bottom: 6px;">1️⃣ 對手的行為是否代表超強牌力？</div>
            <div style="color: #e2e8f0; margin-bottom: 6px;">2️⃣ 牌面結構是否讓我的牌大幅貶值？</div>
            <div style="color: #e2e8f0; margin-bottom: 6px;">3️⃣ 我能打敗對手的價值範圍嗎？</div>
            <div style="color: #94a3b8; margin-top: 10px; font-size: 0.9rem;">如果三個答案都不樂觀，果斷放棄！</div>
        </div>
        '''
    else:
        principles_html = '''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 8px; padding: 15px; margin-bottom: 10px;">
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 10px;">🎯 Three Questions Before Folding:</div>
            <div style="color: #e2e8f0; margin-bottom: 6px;">1️⃣ Does opponent's action represent a very strong hand?</div>
            <div style="color: #e2e8f0; margin-bottom: 6px;">2️⃣ Does the board texture devalue my hand significantly?</div>
            <div style="color: #e2e8f0; margin-bottom: 6px;">3️⃣ Can I beat opponent's value range?</div>
            <div style="color: #94a3b8; margin-top: 10px; font-size: 0.9rem;">If all three answers are negative, fold decisively!</div>
        </div>
        '''
    st.markdown(principles_html, unsafe_allow_html=True)


def _display_bankroll_learning(lang: str):
    """Display bankroll management learning content."""

    def rule_card(rule: str, desc: str, example: str, color: str = "#fbbf24"):
        """Generate HTML for a rule card."""
        return f'''
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 8px; padding: 15px; margin-bottom: 12px; border-left: 4px solid {color};">
            <div style="color: {color}; font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">{rule}</div>
            <div style="color: #e2e8f0; font-size: 0.9rem; margin-bottom: 6px;">{desc}</div>
            <div style="color: #94a3b8; font-size: 0.85rem;">📌 {example}</div>
        </div>
        '''

    def level_card(level: str, buyins: str, note: str, color: str):
        """Generate HTML for stake level recommendation."""
        return f'''
        <div style="background: #1e293b; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
            <span style="background: {color}; color: white; padding: 8px 12px; border-radius: 6px; font-weight: bold; min-width: 100px; text-align: center;">{level}</span>
            <div>
                <div style="color: #e2e8f0; font-weight: bold;">{buyins}</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">{note}</div>
            </div>
        </div>
        '''

    # Title
    title = "💰 資金管理法則" if lang == "zh" else "💰 Bankroll Management"
    st.markdown(f"**{title}**")

    # Main rule - 20 buy-ins
    main_rule_html = '''
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center; border: 2px solid #fbbf24;">
        <div style="color: #fbbf24; font-size: 2rem; font-weight: bold; margin-bottom: 10px;">20 Buy-ins 法則</div>
        <div style="color: #e2e8f0; font-size: 1.1rem;">永遠保持至少 20 倍買入的資金</div>
        <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 8px;">這能抵抗短期波動，讓你專注於正確決策</div>
    </div>
    '''
    st.markdown(main_rule_html, unsafe_allow_html=True)

    col1, col2 = st.columns(2)

    with col1:
        rules_title = "📋 基本原則" if lang == "zh" else "📋 Basic Rules"
        st.markdown(f"**{rules_title}**")

        if lang == "zh":
            rules_html = ""
            rules_html += rule_card("單桌買入 = 資金的 5%",
                "這意味著你需要 20 個買入才能打某個級別",
                "資金 $1000 → 最高打 $50 買入 (NL50)", "#22c55e")
            rules_html += rule_card("下風時降級",
                "連續輸掉 3-5 個買入，考慮降一級",
                "保護資金，重建信心後再回來", "#f59e0b")
            rules_html += rule_card("上風時不急升",
                "贏了幾個買入不代表可以跳級",
                "需要穩定的勝率，至少 30 個買入再升", "#3b82f6")
        else:
            rules_html = ""
            rules_html += rule_card("Single Buy-in = 5% of Bankroll",
                "This means you need 20 buy-ins for a stake level",
                "Bankroll $1000 → Max NL50 ($50 buy-in)", "#22c55e")
            rules_html += rule_card("Move Down When Losing",
                "After 3-5 buy-in downswing, consider moving down",
                "Protect bankroll, rebuild confidence", "#f59e0b")
            rules_html += rule_card("Don't Rush Moving Up",
                "Winning a few buy-ins doesn't mean you can jump stakes",
                "Need stable win rate, at least 30 buy-ins to move up", "#3b82f6")
        st.markdown(rules_html, unsafe_allow_html=True)

    with col2:
        levels_title = "📊 級別建議" if lang == "zh" else "📊 Stake Recommendations"
        st.markdown(f"**{levels_title}**")

        if lang == "zh":
            levels_html = ""
            levels_html += level_card("NL2-NL5", "$40-$100", "新手入門，學習基礎", "#22c55e")
            levels_html += level_card("NL10-NL25", "$200-$500", "基礎穩固，建立風格", "#3b82f6")
            levels_html += level_card("NL50-NL100", "$1000-$2000", "中級玩家，需要調整能力", "#fbbf24")
            levels_html += level_card("NL200+", "$4000+", "高級玩家，需要專業心態", "#ef4444")
        else:
            levels_html = ""
            levels_html += level_card("NL2-NL5", "$40-$100", "Beginner, learn fundamentals", "#22c55e")
            levels_html += level_card("NL10-NL25", "$200-$500", "Solid basics, develop style", "#3b82f6")
            levels_html += level_card("NL50-NL100", "$1000-$2000", "Intermediate, need adaptability", "#fbbf24")
            levels_html += level_card("NL200+", "$4000+", "Advanced, professional mindset", "#ef4444")
        st.markdown(levels_html, unsafe_allow_html=True)

    st.markdown("---")

    # Mental game
    mental_title = "🧠 心態管理" if lang == "zh" else "🧠 Mental Game"
    st.markdown(f"### {mental_title}")

    if lang == "zh":
        mental_html = '''
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #22c55e;">
                <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">✅ 正確心態</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">• 專注於決策質量，不是結果<br/>• 接受短期波動是正常的<br/>• 設定止損點並遵守</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #ef4444;">
                <div style="color: #ef4444; font-weight: bold; margin-bottom: 6px;">❌ 錯誤心態</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">• 輸錢後想立刻贏回來<br/>• 贏錢後覺得自己無敵<br/>• 用生活費或借款打牌</div>
            </div>
        </div>
        '''
    else:
        mental_html = '''
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #22c55e;">
                <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">✅ Right Mindset</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">• Focus on decision quality, not results<br/>• Accept short-term variance<br/>• Set stop-loss limits and follow them</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #ef4444;">
                <div style="color: #ef4444; font-weight: bold; margin-bottom: 6px;">❌ Wrong Mindset</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">• Chasing losses immediately<br/>• Feeling invincible after winning<br/>• Playing with living expenses or loans</div>
            </div>
        </div>
        '''
    st.markdown(mental_html, unsafe_allow_html=True)


def _display_position_value_learning(lang: str):
    """Display position value learning content."""
    title = "🎯 位置價值解說" if lang == "zh" else "🎯 Position Value Guide"
    st.markdown(f"### {title}")

    # Why position matters
    why_title = "為什麼位置重要？" if lang == "zh" else "Why Position Matters?"
    st.markdown(f"**{why_title}**")

    if lang == "zh":
        intro_html = '''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="color: #fbbf24; font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">💡 核心概念</div>
            <div style="color: #e2e8f0; line-height: 1.7;">
                位置是撲克中<span style="color: #22c55e; font-weight: bold;">最重要的因素之一</span>。
                在後位（如 BTN）你可以看到對手的行動再做決定，這帶來巨大的<span style="color: #fbbf24;">資訊優勢</span>。
            </div>
        </div>
        '''
    else:
        intro_html = '''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="color: #fbbf24; font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">💡 Core Concept</div>
            <div style="color: #e2e8f0; line-height: 1.7;">
                Position is <span style="color: #22c55e; font-weight: bold;">one of the most important factors</span> in poker.
                In late position (like BTN), you see opponents' actions before deciding, giving you a huge <span style="color: #fbbf24;">information advantage</span>.
            </div>
        </div>
        '''
    st.markdown(intro_html, unsafe_allow_html=True)

    # Position value ranking
    col1, col2 = st.columns(2)

    with col1:
        rank_title = "📊 位置價值排名" if lang == "zh" else "📊 Position Value Ranking"
        st.markdown(f"**{rank_title}**")

        if lang == "zh":
            positions_html = '''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px;">
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #fbbf24; font-size: 1.2rem; width: 30px;">🥇</span>
                    <span style="color: #22c55e; font-weight: bold; width: 50px;">BTN</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">最後行動，可以竊取盲注，翻後永遠有位置</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #c0c0c0; font-size: 1.2rem; width: 30px;">🥈</span>
                    <span style="color: #3b82f6; font-weight: bold; width: 50px;">CO</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">僅次於BTN，可以對BTN棄牌時獲得位置優勢</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #cd7f32; font-size: 1.2rem; width: 30px;">🥉</span>
                    <span style="color: #8b5cf6; font-weight: bold; width: 50px;">HJ</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">中位，仍有相對位置優勢</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #6b7280; font-size: 1rem; width: 30px;">4</span>
                    <span style="color: #f59e0b; font-weight: bold; width: 50px;">UTG</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">最早行動，需要最緊的範圍</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #6b7280; font-size: 1rem; width: 30px;">5</span>
                    <span style="color: #ef4444; font-weight: bold; width: 50px;">SB</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">翻後總是沒位置（對BB除外）</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px;">
                    <span style="color: #6b7280; font-size: 1rem; width: 30px;">6</span>
                    <span style="color: #64748b; font-weight: bold; width: 50px;">BB</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">被強制投入盲注，但翻前最後行動</span>
                </div>
            </div>
            '''
        else:
            positions_html = '''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px;">
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #fbbf24; font-size: 1.2rem; width: 30px;">🥇</span>
                    <span style="color: #22c55e; font-weight: bold; width: 50px;">BTN</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">Acts last, can steal blinds, always has position postflop</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #c0c0c0; font-size: 1.2rem; width: 30px;">🥈</span>
                    <span style="color: #3b82f6; font-weight: bold; width: 50px;">CO</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">Second best, gains position when BTN folds</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #cd7f32; font-size: 1.2rem; width: 30px;">🥉</span>
                    <span style="color: #8b5cf6; font-weight: bold; width: 50px;">HJ</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">Middle position, still has relative advantage</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #6b7280; font-size: 1rem; width: 30px;">4</span>
                    <span style="color: #f59e0b; font-weight: bold; width: 50px;">UTG</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">First to act, needs tightest range</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #334155;">
                    <span style="color: #6b7280; font-size: 1rem; width: 30px;">5</span>
                    <span style="color: #ef4444; font-weight: bold; width: 50px;">SB</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">Always out of position postflop (except vs BB)</span>
                </div>
                <div style="display: flex; align-items: center; padding: 8px;">
                    <span style="color: #6b7280; font-size: 1rem; width: 30px;">6</span>
                    <span style="color: #64748b; font-weight: bold; width: 50px;">BB</span>
                    <span style="color: #94a3b8; font-size: 0.85rem;">Forced to put in blind, but acts last preflop</span>
                </div>
            </div>
            '''
        st.markdown(positions_html, unsafe_allow_html=True)

    with col2:
        winrate_title = "💰 預期勝率 (bb/100)" if lang == "zh" else "💰 Expected Win Rate (bb/100)"
        st.markdown(f"**{winrate_title}**")

        if lang == "zh":
            winrate_html = '''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px;">
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #22c55e; font-weight: bold;">BTN</span>
                        <span style="color: #22c55e;">+25 ~ +35 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #22c55e; width: 90%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #3b82f6; font-weight: bold;">CO</span>
                        <span style="color: #3b82f6;">+15 ~ +25 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #3b82f6; width: 70%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #8b5cf6; font-weight: bold;">HJ</span>
                        <span style="color: #8b5cf6;">+5 ~ +15 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #8b5cf6; width: 50%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #f59e0b; font-weight: bold;">UTG</span>
                        <span style="color: #f59e0b;">0 ~ +10 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #f59e0b; width: 35%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #ef4444; font-weight: bold;">SB</span>
                        <span style="color: #ef4444;">-15 ~ -25 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #ef4444; width: 25%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #64748b; font-weight: bold;">BB</span>
                        <span style="color: #64748b;">-20 ~ -35 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #64748b; width: 15%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
            </div>
            <div style="color: #6b7280; font-size: 0.75rem; margin-top: 8px; text-align: center;">
                * 數據為典型 NL50-NL200 玩家範圍
            </div>
            '''
        else:
            winrate_html = '''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px;">
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #22c55e; font-weight: bold;">BTN</span>
                        <span style="color: #22c55e;">+25 ~ +35 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #22c55e; width: 90%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #3b82f6; font-weight: bold;">CO</span>
                        <span style="color: #3b82f6;">+15 ~ +25 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #3b82f6; width: 70%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #8b5cf6; font-weight: bold;">HJ</span>
                        <span style="color: #8b5cf6;">+5 ~ +15 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #8b5cf6; width: 50%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #f59e0b; font-weight: bold;">UTG</span>
                        <span style="color: #f59e0b;">0 ~ +10 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #f59e0b; width: 35%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #ef4444; font-weight: bold;">SB</span>
                        <span style="color: #ef4444;">-15 ~ -25 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #ef4444; width: 25%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: #64748b; font-weight: bold;">BB</span>
                        <span style="color: #64748b;">-20 ~ -35 bb/100</span>
                    </div>
                    <div style="background: #334155; border-radius: 4px; height: 8px;">
                        <div style="background: #64748b; width: 15%; height: 100%; border-radius: 4px;"></div>
                    </div>
                </div>
            </div>
            <div style="color: #6b7280; font-size: 0.75rem; margin-top: 8px; text-align: center;">
                * Data range for typical NL50-NL200 players
            </div>
            '''
        st.markdown(winrate_html, unsafe_allow_html=True)

    st.markdown("---")

    # Practical tips
    tips_title = "💡 實戰應用" if lang == "zh" else "💡 Practical Tips"
    st.markdown(f"**{tips_title}**")

    if lang == "zh":
        tips_html = '''
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #22c55e;">
                <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">🎯 BTN 策略</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">
                    • 最寬的開池範圍 (40-50%)<br/>
                    • 積極竊取盲注<br/>
                    • 善用位置優勢打翻後
                </div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #ef4444;">
                <div style="color: #ef4444; font-weight: bold; margin-bottom: 6px;">⚠️ 盲注防守</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">
                    • SB 防守要更緊（沒位置）<br/>
                    • BB 可以寬一點（已投入1bb）<br/>
                    • 小心被位置壓制
                </div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #3b82f6;">
                <div style="color: #3b82f6; font-weight: bold; margin-bottom: 6px;">📐 範圍調整</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">
                    • 早位：只打強牌 (10-15%)<br/>
                    • 中位：稍微放寬 (15-25%)<br/>
                    • 晚位：積極參與 (25-50%)
                </div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #fbbf24;">
                <div style="color: #fbbf24; font-weight: bold; margin-bottom: 6px;">🎪 位置戰術</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">
                    • 有位置時多打價值<br/>
                    • 沒位置時控制底池<br/>
                    • 注意對手的位置意識
                </div>
            </div>
        </div>
        '''
    else:
        tips_html = '''
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #22c55e;">
                <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">🎯 BTN Strategy</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">
                    • Widest open range (40-50%)<br/>
                    • Actively steal blinds<br/>
                    • Leverage position postflop
                </div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #ef4444;">
                <div style="color: #ef4444; font-weight: bold; margin-bottom: 6px;">⚠️ Blind Defense</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">
                    • SB defend tighter (no position)<br/>
                    • BB can be wider (already 1bb in)<br/>
                    • Watch for positional pressure
                </div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #3b82f6;">
                <div style="color: #3b82f6; font-weight: bold; margin-bottom: 6px;">📐 Range Adjustment</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">
                    • Early: Play strong only (10-15%)<br/>
                    • Middle: Slightly wider (15-25%)<br/>
                    • Late: Play aggressively (25-50%)
                </div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #fbbf24;">
                <div style="color: #fbbf24; font-weight: bold; margin-bottom: 6px;">🎪 Position Tactics</div>
                <div style="color: #94a3b8; font-size: 0.85rem;">
                    • In position: extract value<br/>
                    • Out of position: control pot<br/>
                    • Notice opponents' position awareness
                </div>
            </div>
        </div>
        '''
    st.markdown(tips_html, unsafe_allow_html=True)


def _display_blocker_learning(lang: str):
    """Display blocker concept learning content."""
    title = "🚫 Blocker 概念" if lang == "zh" else "🚫 Blocker Concept"
    st.markdown(f"### {title}")

    # What is a blocker
    if lang == "zh":
        intro_html = '''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="color: #fbbf24; font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">💡 什麼是 Blocker？</div>
            <div style="color: #e2e8f0; line-height: 1.7;">
                <span style="color: #22c55e; font-weight: bold;">Blocker（阻擋牌）</span>是指你手中的牌<span style="color: #fbbf24;">降低了對手持有特定牌組的機率</span>。
                例如：你拿著 A♠，對手就不可能有 AA 或 A♠X♠ 同花。
            </div>
        </div>
        '''
    else:
        intro_html = '''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="color: #fbbf24; font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">💡 What is a Blocker?</div>
            <div style="color: #e2e8f0; line-height: 1.7;">
                A <span style="color: #22c55e; font-weight: bold;">blocker</span> is a card in your hand that
                <span style="color: #fbbf24;">reduces the probability</span> of your opponent holding certain hands.
                Example: If you have A♠, opponent cannot have AA or A♠X♠ flush.
            </div>
        </div>
        '''
    st.markdown(intro_html, unsafe_allow_html=True)

    col1, col2 = st.columns(2)

    with col1:
        bluff_title = "🎭 Blocker 用於詐唬" if lang == "zh" else "🎭 Blockers for Bluffing"
        st.markdown(f"**{bluff_title}**")

        if lang == "zh":
            bluff_html = '''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px;">
                <div style="border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">✅ A5s 可以 3-Bet 詐唬</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • 有 A 阻擋對手的 AA、AK<br/>
                        • 降低對手 4-Bet 的可能<br/>
                        • 同花有後門潛力<br/>
                        • 5 可組成順子（A2345）
                    </div>
                </div>
                <div style="border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">✅ K 阻擋 AK/KK</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • K 在你手上，對手 KK 機率減半<br/>
                        • 對手 AKs/AKo 組合也減少<br/>
                        • 有利於你的詐唬
                    </div>
                </div>
                <div>
                    <div style="color: #3b82f6; font-weight: bold; margin-bottom: 6px;">💡 詐唬選擇原則</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • 優先選擇有 A/K 阻擋的牌<br/>
                        • 沒有成牌價值的牌做詐唬<br/>
                        • 阻擋對手的續戰範圍
                    </div>
                </div>
            </div>
            '''
        else:
            bluff_html = '''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px;">
                <div style="border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">✅ A5s as 3-Bet Bluff</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • A blocks opponent's AA, AK<br/>
                        • Reduces chance of 4-bet<br/>
                        • Suited has backdoor potential<br/>
                        • 5 can make wheel straight (A2345)
                    </div>
                </div>
                <div style="border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">✅ K Blocks AK/KK</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • K in your hand halves KK combos<br/>
                        • Reduces AKs/AKo combos too<br/>
                        • Favorable for your bluffs
                    </div>
                </div>
                <div>
                    <div style="color: #3b82f6; font-weight: bold; margin-bottom: 6px;">💡 Bluff Selection</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • Prefer hands with A/K blockers<br/>
                        • Use hands with no showdown value<br/>
                        • Block opponent's continuing range
                    </div>
                </div>
            </div>
            '''
        st.markdown(bluff_html, unsafe_allow_html=True)

    with col2:
        call_title = "🛡️ Blocker 用於跟注" if lang == "zh" else "🛡️ Blockers for Calling"
        st.markdown(f"**{call_title}**")

        if lang == "zh":
            call_html = '''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px;">
                <div style="border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="color: #ef4444; font-weight: bold; margin-bottom: 6px;">⚠️ 不阻擋對手詐唬範圍</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • 你有 K♠K♥ 面對 all-in<br/>
                        • 對手可能有 AA（你不阻擋）<br/>
                        • 對手的 AK 被你阻擋<br/>
                        • 這讓跟注變得更危險
                    </div>
                </div>
                <div style="border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">✅ 阻擋堅果範圍</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • 牌面 A♠K♠5♠2♦7♣<br/>
                        • 你有 Q♠（阻擋堅果同花）<br/>
                        • 對手可能是詐唬<br/>
                        • 可以考慮抓詐
                    </div>
                </div>
                <div>
                    <div style="color: #fbbf24; font-weight: bold; margin-bottom: 6px;">🎯 跟注決策</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • 阻擋對手價值牌 → 利於跟注<br/>
                        • 不阻擋對手詐唬 → 利於跟注<br/>
                        • 反之則傾向棄牌
                    </div>
                </div>
            </div>
            '''
        else:
            call_html = '''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px;">
                <div style="border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="color: #ef4444; font-weight: bold; margin-bottom: 6px;">⚠️ Not Blocking Bluff Range</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • You have K♠K♥ facing all-in<br/>
                        • Opponent may have AA (not blocked)<br/>
                        • You block their AK<br/>
                        • This makes calling riskier
                    </div>
                </div>
                <div style="border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 10px;">
                    <div style="color: #22c55e; font-weight: bold; margin-bottom: 6px;">✅ Blocking Nut Range</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • Board: A♠K♠5♠2♦7♣<br/>
                        • You have Q♠ (blocks nut flush)<br/>
                        • Opponent may be bluffing<br/>
                        • Consider hero call
                    </div>
                </div>
                <div>
                    <div style="color: #fbbf24; font-weight: bold; margin-bottom: 6px;">🎯 Calling Decision</div>
                    <div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.6;">
                        • Block value hands → favor call<br/>
                        • Don't block bluffs → favor call<br/>
                        • Opposite → lean towards fold
                    </div>
                </div>
            </div>
            '''
        st.markdown(call_html, unsafe_allow_html=True)

    st.markdown("---")

    # Common blocker examples
    example_title = "📋 常見 Blocker 範例" if lang == "zh" else "📋 Common Blocker Examples"
    st.markdown(f"**{example_title}**")

    if lang == "zh":
        example_html = '''
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">🅰️</div>
                <div style="color: #22c55e; font-weight: bold; margin-bottom: 4px;">持有 A</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">阻擋 AA, AK, AQ<br/>降低 75% AA 組合</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">👑</div>
                <div style="color: #3b82f6; font-weight: bold; margin-bottom: 4px;">持有 K</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">阻擋 KK, AK, KQ<br/>影響對手頂對範圍</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">♠️</div>
                <div style="color: #8b5cf6; font-weight: bold; margin-bottom: 4px;">持有同花關鍵牌</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">A♠/K♠ 阻擋堅果同花<br/>大幅降低對手同花機率</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">🔢</div>
                <div style="color: #f59e0b; font-weight: bold; margin-bottom: 4px;">持有順子關鍵牌</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">如 8 在 567 牌面<br/>阻擋對手堅果順</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">🃏</div>
                <div style="color: #ef4444; font-weight: bold; margin-bottom: 4px;">持有對子牌</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">如 77 阻擋 77/A7/K7<br/>減少對手暗三機率</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">🚫</div>
                <div style="color: #64748b; font-weight: bold; margin-bottom: 4px;">無 Blocker 效果</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">如 72o 幾乎不阻擋<br/>任何強牌組合</div>
            </div>
        </div>
        '''
    else:
        example_html = '''
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">🅰️</div>
                <div style="color: #22c55e; font-weight: bold; margin-bottom: 4px;">Holding A</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">Blocks AA, AK, AQ<br/>Reduces AA by 75%</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">👑</div>
                <div style="color: #3b82f6; font-weight: bold; margin-bottom: 4px;">Holding K</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">Blocks KK, AK, KQ<br/>Affects top pair range</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">♠️</div>
                <div style="color: #8b5cf6; font-weight: bold; margin-bottom: 4px;">Holding Nut Flush Card</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">A♠/K♠ blocks nut flush<br/>Greatly reduces flush combos</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">🔢</div>
                <div style="color: #f59e0b; font-weight: bold; margin-bottom: 4px;">Holding Straight Card</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">Like 8 on 567 board<br/>Blocks opponent's nut straight</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">🃏</div>
                <div style="color: #ef4444; font-weight: bold; margin-bottom: 4px;">Holding Pair Cards</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">Like 77 blocks 77/A7/K7<br/>Reduces set combos</div>
            </div>
            <div style="background: #1e293b; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 6px;">🚫</div>
                <div style="color: #64748b; font-weight: bold; margin-bottom: 4px;">No Blocker Effect</div>
                <div style="color: #94a3b8; font-size: 0.8rem;">Like 72o blocks almost<br/>no strong combos</div>
            </div>
        </div>
        '''
    st.markdown(example_html, unsafe_allow_html=True)


def _display_common_mistakes_learning(lang: str):
    """Display common mistakes learning content."""
    title = "❌ 常見錯誤 Top 10" if lang == "zh" else "❌ Top 10 Common Mistakes"
    st.markdown(f"### {title}")

    if lang == "zh":
        mistakes = [
            ("1", "翻前打太寬", "新手最常見的錯誤。UTG 只應該打 10-15% 的牌，不是每手都想看翻牌。", "#ef4444", "緊一點！記住各位置的正確範圍"),
            ("2", "不考慮位置", "在早位玩 KJo、在晚位棄掉 A5s。位置決定了你應該玩的範圍。", "#f59e0b", "根據位置調整範圍，BTN 最寬，UTG 最緊"),
            ("3", "跟注太多，加注太少", "「想看看翻牌」心態。好牌應該加注建池，而不是被動跟注。", "#fbbf24", "有好牌就加注，沒有就棄牌，少 limp"),
            ("4", "不會棄掉頂對", "翻牌中了頂對就覺得無敵，面對大額加注還是跟。", "#22c55e", "學會讀牌面，頂對不是堅果"),
            ("5", "詐唬時機錯誤", "對從不棄牌的魚詐唬、在乾燥牌面對頂對範圍詐唬。", "#3b82f6", "只對會棄牌的對手詐唬，講故事要合理"),
            ("6", "忽視籌碼深度", "100bb 和 20bb 的策略完全不同，用深籌策略打短籌。", "#8b5cf6", "學習 SPR 概念，調整翻後策略"),
            ("7", "情緒影響決策", "輸了想追回來，贏了覺得自己無敵。Tilt 是最大的敵人。", "#ec4899", "設定止損，覺得 tilt 就休息"),
            ("8", "資金管理不當", "用全部身家打一個級別，一次 downswing 就出局。", "#06b6d4", "20-30 買入，有紀律地升降級"),
            ("9", "不做筆記覆盤", "玩完就忘，不記錄對手特徵、不分析自己的錯誤。", "#84cc16", "記錄關鍵手牌，定期覆盤分析"),
            ("10", "過度關注結果", "用結果判斷決策好壞。AA 輸給 72 不代表打錯了。", "#6366f1", "專注決策質量，接受短期波動"),
        ]
    else:
        mistakes = [
            ("1", "Playing Too Loose Preflop", "Most common beginner error. UTG should only play 10-15%, not every hand.", "#ef4444", "Tighten up! Memorize correct ranges per position"),
            ("2", "Ignoring Position", "Playing KJo in early position, folding A5s in late position. Position defines your range.", "#f59e0b", "Adjust range by position. BTN widest, UTG tightest"),
            ("3", "Calling Too Much, Raising Too Little", "'I want to see the flop' mentality. Good hands should raise for value.", "#fbbf24", "Raise with good hands, fold bad ones, stop limping"),
            ("4", "Can't Fold Top Pair", "Hitting top pair feels unbeatable, still calling large raises.", "#22c55e", "Learn to read boards, top pair isn't the nuts"),
            ("5", "Wrong Bluff Timing", "Bluffing calling stations, bluffing dry boards vs top pair range.", "#3b82f6", "Only bluff players who can fold, tell believable stories"),
            ("6", "Ignoring Stack Depth", "100bb and 20bb strategies are completely different.", "#8b5cf6", "Learn SPR concept, adjust postflop accordingly"),
            ("7", "Emotional Decision Making", "Chasing losses, feeling invincible after winning. Tilt is the enemy.", "#ec4899", "Set stop-loss limits, take breaks when tilting"),
            ("8", "Poor Bankroll Management", "Playing one stake with entire bankroll, one downswing = busto.", "#06b6d4", "20-30 buy-ins, disciplined moving up/down"),
            ("9", "No Notes or Review", "Play and forget, no opponent notes, no self-analysis.", "#84cc16", "Record key hands, review regularly"),
            ("10", "Results-Oriented Thinking", "Judging decisions by results. AA losing to 72 doesn't mean bad play.", "#6366f1", "Focus on decision quality, accept variance"),
        ]

    for num, title_text, desc, color, solution in mistakes:
        if lang == "zh":
            st.markdown(f'''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px; margin-bottom: 10px; border-left: 4px solid {color};">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="background: {color}; color: white; width: 28px; height: 28px; border-radius: 50%;
                                display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
                        {num}
                    </div>
                    <div style="flex: 1;">
                        <div style="color: {color}; font-weight: bold; font-size: 1rem; margin-bottom: 4px;">{title_text}</div>
                        <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">{desc}</div>
                        <div style="color: #22c55e; font-size: 0.8rem;">💡 解決方案：{solution}</div>
                    </div>
                </div>
            </div>
            ''', unsafe_allow_html=True)
        else:
            st.markdown(f'''
            <div style="background: #1e293b; border-radius: 10px; padding: 12px; margin-bottom: 10px; border-left: 4px solid {color};">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="background: {color}; color: white; width: 28px; height: 28px; border-radius: 50%;
                                display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
                        {num}
                    </div>
                    <div style="flex: 1;">
                        <div style="color: {color}; font-weight: bold; font-size: 1rem; margin-bottom: 4px;">{title_text}</div>
                        <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">{desc}</div>
                        <div style="color: #22c55e; font-size: 0.8rem;">💡 Solution: {solution}</div>
                    </div>
                </div>
            </div>
            ''', unsafe_allow_html=True)


def _display_ev_calculation_learning(lang: str):
    """Display EV calculation learning content."""
    title = "📊 EV 計算入門" if lang == "zh" else "📊 EV Calculation Basics"
    st.markdown(f"### {title}")

    # What is EV
    if lang == "zh":
        intro_html = '''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="color: #fbbf24; font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">💡 什麼是 EV（期望值）？</div>
            <div style="color: #e2e8f0; line-height: 1.7;">
                <span style="color: #22c55e; font-weight: bold;">EV（Expected Value）</span>是指在重複相同情境無數次後，
                <span style="color: #fbbf24;">平均每次的盈虧</span>。<br/><br/>
                <span style="color: #94a3b8;">公式：</span>
                <span style="color: #3b82f6; font-weight: bold;">EV = (贏的機率 × 贏的金額) - (輸的機率 × 輸的金額)</span>
            </div>
        </div>
        '''
    else:
        intro_html = '''
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="color: #fbbf24; font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">💡 What is EV (Expected Value)?</div>
            <div style="color: #e2e8f0; line-height: 1.7;">
                <span style="color: #22c55e; font-weight: bold;">EV (Expected Value)</span> is the
                <span style="color: #fbbf24;">average profit or loss per decision</span> over infinite repetitions.<br/><br/>
                <span style="color: #94a3b8;">Formula:</span>
                <span style="color: #3b82f6; font-weight: bold;">EV = (Win% × Win Amount) - (Lose% × Lose Amount)</span>
            </div>
        </div>
        '''
    st.markdown(intro_html, unsafe_allow_html=True)

    col1, col2 = st.columns(2)

    with col1:
        example_title = "📝 範例計算" if lang == "zh" else "📝 Example Calculation"
        st.markdown(f"**{example_title}**")

        if lang == "zh":
            example_html = '''<div style="background: #1e293b; border-radius: 10px; padding: 14px;">
<div style="color: #fbbf24; font-weight: bold; margin-bottom: 10px;">情境：河牌圈是否跟注？</div>
<div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 12px; line-height: 1.6;">
底池：<span style="color: #22c55e;">$100</span><br/>
對手下注：<span style="color: #ef4444;">$50</span><br/>
你認為贏的機率：<span style="color: #3b82f6;">30%</span>
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
<div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">跟注時：</div>
<div style="color: #e2e8f0; font-size: 0.9rem;">
贏：獲得 $100 + $50 = <span style="color: #22c55e;">$150</span><br/>
輸：損失 <span style="color: #ef4444;">$50</span>
</div>
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
<div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">EV 計算：</div>
<div style="color: #3b82f6; font-weight: bold;">
EV = (30% × $150) - (70% × $50)<br/>
EV = $45 - $35 = <span style="color: #22c55e;">+$10</span>
</div>
</div>
<div style="color: #22c55e; font-weight: bold; text-align: center; padding: 8px; background: rgba(34, 197, 94, 0.1); border-radius: 6px;">
✅ EV 為正，應該跟注！
</div>
</div>'''
        else:
            example_html = '''<div style="background: #1e293b; border-radius: 10px; padding: 14px;">
<div style="color: #fbbf24; font-weight: bold; margin-bottom: 10px;">Scenario: River Call Decision</div>
<div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 12px; line-height: 1.6;">
Pot: <span style="color: #22c55e;">$100</span><br/>
Opponent bets: <span style="color: #ef4444;">$50</span><br/>
Your estimated win rate: <span style="color: #3b82f6;">30%</span>
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
<div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">If you call:</div>
<div style="color: #e2e8f0; font-size: 0.9rem;">
Win: Gain $100 + $50 = <span style="color: #22c55e;">$150</span><br/>
Lose: Lose <span style="color: #ef4444;">$50</span>
</div>
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
<div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">EV Calculation:</div>
<div style="color: #3b82f6; font-weight: bold;">
EV = (30% × $150) - (70% × $50)<br/>
EV = $45 - $35 = <span style="color: #22c55e;">+$10</span>
</div>
</div>
<div style="color: #22c55e; font-weight: bold; text-align: center; padding: 8px; background: rgba(34, 197, 94, 0.1); border-radius: 6px;">
✅ EV is positive, you should call!
</div>
</div>'''
        st.markdown(example_html, unsafe_allow_html=True)

    with col2:
        odds_title = "🎯 底池賠率" if lang == "zh" else "🎯 Pot Odds"
        st.markdown(f"**{odds_title}**")

        if lang == "zh":
            odds_html = '''<div style="background: #1e293b; border-radius: 10px; padding: 14px;">
<div style="color: #fbbf24; font-weight: bold; margin-bottom: 10px;">快速計算法</div>
<div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 12px; line-height: 1.6;">
底池賠率 = 需要跟注 ÷ (底池 + 對手下注 + 你的跟注)
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
<div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">上例計算：</div>
<div style="color: #e2e8f0; font-size: 0.9rem;">
$50 ÷ ($100 + $50 + $50) = $50 ÷ $200<br/>
= <span style="color: #3b82f6; font-weight: bold;">25%</span>
</div>
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
<div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">判斷標準：</div>
<div style="color: #e2e8f0; font-size: 0.9rem;">
贏率 <span style="color: #22c55e;">30%</span> > 需要賠率 <span style="color: #3b82f6;">25%</span><br/>
→ <span style="color: #22c55e; font-weight: bold;">有利可圖，應該跟注</span>
</div>
</div>
<div style="border-top: 1px solid #334155; padding-top: 10px; margin-top: 10px;">
<div style="color: #fbbf24; font-weight: bold; margin-bottom: 6px;">📊 常見下注的底池賠率</div>
<div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.5;">
• 1/3 底池 → 需要 20% 勝率<br/>
• 1/2 底池 → 需要 25% 勝率<br/>
• 2/3 底池 → 需要 28.5% 勝率<br/>
• 滿池 → 需要 33% 勝率
</div>
</div>
</div>'''
        else:
            odds_html = '''<div style="background: #1e293b; border-radius: 10px; padding: 14px;">
<div style="color: #fbbf24; font-weight: bold; margin-bottom: 10px;">Quick Calculation Method</div>
<div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 12px; line-height: 1.6;">
Pot Odds = Call Amount ÷ (Pot + Bet + Your Call)
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
<div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">Example calculation:</div>
<div style="color: #e2e8f0; font-size: 0.9rem;">
$50 ÷ ($100 + $50 + $50) = $50 ÷ $200<br/>
= <span style="color: #3b82f6; font-weight: bold;">25%</span>
</div>
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
<div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 6px;">Decision Rule:</div>
<div style="color: #e2e8f0; font-size: 0.9rem;">
Win rate <span style="color: #22c55e;">30%</span> > Required odds <span style="color: #3b82f6;">25%</span><br/>
→ <span style="color: #22c55e; font-weight: bold;">Profitable, should call</span>
</div>
</div>
<div style="border-top: 1px solid #334155; padding-top: 10px; margin-top: 10px;">
<div style="color: #fbbf24; font-weight: bold; margin-bottom: 6px;">📊 Common Bet Size Odds</div>
<div style="color: #94a3b8; font-size: 0.85rem; line-height: 1.5;">
• 1/3 pot → Need 20% equity<br/>
• 1/2 pot → Need 25% equity<br/>
• 2/3 pot → Need 28.5% equity<br/>
• Full pot → Need 33% equity
</div>
</div>
</div>'''
        st.markdown(odds_html, unsafe_allow_html=True)

    st.markdown("---")

    # Key concepts
    key_title = "🔑 關鍵概念" if lang == "zh" else "🔑 Key Concepts"
    st.markdown(f"**{key_title}**")

    if lang == "zh":
        key_html = '''<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
<div style="background: #1e293b; border-radius: 8px; padding: 12px; text-align: center;">
<div style="color: #22c55e; font-size: 2rem; margin-bottom: 6px;">+EV</div>
<div style="color: #22c55e; font-weight: bold; margin-bottom: 4px;">正期望值</div>
<div style="color: #94a3b8; font-size: 0.85rem;">長期會贏錢<br/>應該執行這個動作</div>
</div>
<div style="background: #1e293b; border-radius: 8px; padding: 12px; text-align: center;">
<div style="color: #ef4444; font-size: 2rem; margin-bottom: 6px;">-EV</div>
<div style="color: #ef4444; font-weight: bold; margin-bottom: 4px;">負期望值</div>
<div style="color: #94a3b8; font-size: 0.85rem;">長期會輸錢<br/>應該避免這個動作</div>
</div>
<div style="background: #1e293b; border-radius: 8px; padding: 12px; text-align: center;">
<div style="color: #fbbf24; font-size: 2rem; margin-bottom: 6px;">0 EV</div>
<div style="color: #fbbf24; font-weight: bold; margin-bottom: 4px;">零期望值</div>
<div style="color: #94a3b8; font-size: 0.85rem;">長期不賺不賠<br/>跟注或棄牌皆可</div>
</div>
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-top: 12px; text-align: center;">
<div style="color: #94a3b8; font-size: 0.9rem;">
<span style="color: #fbbf24; font-weight: bold;">記住：</span>
撲克的目標是做出 +EV 決策，而不是贏每一手牌。<br/>
短期結果可能波動，但長期 +EV 決策一定賺錢。
</div>
</div>'''
    else:
        key_html = '''<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
<div style="background: #1e293b; border-radius: 8px; padding: 12px; text-align: center;">
<div style="color: #22c55e; font-size: 2rem; margin-bottom: 6px;">+EV</div>
<div style="color: #22c55e; font-weight: bold; margin-bottom: 4px;">Positive EV</div>
<div style="color: #94a3b8; font-size: 0.85rem;">Profitable long-term<br/>Execute this action</div>
</div>
<div style="background: #1e293b; border-radius: 8px; padding: 12px; text-align: center;">
<div style="color: #ef4444; font-size: 2rem; margin-bottom: 6px;">-EV</div>
<div style="color: #ef4444; font-weight: bold; margin-bottom: 4px;">Negative EV</div>
<div style="color: #94a3b8; font-size: 0.85rem;">Losing long-term<br/>Avoid this action</div>
</div>
<div style="background: #1e293b; border-radius: 8px; padding: 12px; text-align: center;">
<div style="color: #fbbf24; font-size: 2rem; margin-bottom: 6px;">0 EV</div>
<div style="color: #fbbf24; font-weight: bold; margin-bottom: 4px;">Zero EV</div>
<div style="color: #94a3b8; font-size: 0.85rem;">Break-even long-term<br/>Call or fold equally fine</div>
</div>
</div>
<div style="background: #0f172a; border-radius: 8px; padding: 12px; margin-top: 12px; text-align: center;">
<div style="color: #94a3b8; font-size: 0.9rem;">
<span style="color: #fbbf24; font-weight: bold;">Remember:</span>
Poker's goal is to make +EV decisions, not win every hand.<br/>
Short-term results may vary, but +EV decisions always profit long-term.
</div>
</div>'''
    st.markdown(key_html, unsafe_allow_html=True)


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

    # Use stored category or default
    selected_category = st.session_state.equity_category

    # Generate question if needed
    if st.session_state.equity_question is None:
        st.session_state.equity_question = quiz.generate_question(category=selected_category)
        st.session_state.equity_choices = quiz.generate_choices(st.session_state.equity_question)
        st.session_state.equity_show_result = False
        st.session_state.equity_answered_idx = None

    # Header with score (full width)
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

    # Two-column layout: Cards on left, Choices on right
    col_cards, col_choices = st.columns([3, 2])

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
        <div style="text-align: center; margin: 10px 0 12px 0; font-size: 0.95rem; color: #94a3b8;">
            {t("equity_question")}
        </div>
        """, unsafe_allow_html=True)

        hero_hand_str = question.hand1
        villain_hand_str = question.hand2

        # CSS to style equity card buttons
        st.markdown("""
        <style>
        .equity-card-btn button {
            background: #1e293b !important;
            border: 2px solid #3b82f6 !important;
            border-radius: 8px !important;
            padding: 8px 10px !important;
            text-align: left !important;
            transition: all 0.2s ease !important;
        }
        .equity-card-btn button:hover {
            border-color: #60a5fa !important;
            transform: scale(1.02);
        }
        .equity-card-btn button p {
            margin: 0 !important;
        }
        </style>
        """, unsafe_allow_html=True)

        # Display choices as clickable equity matchup cards
        for i, choice in enumerate(choices):
            hero_pct = choice.equity1
            villain_pct = choice.equity2

            # Determine styling based on answer state
            if has_answered:
                if choice.is_correct:
                    indicator = " ✅"
                    border_color = "#22c55e"
                    opacity = "1"
                elif i == answered_idx:
                    indicator = " ❌"
                    border_color = "#ef4444"
                    opacity = "1"
                else:
                    indicator = ""
                    border_color = "#374151"
                    opacity = "0.5"
            else:
                indicator = ""
                border_color = "#3b82f6"
                opacity = "1"

            if not has_answered:
                # Clickable card button
                st.markdown('<div class="equity-card-btn">', unsafe_allow_html=True)
                # Button label shows the equity bar visualization
                btn_label = f"**{hero_hand_str}** {hero_pct}% vs {villain_pct}% **{villain_hand_str}**"
                if st.button(btn_label, key=f"equity_card_{i}", use_container_width=True):
                    st.session_state.equity_answered_idx = i
                    st.session_state.equity_score["total"] += 1
                    if choice.is_correct:
                        st.session_state.equity_score["correct"] += 1
                    st.rerun()
                st.markdown('</div>', unsafe_allow_html=True)
            else:
                # After answering, show non-clickable card with result indicator
                st.markdown(f'<div style="background: #1e293b; border-radius: 8px; padding: 10px; margin-bottom: 6px; border: 2px solid {border_color}; opacity: {opacity};"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;"><span style="color: #3b82f6; font-weight: bold; font-size: 0.95rem;">{hero_hand_str}</span><span style="color: #64748b; font-size: 0.8rem;">vs</span><span style="color: #ef4444; font-weight: bold; font-size: 0.95rem;">{villain_hand_str}</span><span style="font-size: 0.9rem;">{indicator}</span></div><div style="display: flex; height: 22px; border-radius: 4px; overflow: hidden; background: #374151;"><div style="width: {hero_pct}%; background: linear-gradient(90deg, #1e40af, #3b82f6); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 11px; font-weight: bold;">{hero_pct}%</span></div><div style="width: {villain_pct}%; background: linear-gradient(90deg, #dc2626, #991b1b); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 11px; font-weight: bold;">{villain_pct}%</span></div></div></div>', unsafe_allow_html=True)

        # Next button
        if has_answered:
            if st.button(t("equity_next"), key="equity_next", use_container_width=True, type="primary"):
                st.session_state.equity_question = quiz.generate_question(category=st.session_state.equity_category)
                st.session_state.equity_choices = quiz.generate_choices(st.session_state.equity_question)
                st.session_state.equity_answered_idx = None
                st.rerun()

    # Category filter at bottom (full width)
    st.markdown(f"<div style='color:#64748b;font-size:0.75rem;margin-top:10px;'>{t('equity_category')}</div>", unsafe_allow_html=True)
    current_idx = next((i for i, (cat, _) in enumerate(category_options) if cat == st.session_state.equity_category), 0)
    selected_idx = st.selectbox(
        t("equity_category"),
        options=range(len(category_options)),
        format_func=lambda i: category_options[i][1],
        index=current_idx,
        key="equity_category_select",
        label_visibility="collapsed",
    )
    new_category = category_options[selected_idx][0]
    if new_category != st.session_state.equity_category:
        st.session_state.equity_category = new_category
        st.session_state.equity_question = quiz.generate_question(category=new_category)
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

            # Display choices as buttons - 2-column layout
            for row_start in range(0, len(choices), 2):
                row_choices = choices[row_start:row_start + 2]
                cols = st.columns(2)
                for col_idx, choice in enumerate(row_choices):
                    with cols[col_idx]:
                        if st.button(f"{choice} outs", key=f"outs_choice_{row_start + col_idx}", use_container_width=True):
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


def ev_quiz_page():
    """EV Quiz page - practice pot odds and EV calculation decisions."""
    lang = st.session_state.language

    # Initialize EV quiz state
    if 'ev_quiz' not in st.session_state:
        st.session_state.ev_quiz = EVQuiz()
    if 'ev_question' not in st.session_state:
        st.session_state.ev_question = None
    if 'ev_show_result' not in st.session_state:
        st.session_state.ev_show_result = False
    if 'ev_score' not in st.session_state:
        st.session_state.ev_score = {"correct": 0, "total": 0}
    if 'ev_answered_action' not in st.session_state:
        st.session_state.ev_answered_action = None

    quiz = st.session_state.ev_quiz

    # Generate question if needed
    if st.session_state.ev_question is None:
        st.session_state.ev_question = quiz.generate_question()
        st.session_state.ev_show_result = False
        st.session_state.ev_answered_action = None

    question = st.session_state.ev_question

    # Header with score
    score = st.session_state.ev_score
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
        <span style="font-size: 1.1rem; font-weight: bold;">💰 {t("ev_quiz")}</span>
        <span style="color: #fbbf24; font-size: 0.9rem;">
            {score["correct"]}/{score["total"]} ({accuracy:.0f}%)
        </span>
    </div>
    """, unsafe_allow_html=True)

    # Two-column layout
    col_scenario, col_choices = st.columns([3, 2])

    with col_scenario:
        # Scenario description with visual
        scenario_html = f'''
<div style="
    background: linear-gradient(145deg, #1a5f3c 0%, #0d3d25 100%);
    border-radius: 15px;
    border: 4px solid #8B4513;
    padding: 20px;
    margin: 10px 0;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
">
    <div style="text-align: center; color: #fbbf24; font-size: 0.9rem; margin-bottom: 15px;">
        🎴 {t("ev_question")}
    </div>
    <div style="display: flex; justify-content: space-around; align-items: center; margin-bottom: 15px;">
        <div style="text-align: center;">
            <div style="font-size: 0.8rem; color: #94a3b8;">{t("ev_pot")}</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #22c55e;">
                ${question.pot_size}
            </div>
        </div>
        <div style="text-align: center;">
            <div style="font-size: 0.8rem; color: #94a3b8;">{t("ev_bet")}</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">
                ${question.bet_size}
            </div>
        </div>
        <div style="text-align: center;">
            <div style="font-size: 0.8rem; color: #94a3b8;">{t("ev_equity")}</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">
                {question.equity}%
            </div>
        </div>
    </div>
    <div style="
        background: rgba(0,0,0,0.3);
        border-radius: 8px;
        padding: 10px;
        text-align: center;
        font-size: 0.85rem;
        color: #e2e8f0;
    ">
        {"跟注需額外投入" if lang == "zh" else "To call, you need to put in"}: <span style="color:#fbbf24;font-weight:bold;">${question.bet_size}</span><br/>
        {"贏得總底池" if lang == "zh" else "To win total pot"}: <span style="color:#22c55e;font-weight:bold;">${question.pot_size + question.bet_size}</span>
    </div>
</div>
'''
        st.markdown(scenario_html, unsafe_allow_html=True)

    with col_choices:
        if not st.session_state.ev_show_result:
            # Question prompt
            prompt_text = "應該跟注還是棄牌？" if lang == "zh" else "Should you call or fold?"
            st.markdown(f"""
            <div style="text-align: center; margin: 10px 0 15px 0; font-size: 1rem; color: #94a3b8;">
                {prompt_text}
            </div>
            """, unsafe_allow_html=True)

            # Call/Fold buttons
            col_call, col_fold = st.columns(2)
            with col_call:
                if st.button(f"✅ {t('ev_call')}", key="ev_call_btn", use_container_width=True):
                    st.session_state.ev_show_result = True
                    st.session_state.ev_answered_action = "call"
                    st.session_state.ev_score["total"] += 1
                    is_correct, _ = quiz.check_answer(question, "call")
                    if is_correct:
                        st.session_state.ev_score["correct"] += 1
                    st.rerun()
            with col_fold:
                if st.button(f"❌ {t('ev_fold')}", key="ev_fold_btn", use_container_width=True):
                    st.session_state.ev_show_result = True
                    st.session_state.ev_answered_action = "fold"
                    st.session_state.ev_score["total"] += 1
                    is_correct, _ = quiz.check_answer(question, "fold")
                    if is_correct:
                        st.session_state.ev_score["correct"] += 1
                    st.rerun()

            # Show hint about pot odds calculation
            st.markdown(f"""
            <div style="
                background: #0f172a;
                padding: 10px;
                border-radius: 8px;
                margin-top: 15px;
                font-size: 0.85rem;
                color: #94a3b8;
            ">
                <div style="font-weight: bold; color: #fbbf24; margin-bottom: 5px;">
                    💡 {"提示" if lang == "zh" else "Hint"}
                </div>
                {"比較你的勝率和賠率" if lang == "zh" else "Compare your equity to pot odds"}<br/>
                {"勝率 > 賠率 → 跟注" if lang == "zh" else "Equity > Pot Odds → Call"}<br/>
                {"勝率 < 賠率 → 棄牌" if lang == "zh" else "Equity < Pot Odds → Fold"}
            </div>
            """, unsafe_allow_html=True)
        else:
            # Show result
            answered = st.session_state.ev_answered_action
            is_correct, explanation = quiz.check_answer(question, answered)

            pot_odds = question.pot_odds
            ev = question.ev
            correct_action = "call" if question.is_profitable_call else "fold"

            if is_correct:
                result_icon = "✅"
                result_text = "正確！" if lang == "zh" else "Correct!"
                result_class = "correct-answer"
            else:
                result_icon = "❌"
                result_text = "錯誤" if lang == "zh" else "Wrong"
                result_class = "wrong-answer"

            # Detailed explanation
            st.markdown(f'''
<div class="{result_class}">
    <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px;">
        {result_icon} {result_text}
    </div>
    <div style="background: #0f172a; padding: 10px; border-radius: 6px; margin: 8px 0;">
        <div style="font-weight: bold; color: #e2e8f0; margin-bottom: 8px;">
            📊 {"計算過程" if lang == "zh" else "Calculation"}
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1e293b;">
            <span>{"賠率 (Pot Odds)" if lang == "zh" else "Pot Odds"}</span>
            <span style="color: #fbbf24; font-weight: bold;">
                ${question.bet_size} ÷ (${question.pot_size} + ${question.bet_size} + ${question.bet_size}) = {pot_odds:.1f}%
            </span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1e293b;">
            <span>{"你的勝率" if lang == "zh" else "Your Equity"}</span>
            <span style="color: #3b82f6; font-weight: bold;">{question.equity}%</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #1e293b;">
            <span>{"比較" if lang == "zh" else "Compare"}</span>
            <span style="color: {'#22c55e' if question.equity > pot_odds else '#ef4444'}; font-weight: bold;">
                {question.equity}% {">" if question.equity > pot_odds else "<"} {pot_odds:.1f}%
            </span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; margin-top: 6px;">
            <span>EV</span>
            <span style="color: {'#22c55e' if ev > 0 else '#ef4444'}; font-weight: bold;">
                {'+' if ev > 0 else ''}${ev:.1f}
            </span>
        </div>
    </div>
    <div style="background: #0f172a; padding: 8px; border-radius: 6px; font-size: 0.9rem;">
        <span style="color: #94a3b8;">{"正確答案" if lang == "zh" else "Correct Answer"}:</span>
        <span style="color: #22c55e; font-weight: bold; margin-left: 8px;">
            {t('ev_call').upper() if correct_action == 'call' else t('ev_fold').upper()}
        </span>
    </div>
</div>
''', unsafe_allow_html=True)

            # Next button
            st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)
            next_text = "下一題" if lang == "zh" else "Next Question"
            if st.button(f"➡️ {next_text}", key="ev_next", use_container_width=True):
                st.session_state.ev_question = quiz.generate_question()
                st.session_state.ev_show_result = False
                st.session_state.ev_answered_action = None
                st.rerun()


if __name__ == "__main__":
    main()
