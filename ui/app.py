"""
GTO Poker Trainer - Main Streamlit Application
"""
import streamlit as st
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from core.hand import Hand, random_hand, SUIT_SYMBOLS
from core.position import Position, POSITIONS_6MAX
from core.scenario import Scenario, ActionType
from core.evaluator import Evaluator
from trainer.drill import PreflopDrill, Spot
from trainer.session import TrainingSession, ProgressTracker
from ui.components.range_grid import display_range_grid

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
</style>
""", unsafe_allow_html=True)


def init_session_state():
    """Initialize session state variables."""
    if 'drill' not in st.session_state:
        st.session_state.drill = PreflopDrill(format="6max")
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


def main():
    init_session_state()

    # Sidebar
    with st.sidebar:
        st.title("🃏 GTO Trainer")
        st.markdown("---")

        page = st.radio(
            "Navigate",
            ["Drill Mode", "Range Viewer", "Statistics"],
            key="nav",
        )

        st.markdown("---")

        # Drill settings
        if page == "Drill Mode":
            st.subheader("Settings")

            # Action types
            action_types = st.multiselect(
                "Practice scenarios",
                options=["RFI", "vs Open", "vs 3-Bet", "vs 4-Bet"],
                default=["RFI"],
            )

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

            # Positions
            positions = st.multiselect(
                "Positions to practice",
                options=["UTG", "HJ", "CO", "BTN", "SB", "BB"],
                default=["UTG", "HJ", "CO", "BTN", "SB", "BB"],
            )
            pos_map = {
                "UTG": Position.UTG, "HJ": Position.HJ, "CO": Position.CO,
                "BTN": Position.BTN, "SB": Position.SB, "BB": Position.BB,
            }
            st.session_state.drill.enabled_positions = [
                pos_map[p] for p in positions
            ]

        st.markdown("---")
        st.caption("GTO Poker Trainer v0.1")
        st.caption("Based on simplified GTO charts")

    # Main content
    if page == "Drill Mode":
        drill_page()
    elif page == "Range Viewer":
        viewer_page()
    elif page == "Statistics":
        stats_page()


def drill_page():
    """Drill mode page."""
    st.markdown('<div class="main-header">Preflop Drill</div>', unsafe_allow_html=True)

    # Session stats
    session = st.session_state.session
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total", session.total_spots)
    with col2:
        st.metric("Correct", session.correct_count)
    with col3:
        st.metric("Accuracy", session.accuracy_percent)

    st.markdown("---")

    # Generate new spot if needed
    if st.session_state.current_spot is None:
        st.session_state.current_spot = st.session_state.drill.generate_spot()
        st.session_state.show_result = False

    spot = st.session_state.current_spot

    # Display scenario
    st.markdown(f"""
    <div class="scenario-box">
        <h3 style="margin:0; color: #60a5fa;">Scenario</h3>
        <p style="font-size: 1.2rem; margin: 10px 0;">{spot.scenario.description}</p>
        <p style="font-size: 1rem; color: #94a3b8;">{spot.scenario.description_zh}</p>
    </div>
    """, unsafe_allow_html=True)

    # Display hand
    st.markdown(f"""
    <div class="hand-display">
        <span style="color: #fbbf24;">Your hand: </span>
        <span style="font-size: 4rem;">{spot.display_hand}</span>
    </div>
    """, unsafe_allow_html=True)

    # Action buttons
    if not st.session_state.show_result:
        st.markdown("### What's your action?")
        actions = spot.scenario.available_actions
        cols = st.columns(len(actions))

        for i, action in enumerate(actions):
            with cols[i]:
                # Style buttons differently
                btn_label = action.upper()
                if action in ["raise", "3bet", "4bet", "5bet"]:
                    btn_type = "primary"
                elif action == "call":
                    btn_type = "secondary"
                else:
                    btn_type = "secondary"

                if st.button(btn_label, key=f"action_{action}", use_container_width=True):
                    # Check answer
                    result = st.session_state.drill.check_answer(spot, action)
                    session.add_result(spot, action, result)
                    st.session_state.last_result = result
                    st.session_state.show_result = True
                    st.rerun()

    else:
        # Show result
        result = st.session_state.last_result

        if result.is_correct:
            st.markdown(f"""
            <div class="correct-answer">
                <h3 style="color: #10b981; margin: 0;">✅ Correct!</h3>
                <p style="margin: 10px 0;">{result.explanation}</p>
                <p style="color: #94a3b8; margin: 0;">{result.explanation_zh}</p>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div class="wrong-answer">
                <h3 style="color: #ef4444; margin: 0;">❌ Incorrect</h3>
                <p style="margin: 10px 0;">Your action: <strong>{result.player_action.upper()}</strong></p>
                <p style="margin: 10px 0;">Correct action: <strong>{result.correct_action.upper()}</strong></p>
                <p style="margin: 10px 0;">{result.explanation}</p>
                <p style="color: #94a3b8; margin: 0;">{result.explanation_zh}</p>
            </div>
            """, unsafe_allow_html=True)

        # Show range with current hand highlighted
        with st.expander("View Full Range", expanded=False):
            range_data = st.session_state.drill.get_range_for_spot(spot)
            raise_key = next((k for k in ["raise", "3bet", "4bet", "5bet"] if k in range_data), None)
            raise_hands = range_data.get(raise_key, []) if raise_key else []
            call_hands = range_data.get("call", [])

            display_range_grid(
                raise_hands=raise_hands,
                call_hands=call_hands,
                highlight_hand=str(spot.hand),
            )

        # Next hand button
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            if st.button("Next Hand →", use_container_width=True, type="primary"):
                st.session_state.current_spot = None
                st.session_state.show_result = False
                st.rerun()


def viewer_page():
    """Range viewer page."""
    st.markdown('<div class="main-header">Range Viewer</div>', unsafe_allow_html=True)

    evaluator = Evaluator()

    col1, col2 = st.columns([1, 3])

    with col1:
        # Scenario selector
        action_type = st.selectbox(
            "Scenario Type",
            options=["RFI", "vs Open", "vs 3-Bet", "vs 4-Bet"],
        )

        hero_pos = st.selectbox(
            "Your Position",
            options=["UTG", "HJ", "CO", "BTN", "SB", "BB"],
        )

        # Villain position (if applicable)
        villain_pos = None
        if action_type != "RFI":
            if action_type == "vs Open":
                # Villain is earlier position
                valid_villains = {
                    "HJ": ["UTG"],
                    "CO": ["UTG", "HJ"],
                    "BTN": ["UTG", "HJ", "CO"],
                    "SB": ["UTG", "HJ", "CO", "BTN"],
                    "BB": ["UTG", "HJ", "CO", "BTN", "SB"],
                }
            else:
                # vs 3bet/4bet - villain is later position
                valid_villains = {
                    "UTG": ["HJ", "CO", "BTN", "SB", "BB"],
                    "HJ": ["CO", "BTN", "SB", "BB"],
                    "CO": ["BTN", "SB", "BB"],
                    "BTN": ["SB", "BB"],
                    "SB": ["BB"],
                }

            villains = valid_villains.get(hero_pos, ["BB"])
            if villains:
                villain_pos = st.selectbox("Opponent Position", options=villains)

    with col2:
        # Build scenario
        action_map = {
            "RFI": ActionType.RFI,
            "vs Open": ActionType.VS_RFI,
            "vs 3-Bet": ActionType.VS_3BET,
            "vs 4-Bet": ActionType.VS_4BET,
        }
        pos_map = {
            "UTG": Position.UTG, "HJ": Position.HJ, "CO": Position.CO,
            "BTN": Position.BTN, "SB": Position.SB, "BB": Position.BB,
        }

        scenario = Scenario(
            hero_position=pos_map[hero_pos],
            action_type=action_map[action_type],
            villain_position=pos_map[villain_pos] if villain_pos else None,
        )

        st.markdown(f"**{scenario.description}**")
        st.markdown(f"*{scenario.description_zh}*")

        # Get and display range
        range_data = evaluator.get_range_for_scenario(scenario, format="6max")

        if range_data:
            raise_key = next((k for k in ["raise", "3bet", "4bet", "5bet"] if k in range_data), None)
            raise_hands = range_data.get(raise_key, []) if raise_key else []
            call_hands = range_data.get("call", [])

            display_range_grid(
                raise_hands=raise_hands,
                call_hands=call_hands,
            )
        else:
            st.warning("No range data available for this scenario yet.")


def stats_page():
    """Statistics page."""
    st.markdown('<div class="main-header">Statistics</div>', unsafe_allow_html=True)

    session = st.session_state.session

    if session.total_spots == 0:
        st.info("No data yet. Complete some drills to see your statistics!")
        return

    # Overall stats
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown('<div class="stats-card">', unsafe_allow_html=True)
        st.metric("Total Hands", session.total_spots)
        st.markdown('</div>', unsafe_allow_html=True)
    with col2:
        st.markdown('<div class="stats-card">', unsafe_allow_html=True)
        st.metric("Correct", session.correct_count)
        st.markdown('</div>', unsafe_allow_html=True)
    with col3:
        st.markdown('<div class="stats-card">', unsafe_allow_html=True)
        st.metric("Incorrect", session.incorrect_count)
        st.markdown('</div>', unsafe_allow_html=True)
    with col4:
        st.markdown('<div class="stats-card">', unsafe_allow_html=True)
        st.metric("Accuracy", session.accuracy_percent)
        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("---")

    # Stats by position
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("By Position")
        pos_stats = session.get_stats_by_position()
        if pos_stats:
            for pos, stats in pos_stats.items():
                acc = stats['accuracy'] * 100
                color = "#10b981" if acc >= 70 else "#f59e0b" if acc >= 50 else "#ef4444"
                st.markdown(f"**{pos}**: {stats['correct']}/{stats['total']} ({acc:.0f}%)")
                st.progress(stats['accuracy'])

    with col2:
        st.subheader("By Action Type")
        action_stats = session.get_stats_by_action_type()
        if action_stats:
            for action_type, stats in action_stats.items():
                acc = stats['accuracy'] * 100
                st.markdown(f"**{action_type.upper()}**: {stats['correct']}/{stats['total']} ({acc:.0f}%)")
                st.progress(stats['accuracy'])

    # Mistakes review
    st.markdown("---")
    st.subheader("Recent Mistakes")

    mistakes = session.mistakes[-10:]  # Last 10 mistakes
    if mistakes:
        for m in reversed(mistakes):
            with st.expander(f"{m.spot.hand} at {m.spot.scenario.hero_position.value}"):
                st.write(f"**Scenario:** {m.spot.scenario.description}")
                st.write(f"**Your action:** {m.player_action}")
                st.write(f"**Correct action:** {m.eval_result.correct_action}")
                st.write(f"**Explanation:** {m.eval_result.explanation_zh}")
    else:
        st.success("No mistakes yet! Keep it up! 🎉")


if __name__ == "__main__":
    main()
